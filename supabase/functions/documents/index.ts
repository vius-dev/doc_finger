// Document Service Edge Function
// Handles document registration, retrieval, listing, and revocation
// Implements SHA-256 hashing and fingerprint ID generation

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { sha256, generateRandomHex } from "../_shared/crypto.ts";
import {
    successResponse,
    errorResponse,
    handleCors,
} from "../_shared/response.ts";
import { authenticateRequest, hasPermission } from "../_shared/auth.ts";
import { getCachedResponse, saveIdempotentResponse } from "../_shared/idempotency.ts";


const isUuid = (id?: string) => !!(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    // Normalize path: ignore /functions/v1 prefix if present, then ignore the function name
    let segments = [...pathSegments];
    if (segments[0] === "functions" && segments[1] === "v1") {
        segments = segments.slice(2);
    }
    if (segments[0] === "documents") {
        segments = segments.slice(1);
    }

    const path = segments.length === 0 ? "" : `/${segments.join("/")}`;

    try {
        if (req.method === "POST" && (path === "" || path === "/")) {
            return await registerDocument(req);
        }
        if (req.method === "GET" && path && path !== "/") {
            const id = path.replace("/", "");
            return await getDocument(req, id);
        }
        if (req.method === "GET" && (path === "" || path === "/")) {
            return await listDocuments(req);
        }
        if (req.method === "DELETE" && path && path !== "/") {
            const id = path.replace("/", "");
            return await revokeDocument(req, id);
        }

        return errorResponse("NOT_FOUND", "Endpoint not found", 404);
    } catch (err) {
        console.error("Document service error:", err);
        return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
    }
});

/**
 * Generate a fingerprint ID with institution prefix.
 * Format: {INSTITUTION_CODE}-FP-{RANDOM_8_HEX}
 */
function generateFingerprintId(institutionCode: string): string {
    const randomPart = generateRandomHex(4).toUpperCase(); // 8 hex chars
    return `${institutionCode.toUpperCase()}-FP-${randomPart}`;
}

/**
 * Generate a deterministic hash for a document.
 * This hash must be reproducible from the document attributes alone.
 */
async function generateDocumentHash(payload: {
    document_type: string;
    document_number?: string;
    recipient_name: string;
    issue_date: string;
    metadata: Record<string, any>;
}): Promise<string> {
    const dataString = JSON.stringify({
        t: payload.document_type,
        n: payload.document_number || "",
        r: payload.recipient_name,
        d: payload.issue_date,
        m: payload.metadata,
    });

    return await sha256(dataString);
}

/**
 * POST /documents
 * Register a new document and generate its fingerprint.
 */
async function registerDocument(req: Request): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    if (!hasPermission(context, "documents:create")) {
        return errorResponse(
            "FORBIDDEN",
            "You do not have permission to register documents",
            403
        );
    }

    const supabase = getSupabaseAdmin();
    const idempotencyKey = req.headers.get("X-Idempotency-Key");

    // Check for cached idempotent response
    const cached = await getCachedResponse(supabase, context.institutionId, idempotencyKey);
    if (cached) return cached;

    const body = await req.json();

    // Validate required fields
    const requiredFields = ["recipient_name", "document_type", "issue_date"];
    for (const field of requiredFields) {
        if (!body[field]) {
            return errorResponse(
                "VALIDATION_ERROR",
                `Missing required field: ${field}`,
                400,
                { field }
            );
        }
    }



    // Get institution code for fingerprint prefix
    const { data: institution, error: instError } = await supabase
        .from("institutions")
        .select("institution_code, status")
        .eq("id", context.institutionId)
        .single();

    if (instError || !institution) {
        return errorResponse("NOT_FOUND", "Institution not found", 404);
    }

    if (institution.status !== "active") {
        return errorResponse(
            "INSTITUTION_INACTIVE",
            "Your institution is not active. Contact support.",
            403
        );
    }

    // Generate fingerprint ID. Document hash will be generated after ID/Dates are finalized.
    const fingerprintId = generateFingerprintId(institution.institution_code);

    // Template Lookup
    let template = null;
    if (body.template_id) {
        const { data: tData, error: tError } = await supabase
            .from("document_templates")
            .select("*")
            .eq("id", body.template_id)
            .eq("institution_id", context.institutionId)
            .single();
        if (tError) {
            return errorResponse("NOT_FOUND", "Template not found or inaccessible", 404);
        }
        template = tData;
    }

    // Auto-generate Document Number if missing or if template mandates it
    let docNumber = body.document_number;
    const forceAutoNumber = template?.nomenclature_config?.force_auto === true;

    if (!docNumber || forceAutoNumber) {
        const { data: seq, error: seqError } = await supabase.rpc("get_next_document_number", {
            p_institution_id: context.institutionId,
        });

        if (seqError) {
            console.error("Sequence error:", seqError);
            docNumber = `${institution.institution_code.toUpperCase()}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        } else {
            const prefix = template?.nomenclature_config?.prefix || `${institution.institution_code.toUpperCase()}-`;
            const yearStr = template?.nomenclature_config?.include_year !== false ? `${new Date().getFullYear()}-` : '';
            const padding = template?.nomenclature_config?.padding || 6;
            docNumber = `${prefix}${yearStr}${seq.toString().padStart(padding, '0')}`;
        }
    }

    // Default dates & Lifecycle
    const issueDate = body.issue_date || new Date().toISOString().split("T")[0];
    let expiryDate = body.expiry_date || null;

    if (!expiryDate && template?.default_expiry_days) {
        const date = new Date(issueDate);
        date.setDate(date.getDate() + template.default_expiry_days);
        expiryDate = date.toISOString().split("T")[0];
    }

    // Generate document hash
    const documentHash = await generateDocumentHash({
        recipient_name: body.recipient_name,
        document_type: template?.document_type || body.document_type,
        document_number: docNumber,
        issue_date: issueDate,
        metadata: body.metadata ?? {},
    });

    // Extract recipient identity for hashing and storage as TEXT[]
    const recipientIdentityStrings = [];
    if (body.recipient_email) recipientIdentityStrings.push(`email:${body.recipient_email}`);
    if (body.recipient_phone) recipientIdentityStrings.push(`phone:${body.recipient_phone}`);
    if (body.recipient_id_type && body.recipient_id_value) recipientIdentityStrings.push(`${body.recipient_id_type}:${body.recipient_id_value}`);

    const recipientIdentifierSource = body.recipient_id_value || body.recipient_email || body.recipient_name;
    const recipientIdentifierHash = await sha256(recipientIdentifierSource);

    // Handle creator ID (must be a valid UUID or null)
    const creatorId = isUuid(context.userId) ? context.userId : (isUuid(context.apiKeyId) ? context.apiKeyId : null);

    // Insert document
    const { data, error } = await supabase
        .from("documents")
        .insert({
            fingerprint_id: fingerprintId,
            sha256_hash: documentHash,
            institution_id: context.institutionId,
            template_id: template?.id || null,
            issuing_department: body.issuing_department ?? null,
            issuer_user_id: creatorId,
            document_type: template?.document_type || body.document_type,
            document_subtype: template?.document_subtype || body.document_subtype || null,
            document_number: docNumber,
            recipient_name: body.recipient_name,
            recipient_identifier_hash: recipientIdentifierHash,
            recipient_additional: recipientIdentityStrings.length > 0 ? recipientIdentityStrings : null,
            issue_date: issueDate,
            expiry_date: expiryDate,
            effective_date: body.effective_date ?? null,
            document_metadata: body.metadata ?? {},
            public_display: body.public_display ?? null,
            status: "active",
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return errorResponse(
                "DUPLICATE_ENTRY",
                "A document with this fingerprint already exists",
                409
            );
        }
        console.error("Failed to register document:", error);
        return errorResponse(
            "INTERNAL_ERROR",
            "Failed to register document",
            500
        );
    }

    // Increment API key usage if not an admin JWT
    if (context.apiKeyId && !context.isAdmin) {
        const { error: rpcError } = await supabase.rpc("increment_api_key_usage", {
            p_key_id: context.apiKeyId,
        });
        
        if (rpcError) {
            console.error("Failed to increment API key usage limit:", rpcError);
            // We don't block the document response, but it will expire the key if limit hit
        }
    }

    const responseData = {
        id: data.id,
        fingerprint_id: data.fingerprint_id,
        sha256_hash: data.sha256_hash,
        document_type: data.document_type,
        recipient_name: data.recipient_name,
        issue_date: data.issue_date,
        expiry_date: data.expiry_date,
        status: data.status,
        verification_url: `https://verify.docfingerprint.com/${data.fingerprint_id}`,
    };

    // Save for idempotency
    await saveIdempotentResponse(
        supabase,
        context.institutionId,
        idempotencyKey,
        201,
        responseData
    );

    return successResponse(responseData, undefined, 201);
}

/**
 * GET /documents/:id
 * Retrieve a document by UUID or fingerprint_id.
 */
async function getDocument(
    req: Request,
    id: string
): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    if (!hasPermission(context, "documents:read")) {
        return errorResponse(
            "FORBIDDEN",
            "You do not have permission to read documents",
            403
        );
    }

    const supabase = getSupabaseAdmin();
    const isDocUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

    let query = supabase.from("documents").select("*, institution:institutions(legal_name, institution_code)");
    if (isDocUuid) {
        query = query.eq("id", id);
    } else {
        query = query.eq("fingerprint_id", id.toUpperCase());
    }

    // Scope to caller's institution
    query = query.eq("institution_id", context.institutionId);

    const { data, error } = await query.single();

    if (error || !data) {
        return errorResponse("NOT_FOUND", "Document not found", 404);
    }

    return successResponse(data);
}

/**
 * GET /documents
 * List documents for the authenticated institution.
 */
async function listDocuments(req: Request): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    if (!hasPermission(context, "documents:read")) {
        return errorResponse(
            "FORBIDDEN",
            "You do not have permission to read documents",
            403
        );
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    const supabase = getSupabaseAdmin();

    let query = supabase
        .from("documents")
        .select(
            "id, fingerprint_id, document_type, document_subtype, recipient_name, issue_date, expiry_date, status, created_at",
            { count: "exact" }
        )
        .eq("institution_id", context.institutionId);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("document_type", type);

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return errorResponse("INTERNAL_ERROR", "Failed to list documents", 500);
    }

    return successResponse(data, {
        request_id: `req_${crypto.randomUUID().slice(0, 12)}`,
        response_time_ms: 0,
        pagination: {
            has_more: (count ?? 0) > offset + limit,
            total: count ?? 0,
        },
    });
}

/**
 * DELETE /documents/:id
 * Revoke a document (soft delete — sets status to 'revoked').
 */
async function revokeDocument(
    req: Request,
    id: string
): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    if (!hasPermission(context, "documents:revoke")) {
        return errorResponse(
            "FORBIDDEN",
            "You do not have permission to revoke documents",
            403
        );
    }

    const supabase = getSupabaseAdmin();

    // Find the document
    const isDocUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
    let findQuery = supabase
        .from("documents")
        .select("id, institution_id, status");

    if (isDocUuid) {
        findQuery = findQuery.eq("id", id);
    } else {
        findQuery = findQuery.eq("fingerprint_id", id.toUpperCase());
    }

    const { data: doc, error: findError } = await findQuery.single();

    if (findError || !doc) {
        return errorResponse("NOT_FOUND", "Document not found", 404);
    }

    if (doc.institution_id !== context.institutionId) {
        return errorResponse(
            "FORBIDDEN",
            "You can only revoke documents belonging to your institution",
            403
        );
    }

    if (doc.status === "revoked") {
        return errorResponse(
            "ALREADY_REVOKED",
            "This document is already revoked",
            409
        );
    }

    // Parse reason from body
    let reason = "Revoked by institution";
    try {
        const body = await req.json();
        if (body.reason) reason = body.reason;
    } catch {
        // No body is fine
    }

    const revokerId = isUuid(context.userId) ? context.userId : (isUuid(context.apiKeyId) ? context.apiKeyId : null);

    const { error: updateError } = await supabase
        .from("documents")
        .update({
            status: "revoked",
            revoked_at: new Date().toISOString(),
            revoked_reason: reason,
            revoked_by: revokerId,
        })
        .eq("id", doc.id);

    if (updateError) {
        return errorResponse(
            "INTERNAL_ERROR",
            "Failed to revoke document",
            500
        );
    }

    // Log to audit
    await supabase.from("audit_log").insert({
        actor_type: "api_key",
        actor_id: context.keyId,
        action: "document.revoked",
        resource_type: "document",
        resource_id: doc.id,
        new_state_hash: await sha256(JSON.stringify({ status: "revoked", reason })),
        changes_summary: { status: "revoked", reason },
        environment: context.environment,
    });

    return successResponse({
        id: doc.id,
        status: "revoked",
        revoked_reason: reason,
    });
}

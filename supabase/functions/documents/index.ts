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


Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/documents/, "");

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
 * Generate a SHA-256 hash from document content and metadata.
 */
async function generateDocumentHash(
    recipientName: string,
    documentType: string,
    documentNumber: string | null,
    issueDate: string,
    metadata: Record<string, unknown>
): Promise<string> {
    const hashInput = JSON.stringify({
        recipient: recipientName,
        type: documentType,
        number: documentNumber ?? "",
        issue_date: issueDate,
        metadata,
        timestamp: Date.now(),
    });

    return sha256(hashInput);
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

    // Auto-generate Document Number if missing
    let docNumber = body.document_number;
    if (!docNumber) {
        const { data: seq, error: seqError } = await supabase.rpc("get_next_document_number", {
            p_institution_id: context.institutionId,
        });
        if (seqError) {
            console.error("Sequence error:", seqError);
            // Fallback to timestamp based if sequence function fails
            docNumber = `${institution.institution_code.toUpperCase()}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        } else {
            docNumber = `${institution.institution_code.toUpperCase()}-${new Date().getFullYear()}-${seq.toString().padStart(6, '0')}`;
        }
    }

    // Default dates
    const issueDate = body.issue_date || new Date().toISOString().split("T")[0];
    const expiryDate = body.expiry_date || null; // Trigger handles default if null

    // Generate document hash
    const documentHash = await generateDocumentHash(
        body.recipient_name,
        body.document_type,
        docNumber,
        issueDate,
        body.metadata ?? {}
    );

    // Extract recipient identity for hashing and storage
    const recipientIdentity = {
        email: body.recipient_email || null,
        phone: body.recipient_phone || null,
        id_type: body.recipient_id_type || null,
        id_value: body.recipient_id_value || null,
    };

    const recipientIdentifierSource = body.recipient_id_value || body.recipient_email || body.recipient_name;
    const recipientIdentifierHash = await sha256(recipientIdentifierSource);

    // Insert document — the set_default_expiry trigger handles expiry_date
    const { data, error } = await supabase
        .from("documents")
        .insert({
            fingerprint_id: fingerprintId,
            sha256_hash: documentHash,
            institution_id: context.institutionId,
            issuing_department: body.issuing_department ?? null,
            issuer_user_id: body.issuer_user_id ?? null,
            document_type: body.document_type,
            document_subtype: body.document_subtype ?? null,
            document_number: docNumber,
            recipient_name: body.recipient_name,
            recipient_identifier_hash: recipientIdentifierHash,
            recipient_additional: recipientIdentity,
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

    let query = supabase.from("documents").select("*");
    if (isUuid) {
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
    let findQuery = supabase
        .from("documents")
        .select("id, institution_id, status");

    if (isUuid) {
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

    const { error: updateError } = await supabase
        .from("documents")
        .update({
            status: "revoked",
            revoked_at: new Date().toISOString(),
            revoked_reason: reason,
            revoked_by: context.apiKeyId,
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

// Verification Service Edge Function
// Public endpoint — no authentication required
// Anyone with a fingerprint ID can verify a document

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { getSupabaseAdmin } from "../_shared/supabase.ts";
import {
    successResponse,
    errorResponse,
    handleCors,
} from "../_shared/response.ts";

Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/verify/, "");

    try {
        // GET /verify/:fingerprint_id — Single document verification (public)
        if (req.method === "GET" && path && path !== "/") {
            const fingerprintId = path.replace("/", "");
            return await verifySingle(req, fingerprintId);
        }

        // POST /verify/bulk — Bulk verification (public but rate-limited)
        if (req.method === "POST" && path === "/bulk") {
            return await verifyBulk(req);
        }

        return errorResponse("NOT_FOUND", "Endpoint not found", 404);
    } catch (err) {
        console.error("Verification service error:", err);
        return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
    }
});

/**
 * GET /verify/:fingerprint_id
 * Public verification — anyone can verify a document.
 * Returns verification result + limited public info.
 */
async function verifySingle(
    req: Request,
    fingerprintId: string
): Promise<Response> {
    const startTime = Date.now();
    const supabase = getSupabaseAdmin();

    const normalizedId = fingerprintId.toUpperCase();

    // Look up the document
    const { data: doc, error } = await supabase
        .from("documents")
        .select(
            `id, fingerprint_id, document_type, document_subtype,
       recipient_name, issue_date, expiry_date, status,
       institution_id, public_display, created_at`
        )
        .eq("fingerprint_id", normalizedId)
        .single();

    const responseTimeMs = Date.now() - startTime;

    if (error || !doc) {
        // Log failed verification attempt
        await logVerification(supabase, {
            fingerprintId: normalizedId,
            documentId: null,
            institutionId: null,
            verified: false,
            responseTimeMs,
            verifierIp: req.headers.get("x-forwarded-for") ?? "0.0.0.0",
            verifierUserAgent: req.headers.get("user-agent") ?? "",
            method: "single",
        });

        return successResponse({
            verified: false,
            fingerprint_id: normalizedId,
            message: "No document found with this fingerprint ID",
            checked_at: new Date().toISOString(),
            response_time_ms: responseTimeMs,
        });
    }

    // Get institution public info
    const { data: institution } = await supabase
        .from("institutions")
        .select(
            "institution_code, legal_name, trading_name, institution_type, country_code, verification_level"
        )
        .eq("id", doc.institution_id)
        .single();

    // Determine verification result
    const isActive = doc.status === "active";
    const isExpired =
        doc.expiry_date && new Date(doc.expiry_date) < new Date();
    const verified = isActive && !isExpired;

    let statusMessage: string;
    if (verified) {
        statusMessage = "Document is valid and verified";
    } else if (doc.status === "revoked") {
        statusMessage = "This document has been revoked";
    } else if (isExpired) {
        statusMessage = "This document has expired";
    } else {
        statusMessage = "This document is not active";
    }

    // Log successful verification attempt
    await logVerification(supabase, {
        fingerprintId: normalizedId,
        documentId: doc.id,
        institutionId: doc.institution_id,
        verified,
        responseTimeMs: Date.now() - startTime,
        verifierIp: req.headers.get("x-forwarded-for") ?? "0.0.0.0",
        verifierUserAgent: req.headers.get("user-agent") ?? "",
        method: "single",
    });

    return successResponse({
        verified,
        fingerprint_id: doc.fingerprint_id,
        status: doc.status,
        status_message: statusMessage,
        document: {
            type: doc.document_type,
            subtype: doc.document_subtype,
            recipient_name: doc.recipient_name,
            issue_date: doc.issue_date,
            expiry_date: doc.expiry_date,
            ...(doc.public_display ?? {}),
        },
        issuer: institution
            ? {
                code: institution.institution_code,
                name: institution.legal_name,
                trading_name: institution.trading_name,
                type: institution.institution_type,
                country: institution.country_code,
                verification_level: institution.verification_level,
            }
            : null,
        checked_at: new Date().toISOString(),
        response_time_ms: Date.now() - startTime,
    });
}

/**
 * POST /verify/bulk
 * Verify multiple documents at once.
 * Body: { fingerprint_ids: string[] }
 * Maximum 50 fingerprint IDs per request.
 */
async function verifyBulk(req: Request): Promise<Response> {
    const body = await req.json();
    const { fingerprint_ids } = body;

    if (!Array.isArray(fingerprint_ids) || fingerprint_ids.length === 0) {
        return errorResponse(
            "VALIDATION_ERROR",
            "fingerprint_ids must be a non-empty array",
            400
        );
    }

    if (fingerprint_ids.length > 50) {
        return errorResponse(
            "VALIDATION_ERROR",
            "Maximum 50 fingerprint IDs per bulk request",
            400,
            { limit: 50, provided: fingerprint_ids.length }
        );
    }

    const startTime = Date.now();
    const supabase = getSupabaseAdmin();

    const normalizedIds = fingerprint_ids.map((id: string) =>
        id.toUpperCase()
    );

    // Fetch all matching documents
    const { data: docs, error } = await supabase
        .from("documents")
        .select(
            "fingerprint_id, document_type, recipient_name, issue_date, expiry_date, status"
        )
        .in("fingerprint_id", normalizedIds);

    if (error) {
        return errorResponse(
            "INTERNAL_ERROR",
            "Failed to perform bulk verification",
            500
        );
    }

    // Build a lookup map
    const docMap = new Map<string, typeof docs[0]>();
    for (const doc of docs ?? []) {
        docMap.set(doc.fingerprint_id, doc);
    }

    // Build results for each requested ID
    const results = normalizedIds.map((fpId: string) => {
        const doc = docMap.get(fpId);
        if (!doc) {
            return {
                fingerprint_id: fpId,
                verified: false,
                message: "No document found",
            };
        }

        const isActive = doc.status === "active";
        const isExpired =
            doc.expiry_date && new Date(doc.expiry_date) < new Date();
        const verified = isActive && !isExpired;

        return {
            fingerprint_id: fpId,
            verified,
            status: doc.status,
            document_type: doc.document_type,
            recipient_name: doc.recipient_name,
            issue_date: doc.issue_date,
            expiry_date: doc.expiry_date,
        };
    });

    return successResponse({
        results,
        total: results.length,
        verified_count: results.filter(
            (r: { verified: boolean }) => r.verified
        ).length,
        response_time_ms: Date.now() - startTime,
    });
}

/**
 * Log a verification attempt to the verification_log table.
 */
async function logVerification(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    params: {
        fingerprintId: string;
        documentId: string | null;
        institutionId: string | null;
        verified: boolean;
        responseTimeMs: number;
        verifierIp: string;
        verifierUserAgent: string;
        method: string;
    }
): Promise<void> {
    try {
        await supabase.from("verification_log").insert({
            document_id: params.documentId,
            fingerprint_id: params.fingerprintId,
            institution_id: params.institutionId,
            verifier_ip: params.verifierIp || "0.0.0.0",
            verifier_user_agent: params.verifierUserAgent,
            verified: params.verified,
            response_time_ms: params.responseTimeMs,
            result_details: { method: params.method },
            verification_method: params.method,
        });
    } catch (err) {
        // Don't fail the verification response if logging fails
        console.error("Failed to log verification:", err);
    }
}

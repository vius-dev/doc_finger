// Bulk upload Edge Function — processes CSV of documents in batches
// Refactored to use shared utilities for consistency

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { generateRandomHex, sha256 } from "../_shared/crypto.ts";
import {
    successResponse,
    errorResponse,
    handleCors,
} from "../_shared/response.ts";
import { authenticateRequest, hasPermission } from "../_shared/auth.ts";

interface BulkRecord {
    recipient_name: string;
    document_type: string;
    issue_date: string;
    document_number?: string;
    expiry_date?: string;
}

Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        const { error: authError, context } = await authenticateRequest(req);
        if (authError || !context) return authError!;

        if (!hasPermission(context, "documents:create")) {
            return errorResponse(
                "FORBIDDEN",
                "You do not have permission to register documents",
                403
            );
        }

        const url = new URL(req.url);
        const path = url.pathname.replace(/^\/bulk-upload\/?/, "/");

        // POST /bulk-upload — submit a batch of documents
        if (req.method === "POST" && (path === "/" || path === "")) {
            return await processBulkUpload(req, context);
        }

        return errorResponse("NOT_FOUND", "Endpoint not found", 404);
    } catch (err) {
        console.error("Bulk upload error:", err);
        return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
    }
});

/**
 * Generate a fingerprint ID.
 */
function generateFingerprintId(institutionCode: string): string {
    const randomPart = generateRandomHex(4).toUpperCase();
    return `${institutionCode.toUpperCase()}-FP-${randomPart}`;
}

/**
 * POST /bulk-upload
 */
async function processBulkUpload(req: Request, context: any): Promise<Response> {
    const body = await req.json();
    const records: BulkRecord[] = body.documents;

    if (!Array.isArray(records) || records.length === 0) {
        return errorResponse(
            "VALIDATION_ERROR",
            "'documents' must be a non-empty array",
            400
        );
    }

    if (records.length > 500) {
        return errorResponse(
            "VALIDATION_ERROR",
            "Maximum 500 documents per batch",
            400
        );
    }

    const supabase = getSupabaseAdmin();

    // Get institution info for fingerprint prefix
    const { data: institution } = await supabase
        .from("institutions")
        .select("institution_code")
        .eq("id", context.institutionId)
        .single();

    if (!institution) {
        return errorResponse("NOT_FOUND", "Institution not found", 404);
    }

    const results = {
        total: records.length,
        successful: 0,
        failed: 0,
        documents: [] as { fingerprint_id: string; recipient_name: string; status: string }[],
        errors: [] as { index: number; recipient_name: string; error: string }[],
    };

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const inserts = [];

        for (let j = 0; j < batch.length; j++) {
            const record = batch[j];
            const idx = i + j;

            // Validate required fields
            if (!record.recipient_name || !record.document_type || !record.issue_date) {
                results.failed++;
                results.errors.push({
                    index: idx,
                    recipient_name: record.recipient_name || "unknown",
                    error: "Missing required fields: recipient_name, document_type, issue_date",
                });
                continue;
            }

            const fingerprintId = generateFingerprintId(institution.institution_code);

            // Hash document data for fingerprinting
            const hashInput = JSON.stringify({
                recipient: record.recipient_name,
                type: record.document_type,
                number: record.document_number ?? "",
                issue_date: record.issue_date,
                timestamp: Date.now(),
            });
            const sha256Hash = await sha256(hashInput);

            inserts.push({
                institution_id: context.institutionId,
                fingerprint_id: fingerprintId,
                sha256_hash: sha256Hash,
                recipient_name: record.recipient_name,
                document_type: record.document_type,
                document_number: record.document_number || null,
                issue_date: record.issue_date,
                status: "active",
                // Note: default_expiry trigger will handle null expiry_date
                expiry_date: record.expiry_date || null,
            });
        }

        if (inserts.length > 0) {
            const { data, error } = await supabase
                .from("documents")
                .insert(inserts)
                .select("fingerprint_id, recipient_name, status");

            if (error) {
                // If batch fails, mark all in this batch as failed
                for (const ins of inserts) {
                    results.failed++;
                    results.errors.push({
                        index: i, // Rough index
                        recipient_name: ins.recipient_name,
                        error: error.message,
                    });
                }
            } else if (data) {
                results.successful += data.length;
                results.documents.push(
                    ...data.map((d: any) => ({
                        fingerprint_id: d.fingerprint_id,
                        recipient_name: d.recipient_name,
                        status: d.status,
                    }))
                );
            }
        }
    }

    // Update usage counter using the RPC
    await supabase.rpc("increment_usage", {
        inst_id: context.institutionId,
        count: results.successful,
    });

    return successResponse(results);
}

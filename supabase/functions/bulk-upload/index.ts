// Bulk upload Edge Function — processes CSV of documents in batches
// Phase 6 pilot feedback: NOUN requested faster bulk uploads

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-timestamp, x-signature, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function errorResponse(message: string, code: string, status: number) {
    return jsonResponse({ status: "error", error: { message, code } }, status);
}

// Simple auth check — reuse the same API key auth pattern
async function authenticate(req: Request, supabase: ReturnType<typeof createClient>) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }
    const apiKey = authHeader.replace("Bearer ", "");

    const { data } = await supabase
        .from("api_keys")
        .select("institution_id, permissions, status")
        .eq("key_preview", apiKey.substring(0, 8) + "...")
        .eq("status", "active")
        .single();

    return data;
}

// Generate fingerprint ID
function generateFingerprintId(institutionCode: string): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let random = "";
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    for (const byte of arr) {
        random += chars[byte % chars.length];
    }
    return `${institutionCode}-FP-${random}`;
}

// Hash document data
async function hashDocument(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

interface BulkRecord {
    recipient_name: string;
    document_type: string;
    issue_date: string;
    document_number?: string;
    expiry_date?: string;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
        // Authenticate
        const auth = await authenticate(req, supabase);
        if (!auth) {
            return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
        }

        const url = new URL(req.url);
        const path = url.pathname.replace(/^\/bulk-upload\/?/, "/");

        // POST /bulk-upload — submit a batch of documents
        if (req.method === "POST" && (path === "/" || path === "")) {
            const body = await req.json();
            const records: BulkRecord[] = body.documents;

            if (!Array.isArray(records) || records.length === 0) {
                return errorResponse("'documents' must be a non-empty array", "VALIDATION_ERROR", 400);
            }

            if (records.length > 500) {
                return errorResponse("Maximum 500 documents per batch", "VALIDATION_ERROR", 400);
            }

            // Get institution info for fingerprint prefix
            const { data: institution } = await supabase
                .from("institutions")
                .select("institution_code")
                .eq("id", auth.institution_id)
                .single();

            if (!institution) {
                return errorResponse("Institution not found", "NOT_FOUND", 404);
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
                    const hashInput = `${auth.institution_id}|${record.recipient_name}|${record.document_type}|${record.issue_date}|${Date.now()}`;
                    const sha256Hash = await hashDocument(hashInput);

                    // Default expiry: 3 months from issue date
                    const issueDate = new Date(record.issue_date);
                    const defaultExpiry = new Date(issueDate);
                    defaultExpiry.setMonth(defaultExpiry.getMonth() + 3);

                    inserts.push({
                        institution_id: auth.institution_id,
                        fingerprint_id: fingerprintId,
                        sha256_hash: sha256Hash,
                        recipient_name: record.recipient_name,
                        document_type: record.document_type,
                        document_number: record.document_number || null,
                        issue_date: record.issue_date,
                        expiry_date: record.expiry_date || defaultExpiry.toISOString().split("T")[0],
                        status: "active",
                    });
                }

                if (inserts.length > 0) {
                    const { data, error } = await supabase
                        .from("documents")
                        .insert(inserts)
                        .select("fingerprint_id, recipient_name, status");

                    if (error) {
                        // If batch fails, mark all as failed
                        for (const ins of inserts) {
                            results.failed++;
                            results.errors.push({
                                index: i,
                                recipient_name: ins.recipient_name,
                                error: error.message,
                            });
                        }
                    } else if (data) {
                        results.successful += data.length;
                        results.documents.push(
                            ...data.map((d: { fingerprint_id: string; recipient_name: string; status: string }) => ({
                                fingerprint_id: d.fingerprint_id,
                                recipient_name: d.recipient_name,
                                status: d.status,
                            }))
                        );
                    }
                }
            }

            // Update usage counter
            await supabase.rpc("increment_usage", {
                inst_id: auth.institution_id,
                count: results.successful,
            });

            return jsonResponse({
                status: "success",
                data: results,
            });
        }

        return errorResponse("Not found", "NOT_FOUND", 404);
    } catch (err) {
        return errorResponse(
            err instanceof Error ? err.message : "Internal server error",
            "INTERNAL_ERROR",
            500
        );
    }
});

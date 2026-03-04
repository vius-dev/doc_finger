// Admin Seed Edge Function
// Production admin tool for bootstrapping API keys & test documents.
// Authenticates via SUPABASE_SERVICE_ROLE_KEY — not accessible to normal users.
//
// POST /admin-seed   { action: "seed_keys" | "seed_documents" | "seed_all" }
//
// Authorization: Bearer <service_role_key>

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    hashApiKey,
    generateSalt,
    generateRandomHex,
    sha256,
} from "../_shared/crypto.ts";

const PBKDF2_ITERATIONS = 600_000;
const DEFAULT_KEY_EXPIRY_DAYS = 365;

const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

// ---- Admin Auth ----

function authenticateAdmin(req: Request): boolean {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return false;
    const token = authHeader.slice(7);

    // Accept either: custom ADMIN_SECRET or the built-in SUPABASE_SERVICE_ROLE_KEY
    const adminSecret = Deno.env.get("ADMIN_SECRET") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (adminSecret.length > 0 && token === adminSecret) return true;
    if (serviceRoleKey.length > 0 && token === serviceRoleKey) return true;
    return false;
}

function getSupabaseAdmin() {
    return createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
}

// ---- Key Generation (mirrors auth/createApiKey) ----

interface GeneratedKey {
    institution_code: string;
    institution_id: string;
    key_id: string;
    api_key: string;          // plaintext — shown once
    key_preview: string;
    environment: string;
    permissions: Record<string, boolean>;
    expires_at: string;
}

async function generateApiKeyForInstitution(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    institutionId: string,
    institutionCode: string,
    environment: "test" | "production" = "test"
): Promise<GeneratedKey> {
    const code = institutionCode.toLowerCase();

    // Generate the plaintext key
    const randomPart = generateRandomHex(16);
    const apiKey = `${code}_${environment}_${randomPart}`;

    // Key ID
    const keyIdHash = await sha256(apiKey);
    const keyId = `key_${keyIdHash.slice(0, 8)}`;

    // PBKDF2 hash for storage
    const salt = generateSalt(16);
    const keyHash = await hashApiKey(apiKey, salt, PBKDF2_ITERATIONS);
    const saltHex = Array.from(salt)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Preview
    const keyPreview = `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}`;

    // Expiry
    const expiresAt = new Date(
        Date.now() + DEFAULT_KEY_EXPIRY_DAYS * 864e5
    ).toISOString();

    // Full permissions for admin-seeded keys
    const permissions: Record<string, boolean> = {
        "documents:create": true,
        "documents:read": true,
        "documents:revoke": true,
        "stats:read": true,
        "keys:read": true,
        "keys:create": true,
        "institution:read": true,
    };

    // Insert (same format as auth/createApiKey)
    const { error } = await supabase.from("api_keys").insert({
        key_id: keyId,
        institution_id: institutionId,
        key_hash: `${keyHash}:${saltHex}`,
        key_preview: keyPreview,
        permissions,
        name: `${institutionCode} Admin Key`,
        description: `Admin-seeded ${environment} key for pilot program`,
        environment,
        expires_at: expiresAt,
        status: "active",
    });

    if (error) throw new Error(`Failed to insert key for ${institutionCode}: ${error.message}`);

    return {
        institution_code: institutionCode,
        institution_id: institutionId,
        key_id: keyId,
        api_key: apiKey,
        key_preview: keyPreview,
        environment,
        permissions,
        expires_at: expiresAt,
    };
}

// ---- Document Seeding ----

interface SeedDocument {
    type: string;
    recipient: string;
    number: string;
    issueDate: string;
    metadata: Record<string, unknown>;
}

function getTestDocuments(institutionCode: string): SeedDocument[] {
    return [
        {
            type: "degree_certificate",
            recipient: "Adebayo Oluwaseun",
            number: `${institutionCode}-DOC-001`,
            issueDate: "2026-01-15",
            metadata: { degree: "BSc Computer Science", class: "First Class" },
        },
        {
            type: "degree_certificate",
            recipient: "Fatima Ibrahim",
            number: `${institutionCode}-DOC-002`,
            issueDate: "2026-02-01",
            metadata: { degree: "MSc Data Science", class: "Distinction" },
        },
        {
            type: "professional_license",
            recipient: "Chinedu Eze",
            number: `${institutionCode}-DOC-003`,
            issueDate: "2025-12-10",
            metadata: { license: "Full Registration", specialisation: "Surgery" },
        },
        {
            type: "transcript",
            recipient: "Amara Okafor",
            number: `${institutionCode}-DOC-004`,
            issueDate: "2026-03-01",
            metadata: { gpa: "3.85", totalCredits: 148 },
        },
        {
            type: "certificate_of_completion",
            recipient: "Kofi Mensah",
            number: `${institutionCode}-DOC-005`,
            issueDate: "2026-02-20",
            metadata: { course: "Project Management Professional", hours: 120 },
        },
    ];
}

async function seedDocuments(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    institutionId: string,
    institutionCode: string
): Promise<{ created: number; skipped: number; fingerprints: string[] }> {
    const docs = getTestDocuments(institutionCode);
    let created = 0;
    let skipped = 0;
    const fingerprints: string[] = [];

    for (const doc of docs) {
        const fingerprintId = `${institutionCode}-FP-${generateRandomHex(6).toUpperCase()}`;
        const docHash = await sha256(
            JSON.stringify({ ...doc, institution: institutionCode, fingerprint: fingerprintId })
        );
        const expiryDate = new Date(Date.now() + 90 * 864e5).toISOString().split("T")[0]; // 3 months

        const { error } = await supabase.from("documents").insert({
            fingerprint_id: fingerprintId,
            sha256_hash: docHash,
            institution_id: institutionId,
            document_type: doc.type,
            document_number: doc.number,
            recipient_name: doc.recipient,
            issue_date: doc.issueDate,
            expiry_date: expiryDate,
            status: "active",
            document_metadata: doc.metadata,
        });

        if (error) {
            console.warn(`Skipped ${doc.number}: ${error.message}`);
            skipped++;
        } else {
            created++;
            fingerprints.push(fingerprintId);
        }
    }

    return { created, skipped, fingerprints };
}

// ---- Main Handler ----

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // Admin-only: require service role key
    if (!authenticateAdmin(req)) {
        return new Response(
            JSON.stringify({
                status: "error",
                error: { code: "UNAUTHORIZED", message: "Service role key required" },
            }),
            { status: 401, headers: corsHeaders }
        );
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ status: "error", error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } }),
            { status: 405, headers: corsHeaders }
        );
    }

    const { action = "seed_all" } = await req.json().catch(() => ({ action: "seed_all" }));
    const supabase = getSupabaseAdmin();

    // Get all pilot institutions
    const { data: institutions, error: instError } = await supabase
        .from("institutions")
        .select("id, institution_code, legal_name, status")
        .like("institution_code", "%-PILOT")
        .order("institution_code");

    if (instError || !institutions?.length) {
        return new Response(
            JSON.stringify({
                status: "error",
                error: { code: "NO_INSTITUTIONS", message: "No pilot institutions found. Run the seed migration first." },
            }),
            { status: 404, headers: corsHeaders }
        );
    }

    const results: Record<string, unknown> = {};
    const generatedKeys: GeneratedKey[] = [];

    for (const inst of institutions) {
        const instResult: Record<string, unknown> = { legal_name: inst.legal_name };

        // Seed API keys
        if (action === "seed_keys" || action === "seed_all") {
            try {
                const key = await generateApiKeyForInstitution(supabase, inst.id, inst.institution_code);
                generatedKeys.push(key);
                instResult.api_key = {
                    key_id: key.key_id,
                    api_key: key.api_key,
                    key_preview: key.key_preview,
                    environment: key.environment,
                    expires_at: key.expires_at,
                    warning: "Save this API key now. It will not be shown again.",
                };
            } catch (err) {
                instResult.api_key_error = err instanceof Error ? err.message : String(err);
            }
        }

        // Seed documents
        if (action === "seed_documents" || action === "seed_all") {
            try {
                const docResult = await seedDocuments(supabase, inst.id, inst.institution_code);
                instResult.documents = docResult;
            } catch (err) {
                instResult.documents_error = err instanceof Error ? err.message : String(err);
            }
        }

        results[inst.institution_code] = instResult;
    }

    return new Response(
        JSON.stringify({
            status: "success",
            action,
            institutions_seeded: institutions.length,
            results,
            meta: {
                timestamp: new Date().toISOString(),
                warning: "API keys are shown only once. Save them immediately.",
            },
        }, null, 2),
        { status: 200, headers: corsHeaders }
    );
});

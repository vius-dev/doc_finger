// Auth Service Edge Function
// Handles API key generation, validation, revocation, and listing

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { getSupabaseAdmin } from "../_shared/supabase.ts";
import {
    hashApiKey,
    generateSalt,
    generateRandomHex,
    sha256,
} from "../_shared/crypto.ts";
import {
    successResponse,
    errorResponse,
    handleCors,
    corsHeaders,
} from "../_shared/response.ts";
import { authenticateRequest, hasPermission } from "../_shared/auth.ts";

const PBKDF2_ITERATIONS = 600_000;
const DEFAULT_KEY_EXPIRY_DAYS = 90;
const ALLOWED_ENVIRONMENTS = ["test", "production"];

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/auth/, "");

    try {
        // Route requests
        // Validate Key (Must come before dynamic key ID routes)
        if (req.method === "POST" && path === "/keys/validate") {
            return await validateApiKey(req);
        }

        if (req.method === "POST" && path === "/keys") {
            return await createApiKey(req);
        }
        if (req.method === "GET" && path === "/keys") {
            return await listApiKeys(req);
        }
        if (req.method === "DELETE" && path.startsWith("/keys/")) {
            const keyId = path.replace("/keys/", "");
            return await revokeApiKey(req, keyId);
        }

        return errorResponse("NOT_FOUND", "Endpoint not found", 404);
    } catch (err) {
        console.error("Auth service error:", err);
        return errorResponse(
            "INTERNAL_ERROR",
            "An unexpected error occurred",
            500
        );
    }
});

/**
 * POST /auth/keys
 * Generate a new API key for an institution.
 * Requires authentication with 'keys:create' permission.
 */
async function createApiKey(req: Request): Promise<Response> {
    // Authenticate the request
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    if (!hasPermission(context, "keys:create")) {
        return errorResponse(
            "FORBIDDEN",
            "You do not have permission to create API keys",
            403
        );
    }

    // Parse request body
    const body = await req.json();
    const {
        environment = "test",
        name,
        permissions,
        expires_in_days,
    } = body;

    // Validate environment
    if (!ALLOWED_ENVIRONMENTS.includes(environment)) {
        return errorResponse(
            "VALIDATION_ERROR",
            `Invalid environment. Must be one of: ${ALLOWED_ENVIRONMENTS.join(", ")}`,
            400,
            { field: "environment" }
        );
    }

    const supabase = getSupabaseAdmin();

    // Get institution code for key prefix
    const { data: institution, error: instError } = await supabase
        .from("institutions")
        .select("institution_code")
        .eq("id", context.institutionId)
        .single();

    if (instError || !institution) {
        return errorResponse("NOT_FOUND", "Institution not found", 404);
    }

    const institutionCode = institution.institution_code.toLowerCase();

    // Generate the API key
    const randomPart = generateRandomHex(16); // 32 hex chars
    const apiKey = `${institutionCode}_${environment}_${randomPart}`;

    // Generate key ID from hash
    const keyIdHash = await sha256(apiKey);
    const keyId = `key_${keyIdHash.slice(0, 8)}`;

    // Hash the key for storage
    const salt = generateSalt(16);
    const keyHash = await hashApiKey(apiKey, salt, PBKDF2_ITERATIONS);
    const saltHex = Array.from(salt)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Key preview for UI display
    const keyPreview = `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}`;

    // Expiry date
    const expiryDays = expires_in_days ?? DEFAULT_KEY_EXPIRY_DAYS;
    const expiresAt = new Date(
        Date.now() + expiryDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Default permissions
    const keyPermissions = permissions ?? {
        "documents:create": true,
        "documents:read": true,
        "documents:revoke": true,
        "stats:read": true,
    };

    // Store in database (hash:salt format)
    const { error: insertError } = await supabase.from("api_keys").insert({
        key_id: keyId,
        institution_id: context.institutionId,
        created_by: context.apiKeyId,
        key_hash: `${keyHash}:${saltHex}`,
        key_preview: keyPreview,
        permissions: keyPermissions,
        name: name ?? `API Key - ${environment}`,
        environment,
        expires_at: expiresAt,
        status: "active",
    });

    if (insertError) {
        console.error("Failed to insert API key:", insertError);
        return errorResponse("INTERNAL_ERROR", "Failed to create API key", 500);
    }

    // Return the key — SHOW ONLY ONCE
    return new Response(
        JSON.stringify({
            status: "success",
            data: {
                key_id: keyId,
                api_key: apiKey, // Show only once, never stored
                key_preview: keyPreview,
                environment,
                permissions: keyPermissions,
                expires_at: expiresAt,
            },
            meta: {
                request_id: `req_${crypto.randomUUID().slice(0, 12)}`,
                response_time_ms: 0,
                warning:
                    "Save this API key now. It will not be shown again.",
            },
        }),
        {
            status: 201,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders(),
            },
        }
    );
}

/**
 * GET /auth/keys
 * List all API keys for the authenticated institution.
 */
async function listApiKeys(req: Request): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    const supabase = getSupabaseAdmin();
    const { data: keys, error } = await supabase
        .from("api_keys")
        .select(
            "key_id, key_preview, name, environment, status, created_at, expires_at, last_used_at"
        )
        .eq("institution_id", context.institutionId)
        .order("created_at", { ascending: false });

    if (error) {
        return errorResponse("INTERNAL_ERROR", "Failed to list API keys", 500);
    }

    return successResponse(keys);
}

/**
 * DELETE /auth/keys/:keyId
 * Revoke an API key.
 */
async function revokeApiKey(
    req: Request,
    keyId: string
): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    if (!hasPermission(context, "keys:revoke") && !hasPermission(context, "keys:create")) {
        return errorResponse(
            "FORBIDDEN",
            "You do not have permission to revoke API keys",
            403
        );
    }

    const supabase = getSupabaseAdmin();

    // Ensure the key belongs to the same institution
    const { data: existingKey, error: findError } = await supabase
        .from("api_keys")
        .select("id, institution_id")
        .eq("key_id", keyId)
        .single();

    if (findError || !existingKey) {
        return errorResponse("NOT_FOUND", "API key not found", 404);
    }

    if (existingKey.institution_id !== context.institutionId) {
        return errorResponse(
            "FORBIDDEN",
            "You can only revoke keys belonging to your institution",
            403
        );
    }

    // Parse optional reason from body
    let reason = "Revoked by administrator";
    try {
        const body = await req.json();
        if (body.reason) reason = body.reason;
    } catch {
        // No body is fine
    }

    const { error: updateError } = await supabase
        .from("api_keys")
        .update({
            status: "revoked",
            revoked_at: new Date().toISOString(),
            revoked_reason: reason,
            revoked_by: context.apiKeyId,
        })
        .eq("id", existingKey.id);

    if (updateError) {
        return errorResponse("INTERNAL_ERROR", "Failed to revoke API key", 500);
    }

    return successResponse({ key_id: keyId, status: "revoked" });
}

/**
 * POST /auth/keys/validate
 * Validate an API key and return its associated institution context.
 * Used internally by other services to verify requests.
 */
async function validateApiKey(req: Request): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    return successResponse({
        valid: true,
        institution_id: context.institutionId,
        key_id: context.keyId,
        permissions: context.permissions,
        environment: context.environment,
    });
}

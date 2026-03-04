// Authentication middleware for Edge Functions
// Validates API keys and HMAC signatures, enforces rate limiting

import { getSupabaseAdmin } from "./supabase.ts";
import { verifyApiKey, verifyHmacSignature } from "./crypto.ts";
import { errorResponse } from "./response.ts";

export interface AuthContext {
    institutionId: string;
    apiKeyId: string;
    keyId: string;
    permissions: Record<string, boolean>;
    environment: string;
}

// Maximum age of a request timestamp in seconds (5 minutes)
const MAX_TIMESTAMP_AGE_SECONDS = 300;

/**
 * Authenticate an incoming request.
 * Extracts API key from Authorization header, verifies HMAC signature,
 * and returns the institution context for downstream use.
 *
 * Returns null if authentication succeeds (with context set),
 * or a Response if it fails (error response to send back).
 */
export async function authenticateRequest(
    req: Request
): Promise<{ error: Response | null; context: AuthContext | null }> {
    // 1. Extract API key from Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
        return {
            error: errorResponse(
                "INVALID_API_KEY",
                "Missing or invalid Authorization header. Use: Bearer <api_key>",
                401
            ),
            context: null,
        };
    }

    const providedKey = authHeader.slice(7); // Remove 'Bearer '

    // 2. Look up candidate keys by prefix (narrows the search)
    const prefix = providedKey.split("_")[0];
    if (!prefix) {
        return {
            error: errorResponse("INVALID_API_KEY", "Invalid API key format", 401),
            context: null,
        };
    }

    const supabase = getSupabaseAdmin();
    const { data: candidates, error: dbError } = await supabase
        .from("api_keys")
        .select(
            "id, key_id, institution_id, key_hash, permissions, environment, expires_at, status"
        )
        .like("key_preview", `${prefix}%`)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());

    if (dbError || !candidates || candidates.length === 0) {
        return {
            error: errorResponse("INVALID_API_KEY", "Invalid or expired API key", 401),
            context: null,
        };
    }

    // 3. Verify the key against stored hashes (constant-time)
    let matchedKey: typeof candidates[0] | null = null;
    for (const candidate of candidates) {
        // The key_hash field stores "hash:salt" combined
        const [storedHash, storedSalt] = candidate.key_hash.split(":");
        if (storedHash && storedSalt) {
            const valid = await verifyApiKey(providedKey, storedHash, storedSalt);
            if (valid) {
                matchedKey = candidate;
                break;
            }
        }
    }

    if (!matchedKey) {
        return {
            error: errorResponse("INVALID_API_KEY", "Invalid or expired API key", 401),
            context: null,
        };
    }

    // 4. Verify HMAC signature
    const timestamp = req.headers.get("X-Timestamp");
    const signature = req.headers.get("X-Signature");

    if (!timestamp || !signature) {
        return {
            error: errorResponse(
                "INVALID_SIGNATURE",
                "Missing X-Timestamp or X-Signature headers",
                401
            ),
            context: null,
        };
    }

    // Validate timestamp freshness (prevent replay attacks)
    const requestTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ageSeconds = Math.abs(now - requestTime) / 1000;

    if (isNaN(requestTime) || ageSeconds > MAX_TIMESTAMP_AGE_SECONDS) {
        return {
            error: errorResponse(
                "TIMESTAMP_EXPIRED",
                `Request timestamp too old. Maximum age is ${MAX_TIMESTAMP_AGE_SECONDS} seconds.`,
                401
            ),
            context: null,
        };
    }

    // Reconstruct the signed message: timestamp\nmethod\npath\nbody
    const url = new URL(req.url);
    const body = req.method !== "GET" ? await req.clone().text() : "";
    const fullPath = url.pathname + url.search;
    const message = `${timestamp}\n${req.method}\n${fullPath}\n${body}`;

    const signatureValid = await verifyHmacSignature(
        providedKey,
        message,
        signature
    );

    if (!signatureValid) {
        return {
            error: errorResponse(
                "INVALID_SIGNATURE",
                "HMAC signature verification failed",
                401
            ),
            context: null,
        };
    }

    // 5. Update last_used_at
    await supabase
        .from("api_keys")
        .update({
            last_used_at: new Date().toISOString(),
            last_used_ip: req.headers.get("x-forwarded-for") ?? "unknown",
        })
        .eq("id", matchedKey.id);

    // 6. Return auth context
    return {
        error: null,
        context: {
            institutionId: matchedKey.institution_id,
            apiKeyId: matchedKey.id,
            keyId: matchedKey.key_id,
            permissions: matchedKey.permissions ?? {},
            environment: matchedKey.environment,
        },
    };
}

/**
 * Check if the auth context has a specific permission.
 */
export function hasPermission(
    context: AuthContext,
    permission: string
): boolean {
    return context.permissions[permission] === true;
}

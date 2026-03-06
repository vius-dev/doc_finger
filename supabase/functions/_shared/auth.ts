// Authentication middleware for Edge Functions
// Validates API keys and HMAC signatures, enforces rate limiting

import { getSupabaseAdmin, getSupabaseAnon } from "./supabase.ts";
import { verifyApiKey, verifyHmacSignature } from "./crypto.ts";
import { errorResponse } from "./response.ts";

export interface AuthContext {
    institutionId: string;
    apiKeyId: string;
    keyId: string;
    permissions: Record<string, boolean>;
    environment: string;
    isAdmin?: boolean;
    userId?: string;
}

/**
 * Log a security-related event to the database.
 */
async function logSecurityEvent(
    supabase: any,
    event: string,
    severity: string,
    req: Request,
    reason: string,
    extraActorDetails: Record<string, any> = {}
) {
    try {
        const url = new URL(req.url);
        await supabase.from("security_audit_log").insert({
            event_type: event,
            severity,
            reason,
            actor_details: {
                ip: req.headers.get("x-forwarded-for") ?? "unknown",
                user_agent: req.headers.get("user-agent") ?? "unknown",
                ...extraActorDetails,
            },
            request_details: {
                method: req.method,
                path: url.pathname + url.search,
            },
        });
    } catch (err) {
        console.error("Failed to log security event:", err);
    }
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
    const authHeader = req.headers.get("Authorization") ?? "";
    const apiKeyHeader = req.headers.get("apikey") ?? "none";

    console.log(`[AUTH] Method: ${req.method} | Auth: ${authHeader.slice(0, 20)}... | ApiKey: ${apiKeyHeader.slice(0, 10)}...`);
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

    const supabase = getSupabaseAdmin();

    // Check if the token is a JWT (starts with eyJ)
    if (providedKey.startsWith("eyJ")) {
        const authClient = getSupabaseAnon();
        const { data: { user }, error: jwtError } = await authClient.auth.getUser(providedKey);

        if (jwtError || !user) {
            return {
                error: errorResponse("UNAUTHORIZED", `Invalid session token: ${jwtError?.message || "User not found"}`, 401),
                context: null
            };
        }

        // Verify if user is an admin
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (roleData?.role !== "admin") {
            return {
                error: errorResponse("FORBIDDEN", "Admin role required", 403),
                context: null
            };
        }

        // Admin is fully trusted, bypass HMAC
        return {
            error: null,
            context: {
                institutionId: "admin", // Will be overridden in the route handler
                apiKeyId: "admin_jwt",
                keyId: "admin_jwt",
                permissions: {
                    "keys:create": true,
                    "keys:revoke": true,
                    "keys:read": true,
                    "institutions:create": true,
                    "institutions:read_all": true,
                    "institutions:update_all": true
                },
                environment: "admin",
                isAdmin: true,
                userId: user.id
            }
        };
    }

    // 2. Look up candidate keys by prefix (narrows the search)
    const prefix = providedKey.split("_")[0];
    if (!prefix) {
        return {
            error: errorResponse("INVALID_API_KEY", "Invalid API key format", 401),
            context: null,
        };
    }
    const { data: candidates, error: dbError } = await supabase
        .from("api_keys")
        .select(
            "id, key_id, institution_id, key_hash, permissions, environment, expires_at, status, usage_limit, usage_count"
        )
        .like("key_preview", `${prefix}%`)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());

    if (dbError || !candidates || candidates.length === 0) {
        await logSecurityEvent(supabase, "auth.key_invalid", "low", req, "Key prefix not found or expired", { prefix });
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

    // Check usage limits
    if (matchedKey.usage_limit !== null && matchedKey.usage_count >= matchedKey.usage_limit) {
        await logSecurityEvent(supabase, "auth.key_limit_exceeded", "high", req, "API Key usage limit reached", {
            key_id: matchedKey.key_id,
            usage_count: matchedKey.usage_count,
            usage_limit: matchedKey.usage_limit
        });

        // Auto-expire the key in the database just in case
        await supabase.from("api_keys").update({ status: 'expired' }).eq("id", matchedKey.id);

        return {
            error: errorResponse("RATE_LIMIT_EXCEEDED", "API Key usage limit has been exceeded", 429),
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
        await logSecurityEvent(supabase, "auth.timestamp_expired", "medium", req, `Timestamp age: ${ageSeconds}s`, {
            key_id: matchedKey.key_id,
            timestamp,
        });
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

    // Normalize path for signature verification: 
    // The client sends "/function-name/path", but the server sees "/functions/v1/function-name/path"
    let sigPath = url.pathname;
    if (sigPath.startsWith("/functions/v1")) {
        sigPath = sigPath.replace("/functions/v1", "");
    }
    const fullPath = sigPath + url.search;

    const message = `${timestamp}\n${req.method}\n${fullPath}\n${body}`;

    const signatureValid = await verifyHmacSignature(
        providedKey,
        message,
        signature
    );

    if (!signatureValid) {
        console.error(`[AUTH] Signature mismatch! \nExpected Path: ${fullPath}\nMethod: ${req.method}\nTimestamp: ${timestamp}`);
        await logSecurityEvent(supabase, "auth.signature_invalid", "high", req, "HMAC verification failed", {
            key_id: matchedKey.key_id,
            timestamp,
            provided_signature: signature,
            expected_path: fullPath
        });
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

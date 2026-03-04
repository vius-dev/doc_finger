// Shared security headers + CORS + helpers for all Edge Functions
// Phase 7 hardening: X-Content-Type-Options, HSTS, X-Frame-Options, CSP

/** Standard security + CORS headers for every response. */
export const securityHeaders: Record<string, string> = {
    // CORS
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-timestamp, x-signature, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",

    // Security hardening (Phase 7 pen-test fixes)
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",

    // Content
    "Content-Type": "application/json",
};

/** Convenience: return a JSON response with security headers. */
export function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...securityHeaders },
    });
}

/** Convenience: return an error JSON response. */
export function errorResponse(
    message: string,
    code: string,
    status: number
): Response {
    return jsonResponse({ status: "error", error: { message, code } }, status);
}

/** Handle OPTIONS pre-flight. */
export function handleCors(req: Request): Response | null {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: securityHeaders });
    }
    return null;
}

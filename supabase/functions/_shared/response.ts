// Standardized API response format for the Document Fingerprint API
// Matches the canonical response format from the Master Prompt

export interface ApiResponse<T = unknown> {
    status: "success" | "error";
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        documentation_url?: string;
    };
    meta?: {
        request_id: string;
        response_time_ms: number;
        pagination?: {
            cursor?: string;
            has_more: boolean;
            total?: number;
        };
    };
}

/**
 * Create a success response with the canonical format.
 */
export function successResponse<T>(
    data: T,
    meta?: Partial<ApiResponse["meta"]>,
    status = 200
): Response {
    const requestId = crypto.randomUUID().slice(0, 12);
    const body: ApiResponse<T> = {
        status: "success",
        data,
        meta: {
            request_id: `req_${requestId}`,
            response_time_ms: 0,
            ...meta,
        },
    };

    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "X-Request-Id": `req_${requestId}`,
            ...corsHeaders(),
        },
    });
}

/**
 * Create an error response with the canonical format.
 */
export function errorResponse(
    code: string,
    message: string,
    status = 400,
    details?: Record<string, unknown>,
    extraHeaders?: Record<string, string>
): Response {
    const requestId = crypto.randomUUID().slice(0, 12);
    const body: ApiResponse = {
        status: "error",
        error: {
            code,
            message,
            details,
            documentation_url: `https://docs.docfingerprint.com/errors#${code.toLowerCase().replace(/_/g, "-")}`,
        },
        meta: {
            request_id: `req_${requestId}`,
            response_time_ms: 0,
        },
    };

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Request-Id": `req_${requestId}`,
        ...corsHeaders(),
        ...extraHeaders,
    };

    return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Standard CORS headers for all responses.
 */
export function corsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
            "authorization, apikey, x-timestamp, x-signature, x-idempotency-key, content-type",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    };
}

/**
 * Handle CORS preflight requests.
 */
export function handleCors(req: Request): Response | null {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders() });
    }
    return null;
}

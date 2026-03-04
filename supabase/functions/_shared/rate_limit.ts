// Simple in-memory rate limiter for Edge Functions
// Phase 7: Multi-layer rate limiting

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean expired entries every 60s
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 60_000);

export interface RateLimitOptions {
    /** Max requests allowed in the window. Default: 60 */
    maxRequests?: number;
    /** Window duration in seconds. Default: 60 */
    windowSeconds?: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * Check whether the given key should be rate-limited.
 *
 * ```ts
 * const result = checkRateLimit(`key:${apiKey}`, { maxRequests: 100 });
 * if (!result.allowed) return errorResponse("Rate limit exceeded", "RATE_LIMIT", 429);
 * ```
 */
export function checkRateLimit(
    key: string,
    opts: RateLimitOptions = {}
): RateLimitResult {
    const maxRequests = opts.maxRequests ?? 60;
    const windowMs = (opts.windowSeconds ?? 60) * 1000;
    const now = Date.now();

    let entry = store.get(key);

    // New window
    if (!entry || now > entry.resetAt) {
        entry = { count: 1, resetAt: now + windowMs };
        store.set(key, entry);
        return { allowed: true, remaining: maxRequests - 1, resetAt: entry.resetAt };
    }

    // Existing window
    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);
    return {
        allowed: entry.count <= maxRequests,
        remaining,
        resetAt: entry.resetAt,
    };
}

// Health-check Edge Function
// Phase 7: Production monitoring endpoint

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const start = Date.now();

    const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

    // 1. Database connectivity
    try {
        const dbStart = Date.now();
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const { error } = await supabase.from("institutions").select("id").limit(1);
        checks.database = {
            status: error ? "unhealthy" : "healthy",
            latency_ms: Date.now() - dbStart,
            ...(error && { error: error.message }),
        };
    } catch (err) {
        checks.database = {
            status: "unhealthy",
            error: err instanceof Error ? err.message : "Unknown error",
        };
    }

    // 2. Runtime health
    checks.runtime = {
        status: "healthy",
        latency_ms: 0,
    };

    // Overall status
    const allHealthy = Object.values(checks).every((c) => c.status === "healthy");
    const totalLatency = Date.now() - start;

    return new Response(
        JSON.stringify({
            status: allHealthy ? "healthy" : "degraded",
            version: "1.0.0",
            uptime_seconds: Math.floor(performance.now() / 1000),
            checks,
            response_time_ms: totalLatency,
            timestamp: new Date().toISOString(),
        }),
        {
            status: allHealthy ? 200 : 503,
            headers: corsHeaders,
        }
    );
});

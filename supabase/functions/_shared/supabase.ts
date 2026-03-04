// Supabase client initialization for Edge Functions
// Uses service_role key to bypass RLS (backend-only access)

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

let _client: SupabaseClient | null = null;

/**
 * Get the Supabase admin client (service_role).
 * This client bypasses RLS and should only be used in Edge Functions.
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (_client) return _client;

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !serviceKey) {
        throw new Error(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
        );
    }

    _client = createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return _client;
}

/**
 * Get a Supabase client scoped to the anon key (respects RLS).
 * Use this for public-facing operations like document verification.
 */
export function getSupabaseAnon(): SupabaseClient {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!url || !anonKey) {
        throw new Error(
            "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables"
        );
    }

    return createClient(url, anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

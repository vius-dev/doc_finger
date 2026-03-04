import { SupabaseClient } from "jsr:@supabase/supabase-js";
import { successResponse } from "./response.ts";

/**
 * Check if an idempotency key exists for this institution.
 * If it does, returns the cached response.
 */
export async function getCachedResponse(
    supabase: SupabaseClient,
    institutionId: string,
    idempotencyKey: string | null
): Promise<Response | null> {
    if (!idempotencyKey) return null;

    const { data, error } = await supabase
        .from("idempotency_keys")
        .select("response_code, response_body")
        .eq("institution_id", institutionId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (error || !data) return null;

    return successResponse(data.response_body, undefined, data.response_code as any);
}

/**
 * Save a response for an idempotency key.
 */
export async function saveIdempotentResponse(
    supabase: SupabaseClient,
    institutionId: string,
    idempotencyKey: string | null,
    code: number,
    body: any
): Promise<void> {
    if (!idempotencyKey) return;

    await supabase.from("idempotency_keys").insert({
        institution_id: institutionId,
        idempotency_key: idempotencyKey,
        response_code: code,
        response_body: body,
    });
}

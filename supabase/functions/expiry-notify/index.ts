// Expiry Notification Edge Function
// Called daily via pg_cron (through pg_net HTTP) or directly
// Queries documents approaching expiry and sends webhook notifications

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { getSupabaseAdmin } from "../_shared/supabase.ts";
import {
    successResponse,
    errorResponse,
    handleCors,
} from "../_shared/response.ts";

Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/expiry-notify/, "");

    try {
        if (req.method === "POST" && (path === "" || path === "/")) {
            return await processExpiryNotifications();
        }

        if (req.method === "GET" && path === "/status") {
            return await getNotificationStatus();
        }

        return errorResponse("NOT_FOUND", "Endpoint not found", 404);
    } catch (err) {
        console.error("Expiry notification error:", err);
        return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
    }
});

/**
 * POST /expiry-notify
 * Process expiry notifications for all institutions.
 * Finds documents expiring within notification schedule windows
 * and queues webhook/email notifications.
 */
async function processExpiryNotifications(): Promise<Response> {
    const supabase = getSupabaseAdmin();
    const notificationsSent: Array<{
        institution_id: string;
        fingerprint_id: string;
        days_remaining: number;
        notification_type: string;
    }> = [];

    // Get all active notification schedule windows
    const { data: rules, error: rulesError } = await supabase
        .from("expiry_rules")
        .select("document_type, notification_days");

    if (rulesError) {
        console.error("Failed to fetch expiry rules:", rulesError);
        return errorResponse("INTERNAL_ERROR", "Failed to fetch expiry rules", 500);
    }

    // Collect all unique notification day thresholds
    const allDays = new Set<number>();
    for (const rule of rules ?? []) {
        for (const day of rule.notification_days ?? []) {
            allDays.add(day);
        }
    }

    const today = new Date();

    for (const daysAhead of allDays) {
        // Calculate the target date
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysAhead);
        const targetDateStr = targetDate.toISOString().split("T")[0];

        // Find documents expiring on this date
        const { data: docs, error: docsError } = await supabase
            .from("documents")
            .select(
                "id, fingerprint_id, institution_id, document_type, recipient_name, expiry_date"
            )
            .eq("status", "active")
            .eq("expiry_date", targetDateStr);

        if (docsError || !docs || docs.length === 0) continue;

        // Group by institution for batch notifications
        const byInstitution = new Map<string, typeof docs>();
        for (const doc of docs) {
            // Verify this document type has this day in its notification schedule
            const rule = rules?.find(
                (r) =>
                    r.document_type === doc.document_type ||
                    r.document_type === "default"
            );
            if (!rule?.notification_days?.includes(daysAhead)) continue;

            const existing = byInstitution.get(doc.institution_id) ?? [];
            existing.push(doc);
            byInstitution.set(doc.institution_id, existing);
        }

        // Send notifications per institution
        for (const [institutionId, institutionDocs] of byInstitution) {
            // Get institution webhook URL
            const { data: institution } = await supabase
                .from("institutions")
                .select("legal_name, technical_email, metadata")
                .eq("id", institutionId)
                .single();

            if (!institution) continue;

            const webhookUrl = institution.metadata?.webhook_url;

            // Prepare notification payload
            const payload = {
                event: "documents.expiring_soon",
                institution: institution.legal_name,
                days_remaining: daysAhead,
                documents: institutionDocs.map((d) => ({
                    fingerprint_id: d.fingerprint_id,
                    document_type: d.document_type,
                    recipient_name: d.recipient_name,
                    expiry_date: d.expiry_date,
                })),
                notification_type:
                    daysAhead <= 1
                        ? "urgent"
                        : daysAhead <= 7
                            ? "warning"
                            : "reminder",
                sent_at: new Date().toISOString(),
            };

            // Send webhook if configured
            if (webhookUrl) {
                try {
                    await fetch(webhookUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                } catch (webhookErr) {
                    console.error(
                        `Webhook delivery failed for ${institutionId}:`,
                        webhookErr
                    );
                }
            }

            // Log notifications
            for (const doc of institutionDocs) {
                notificationsSent.push({
                    institution_id: institutionId,
                    fingerprint_id: doc.fingerprint_id,
                    days_remaining: daysAhead,
                    notification_type: payload.notification_type,
                });
            }

            // Audit log
            await supabase.from("audit_log").insert({
                actor_type: "system",
                actor_id: "expiry_notifier",
                action: "notification.expiry_warning",
                resource_type: "institution",
                resource_id: institutionId,
                new_state_hash: crypto.randomUUID().replace(/-/g, "").slice(0, 64),
                changes_summary: {
                    documents_count: institutionDocs.length,
                    days_remaining: daysAhead,
                    webhook_delivered: !!webhookUrl,
                },
                environment: "production",
            });
        }
    }

    return successResponse({
        notifications_sent: notificationsSent.length,
        details: notificationsSent,
        processed_at: new Date().toISOString(),
    });
}

/**
 * GET /expiry-notify/status
 * Returns a summary of upcoming expirations and notification status.
 */
async function getNotificationStatus(): Promise<Response> {
    const supabase = getSupabaseAdmin();

    // Documents expiring in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: upcoming, count } = await supabase
        .from("documents")
        .select("document_type, expiry_date", { count: "exact" })
        .eq("status", "active")
        .not("expiry_date", "is", null)
        .lte("expiry_date", thirtyDaysFromNow.toISOString().split("T")[0])
        .gte("expiry_date", new Date().toISOString().split("T")[0]);

    // Documents currently in grace period
    const { count: graceCount } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "expired_grace")
        .eq("grace_period_active", true);

    // Recent notification logs
    const { data: recentLogs } = await supabase
        .from("audit_log")
        .select("occurred_at, changes_summary")
        .eq("action", "notification.expiry_warning")
        .order("occurred_at", { ascending: false })
        .limit(10);

    return successResponse({
        upcoming_expirations: count ?? 0,
        in_grace_period: graceCount ?? 0,
        expiring_by_type: summarizeByType(upcoming ?? []),
        recent_notifications: recentLogs ?? [],
    });
}

function summarizeByType(
    docs: Array<{ document_type: string; expiry_date: string }>
): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const doc of docs) {
        summary[doc.document_type] = (summary[doc.document_type] ?? 0) + 1;
    }
    return summary;
}

// Institution Service Edge Function
// Handles institution registration, retrieval, update, and listing

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { getSupabaseAdmin } from "../_shared/supabase.ts";
import {
    successResponse,
    errorResponse,
    handleCors,
} from "../_shared/response.ts";
import { authenticateRequest, hasPermission } from "../_shared/auth.ts";

const VALID_INSTITUTION_TYPES = [
    "university",
    "professional_body",
    "government",
    "corporate",
];
const VALID_STATUSES = ["pending", "active", "suspended", "terminated"];

Deno.serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    // Find the path relative to the function name
    const pathParts = url.pathname.split('/');
    const functionIndex = pathParts.findIndex(p => p === 'institutions');
    const path = '/' + pathParts.slice(functionIndex + 1).filter(Boolean).join('/');

    console.log(`[INSTITUTIONS] Request: ${req.method} ${url.pathname} -> Path: ${path}`);

    try {
        // Debug endpoint
        if (req.method === "GET" && path === "/debug") {
            return successResponse({ message: "Gateway OK - Function reached" });
        }

        // Public endpoints
        if (req.method === "GET" && path.startsWith("/public/")) {
            const code = path.replace("/public/", "");
            return await getPublicInstitution(code);
        }
        if (req.method === "POST" && path === "/public/apply") {
            return await applyInstitution(req);
        }
        // Document Template Endpoints (Must come before dynamic ID routes)
        if (path === "/templates") {
            if (req.method === "GET") return await listTemplates(req);
            if (req.method === "POST") return await createTemplate(req);
        }
        if (path.startsWith("/templates/")) {
            const id = path.replace("/templates/", "");
            if (req.method === "GET") return await getTemplate(req, id);
            if (req.method === "PATCH") return await updateTemplate(req, id);
            if (req.method === "DELETE") return await deleteTemplate(req, id);
        }

        // Institution CRUD
        if (req.method === "GET" && path && path !== "/") {
            const id = path.replace("/", "");
            return await getInstitution(req, id);
        }
        if (req.method === "GET" && (path === "" || path === "/")) {
            return await listInstitutions(req);
        }
        if (req.method === "POST" && (path === "" || path === "/")) {
            return await createInstitution(req);
        }
        if (req.method === "PATCH" && path && path !== "/") {
            const id = path.replace("/", "");
            return await updateInstitution(req, id);
        }

        return errorResponse("NOT_FOUND", "Endpoint not found", 404);
    } catch (err) {
        console.error("Institution service error:", err);
        return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
    }
});

/**
 * GET /institutions/public/:code
 * Public endpoint — no auth required.
 * Returns limited institution info for verification display.
 */
async function getPublicInstitution(code: string): Promise<Response> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("institutions")
        .select(
            "institution_code, legal_name, trading_name, institution_type, country_code, verification_level, status"
        )
        .eq("institution_code", code.toUpperCase())
        .eq("status", "active")
        .single();

    if (error || !data) {
        return errorResponse("NOT_FOUND", "Institution not found", 404);
    }

    return successResponse(data);
}

/**
 * POST /institutions
 * Register a new institution.
 */
async function createInstitution(req: Request): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    if (!hasPermission(context, "institutions:create")) {
        return errorResponse(
            "FORBIDDEN",
            "You do not have permission to create institutions",
            403
        );
    }

    const body = await req.json();

    // Validate required fields
    const requiredFields = [
        "institution_code",
        "legal_name",
        "institution_type",
        "country_code",
        "primary_email",
    ];
    for (const field of requiredFields) {
        if (!body[field]) {
            return errorResponse(
                "VALIDATION_ERROR",
                `Missing required field: ${field}`,
                400,
                { field }
            );
        }
    }

    if (!VALID_INSTITUTION_TYPES.includes(body.institution_type)) {
        return errorResponse(
            "VALIDATION_ERROR",
            `Invalid institution_type. Must be one of: ${VALID_INSTITUTION_TYPES.join(", ")}`,
            400,
            { field: "institution_type" }
        );
    }

    // Handle creator ID (must be a valid UUID or null)
    const isUuid = (id?: string) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const creatorId = isUuid(context.userId) ? context.userId : (isUuid(context.apiKeyId) ? context.apiKeyId : null);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("institutions")
        .insert({
            institution_code: body.institution_code.toUpperCase(),
            legal_name: body.legal_name,
            trading_name: body.trading_name ?? null,
            institution_type: body.institution_type,
            country_code: body.country_code.toUpperCase(),
            registration_number: body.registration_number ?? null,
            primary_email: body.primary_email,
            technical_email: body.technical_email ?? null,
            billing_email: body.billing_email ?? null,
            phone_number: body.phone_number ?? null,
            website: body.website ?? null,
            physical_address: body.physical_address ?? null,
            postal_address: body.postal_address ?? null,
            allowed_document_types: body.allowed_document_types ?? [],
            billing_plan: body.billing_plan ?? "free",
            status: "pending",
            created_by: creatorId,
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return errorResponse(
                "DUPLICATE_ENTRY",
                "An institution with this code already exists",
                409
            );
        }
        console.error("Failed to create institution:", error);
        return errorResponse("INTERNAL_ERROR", `Failed to create institution: ${error.message} (${error.code})`, 500);
    }

    return successResponse(data, undefined, 201);
}

/**
 * GET /institutions/:id
 * Get institution details.
 */
async function getInstitution(
    req: Request,
    id: string
): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    const supabase = getSupabaseAdmin();

    // Allow fetching by UUID or institution_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
    const query = supabase.from("institutions").select("*");

    if (isUuid) {
        query.eq("id", id);
    } else {
        query.eq("institution_code", id.toUpperCase());
    }

    const { data, error } = await query.single();

    if (error || !data) {
        return errorResponse("NOT_FOUND", "Institution not found", 404);
    }

    // Non-admin users can only see their own institution
    if (data.id !== context.institutionId) {
        if (!hasPermission(context, "institutions:read_all")) {
            return errorResponse(
                "FORBIDDEN",
                "You can only view your own institution",
                403
            );
        }
    }

    return successResponse(data);
}

/**
 * GET /institutions
 * List institutions (admin only, or returns own institution).
 */
async function listInstitutions(req: Request): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const limit = parseInt(url.searchParams.get("limit") ?? "50");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    let query = supabase
        .from("institutions")
        .select(
            "id, institution_code, legal_name, trading_name, institution_type, country_code, verification_level, status, created_at",
            { count: "exact" }
        );

    // Non-admin users only see their own institution
    if (!hasPermission(context, "institutions:read_all")) {
        query = query.eq("id", context.institutionId);
    }

    if (status && VALID_STATUSES.includes(status)) {
        query = query.eq("status", status);
    }
    if (type && VALID_INSTITUTION_TYPES.includes(type)) {
        query = query.eq("institution_type", type);
    }

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return errorResponse("INTERNAL_ERROR", "Failed to list institutions", 500);
    }

    return successResponse(data, {
        request_id: `req_${crypto.randomUUID().slice(0, 12)}`,
        response_time_ms: 0,
        pagination: {
            has_more: (count ?? 0) > offset + limit,
            total: count ?? 0,
        },
    });
}

/**
 * PATCH /institutions/:id
 * Update institution details.
 */
async function updateInstitution(
    req: Request,
    id: string
): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    if (!hasPermission(context, "institutions:update")) {
        return errorResponse(
            "FORBIDDEN",
            "You do not have permission to update institutions",
            403
        );
    }

    const supabase = getSupabaseAdmin();

    // Verify institution exists and belongs to caller
    const { data: existing, error: findError } = await supabase
        .from("institutions")
        .select("id")
        .eq("id", id)
        .single();

    if (findError || !existing) {
        return errorResponse("NOT_FOUND", "Institution not found", 404);
    }

    if (existing.id !== context.institutionId) {
        if (!hasPermission(context, "institutions:update_all")) {
            return errorResponse(
                "FORBIDDEN",
                "You can only update your own institution",
                403
            );
        }
    }

    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields = [
        "legal_name",
        "trading_name",
        "primary_email",
        "technical_email",
        "billing_email",
        "phone_number",
        "website",
        "physical_address",
        "postal_address",
        "allowed_document_types",
        "custom_document_types",
        "metadata",
        "tags",
    ];

    const isUuid = (id?: string) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const updaterId = isUuid(context.userId) ? context.userId : (isUuid(context.apiKeyId) ? context.apiKeyId : null);

    const updates: Record<string, unknown> = { updated_by: updaterId };
    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updates[field] = body[field];
        }
    }

    const { data, error } = await supabase
        .from("institutions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Failed to update institution:", error);
        return errorResponse("INTERNAL_ERROR", "Failed to update institution", 500);
    }

    return successResponse(data);
}

/**
 * POST /institutions/public/apply
 * Public self-registration (application) endpoint.
 */
async function applyInstitution(req: Request): Promise<Response> {
    const body = await req.json();

    // Validate required fields
    const requiredFields = [
        "institution_code",
        "legal_name",
        "institution_type",
        "country_code",
        "primary_email",
    ];
    for (const field of requiredFields) {
        if (!body[field]) {
            return errorResponse(
                "VALIDATION_ERROR",
                `Missing required field: ${field}`,
                400,
                { field }
            );
        }
    }

    if (!VALID_INSTITUTION_TYPES.includes(body.institution_type)) {
        return errorResponse(
            "VALIDATION_ERROR",
            `Invalid institution_type. Must be one of: ${VALID_INSTITUTION_TYPES.join(", ")}`,
            400,
            { field: "institution_type" }
        );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("institutions")
        .insert({
            institution_code: body.institution_code.toUpperCase(),
            legal_name: body.legal_name,
            trading_name: body.trading_name ?? null,
            institution_type: body.institution_type,
            country_code: body.country_code.toUpperCase(),
            registration_number: body.registration_number ?? null,
            primary_email: body.primary_email,
            website: body.website ?? null,
            billing_plan: body.billing_plan ?? "free",
            status: "pending",
            // Public applications don't have a creator ID or update signature
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return errorResponse(
                "DUPLICATE_ENTRY",
                "An institution with this code already exists",
                409
            );
        }
        console.error("Failed to process application:", error);
        return errorResponse("INTERNAL_ERROR", "Failed to process application", 500);
    }

    return successResponse(
        {
            id: data.id,
            institution_code: data.institution_code,
            status: data.status
        },
        undefined,
        201
    );
}

// ============ Document Templates ============

async function listTemplates(req: Request): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("institution_id", context.institutionId)
        .order("created_at", { ascending: false });

    if (error) return errorResponse("INTERNAL_ERROR", "Failed to list templates", 500);
    return successResponse(data);
}

async function createTemplate(req: Request): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    const body = await req.json();
    if (!body.name || !body.document_type) {
        return errorResponse("VALIDATION_ERROR", "Name and document_type are required", 400);
    }

    const isUuid = (id?: string) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const creatorId = isUuid(context.userId) ? context.userId : (isUuid(context.apiKeyId) ? context.apiKeyId : null);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("document_templates")
        .insert({
            institution_id: context.institutionId,
            name: body.name,
            description: body.description,
            document_type: body.document_type,
            document_subtype: body.document_subtype,
            metadata_schema: body.metadata_schema ?? [],
            nomenclature_config: body.nomenclature_config ?? {},
            default_expiry_days: body.default_expiry_days,
            grace_period_days: body.grace_period_days,
            theme_config: body.theme_config ?? {},
            created_by: creatorId,
        })
        .select()
        .single();

    if (error) return errorResponse("INTERNAL_ERROR", "Failed to create template", 500);
    return successResponse(data, undefined, 201);
}

async function getTemplate(req: Request, id: string): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", id)
        .eq("institution_id", context.institutionId)
        .single();

    if (error || !data) return errorResponse("NOT_FOUND", "Template not found", 404);
    return successResponse(data);
}

async function updateTemplate(req: Request, id: string): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("document_templates")
        .update({
            ...body,
            institution_id: context.institutionId, // Ensure it stays locked
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("institution_id", context.institutionId)
        .select()
        .single();

    if (error) return errorResponse("INTERNAL_ERROR", "Failed to update template", 500);
    return successResponse(data);
}

async function deleteTemplate(req: Request, id: string): Promise<Response> {
    const { error: authError, context } = await authenticateRequest(req);
    if (authError || !context) return authError!;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", id)
        .eq("institution_id", context.institutionId);

    if (error) return errorResponse("INTERNAL_ERROR", "Failed to delete template", 500);
    return successResponse({ deleted: true });
}

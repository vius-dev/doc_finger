// API Client — connects to Supabase Edge Functions
// This is the data access layer; no UI or business logic here

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tzulhmrmscedulpldvnk.supabase.co';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

let _apiKey: string | null = null;

export function setApiKey(key: string | null) {
    _apiKey = key;
    if (key) {
        localStorage.setItem('df_api_key', key);
    } else {
        localStorage.removeItem('df_api_key');
    }
}

export function getApiKey(): string | null {
    if (_apiKey) return _apiKey;
    _apiKey = localStorage.getItem('df_api_key');
    return _apiKey;
}

async function generateHmacSignature(apiKey: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(apiKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function request<T>(
    functionName: string,
    path: string,
    options: {
        method?: string;
        body?: unknown;
        auth?: boolean;
    } = {}
): Promise<T> {
    const { method = 'GET', body, auth = true } = options;
    const apiKey = getApiKey();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const messagePath = `/${functionName}${path}`;

    if (auth && apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        const timestamp = new Date().toISOString();
        headers['X-Timestamp'] = timestamp;

        const bodyStr = body ? JSON.stringify(body) : '';
        const message = `${timestamp}\n${method}\n${messagePath}\n${method !== 'GET' ? bodyStr : ''}`;
        headers['X-Signature'] = await generateHmacSignature(apiKey, message);
    }

    const url = `${FUNCTIONS_URL}${messagePath}`;
    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok || data.status === 'error') {
        throw new ApiError(
            data.error?.message || 'Request failed',
            data.error?.code || 'UNKNOWN',
            res.status
        );
    }

    return data.data as T;
}

export class ApiError extends Error {
    code: string;
    status: number;

    constructor(message: string, code: string, status: number) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// ============ Auth ============

export async function validateKey(): Promise<{
    valid: boolean;
    institution_id: string;
    key_id: string;
    permissions: Record<string, boolean>;
    environment: string;
}> {
    return request('auth', '/keys/validate', { method: 'POST', body: {} });
}

// ============ Documents ============

export interface Document {
    id: string;
    fingerprint_id: string;
    document_type: string;
    document_subtype?: string;
    document_number?: string;
    recipient_name: string;
    issue_date: string;
    expiry_date: string;
    status: string;
    created_at: string;
}

export interface DocumentDetail extends Document {
    sha256_hash: string;
    institution_id: string;
    issuing_department?: string;
    document_metadata: Record<string, unknown>;
    public_display?: Record<string, unknown>;
    grace_period_active?: boolean;
    grace_period_end?: string;
}

export async function getDocuments(params?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
}): Promise<Document[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return request('documents', `/${qs ? '?' + qs : ''}`);
}

export async function getDocument(id: string): Promise<DocumentDetail> {
    return request('documents', `/${id}`);
}

export async function registerDocument(body: {
    recipient_name: string;
    document_type: string;
    issue_date?: string;
    document_number?: string;
    expiry_date?: string;
    recipient_email?: string;
    recipient_phone?: string;
    recipient_id_type?: string;
    recipient_id_value?: string;
    metadata?: Record<string, unknown>;
}): Promise<{
    fingerprint_id: string;
    sha256_hash: string;
    status: string;
    expiry_date: string;
    verification_url: string;
}> {
    return request('documents', '/', { method: 'POST', body });
}

export async function revokeDocument(id: string, reason?: string): Promise<void> {
    return request('documents', `/${id}`, {
        method: 'DELETE',
        body: reason ? { reason } : undefined,
    });
}

// ============ Verification (public, no auth) ============

export interface VerificationResult {
    verified: boolean;
    fingerprint_id: string;
    status: string;
    status_message: string;
    document?: {
        type: string;
        subtype?: string;
        recipient_name: string;
        issue_date: string;
        expiry_date: string;
    };
    issuer?: {
        code: string;
        name: string;
        trading_name?: string;
        type: string;
        country: string;
        verification_level: number;
    };
    checked_at: string;
    response_time_ms: number;
}

export async function verifyDocument(fingerprintId: string): Promise<VerificationResult> {
    return request('verify', `/${fingerprintId}`, { auth: false });
}

// ============ API Keys ============

export interface ApiKey {
    key_id: string;
    key_preview: string;
    name: string;
    environment: string;
    status: string;
    created_at: string;
    expires_at: string;
    last_used_at?: string;
}

export async function listApiKeys(): Promise<ApiKey[]> {
    return request('auth', '/keys');
}

export async function revokeApiKey(keyId: string): Promise<void> {
    return request('auth', `/keys/${keyId}`, { method: 'DELETE' });
}

// ============ Institutions ============

export interface Institution {
    id: string;
    institution_code: string;
    legal_name: string;
    trading_name?: string;
    institution_type: string;
    country_code: string;
    registration_number?: string;
    verification_level: number;
    status: string;
    primary_email: string;
    technical_email?: string;
    billing_email?: string;
    phone_number?: string;
    website?: string;
    physical_address?: string;
    postal_address?: string;
    allowed_document_types: string[];
    custom_document_types?: Record<string, any>;
    monthly_document_quota?: number;
    annual_document_quota?: number;
    current_month_usage: number;
    billing_plan: string;
    billing_status?: string;
    metadata?: Record<string, any>;
}

export async function getInstitution(id: string): Promise<Institution> {
    return request('institutions', `/${id}`);
}

export async function updateInstitution(
    id: string,
    body: Partial<Institution>
): Promise<Institution> {
    return request('institutions', `/${id}`, { method: 'PATCH', body });
}

export async function applyInstitution(body: {
    legal_name: string;
    institution_code: string;
    institution_type: string;
    country_code: string;
    primary_email: string;
    website?: string;
    trading_name?: string;
    registration_number?: string;
}): Promise<{ id: string; institution_code: string; status: string }> {
    return request('institutions', '/public/apply', { method: 'POST', body, auth: false });
}

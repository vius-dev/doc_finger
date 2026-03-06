import { supabase } from './supabase';

export interface Institution {
    id: string;
    institution_code: string;
    legal_name: string;
    institution_type: 'university' | 'professional_body' | 'government' | 'corporate';
    country_code: string;
    status: 'pending' | 'active' | 'suspended' | 'terminated';
    verification_level: number;
    verified_at?: string;
    created_at: string;
    primary_email: string;
    current_month_usage?: number;
    annual_document_quota?: number;
}

export interface ApiKey {
    id: string;
    key_id: string;
    key_preview: string;
    name: string;
    environment: 'test' | 'production';
    status: 'active' | 'revoked' | 'expired';
    created_at: string;
    last_used_at: string | null;
    expires_at: string;
    institution_id: string;
    institutions?: {
        legal_name: string;
        institution_code: string;
    };
    usage_limit: number | null;
    usage_count: number;
}

export interface DashboardStats {
    totalInstitutions: number;
    activeDocuments: number;
    totalVerifications: number;
    systemGrowth: number;
}

const getBaseUrl = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) throw new Error("VITE_SUPABASE_URL is not defined");
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

const handleResponse = async (response: Response) => {
    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    } catch (e) {
        throw new Error(`Server returned non-JSON (${response.status}): ${text.slice(0, 100)}`);
    }

    if (!response.ok || result.status === 'error') {
        const message = result.error?.message || result.message || `Request failed (${response.status})`;

        // Handle 401 Unauthorized globally for admin
        if (response.status === 401 || message.includes("JWT") || message.includes("session")) {
            await supabase.auth.signOut();
            window.location.href = '/login';
            throw new Error("Session expired. Please log in again.");
        }

        throw new Error(message);
    }

    return result.data;
};

async function adminFetch(path: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active admin session. Please sign in again.");

    const url = `${getBaseUrl()}/functions/v1${path}`;

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${session.access_token}`);
    headers.set('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    return handleResponse(response);
}

export const adminService = {
    // Authentication
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Institutions
    async fetchInstitutions() {
        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Institution[];
    },

    async getInstitutionExtended(id: string) {
        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Fetch additional counts
        const [docs, verifications] = await Promise.all([
            supabase.from('documents').select('id', { count: 'exact', head: true }).eq('institution_id', id),
            supabase.from('verification_log').select('id', { count: 'exact', head: true }).eq('institution_id', id)
        ]);

        return {
            ...data,
            document_count: docs.count || 0,
            verification_count: verifications.count || 0
        } as Institution & { document_count: number; verification_count: number };
    },

    async updateInstitutionStatus(id: string, status: Institution['status']) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('institutions')
            .update({
                status,
                updated_by: user?.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Institution;
    },

    async verifyInstitution(id: string, level: number) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('institutions')
            .update({
                verification_level: level,
                verified_at: new Date().toISOString(),
                verified_by: user?.id,
                updated_by: user?.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Institution;
    },

    async createInstitution(body: {
        legal_name: string;
        institution_code: string;
        institution_type: string;
        country_code: string;
        primary_email: string;
        trading_name?: string;
        registration_number?: string;
        website?: string;
    }) {
        return adminFetch('/institutions/', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    // API Keys
    async fetchAllKeys() {
        const { data, error } = await supabase
            .from('api_keys')
            .select(`
                *,
                institutions (
                    legal_name,
                    institution_code
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ApiKey[];
    },

    async fetchInstitutionKeys(institutionId: string) {
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('institution_id', institutionId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ApiKey[];
    },

    async generateKey(institutionId: string, name: string, environment: 'test' | 'production', expiresInDays?: number, usageLimit?: number | null) {
        return adminFetch('/auth/keys', {
            method: 'POST',
            body: JSON.stringify({
                institution_id: institutionId,
                name,
                environment,
                expires_in_days: expiresInDays,
                usage_limit: usageLimit
            })
        });
    },

    async revokeKey(keyId: string, reason: string = 'Revoked by administrator') {
        return adminFetch(`/auth/keys/${keyId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason })
        });
    },

    // Dashboard Stats
    async fetchDashboardStats(): Promise<DashboardStats> {
        // Query multiple tables for stats
        const [institutions, documents, verifications] = await Promise.all([
            supabase.from('institutions').select('id', { count: 'exact', head: true }),
            supabase.from('documents').select('id', { count: 'exact', head: true }),
            supabase.from('verification_log').select('id', { count: 'exact', head: true })
        ]);

        return {
            totalInstitutions: institutions.count || 0,
            activeDocuments: documents.count || 0,
            totalVerifications: verifications.count || 0,
            systemGrowth: 12.5 // Mock value for growth
        };
    },

    async fetchRecentActivity() {
        const { data, error } = await supabase
            .from('audit_log')
            .select('*')
            .order('occurred_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    },

    // Debugging
    async testDebugEndpoint() {
        return adminFetch('/institutions/debug', { method: 'GET' });
    }
};

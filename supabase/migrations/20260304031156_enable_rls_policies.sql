-- ============================================================
-- Enable Row Level Security (RLS) on all public tables
-- ============================================================

-- Core tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Partitioned verification_log partitions
ALTER TABLE public.verification_log_2026_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_log_2026_04 ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- By default, deny all access via the anon/public key.
-- Only the service_role key (used by backend services) bypasses RLS.
-- This ensures that the Publishable (anon) key cannot read or write
-- any data directly — all access must go through authenticated
-- backend services or Edge Functions using the service_role key.

-- Institutions: service_role only (no public access)
CREATE POLICY "Service role full access on institutions"
    ON public.institutions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- API Keys: service_role only (no public access)
CREATE POLICY "Service role full access on api_keys"
    ON public.api_keys
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Documents: service_role only (no public access)
CREATE POLICY "Service role full access on documents"
    ON public.documents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Audit Log: service_role only (no public access)
CREATE POLICY "Service role full access on audit_log"
    ON public.audit_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Verification Log Partitions: service_role only
CREATE POLICY "Service role full access on verification_log_2026_03"
    ON public.verification_log_2026_03
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on verification_log_2026_04"
    ON public.verification_log_2026_04
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Fix function search_path warning
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

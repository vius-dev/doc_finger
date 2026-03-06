-- ============================================================
-- Fix Supabase Linter Warnings
-- ============================================================

-- 1. CRITICAL: Enable RLS on expiry_rules
ALTER TABLE public.expiry_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on expiry_rules"
    ON public.expiry_rules
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins have full access to expiry_rules"
    ON public.expiry_rules
    FOR ALL
    TO authenticated
    USING (public.is_admin((select auth.uid())))
    WITH CHECK (public.is_admin((select auth.uid())));

-- 2. Fix get_next_document_number search_path
CREATE OR REPLACE FUNCTION public.get_next_document_number(p_institution_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_next BIGINT;
BEGIN
    UPDATE institutions
    SET next_document_sequence = next_document_sequence + 1
    WHERE id = p_institution_id
    RETURNING (next_document_sequence - 1) INTO v_next;

    RETURN v_next;
END;
$$;

-- 3. Optimize RLS policies: wrap auth.uid() in (select ...) to avoid per-row re-evaluation

-- Drop and recreate: institutions
DROP POLICY IF EXISTS "Admins have full access to institutions" ON public.institutions;
CREATE POLICY "Admins have full access to institutions"
    ON public.institutions
    FOR ALL
    TO authenticated
    USING (public.is_admin((select auth.uid())))
    WITH CHECK (public.is_admin((select auth.uid())));

-- Drop and recreate: api_keys
DROP POLICY IF EXISTS "Admins have full access to api_keys" ON public.api_keys;
CREATE POLICY "Admins have full access to api_keys"
    ON public.api_keys
    FOR ALL
    TO authenticated
    USING (public.is_admin((select auth.uid())))
    WITH CHECK (public.is_admin((select auth.uid())));

-- Drop and recreate: documents
DROP POLICY IF EXISTS "Admins have full access to documents" ON public.documents;
CREATE POLICY "Admins have full access to documents"
    ON public.documents
    FOR ALL
    TO authenticated
    USING (public.is_admin((select auth.uid())))
    WITH CHECK (public.is_admin((select auth.uid())));

-- Drop and recreate: audit_log (read)
DROP POLICY IF EXISTS "Admins can read audit_log" ON public.audit_log;
CREATE POLICY "Admins can read audit_log"
    ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (public.is_admin((select auth.uid())));

-- Drop and recreate: audit_log (insert)
DROP POLICY IF EXISTS "Admins can insert audit_log" ON public.audit_log;
CREATE POLICY "Admins can insert audit_log"
    ON public.audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin((select auth.uid())));

-- Drop and recreate: user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.is_admin((select auth.uid())))
    WITH CHECK (public.is_admin((select auth.uid())));

-- Drop and recreate: verification_log_2026_03
DROP POLICY IF EXISTS "Admins can read verification_log_2026_03" ON public.verification_log_2026_03;
CREATE POLICY "Admins can read verification_log_2026_03"
    ON public.verification_log_2026_03
    FOR SELECT
    TO authenticated
    USING (public.is_admin((select auth.uid())));

-- Drop and recreate: verification_log_2026_04
DROP POLICY IF EXISTS "Admins can read verification_log_2026_04" ON public.verification_log_2026_04;
CREATE POLICY "Admins can read verification_log_2026_04"
    ON public.verification_log_2026_04
    FOR SELECT
    TO authenticated
    USING (public.is_admin((select auth.uid())));

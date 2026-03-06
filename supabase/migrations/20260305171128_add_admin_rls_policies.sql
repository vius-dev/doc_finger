-- ============================================================
-- Admin Role Management & RLS Policies
-- ============================================================

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = $1 AND role = 'admin'
    );
$$;

-- RLS for user_roles
CREATE POLICY "Admins can manage roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role full access on user_roles"
    ON public.user_roles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Update Core Tables RLS
-- ============================================================

-- Institutions
CREATE POLICY "Admins have full access to institutions"
    ON public.institutions
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- API Keys
CREATE POLICY "Admins have full access to api_keys"
    ON public.api_keys
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Documents
CREATE POLICY "Admins have full access to documents"
    ON public.documents
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Audit Log
CREATE POLICY "Admins can read audit_log"
    ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit_log"
    ON public.audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

-- Verification Log
CREATE POLICY "Admins can read verification_log_2026_03"
    ON public.verification_log_2026_03
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read verification_log_2026_04"
    ON public.verification_log_2026_04
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

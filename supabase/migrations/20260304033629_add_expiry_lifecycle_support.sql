-- Phase 3: Expiry & Lifecycle Support
-- Adds lifecycle columns, pg_cron extension, and automated expiry functions

-- ============================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 2. ADD LIFECYCLE COLUMNS TO DOCUMENTS
-- ============================================================

-- Drop the existing status constraint to add new statuses
ALTER TABLE documents DROP CONSTRAINT IF EXISTS ck_documents_status_values;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS grace_period_active BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reactivated_by UUID,
    ADD COLUMN IF NOT EXISTS reactivation_reason TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Re-add status constraint with lifecycle statuses
ALTER TABLE documents ADD CONSTRAINT ck_documents_status_values
    CHECK (status IN ('active', 'expired', 'expired_grace', 'revoked', 'deleted'));

-- Index for lifecycle queries
CREATE INDEX IF NOT EXISTS idx_documents_grace_period
    ON documents(grace_period_end) WHERE grace_period_active = true;
CREATE INDEX IF NOT EXISTS idx_documents_soft_deleted
    ON documents(soft_deleted_at) WHERE soft_deleted_at IS NOT NULL;

-- ============================================================
-- 3. EXPIRY RULES (stored as a config table)
-- ============================================================
CREATE TABLE IF NOT EXISTS expiry_rules (
    document_type VARCHAR(50) PRIMARY KEY,
    default_expiry_days INTEGER,         -- NULL = never expires
    grace_period_days INTEGER NOT NULL DEFAULT 30,
    notification_days INTEGER[] NOT NULL DEFAULT '{30,14,7,1}'
);

INSERT INTO expiry_rules (document_type, default_expiry_days, grace_period_days, notification_days)
VALUES
    ('degree_certificate', 3650, 90, '{90,30,14,7,1}'),
    ('diploma', 3650, 90, '{90,30,14,7,1}'),
    ('transcript', 3650, 90, '{90,30,14,7,1}'),
    ('land_title', NULL, 0, '{}'),
    ('professional_license', 365, 30, '{60,30,14,7,1}'),
    ('medical_license', 365, 30, '{60,30,14,7,1}'),
    ('legal_license', 365, 30, '{60,30,14,7,1}'),
    ('temporary_permit', 90, 0, '{30,14,7,1}'),
    ('visitor_pass', 90, 0, '{30,14,7,1}'),
    ('employment_contract', 730, 30, '{60,30,14,7}'),
    ('offer_letter', 90, 30, '{30,14,7,1}'),
    ('default', 90, 30, '{30,14,7,1}')
ON CONFLICT (document_type) DO NOTHING;

-- ============================================================
-- 4. FUNCTION: check_expiring_documents (Hourly)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_expiring_documents()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    affected INTEGER := 0;
    doc RECORD;
    grace_days INTEGER;
BEGIN
    -- Find active documents past their expiry date
    FOR doc IN
        SELECT d.id, d.fingerprint_id, d.institution_id, d.document_type, d.expiry_date
        FROM documents d
        WHERE d.status = 'active'
          AND d.expiry_date IS NOT NULL
          AND d.expiry_date < CURRENT_DATE
    LOOP
        -- Look up grace period for this document type
        SELECT COALESCE(er.grace_period_days, 30)
        INTO grace_days
        FROM expiry_rules er
        WHERE er.document_type = doc.document_type;

        -- Fallback to default if not found
        IF grace_days IS NULL THEN
            SELECT COALESCE(er.grace_period_days, 30)
            INTO grace_days
            FROM expiry_rules er
            WHERE er.document_type = 'default';
        END IF;

        IF grace_days IS NULL THEN
            grace_days := 30;
        END IF;

        -- Transition to expired_grace or expired based on grace period
        IF grace_days > 0 THEN
            UPDATE documents
            SET status = 'expired_grace',
                grace_period_active = true,
                grace_period_end = doc.expiry_date::timestamptz + (grace_days || ' days')::interval,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = doc.id;
        ELSE
            UPDATE documents
            SET status = 'expired',
                grace_period_active = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = doc.id;
        END IF;

        affected := affected + 1;

        -- Log to audit
        INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, new_state_hash, changes_summary, environment)
        VALUES ('system', 'expiry_worker', 'document.expired', 'document', doc.id::text,
                encode(digest(doc.id::text || now()::text, 'sha256'), 'hex'),
                jsonb_build_object('previous_status', 'active', 'new_status',
                    CASE WHEN grace_days > 0 THEN 'expired_grace' ELSE 'expired' END,
                    'grace_period_days', grace_days),
                'production');
    END LOOP;

    RAISE NOTICE 'check_expiring_documents: % documents transitioned', affected;
    RETURN affected;
END;
$$;

-- ============================================================
-- 5. FUNCTION: check_grace_periods (Daily)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_grace_periods()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    affected INTEGER := 0;
BEGIN
    -- Find documents where grace period has ended
    UPDATE documents
    SET status = 'expired',
        grace_period_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'expired_grace'
      AND grace_period_active = true
      AND grace_period_end IS NOT NULL
      AND grace_period_end < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS affected = ROW_COUNT;

    -- Log batch operation
    IF affected > 0 THEN
        INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, new_state_hash, changes_summary, environment)
        VALUES ('system', 'grace_period_worker', 'documents.grace_period_ended', 'batch', affected::text,
                encode(digest(affected::text || now()::text, 'sha256'), 'hex'),
                jsonb_build_object('documents_affected', affected, 'action', 'grace_period_expired'),
                'production');
    END IF;

    RAISE NOTICE 'check_grace_periods: % documents removed from grace period', affected;
    RETURN affected;
END;
$$;

-- ============================================================
-- 6. FUNCTION: cleanup_soft_deleted (Weekly)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_soft_deleted()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    affected INTEGER := 0;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Soft delete: anonymize expired documents older than 90 days past expiry
    cutoff_date := CURRENT_TIMESTAMP - INTERVAL '90 days';

    UPDATE documents
    SET status = 'deleted',
        soft_deleted_at = CURRENT_TIMESTAMP,
        recipient_name = 'REDACTED',
        recipient_identifier_hash = NULL,
        recipient_additional = NULL,
        document_metadata = jsonb_build_object(
            'redacted', true,
            'original_type', document_type,
            'original_issue_date', issue_date,
            'original_expiry_date', expiry_date,
            'redacted_at', CURRENT_TIMESTAMP
        ),
        public_display = jsonb_build_object('redacted', true),
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'expired'
      AND grace_period_active = false
      AND expiry_date IS NOT NULL
      AND expiry_date::timestamptz < cutoff_date
      AND soft_deleted_at IS NULL;

    GET DIAGNOSTICS affected = ROW_COUNT;

    IF affected > 0 THEN
        INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, new_state_hash, changes_summary, environment)
        VALUES ('system', 'cleanup_worker', 'documents.soft_deleted', 'batch', affected::text,
                encode(digest(affected::text || now()::text, 'sha256'), 'hex'),
                jsonb_build_object('documents_anonymized', affected, 'cutoff_date', cutoff_date),
                'production');
    END IF;

    RAISE NOTICE 'cleanup_soft_deleted: % documents anonymized', affected;
    RETURN affected;
END;
$$;

-- ============================================================
-- 7. FUNCTION: reactivate_document
-- ============================================================
CREATE OR REPLACE FUNCTION public.reactivate_document(
    p_document_id UUID,
    p_new_expiry_date DATE DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_reactivated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    doc RECORD;
    new_expiry DATE;
    result JSONB;
BEGIN
    -- Get current document status
    SELECT id, fingerprint_id, document_type, status, grace_period_active, issue_date
    INTO doc
    FROM documents
    WHERE id = p_document_id;

    IF doc IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Document not found');
    END IF;

    IF doc.status != 'expired_grace' OR NOT doc.grace_period_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Document is not in grace period');
    END IF;

    -- Calculate new expiry (default: 3 months from now)
    new_expiry := COALESCE(p_new_expiry_date, CURRENT_DATE + INTERVAL '3 months');

    -- Reactivate
    UPDATE documents
    SET status = 'active',
        expiry_date = new_expiry,
        grace_period_active = false,
        grace_period_end = NULL,
        reactivated_at = CURRENT_TIMESTAMP,
        reactivated_by = p_reactivated_by,
        reactivation_reason = p_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_document_id;

    -- Audit log
    INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, new_state_hash, changes_summary, environment)
    VALUES ('api_key', COALESCE(p_reactivated_by::text, 'system'), 'document.reactivated', 'document', p_document_id::text,
            encode(digest(p_document_id::text || now()::text, 'sha256'), 'hex'),
            jsonb_build_object('fingerprint_id', doc.fingerprint_id, 'new_expiry', new_expiry, 'reason', p_reason),
            'production');

    RETURN jsonb_build_object(
        'success', true,
        'fingerprint_id', doc.fingerprint_id,
        'new_expiry_date', new_expiry,
        'status', 'active'
    );
END;
$$;

-- ============================================================
-- 8. SET UP pg_cron SCHEDULES
-- ============================================================

-- Hourly: check for expired documents
SELECT cron.schedule(
    'check-expiring-documents',
    '0 * * * *',  -- Every hour at :00
    $$SELECT public.check_expiring_documents()$$
);

-- Daily at 06:00 UTC: check grace periods
SELECT cron.schedule(
    'check-grace-periods',
    '0 6 * * *',  -- Daily at 06:00 UTC
    $$SELECT public.check_grace_periods()$$
);

-- Weekly on Sunday at 02:00 UTC: cleanup soft deleted
SELECT cron.schedule(
    'cleanup-soft-deleted',
    '0 2 * * 0',  -- Weekly, Sunday at 02:00 UTC
    $$SELECT public.cleanup_soft_deleted()$$
);

-- Update the document updated_at trigger
CREATE TRIGGER update_documents_timestamp
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

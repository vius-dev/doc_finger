-- Phase 4: Institution Document Counters & Automation
-- Adds sequence generation for unique document numbers

-- 1. Add next_document_sequence to institutions
ALTER TABLE institutions 
    ADD COLUMN IF NOT EXISTS next_document_sequence BIGINT DEFAULT 1;

-- 2. Create function to safely get and increment the next number
CREATE OR REPLACE FUNCTION public.get_next_document_number(p_institution_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
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

-- 3. Enhance documents table for recipients
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS recipient_additional JSONB DEFAULT '{}'::jsonb;

-- 4. Initial seed for expiry rules (if not already handled)
INSERT INTO expiry_rules (document_type, default_expiry_days, grace_period_days, notification_days)
VALUES
    ('degree_certificate', 3650, 90, '{90,30,14,7,1}'),
    ('transcript', 3650, 90, '{90,30,14,7,1}'),
    ('professional_license', 365, 30, '{60,30,14,7,1}'),
    ('temporary_permit', 90, 0, '{30,14,7,1}'),
    ('visitor_pass', 90, 0, '{30,14,7,1}'),
    ('employment_contract', 730, 30, '{60,30,14,7}'),
    ('offer_letter', 90, 30, '{30,14,7,1}'),
    ('default', 90, 30, '{30,14,7,1}')
ON CONFLICT (document_type) DO UPDATE 
SET default_expiry_days = EXCLUDED.default_expiry_days,
    grace_period_days = EXCLUDED.grace_period_days,
    notification_days = EXCLUDED.notification_days;

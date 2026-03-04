-- Add 3-month default expiry trigger for documents
-- From Phase_1_foundation.md: Documents without an explicit expiry_date
-- get a default based on their document_type.

CREATE OR REPLACE FUNCTION public.set_default_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- If no expiry_date provided, set default based on document_type
    IF NEW.expiry_date IS NULL THEN
        NEW.expiry_date := CASE NEW.document_type
            WHEN 'degree_certificate' THEN NEW.issue_date + INTERVAL '10 years'
            WHEN 'professional_license' THEN NEW.issue_date + INTERVAL '1 year'
            WHEN 'temporary_permit' THEN NEW.issue_date + INTERVAL '3 months'
            WHEN 'employment_contract' THEN NEW.issue_date + INTERVAL '2 years'
            ELSE NEW.issue_date + INTERVAL '3 months'  -- Default 3 months
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_document_default_expiry
    BEFORE INSERT ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_expiry();

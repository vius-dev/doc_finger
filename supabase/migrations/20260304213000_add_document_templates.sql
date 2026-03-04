-- Create document_templates table
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    document_type VARCHAR(50) NOT NULL,
    document_subtype VARCHAR(50),
    
    -- Schema for custom fields: JSONSchema or simple field list
    metadata_schema JSONB NOT NULL DEFAULT '[]',
    
    -- Nomenclature rules (e.g., prefix: "DEG-", format: "YYYY-NNNNNN")
    nomenclature_config JSONB NOT NULL DEFAULT '{}',
    
    -- Default lifecycle rules
    default_expiry_days INTEGER,
    grace_period_days INTEGER DEFAULT 30,
    
    -- Presentation preferences
    theme_config JSONB NOT NULL DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    CONSTRAINT ck_templates_type_values CHECK (document_type IN ('university', 'professional_body', 'government', 'corporate'))
);

-- Add template_id to documents
ALTER TABLE documents ADD COLUMN template_id UUID REFERENCES document_templates(id);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role full access on document_templates"
    ON public.document_templates
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Indexes
CREATE INDEX idx_templates_institution ON document_templates(institution_id);
CREATE INDEX idx_templates_type ON document_templates(document_type);

-- Trigger for updated_at
CREATE TRIGGER update_document_templates_timestamp
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

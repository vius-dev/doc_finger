-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create institutions table
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_code VARCHAR(50) NOT NULL UNIQUE,
    legal_name VARCHAR(200) NOT NULL,
    trading_name VARCHAR(200),
    institution_type VARCHAR(50) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    registration_number VARCHAR(100),
    verification_level INTEGER NOT NULL DEFAULT 0,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    verification_expires_at TIMESTAMPTZ,
    primary_email VARCHAR(200) NOT NULL,
    technical_email VARCHAR(200),
    billing_email VARCHAR(200),
    phone_number VARCHAR(50),
    website VARCHAR(200),
    physical_address TEXT,
    postal_address TEXT,
    parent_institution_id UUID,
    root_institution_id UUID,
    allowed_document_types JSONB NOT NULL DEFAULT '[]',
    custom_document_types JSONB,
    monthly_document_quota INTEGER,
    annual_document_quota INTEGER,
    current_month_usage INTEGER DEFAULT 0,
    billing_plan VARCHAR(50) NOT NULL DEFAULT 'free',
    billing_status VARCHAR(20) DEFAULT 'active',
    stripe_customer_id VARCHAR(100),
    next_billing_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    status_reason TEXT,
    suspended_at TIMESTAMPTZ,
    metadata JSONB,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    CONSTRAINT ck_institutions_verification_level_range CHECK (verification_level BETWEEN 0 AND 4),
    CONSTRAINT ck_institutions_status_values CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
    CONSTRAINT ck_institutions_type_values CHECK (institution_type IN ('university', 'professional_body', 'government', 'corporate'))
);

-- Create api_keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id VARCHAR(50) NOT NULL UNIQUE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_by UUID,
    key_hash VARCHAR(64) NOT NULL,
    key_preview VARCHAR(20) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    ip_restrictions INET[],
    name VARCHAR(100),
    description TEXT,
    environment VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    revoked_by UUID,
    CONSTRAINT ck_api_keys_environment CHECK (environment IN ('test', 'production')),
    CONSTRAINT ck_api_keys_status CHECK (status IN ('active', 'revoked', 'expired')),
    CONSTRAINT ck_api_keys_expiry_future CHECK (expires_at > created_at)
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint_id VARCHAR(100) NOT NULL UNIQUE,
    sha256_hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    issuing_department VARCHAR(200),
    issuer_user_id VARCHAR(100),
    document_type VARCHAR(50) NOT NULL,
    document_subtype VARCHAR(50),
    document_number VARCHAR(100),
    recipient_name VARCHAR(200) NOT NULL,
    recipient_identifier_hash VARCHAR(64),
    recipient_additional TEXT[],
    issue_date DATE NOT NULL,
    expiry_date DATE,
    effective_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    status_reason TEXT,
    document_metadata JSONB NOT NULL DEFAULT '{}',
    public_display JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    revoked_by UUID,
    version INTEGER DEFAULT 1,
    superseded_by UUID REFERENCES documents(id),
    CONSTRAINT ck_documents_dates_valid CHECK (expiry_date IS NULL OR expiry_date > issue_date),
    CONSTRAINT ck_documents_status_values CHECK (status IN ('active', 'expired', 'revoked', 'deleted'))
);

-- Create verification_log table (Partitioned)
CREATE TABLE verification_log (
    id BIGSERIAL,
    document_id UUID REFERENCES documents(id),
    fingerprint_id VARCHAR(100) NOT NULL,
    institution_id UUID REFERENCES institutions(id),
    verifier_ip INET NOT NULL,
    verifier_user_agent TEXT,
    verifier_identifier VARCHAR(100),
    verified BOOLEAN NOT NULL,
    response_time_ms INTEGER NOT NULL,
    result_details JSONB,
    verification_method VARCHAR(20),
    api_key_id UUID REFERENCES api_keys(id),
    verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, verified_at)
) PARTITION BY RANGE (verified_at);

-- Create initial partitions for verification log
CREATE TABLE verification_log_2026_03 PARTITION OF verification_log FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE verification_log_2026_04 PARTITION OF verification_log FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Create audit_log table
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    log_id UUID DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    actor_type VARCHAR(20) NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    actor_ip INET,
    actor_user_agent TEXT,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    previous_state_hash VARCHAR(64),
    new_state_hash VARCHAR(64) NOT NULL,
    changes_summary JSONB,
    chain_hash VARCHAR(64),
    signature TEXT,
    environment VARCHAR(20),
    version VARCHAR(10)
);

-- Indexes

-- Institutions table indexes
CREATE INDEX idx_institutions_code ON institutions(institution_code);
CREATE INDEX idx_institutions_status ON institutions(status);
CREATE INDEX idx_institutions_country ON institutions(country_code);
CREATE INDEX idx_institutions_type ON institutions(institution_type);
CREATE INDEX idx_institutions_verification ON institutions(verification_level);
CREATE INDEX idx_institutions_parent ON institutions(parent_institution_id);

-- API Keys table indexes
CREATE INDEX idx_api_keys_institution ON api_keys(institution_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_api_keys_expiry ON api_keys(expires_at);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- Documents table indexes
CREATE INDEX idx_documents_institution ON documents(institution_id);
CREATE INDEX idx_documents_fingerprint ON documents(fingerprint_id);
CREATE INDEX idx_documents_hash ON documents(sha256_hash);
CREATE INDEX idx_documents_recipient ON documents(recipient_name);
CREATE INDEX idx_documents_expiry ON documents(expiry_date) WHERE status = 'active';
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_issue_date ON documents(issue_date);
CREATE INDEX idx_documents_institution_status ON documents(institution_id, status);
CREATE INDEX idx_documents_institution_expiry ON documents(institution_id, expiry_date) WHERE status = 'active';

-- Verification log indexes
CREATE INDEX idx_verification_document ON verification_log(document_id);
CREATE INDEX idx_verification_timestamp ON verification_log(verified_at);
CREATE INDEX idx_verification_ip ON verification_log(verifier_ip);
CREATE INDEX idx_verification_fingerprint ON verification_log(fingerprint_id);

-- Audit log indexes
CREATE INDEX idx_audit_actor ON audit_log(actor_type, actor_id);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_log(occurred_at);
CREATE INDEX idx_audit_action ON audit_log(action);

-- Function and Trigger for automatic updated_at timestamp updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_institutions_timestamp
    BEFORE UPDATE ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

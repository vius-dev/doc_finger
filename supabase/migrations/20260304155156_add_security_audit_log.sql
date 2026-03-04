-- Security Audit Log for tracking suspicious activities and auth failures
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'low',
    actor_details JSONB,
    request_details JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_log_type ON security_audit_log (event_type);
CREATE INDEX idx_security_log_created_at ON security_audit_log (created_at);

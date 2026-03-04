-- Idempotency Keys table to ensure exactly-once semantics for critical operations
-- Keys are scoped to an institution and expire after 24 hours

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    response_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    
    UNIQUE(institution_id, idempotency_key)
);

CREATE INDEX idx_idempotency_lookup ON idempotency_keys (institution_id, idempotency_key);
CREATE INDEX idx_idempotency_expiry ON idempotency_keys (expires_at);

-- Add to the cleanup cron job if it exists, or create a simple one
-- In our system, check_lifecycle manages cleanup. We'll add it there or just use pg_cron if enabled.
SELECT cron.schedule(
    'cleanup-idempotency-keys',
    '30 * * * *', -- Every hour at minute 30
    $$ DELETE FROM idempotency_keys WHERE expires_at < now() $$
);

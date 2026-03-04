-- Add index to key_preview for faster API key lookups during authentication
-- This prevents full table scans as the institution base grows.

CREATE INDEX IF NOT EXISTS idx_api_keys_preview ON api_keys (key_preview);

-- Audit note: This resolves a potential O(N) performance bottleneck in the auth middleware.

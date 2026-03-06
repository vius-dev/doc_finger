-- Add usage tracking columns to api_keys
ALTER TABLE api_keys
    ADD COLUMN usage_limit INTEGER,
    ADD COLUMN usage_count INTEGER DEFAULT 0 NOT NULL;

-- Function to safely increment usage and check limit
CREATE OR REPLACE FUNCTION increment_api_key_usage(p_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run as db owner for secure updates
AS $$
DECLARE
    v_limit INTEGER;
    v_count INTEGER;
BEGIN
    -- Get current limit and lock the row for update
    SELECT usage_limit, usage_count 
    INTO v_limit, v_count
    FROM api_keys
    WHERE id = p_key_id
    FOR UPDATE;

    -- If there's no limit, just return success
    IF v_limit IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if we're already at or over limit
    IF v_count >= v_limit THEN
        -- Force status to expired if it isn't already
        UPDATE api_keys SET status = 'expired' WHERE id = p_key_id AND status != 'expired';
        RETURN FALSE;
    END IF;

    -- Increment usage
    UPDATE api_keys 
    SET usage_count = usage_count + 1
    WHERE id = p_key_id;

    -- If we hit the limit after incrementing, expire it
    IF (v_count + 1) >= v_limit THEN
        UPDATE api_keys SET status = 'expired' WHERE id = p_key_id;
    END IF;

    RETURN TRUE;
END;
$$;

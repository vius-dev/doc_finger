-- Expand key_hash length to accommodate PBKDF2 hash (64 chars) + colon + salt (32 chars) = 97 chars total
ALTER TABLE api_keys ALTER COLUMN key_hash TYPE VARCHAR(100);

-- For databases created before auth existed. Safe to run more than once.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

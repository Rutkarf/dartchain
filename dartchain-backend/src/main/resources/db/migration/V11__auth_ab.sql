-- Phase AB — rôles, refresh tokens, audit, rate limit Postgres

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'USER';

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    token UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id ON auth_refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at ON auth_refresh_tokens (expires_at);

CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY,
    user_id UUID,
    action VARCHAR(64) NOT NULL,
    detail TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log (created_at);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    bucket_key VARCHAR(256) PRIMARY KEY,
    window_start_ms BIGINT NOT NULL,
    request_count INT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE launch_projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    symbol VARCHAR(16) NOT NULL UNIQUE,
    status VARCHAR(16) NOT NULL,
    raised_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    target_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    logo_url TEXT,
    description TEXT,
    chain VARCHAR(64)
);

CREATE TABLE ip_bans (
    ip_address VARCHAR(64) PRIMARY KEY,
    reason VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    user_agent VARCHAR(512)
);

CREATE INDEX idx_ip_bans_created_at ON ip_bans (created_at);

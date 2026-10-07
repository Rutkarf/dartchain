CREATE TABLE faucet_claims (
    id VARCHAR(36) PRIMARY KEY,
    wallet_address VARCHAR(128) NOT NULL,
    amount NUMERIC(38, 26) NOT NULL,
    claimed_at BIGINT NOT NULL,
    next_eligible_at BIGINT NOT NULL,
    tx_hash VARCHAR(128),
    client_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_faucet_claims_wallet_claimed_at
    ON faucet_claims (wallet_address, claimed_at DESC);

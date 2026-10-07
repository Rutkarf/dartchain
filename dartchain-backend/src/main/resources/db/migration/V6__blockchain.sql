CREATE TABLE blocks (
    block_index INT PRIMARY KEY,
    block_timestamp BIGINT NOT NULL,
    block_data TEXT,
    previous_hash VARCHAR(128) NOT NULL,
    block_hash VARCHAR(128) NOT NULL,
    nonce INT NOT NULL,
    difficulty INT NOT NULL,
    transactions_json JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_blocks_hash ON blocks (block_hash);

CREATE TABLE pending_transactions (
    id VARCHAR(36) PRIMARY KEY,
    tx_hash VARCHAR(128),
    from_address VARCHAR(128) NOT NULL,
    to_address VARCHAR(128) NOT NULL,
    amount NUMERIC(38, 26) NOT NULL,
    tx_data TEXT,
    signature TEXT,
    status VARCHAR(32),
    system_reward BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL
);

CREATE INDEX idx_pending_created ON pending_transactions (created_at DESC);

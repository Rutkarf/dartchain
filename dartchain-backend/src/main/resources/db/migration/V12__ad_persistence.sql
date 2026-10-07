-- Phase AD — indexes persistance + métadonnées chaîne EVM-compatible native

CREATE INDEX IF NOT EXISTS idx_pending_from ON pending_transactions (from_address);
CREATE INDEX IF NOT EXISTS idx_pending_to ON pending_transactions (to_address);
CREATE INDEX IF NOT EXISTS idx_exchange_wallet ON exchange_ledger_adjustments (wallet_address);

CREATE TABLE IF NOT EXISTS chain_config (
    config_key VARCHAR(64) PRIMARY KEY,
    config_value TEXT NOT NULL
);

INSERT INTO chain_config (config_key, config_value) VALUES
    ('chainId', '3377'),
    ('networkName', 'DartChain Native'),
    ('nativeToken', 'R4V3'),
    ('addressSchemeDefault', 'evm-compatible'),
    ('signingPayloadVersion', 'DCv1')
ON CONFLICT (config_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS chain_accounts (
    address VARCHAR(42) PRIMARY KEY,
    address_scheme VARCHAR(16) NOT NULL DEFAULT 'evm',
    public_key TEXT,
    nonce BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_accounts_scheme ON chain_accounts (address_scheme);

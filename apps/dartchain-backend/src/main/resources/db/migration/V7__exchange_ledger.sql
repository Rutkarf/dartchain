CREATE TABLE exchange_ledger_adjustments (
    wallet_address VARCHAR(128) NOT NULL,
    token VARCHAR(16) NOT NULL,
    adjustment NUMERIC(38, 8) NOT NULL,
    PRIMARY KEY (wallet_address, token)
);

CREATE TABLE exchange_seeded_wallets (
    wallet_address VARCHAR(128) PRIMARY KEY
);

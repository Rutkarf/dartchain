-- Soldes wallet persistés (R4V3 + tokens swap) pour lecture / vérifications.
-- Source de vérité runtime = chaîne + exchange_ledger_adjustments ; cette table est le snapshot.

CREATE TABLE wallet_balances (
    wallet_address VARCHAR(128) NOT NULL,
    token VARCHAR(32) NOT NULL,
    balance NUMERIC(38, 26) NOT NULL,
    chain_balance NUMERIC(38, 26) NOT NULL DEFAULT 0,
    ledger_adjustment NUMERIC(38, 26) NOT NULL DEFAULT 0,
    source VARCHAR(32) NOT NULL DEFAULT 'SYNC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (wallet_address, token)
);

CREATE INDEX idx_wallet_balances_updated
    ON wallet_balances (updated_at DESC);

CREATE INDEX idx_wallet_balances_token
    ON wallet_balances (token, updated_at DESC);

-- Journal d'audit des variations de solde (swap, sync, mint).
CREATE TABLE wallet_balance_events (
    id UUID PRIMARY KEY,
    wallet_address VARCHAR(128) NOT NULL,
    token VARCHAR(32) NOT NULL,
    delta NUMERIC(38, 26) NOT NULL,
    balance_after NUMERIC(38, 26) NOT NULL,
    chain_balance NUMERIC(38, 26),
    ledger_adjustment NUMERIC(38, 26),
    event_type VARCHAR(32) NOT NULL,
    reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_balance_events_wallet
    ON wallet_balance_events (wallet_address, created_at DESC);

CREATE INDEX idx_wallet_balance_events_token
    ON wallet_balance_events (wallet_address, token, created_at DESC);

ALTER TABLE exchange_ledger_adjustments
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Panier Marché + commandes (paiement R4V3 via exchange ledger).

CREATE TABLE market_carts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE market_cart_items (
    id VARCHAR(64) PRIMARY KEY,
    cart_id VARCHAR(64) NOT NULL REFERENCES market_carts (id) ON DELETE CASCADE,
    exchange_token VARCHAR(32) NOT NULL,
    display_symbol VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    offer_kind VARCHAR(16) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_r4v3 NUMERIC(38, 26) NOT NULL CHECK (unit_price_r4v3 >= 0),
    UNIQUE (cart_id, exchange_token)
);

CREATE INDEX idx_market_cart_items_cart ON market_cart_items (cart_id);

CREATE TABLE market_orders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    wallet_address VARCHAR(128) NOT NULL,
    status VARCHAR(16) NOT NULL,
    total_r4v3 NUMERIC(38, 26) NOT NULL DEFAULT 0,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_orders_user ON market_orders (user_id, created_at DESC);

CREATE TABLE market_order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES market_orders (id) ON DELETE CASCADE,
    exchange_token VARCHAR(32) NOT NULL,
    display_symbol VARCHAR(32) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_r4v3 NUMERIC(38, 26) NOT NULL,
    amount_in_r4v3 NUMERIC(38, 26) NOT NULL DEFAULT 0,
    amount_out NUMERIC(38, 26) NOT NULL DEFAULT 0,
    ok BOOLEAN NOT NULL DEFAULT FALSE,
    line_message TEXT
);

CREATE INDEX idx_market_order_items_order ON market_order_items (order_id);

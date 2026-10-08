ALTER TABLE chain_accounts
    ALTER COLUMN address TYPE VARCHAR(128);

ALTER TABLE chain_accounts
    ALTER COLUMN address_scheme SET DEFAULT 'evm-compatible';

UPDATE chain_accounts
SET address_scheme = 'evm-compatible'
WHERE address_scheme = 'evm';

UPDATE auth_audit_log
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth_audit_log.user_id);

ALTER TABLE auth_audit_log
    ADD CONSTRAINT fk_auth_audit_log_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE TABLE faq_questions (
    id VARCHAR(64) PRIMARY KEY,
    author_id VARCHAR(64),
    author_name VARCHAR(128),
    title TEXT NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL,
    score INTEGER NOT NULL,
    upvotes INTEGER NOT NULL,
    downvotes INTEGER NOT NULL,
    answer_count INTEGER NOT NULL,
    pending_staff_review BOOLEAN NOT NULL
);

CREATE TABLE faq_question_votes (
    question_id VARCHAR(64) NOT NULL REFERENCES faq_questions (id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    direction VARCHAR(16) NOT NULL,
    PRIMARY KEY (question_id, user_id)
);

CREATE TABLE m4t3r_rewards (
    reward_id VARCHAR(128) PRIMARY KEY,
    collection_id VARCHAR(128),
    wallet_address VARCHAR(128),
    collected_at BIGINT NOT NULL,
    payload TEXT NOT NULL
);

CREATE INDEX idx_m4t3r_rewards_collection ON m4t3r_rewards (collection_id);
CREATE INDEX idx_m4t3r_rewards_wallet ON m4t3r_rewards (wallet_address, collected_at DESC);

CREATE TABLE faucet_pending_balances (
    wallet_address VARCHAR(128) PRIMARY KEY,
    amount NUMERIC(38, 26) NOT NULL
);

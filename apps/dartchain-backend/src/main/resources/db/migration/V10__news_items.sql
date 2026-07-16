CREATE TABLE news_items (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    body TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(16) NOT NULL,
    action_type VARCHAR(32),
    action_target TEXT
);

CREATE INDEX idx_news_published ON news_items (published_at DESC);

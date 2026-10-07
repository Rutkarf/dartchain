CREATE TABLE quest_progress (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    day_key VARCHAR(10) NOT NULL,
    tasks_json JSONB NOT NULL,
    mission_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    total_xp INT NOT NULL DEFAULT 0,
    pending_mts NUMERIC(18, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quest_progress_day_key ON quest_progress (day_key);

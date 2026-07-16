CREATE TABLE chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL,
    author VARCHAR(128) NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    client_id VARCHAR(64),
    font_key VARCHAR(32),
    font_size VARCHAR(8),
    bold BOOLEAN NOT NULL DEFAULT FALSE,
    italic BOOLEAN NOT NULL DEFAULT FALSE,
    underline BOOLEAN NOT NULL DEFAULT FALSE,
    strikethrough BOOLEAN NOT NULL DEFAULT FALSE,
    font_color VARCHAR(16),
    highlight_color VARCHAR(16),
    text_align VARCHAR(16),
    style_key VARCHAR(32)
);

CREATE INDEX idx_chat_room_sent ON chat_messages (room_id, sent_at DESC);

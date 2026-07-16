ALTER TABLE quest_progress
    ADD COLUMN explored_blocks_json JSONB NOT NULL DEFAULT '[]'::jsonb;

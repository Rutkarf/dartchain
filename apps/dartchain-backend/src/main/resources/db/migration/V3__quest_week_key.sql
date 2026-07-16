ALTER TABLE quest_progress
    ADD COLUMN IF NOT EXISTS week_key VARCHAR(8);

UPDATE quest_progress
SET week_key = TO_CHAR(CURRENT_DATE, 'IYYY') || '-W' || LPAD(TO_CHAR(CURRENT_DATE, 'IW'), 2, '0')
WHERE week_key IS NULL;

ALTER TABLE quest_progress
    ALTER COLUMN week_key SET NOT NULL;

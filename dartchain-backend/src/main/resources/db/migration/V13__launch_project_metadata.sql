ALTER TABLE launch_projects
    ADD COLUMN IF NOT EXISTS whitepaper_url TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS launch_date VARCHAR(40);

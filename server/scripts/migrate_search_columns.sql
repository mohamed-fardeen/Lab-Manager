-- Run this in your Supabase SQL Editor to add the required columns for Smart Search

ALTER TABLE files ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE files ADD COLUMN IF NOT EXISTS content TEXT;

-- Optional: Create an index for faster text searching
CREATE INDEX IF NOT EXISTS idx_files_content ON files USING GIN (to_tsvector('english', coalesce(content, '')));
CREATE INDEX IF NOT EXISTS idx_files_tags ON files USING GIN (tags);

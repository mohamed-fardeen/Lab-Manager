-- Run this in your Supabase SQL Editor
ALTER TABLE files ADD COLUMN IF NOT EXISTS edited_content JSONB DEFAULT '{"blocks": []}';

-- Optional: Add index for performance if you have many files
CREATE INDEX IF NOT EXISTS idx_files_edited_content ON files USING GIN (edited_content);

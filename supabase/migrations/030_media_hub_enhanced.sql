-- ============================================================
-- ENHANCED MEDIA HUB - Full multimedia platform
-- ============================================================

-- Add new columns to media_items for enhanced functionality
ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'youtube' CHECK (source_type IN ('youtube', 'vimeo', 'upload', 'external')),
  ADD COLUMN IF NOT EXISTS media_date DATE,
  ADD COLUMN IF NOT EXISTS duration INTEGER, -- seconds for videos
  ADD COLUMN IF NOT EXISTS file_size INTEGER, -- bytes for uploads
  ADD COLUMN IF NOT EXISTS storage_path TEXT, -- for Supabase Storage uploads
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'members', 'coaches', 'private'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_media_items_media_date ON media_items(media_date);
CREATE INDEX IF NOT EXISTS idx_media_items_source_type ON media_items(source_type);
CREATE INDEX IF NOT EXISTS idx_media_items_season_id ON media_items(season_id);
CREATE INDEX IF NOT EXISTS idx_media_items_match_id ON media_items(match_id);
CREATE INDEX IF NOT EXISTS idx_media_items_is_featured ON media_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_media_items_visibility ON media_items(visibility);

-- Add more categories
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_category_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_category_check 
  CHECK (category IN ('match', 'highlight', 'training', 'photo', 'technique', 'analysis', 'event', 'promo', 'other'));

-- Comment for documentation
COMMENT ON TABLE media_items IS 'Enhanced Media Hub: supports YouTube, Vimeo, direct uploads, with calendar association and visibility controls';

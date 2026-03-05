-- ============================================================
-- ApexLeap - Migration 021: Landing page extensions
-- Media featured toggle, dynamic sections, GA4 analytics
-- ============================================================

-- media_items: toggle para publicar en landing
ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS landing_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_media_landing ON media_items(club_id, landing_featured);

-- clubs: toggles de secciones del landing + analytics
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS landing_show_media    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_show_results  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_show_schedule BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_show_stats    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS analytics_ga4_id      TEXT;

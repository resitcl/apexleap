-- ============================================================
-- ApexLeap - Migration 022: Landing page team & about sections
-- Show athletes, admins, categories, sport info
-- ============================================================

-- clubs: toggles para mostrar atletas y sección "sobre el club"
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS landing_show_athletes BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_show_about    BOOLEAN NOT NULL DEFAULT true;

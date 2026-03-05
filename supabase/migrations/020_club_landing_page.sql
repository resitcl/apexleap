-- ============================================================
-- ApexLeap - Migration 020: Club Landing Page
-- Adds landing page configuration fields to clubs table
-- ============================================================

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS landing_enabled      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_headline     TEXT,
  ADD COLUMN IF NOT EXISTS landing_description  TEXT,
  ADD COLUMN IF NOT EXISTS landing_show_team    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS landing_trial_enabled     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_trial_description TEXT,
  ADD COLUMN IF NOT EXISTS landing_trial_contact     TEXT,
  ADD COLUMN IF NOT EXISTS landing_cta_label    TEXT DEFAULT 'Iniciar sesión',
  ADD COLUMN IF NOT EXISTS landing_gallery      JSONB DEFAULT '[]';

-- ─── Trial requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trial_requests (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'enrolled', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trial_requests_club_id ON trial_requests(club_id);
ALTER TABLE trial_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trial_requests_service_role" ON trial_requests FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- ApexLeap - Migration 018: Club Invitations
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS club_invitations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id              UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'coach', 'athlete')),
  clerk_invitation_id  TEXT,                          -- Clerk's invitation ID
  invited_by           TEXT NOT NULL,                 -- Clerk user ID of inviter
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at          TIMESTAMPTZ,
  UNIQUE (club_id, email)
);

CREATE INDEX IF NOT EXISTS idx_club_invitations_club_id ON club_invitations(club_id);
CREATE INDEX IF NOT EXISTS idx_club_invitations_email   ON club_invitations(email);
CREATE INDEX IF NOT EXISTS idx_club_invitations_status  ON club_invitations(status);

ALTER TABLE club_invitations ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'club_invitations'
      AND policyname = 'service_role_all_invitations'
  ) THEN
    CREATE POLICY "service_role_all_invitations" ON club_invitations
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

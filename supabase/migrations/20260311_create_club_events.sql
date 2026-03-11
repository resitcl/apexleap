-- Club Events: tournaments, seminars, meetings, workshops, etc.
-- Especially useful for martial arts academies and studios.
CREATE TABLE IF NOT EXISTS club_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  event_type    text NOT NULL DEFAULT 'other',
  event_date    date NOT NULL,
  end_date      date,
  start_time    time,
  end_time      time,
  location      text,
  is_visible_to_athletes boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE club_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_events_tenant_isolation" ON club_events
  USING (club_id = current_setting('app.current_club_id', true)::uuid);

-- Index
CREATE INDEX idx_club_events_club ON club_events(club_id);
CREATE INDEX idx_club_events_date ON club_events(club_id, event_date);

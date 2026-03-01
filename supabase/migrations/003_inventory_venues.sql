-- ============================================================
-- INVENTORY ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'equipment',  -- equipment, uniform, infrastructure, other
  description  TEXT,
  quantity     INTEGER NOT NULL DEFAULT 1,
  quantity_min INTEGER NOT NULL DEFAULT 0,          -- alert if below this
  condition    TEXT NOT NULL DEFAULT 'good',        -- good, fair, poor, broken
  assigned_to  UUID REFERENCES athletes(id) ON DELETE SET NULL,
  purchase_date DATE,
  purchase_price NUMERIC(10,2),
  serial_number TEXT,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_club_id ON inventory_items(club_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_all" ON inventory_items FOR ALL
  USING (club_id = get_user_club_id());

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VENUES (if not already created)
-- ============================================================

CREATE TABLE IF NOT EXISTS venues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  lat             NUMERIC(10,7),
  lng             NUMERIC(10,7),
  geofence_radius INTEGER NOT NULL DEFAULT 100,
  capacity        INTEGER,
  is_home_venue   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_club_id ON venues(club_id);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_all" ON venues FOR ALL
  USING (club_id = get_user_club_id());

CREATE TRIGGER trg_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

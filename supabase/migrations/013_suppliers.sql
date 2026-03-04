-- ============================================================
-- ApexLeap - Migration 013: Suppliers (Proveedores)
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id      UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  rut          TEXT,
  bank_name    TEXT,
  account_type TEXT        CHECK (account_type IN ('corriente', 'vista', 'ahorro', 'rut', 'otra')),
  account_number TEXT,
  email        TEXT,
  phone        TEXT,
  category     TEXT        NOT NULL DEFAULT 'other',
  notes        TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- RLS: club members can only see their own suppliers
DROP POLICY IF EXISTS "suppliers_club_isolation" ON suppliers;
CREATE POLICY "suppliers_club_isolation"
  ON suppliers FOR ALL
  USING (club_id = (
    SELECT club_id FROM user_clubs
    WHERE user_id = auth.uid()::TEXT AND is_active = TRUE
    LIMIT 1
  ));

-- Link expenses to suppliers (nullable FK)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_suppliers_club ON suppliers(club_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id);

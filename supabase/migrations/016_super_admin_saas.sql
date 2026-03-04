-- ============================================================
-- ApexLeap - Migration 016: Super Admin + SaaS Infrastructure
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

-- ============================================================
-- 1. SUPER ADMINS table
-- ============================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    TEXT NOT NULL UNIQUE,  -- Clerk user ID
  email      TEXT,
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. SAAS PLANS (ApexLeap's own plans sold to clubs)
-- ============================================================
CREATE TABLE IF NOT EXISTS saas_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,          -- "Starter", "Growth", "Enterprise"
  slug            TEXT NOT NULL UNIQUE,
  price_monthly   INTEGER NOT NULL DEFAULT 0,  -- CLP
  price_annual    INTEGER NOT NULL DEFAULT 0,  -- CLP (yearly total)
  max_athletes    INTEGER,               -- NULL = unlimited
  max_coaches     INTEGER,
  max_venues      INTEGER,
  features        JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. CLUB SAAS SUBSCRIPTIONS (which SaaS plan each club is on)
-- ============================================================
CREATE TABLE IF NOT EXISTS club_saas_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
  saas_plan_id    UUID REFERENCES saas_plans(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('trialing','active','past_due','cancelled','paused')),
  billing_cycle   TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
  trial_ends_at   TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_saas_club_id ON club_saas_subscriptions(club_id);
CREATE INDEX IF NOT EXISTS idx_club_saas_status  ON club_saas_subscriptions(status);

-- ============================================================
-- 4. SAAS BILLING HISTORY (invoices per club)
-- ============================================================
CREATE TABLE IF NOT EXISTS saas_billing_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  saas_plan_id    UUID REFERENCES saas_plans(id) ON DELETE SET NULL,
  amount          INTEGER NOT NULL,     -- CLP
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','failed','refunded')),
  billing_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ,
  invoice_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_billing_club ON saas_billing_history(club_id);

-- ============================================================
-- 5. ADD is_active + status columns to clubs if missing
-- ============================================================
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS timezone     TEXT DEFAULT 'America/Santiago';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS notes        TEXT;  -- super admin internal notes

-- ============================================================
-- 6. SEED: SaaS Plans
-- ============================================================
INSERT INTO saas_plans (name, slug, price_monthly, price_annual, max_athletes, max_coaches, max_venues, features, display_order)
VALUES
  ('Starter',    'starter',    29900,  299000, 30,   2,  1,
   '["Dashboard","Atletas","Asistencia","Pagos básicos","1 Sede"]'::jsonb, 1),
  ('Growth',     'growth',     59900,  599000, 100,  5,  3,
   '["Todo Starter","Competencias","Nóminas","Documentos","Analytics","3 Sedes"]'::jsonb, 2),
  ('Enterprise', 'enterprise', 99900, 999000, NULL, NULL, NULL,
   '["Todo Growth","Atletas ilimitados","API acceso","Marca blanca","Soporte prioritario","Sedes ilimitadas"]'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 7. SEED: 2 Test Clubs (sin user_id — solo datos del club)
-- ============================================================
DO $$
DECLARE
  v_plan_starter  UUID;
  v_plan_growth   UUID;
  v_plan_ent      UUID;
  v_club_fut      UUID;
  v_club_yoga     UUID;
  v_today         DATE := CURRENT_DATE;
BEGIN
  SELECT id INTO v_plan_starter  FROM saas_plans WHERE slug = 'starter';
  SELECT id INTO v_plan_growth   FROM saas_plans WHERE slug = 'growth';
  SELECT id INTO v_plan_ent      FROM saas_plans WHERE slug = 'enterprise';

  -- Club 1: Fútbol
  INSERT INTO clubs (name, slug, sport_type, description, city, country, primary_color, secondary_color, phone, email, is_active)
  VALUES ('Club Deportivo Los Cóndores', 'club-condores', 'Fútbol',
    'Club de fútbol amateur con sede en Providencia. Fundado en 2015.',
    'Santiago', 'Chile', '#1d4ed8', '#ffffff', '+56 9 7777 1111', 'admin@condores.cl', true)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_club_fut;

  -- Club 2: Yoga
  INSERT INTO clubs (name, slug, sport_type, description, city, country, primary_color, secondary_color, phone, email, is_active)
  VALUES ('Yoga Flow Studio', 'yoga-flow-studio', 'Yoga',
    'Estudio de yoga y bienestar. Clases de Hatha, Vinyasa y Yin Yoga.',
    'Vitacura', 'Chile', '#7c3aed', '#f5f3ff', '+56 9 8888 2222', 'hola@yogaflow.cl', true)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_club_yoga;

  -- Only seed if clubs were actually inserted
  IF v_club_fut IS NOT NULL THEN
    -- Athletes for Fútbol club
    INSERT INTO athletes (club_id, name, email, phone, birth_date, status, health_status, category)
    VALUES
      (v_club_fut, 'Rodrigo Pizarro',    'r.pizarro@condores.cl',   '+56 9 1001 0001', '1998-03-10', 'active',   'healthy',     'Senior'),
      (v_club_fut, 'Bastián Mora',       'b.mora@condores.cl',      '+56 9 1001 0002', '2000-07-15', 'active',   'healthy',     'Senior'),
      (v_club_fut, 'Lucas Figueroa',     'l.figueroa@condores.cl',  '+56 9 1001 0003', '1997-11-22', 'active',   'injured',     'Senior'),
      (v_club_fut, 'Tomás Contreras',    't.contreras@condores.cl', '+56 9 1001 0004', '2002-05-08', 'active',   'healthy',     'Sub-20'),
      (v_club_fut, 'Emilio Salas',       'e.salas@condores.cl',     '+56 9 1001 0005', '2003-09-30', 'active',   'healthy',     'Sub-20'),
      (v_club_fut, 'Nicolás Espinoza',   'n.espinoza@condores.cl',  '+56 9 1001 0006', '1999-01-17', 'active',   'observation', 'Senior'),
      (v_club_fut, 'Felipe Rojas',       'f.rojas@condores.cl',     '+56 9 1001 0007', '1995-04-25', 'inactive', 'healthy',     'Senior'),
      (v_club_fut, 'Ignacio Bravo',      'i.bravo@condores.cl',     '+56 9 1001 0008', '2001-08-12', 'active',   'healthy',     'Sub-20'),
      (v_club_fut, 'Diego Sepúlveda',    'd.sepulveda@condores.cl', '+56 9 1001 0009', '1996-12-03', 'active',   'healthy',     'Senior'),
      (v_club_fut, 'Andrés Valenzuela',  'a.valenzuela@condores.cl','+56 9 1001 0010', '2004-06-19', 'active',   'healthy',     'Sub-20'),
      (v_club_fut, 'Cristóbal Muñiz',    'c.muniz@condores.cl',     '+56 9 1001 0011', '1993-02-28', 'active',   'healthy',     'Senior'),
      (v_club_fut, 'Mateo Ibáñez',       'm.ibanez@condores.cl',    '+56 9 1001 0012', '1999-10-14', 'active',   'healthy',     'Senior');

    -- SaaS subscription for Fútbol club (Growth plan)
    INSERT INTO club_saas_subscriptions (club_id, saas_plan_id, status, billing_cycle, current_period_start, current_period_end)
    VALUES (v_club_fut, v_plan_growth, 'active', 'monthly', v_today - 20, v_today + 10);

    -- Billing history
    INSERT INTO saas_billing_history (club_id, saas_plan_id, amount, status, billing_date, paid_at)
    VALUES
      (v_club_fut, v_plan_growth, 59900, 'paid', (v_today - 50)::TIMESTAMPTZ, (v_today - 50 + 1)::TIMESTAMPTZ),
      (v_club_fut, v_plan_growth, 59900, 'paid', (v_today - 20)::TIMESTAMPTZ, (v_today - 20 + 0)::TIMESTAMPTZ);
  END IF;

  IF v_club_yoga IS NOT NULL THEN
    -- Athletes for Yoga club
    INSERT INTO athletes (club_id, name, email, phone, birth_date, status, health_status, category)
    VALUES
      (v_club_yoga, 'Catalina Reyes',    'c.reyes@yogaflow.cl',    '+56 9 2001 0001', '1990-04-12', 'active', 'healthy', 'Avanzado'),
      (v_club_yoga, 'Sofía Montoya',     's.montoya@yogaflow.cl',  '+56 9 2001 0002', '1988-09-25', 'active', 'healthy', 'Avanzado'),
      (v_club_yoga, 'Valentina Poblete', 'v.poblete@yogaflow.cl',  '+56 9 2001 0003', '1995-01-07', 'active', 'healthy', 'Intermedio'),
      (v_club_yoga, 'María José Leal',   'mj.leal@yogaflow.cl',    '+56 9 2001 0004', '1992-06-30', 'active', 'healthy', 'Intermedio'),
      (v_club_yoga, 'Francisca Ojeda',   'f.ojeda@yogaflow.cl',    '+56 9 2001 0005', '1997-11-15', 'active', 'healthy', 'Principiante'),
      (v_club_yoga, 'Isadora Villalobos','i.villalobos@yogaflow.cl','+56 9 2001 0006', '2000-03-22', 'active', 'healthy', 'Principiante'),
      (v_club_yoga, 'Camila Donoso',     'c.donoso@yogaflow.cl',   '+56 9 2001 0007', '1993-08-08', 'active', 'healthy', 'Avanzado'),
      (v_club_yoga, 'Antonia Venegas',   'a.venegas@yogaflow.cl',  '+56 9 2001 0008', '1998-12-01', 'active', 'healthy', 'Intermedio');

    -- SaaS subscription for Yoga (Starter, trialing)
    INSERT INTO club_saas_subscriptions (club_id, saas_plan_id, status, billing_cycle, trial_ends_at, current_period_start, current_period_end)
    VALUES (v_club_yoga, v_plan_starter, 'trialing', 'monthly', v_today + 7, v_today - 7, v_today + 23);

    -- Billing history (just one)
    INSERT INTO saas_billing_history (club_id, saas_plan_id, amount, status, billing_date)
    VALUES (v_club_yoga, v_plan_starter, 29900, 'pending', v_today::TIMESTAMPTZ);
  END IF;
END $$;

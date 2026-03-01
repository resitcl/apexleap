-- ============================================================
-- ApexLeap - Seed Data (Default rules for new clubs)
-- ============================================================

-- Function to insert default rules when a new club is created
CREATE OR REPLACE FUNCTION create_default_rules_for_club(p_club_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rules (club_id, name, type, config, is_active) VALUES
    (
      p_club_id,
      'Bloqueo por Deuda',
      'financial',
      '{"max_overdue_months": 1, "block_actions": ["nomina", "content"]}',
      true
    ),
    (
      p_club_id,
      'Asistencia Mínima para Partidos',
      'attendance',
      '{"min_percentage": 70, "period_days": 30, "block_actions": ["nomina"]}',
      true
    ),
    (
      p_club_id,
      'Documentación Obligatoria',
      'documentation',
      '{"required_docs": ["ficha_medica"], "block_actions": ["all"]}',
      true
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create default rules when a club is created
CREATE OR REPLACE FUNCTION trigger_create_default_rules()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_rules_for_club(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_club_default_rules
  AFTER INSERT ON clubs
  FOR EACH ROW EXECUTE FUNCTION trigger_create_default_rules();

-- ============================================================
-- DEMO CLUB (optional - run manually to populate demo data)
-- Replace DEMO_USER_CLERK_ID with your actual Clerk user ID
-- ============================================================

DO $$
DECLARE
  v_club_id    UUID;
  v_plan_basico UUID;
  v_plan_intermedio UUID;
  v_plan_elite UUID;
  v_venue_id   UUID;
  v_sched_bjj  UUID;
  v_sched_muay UUID;
  a1 UUID; a2 UUID; a3 UUID; a4 UUID; a5 UUID; a6 UUID; a7 UUID; a8 UUID;
BEGIN

-- Club principal
INSERT INTO clubs (id, name, slug, sport_type, city, country, timezone, primary_color, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Dojo Samurai Santiago',
  'dojo-samurai',
  'BJJ / MMA',
  'Santiago',
  'Chile',
  'America/Santiago',
  '#1a1a2e',
  true
)
ON CONFLICT (slug) DO NOTHING;

v_club_id := '00000000-0000-0000-0000-000000000001';

-- Sede
INSERT INTO venues (id, club_id, name, address, city, lat, lng, geofence_radius, capacity, is_home_venue, is_active)
VALUES (
  '00000000-0000-0000-0001-000000000001',
  v_club_id,
  'Dojo Central',
  'Av. Providencia 1234',
  'Santiago',
  -33.4372,
  -70.6506,
  100,
  40,
  true,
  true
) ON CONFLICT DO NOTHING;
v_venue_id := '00000000-0000-0000-0001-000000000001';

-- Planes
INSERT INTO plans (id, club_id, name, description, price, billing_cycle, session_limit, is_active)
VALUES
  ('00000000-0000-0000-0002-000000000001', v_club_id, 'Plan Básico', '2 clases semanales de BJJ', 35000, 'monthly', 8, true),
  ('00000000-0000-0000-0002-000000000002', v_club_id, 'Plan Intermedio', 'Acceso ilimitado BJJ + Muay Thai', 55000, 'monthly', NULL, true),
  ('00000000-0000-0000-0002-000000000003', v_club_id, 'Plan Elite', 'Todo incluido + clases privadas mensuales', 85000, 'monthly', NULL, true)
ON CONFLICT DO NOTHING;
v_plan_basico      := '00000000-0000-0000-0002-000000000001';
v_plan_intermedio  := '00000000-0000-0000-0002-000000000002';
v_plan_elite       := '00000000-0000-0000-0002-000000000003';

-- Horarios
INSERT INTO schedules (id, club_id, venue_id, name, day_of_week, start_time, end_time, start_date, capacity, access_rule, is_active)
VALUES
  ('00000000-0000-0000-0003-000000000001', v_club_id, v_venue_id, 'BJJ Fundamentales', ARRAY[1,3,5], '19:00', '20:30', '2026-01-01', 20, 'subscription', true),
  ('00000000-0000-0000-0003-000000000002', v_club_id, v_venue_id, 'Muay Thai', ARRAY[2,4], '20:30', '22:00', '2026-01-01', 15, 'subscription', true)
ON CONFLICT DO NOTHING;
v_sched_bjj  := '00000000-0000-0000-0003-000000000001';
v_sched_muay := '00000000-0000-0000-0003-000000000002';

-- Atletas
a1 := gen_random_uuid();
a2 := gen_random_uuid();
a3 := gen_random_uuid();
a4 := gen_random_uuid();
a5 := gen_random_uuid();
a6 := gen_random_uuid();
a7 := gen_random_uuid();
a8 := gen_random_uuid();

INSERT INTO athletes (id, club_id, name, email, phone, document_number, birth_date, status, health_status, technical_meta)
VALUES
  (a1, v_club_id, 'Carlos Muñoz',    'carlos@demo.cl',   '+56912345601', '12345678-9', '1992-03-15', 'active',    'healthy',     '{"belt": "Azul", "stripes": 3}'),
  (a2, v_club_id, 'Ana Torres',      'ana@demo.cl',      '+56912345602', '23456789-0', '1998-07-22', 'active',    'healthy',     '{"belt": "Blanca", "stripes": 4}'),
  (a3, v_club_id, 'Luis Herrera',    'luis@demo.cl',     '+56912345603', '34567890-1', '1990-11-08', 'active',    'observation', '{"belt": "Morada", "stripes": 1}'),
  (a4, v_club_id, 'María González',  'maria@demo.cl',    '+56912345604', '45678901-2', '2000-04-30', 'active',    'healthy',     '{"belt": "Azul", "stripes": 0}'),
  (a5, v_club_id, 'Pablo Riquelme',  'pablo@demo.cl',    '+56912345605', '56789012-3', '1995-08-14', 'active',    'injured',     '{"belt": "Café", "stripes": 2}'),
  (a6, v_club_id, 'Javiera Soto',    'javiera@demo.cl',  '+56912345606', '67890123-4', '2001-12-05', 'active',    'healthy',     '{"belt": "Blanca", "stripes": 2}'),
  (a7, v_club_id, 'Andrés Díaz',     'andres@demo.cl',   '+56912345607', '78901234-5', '1988-06-20', 'suspended', 'healthy',     '{"belt": "Negra", "stripes": 0}'),
  (a8, v_club_id, 'Valentina Pino',  'valentina@demo.cl','+56912345608', '89012345-6', '1997-09-11', 'active',    'healthy',     '{"belt": "Verde", "stripes": 3}')
ON CONFLICT DO NOTHING;

-- Lesión activa para Pablo
INSERT INTO injuries (club_id, athlete_id, diagnosis, severity, start_date, estimated_recovery, notes)
VALUES (v_club_id, a5, 'Esguince tobillo derecho', 'moderate', '2026-02-15', '2026-03-15', 'Reposo 4 semanas')
ON CONFLICT DO NOTHING;

-- Suscripciones
INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, auto_renew, payment_method)
VALUES
  (v_club_id, a1, v_plan_intermedio, 'active',    '2026-01-01', true,  'transfer'),
  (v_club_id, a2, v_plan_basico,     'active',    '2026-02-01', true,  'cash'),
  (v_club_id, a3, v_plan_elite,      'active',    '2026-01-01', true,  'webpay'),
  (v_club_id, a4, v_plan_basico,     'active',    '2026-02-15', false, 'transfer'),
  (v_club_id, a5, v_plan_intermedio, 'paused',    '2026-01-01', true,  'transfer'),
  (v_club_id, a6, v_plan_basico,     'active',    '2026-03-01', true,  'cash'),
  (v_club_id, a8, v_plan_elite,      'active',    '2025-11-01', true,  'webpay')
ON CONFLICT DO NOTHING;

-- Pagos
INSERT INTO payments (club_id, athlete_id, plan_id, concept, amount, status, due_date, paid_at, payment_method)
VALUES
  (v_club_id, a1, v_plan_intermedio, 'Mensualidad Enero 2026',   55000, 'paid',    '2026-01-05', '2026-01-03 10:00:00', 'transfer'),
  (v_club_id, a1, v_plan_intermedio, 'Mensualidad Febrero 2026', 55000, 'paid',    '2026-02-05', '2026-02-04 09:30:00', 'transfer'),
  (v_club_id, a1, v_plan_intermedio, 'Mensualidad Marzo 2026',   55000, 'pending', '2026-03-05', NULL,                  'transfer'),
  (v_club_id, a2, v_plan_basico,     'Mensualidad Febrero 2026', 35000, 'paid',    '2026-02-10', '2026-02-09 15:00:00', 'cash'),
  (v_club_id, a2, v_plan_basico,     'Mensualidad Marzo 2026',   35000, 'pending', '2026-03-10', NULL,                  'cash'),
  (v_club_id, a3, v_plan_elite,      'Mensualidad Enero 2026',   85000, 'paid',    '2026-01-05', '2026-01-05 11:00:00', 'webpay'),
  (v_club_id, a3, v_plan_elite,      'Mensualidad Febrero 2026', 85000, 'paid',    '2026-02-05', '2026-02-05 11:00:00', 'webpay'),
  (v_club_id, a3, v_plan_elite,      'Mensualidad Marzo 2026',   85000, 'pending', '2026-03-05', NULL,                  'webpay'),
  (v_club_id, a4, v_plan_basico,     'Mensualidad Febrero 2026', 35000, 'overdue', '2026-02-28', NULL,                  'transfer'),
  (v_club_id, a5, v_plan_intermedio, 'Mensualidad Febrero 2026', 55000, 'overdue', '2026-02-05', NULL,                  'transfer'),
  (v_club_id, a6, v_plan_basico,     'Mensualidad Marzo 2026',   35000, 'pending', '2026-03-10', NULL,                  'cash'),
  (v_club_id, a8, v_plan_elite,      'Mensualidad Enero 2026',   85000, 'paid',    '2026-01-05', '2026-01-04 08:00:00', 'webpay'),
  (v_club_id, a8, v_plan_elite,      'Mensualidad Febrero 2026', 85000, 'paid',    '2026-02-05', '2026-02-04 08:00:00', 'webpay'),
  (v_club_id, a8, v_plan_elite,      'Mensualidad Marzo 2026',   85000, 'paid',    '2026-03-05', '2026-03-04 08:00:00', 'webpay')
ON CONFLICT DO NOTHING;

-- Asistencia (últimas 3 semanas)
INSERT INTO attendance (club_id, athlete_id, schedule_id, checked_in_at, is_valid)
SELECT v_club_id, a, v_sched_bjj, ts, true
FROM (
  VALUES
    (a1, NOW() - INTERVAL '1 day'),  (a1, NOW() - INTERVAL '3 days'), (a1, NOW() - INTERVAL '5 days'),
    (a1, NOW() - INTERVAL '8 days'), (a1, NOW() - INTERVAL '10 days'),(a1, NOW() - INTERVAL '12 days'),
    (a2, NOW() - INTERVAL '1 day'),  (a2, NOW() - INTERVAL '5 days'), (a2, NOW() - INTERVAL '8 days'),
    (a3, NOW() - INTERVAL '1 day'),  (a3, NOW() - INTERVAL '3 days'), (a3, NOW() - INTERVAL '5 days'),
    (a3, NOW() - INTERVAL '8 days'), (a3, NOW() - INTERVAL '10 days'),(a3, NOW() - INTERVAL '12 days'),
    (a3, NOW() - INTERVAL '15 days'),(a3, NOW() - INTERVAL '17 days'),
    (a4, NOW() - INTERVAL '3 days'), (a4, NOW() - INTERVAL '10 days'),
    (a6, NOW() - INTERVAL '1 day'),  (a6, NOW() - INTERVAL '5 days'),
    (a8, NOW() - INTERVAL '1 day'),  (a8, NOW() - INTERVAL '3 days'), (a8, NOW() - INTERVAL '5 days'),
    (a8, NOW() - INTERVAL '8 days'), (a8, NOW() - INTERVAL '10 days'),(a8, NOW() - INTERVAL '12 days'),
    (a8, NOW() - INTERVAL '15 days')
) AS t(a, ts)
ON CONFLICT DO NOTHING;

-- Egresos de demo
INSERT INTO expenses (club_id, concept, category, amount, date, paid_to)
VALUES
  (v_club_id, 'Arriendo Dojo Febrero', 'rent',        350000, '2026-02-01', 'Inmobiliaria Norte'),
  (v_club_id, 'Electricidad Febrero',  'maintenance',  45000, '2026-02-10', 'Empresa Eléctrica'),
  (v_club_id, 'Colchonetas nuevas',    'supplies',    120000, '2026-02-15', 'Deportes Total'),
  (v_club_id, 'Arriendo Dojo Marzo',   'rent',        350000, '2026-03-01', 'Inmobiliaria Norte'),
  (v_club_id, 'Limpieza mensual',      'maintenance',  30000, '2026-03-05', 'Servicio Aseo')
ON CONFLICT DO NOTHING;

END $$;

-- NOTE: To link the demo club to your Clerk user, run:
-- INSERT INTO user_clubs (user_id, club_id, role, is_active)
-- VALUES ('YOUR_CLERK_USER_ID', '00000000-0000-0000-0000-000000000001', 'admin', true)
-- ON CONFLICT DO NOTHING;

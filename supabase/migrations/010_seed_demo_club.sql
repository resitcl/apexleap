-- ============================================================
-- ApexLeap - Script 010: SEED DEMO CLUB (Datos de prueba completos)
-- ⚠️  ANTES DE EJECUTAR:
--   1. Busca tu Clerk User ID en: https://dashboard.clerk.com
--      → Users → tu usuario → copia el ID (empieza con "user_")
--   2. Reemplaza 'REEMPLAZA_CON_TU_CLERK_ID' abajo con ese valor
--   3. Ejecuta en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  -- ┌─────────────────────────────────────────┐
  -- │  ⚙️  CONFIGURA TU CLERK USER ID AQUÍ    │
  -- └─────────────────────────────────────────┘
  v_clerk_id TEXT := 'user_3AOX9Z0LBHKQpPgCLcGx1b1mOOb';

  -- IDs generados
  v_club_id       UUID;
  v_venue1_id     UUID;
  v_venue2_id     UUID;
  v_plan1_id      UUID;
  v_plan2_id      UUID;
  v_plan3_id      UUID;
  v_plan4_id      UUID;
  v_coach1_id     UUID;
  v_coach2_id     UUID;
  v_coach3_id     UUID;
  v_ath1_id       UUID;
  v_ath2_id       UUID;
  v_ath3_id       UUID;
  v_ath4_id       UUID;
  v_ath5_id       UUID;
  v_ath6_id       UUID;
  v_ath7_id       UUID;
  v_ath8_id       UUID;
  v_ath9_id       UUID;
  v_ath10_id      UUID;
  v_ath11_id      UUID;
  v_ath12_id      UUID;
  v_ath13_id      UUID;
  v_ath14_id      UUID;
  v_ath15_id      UUID;
  v_ath16_id      UUID;
  v_ath17_id      UUID;
  v_ath18_id      UUID;
  v_sched1_id     UUID;
  v_sched2_id     UUID;
  v_sched3_id     UUID;
  v_sched4_id     UUID;
  v_sched5_id     UUID;
  v_rule1_id      UUID;
  v_rule2_id      UUID;
  v_rule3_id      UUID;
  v_rule4_id      UUID;
  v_comp1_id      UUID;
  v_comp2_id      UUID;
  v_comp3_id      UUID;
  v_roster1_id    UUID;
  v_roster2_id    UUID;
  v_sub1_id       UUID;
  v_sub2_id       UUID;
  v_sub3_id       UUID;
  v_inj1_id       UUID;
  v_today         DATE := CURRENT_DATE;

BEGIN

  IF v_clerk_id = 'REEMPLAZA_CON_TU_CLERK_ID' THEN
    RAISE EXCEPTION '❌ Debes reemplazar v_clerk_id con tu Clerk User ID real antes de ejecutar este script.';
  END IF;

  -- ============================================================
  -- 1. CLUB
  -- ============================================================
  INSERT INTO clubs (name, slug, sport_type, description, city, country, timezone, primary_color, secondary_color, phone, email, is_active)
  VALUES (
    'Academia Dragón - Demo',
    'academia-dragon-demo',
    'Artes Marciales',
    'Club de demostración con datos de prueba para explorar todas las funcionalidades de ApexLeap.',
    'Santiago',
    'Chile',
    'America/Santiago',
    '#dc2626',
    '#ffffff',
    '+56 9 9999 0000',
    'demo@academiadragon.cl',
    true
  )
  RETURNING id INTO v_club_id;

  -- ============================================================
  -- 2. VINCULAR USUARIO AL CLUB (Admin)
  -- ============================================================
  INSERT INTO user_clubs (user_id, club_id, role, is_active)
  VALUES (v_clerk_id, v_club_id, 'admin', true)
  ON CONFLICT (user_id, club_id) DO UPDATE SET role = 'admin', is_active = true;

  -- ============================================================
  -- 3. SEDES (Venues)
  -- ============================================================
  INSERT INTO venues (club_id, name, address, city, lat, lng, geofence_radius, capacity, is_home_venue, is_active)
  VALUES (v_club_id, 'Dojo Principal', 'Av. Providencia 1234', 'Santiago', -33.4317, -70.6093, 50, 40, true, true)
  RETURNING id INTO v_venue1_id;

  INSERT INTO venues (club_id, name, address, city, lat, lng, geofence_radius, capacity, is_home_venue, is_active)
  VALUES (v_club_id, 'Sede Norte', 'Av. La Paz 567, Recoleta', 'Santiago', -33.3971, -70.6355, 50, 25, false, true)
  RETURNING id INTO v_venue2_id;

  -- ============================================================
  -- 4. PLANES
  -- ============================================================
  INSERT INTO plans (club_id, name, description, price, enrollment_fee, billing_cycle, session_limit, multi_sede, content_level, grace_period_days, is_visible, is_active)
  VALUES (v_club_id, 'Plan Básico', 'Acceso 2 veces por semana. Ideal para principiantes.', 35000, 15000, 'monthly', 8, false, 'basic', 3, true, true)
  RETURNING id INTO v_plan1_id;

  INSERT INTO plans (club_id, name, description, price, enrollment_fee, billing_cycle, session_limit, multi_sede, content_level, grace_period_days, is_visible, is_active)
  VALUES (v_club_id, 'Plan Intermedio', 'Acceso 4 veces por semana. Para practicantes regulares.', 55000, 15000, 'monthly', 16, false, 'intermediate', 3, true, true)
  RETURNING id INTO v_plan2_id;

  INSERT INTO plans (club_id, name, description, price, enrollment_fee, billing_cycle, session_limit, multi_sede, content_level, grace_period_days, is_visible, is_active)
  VALUES (v_club_id, 'Plan Elite', 'Acceso ilimitado a todas las clases y sedes. Sin restricciones.', 85000, 20000, 'monthly', NULL, true, 'pro', 5, true, true)
  RETURNING id INTO v_plan3_id;

  INSERT INTO plans (club_id, name, description, price, enrollment_fee, billing_cycle, session_limit, multi_sede, content_level, grace_period_days, is_visible, is_active)
  VALUES (v_club_id, 'Plan Semestral', 'Pago semestral con 15% de descuento. Acceso ilimitado.', 430000, 0, 'semiannual', NULL, true, 'pro', 7, true, true)
  RETURNING id INTO v_plan4_id;

  -- ============================================================
  -- 5. ENTRENADORES (Coaches)
  -- ============================================================
  INSERT INTO coaches (club_id, name, email, phone, specialty, salary_type, salary_amount, is_active)
  VALUES (v_club_id, 'Carlos Mendoza', 'carlos.mendoza@academiadragon.cl', '+56 9 8111 2222', 'Karate / Judo', 'fixed', 800000, true)
  RETURNING id INTO v_coach1_id;

  INSERT INTO coaches (club_id, name, email, phone, specialty, salary_type, salary_amount, is_active)
  VALUES (v_club_id, 'Ana Torres', 'ana.torres@academiadragon.cl', '+56 9 8333 4444', 'Taekwondo / Kickboxing', 'fixed', 650000, true)
  RETURNING id INTO v_coach2_id;

  INSERT INTO coaches (club_id, name, email, phone, specialty, salary_type, salary_amount, is_active)
  VALUES (v_club_id, 'Pedro Silva', 'pedro.silva@academiadragon.cl', '+56 9 8555 6666', 'Preparación Física', 'fixed', 500000, true)
  RETURNING id INTO v_coach3_id;

  -- ============================================================
  -- 6. ATLETAS (18 con estados variados)
  -- ============================================================
  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone, notes)
  VALUES (v_club_id, 'Marco Rodríguez', 'marco.rodriguez@gmail.com', '+56 9 7111 0001', '12.345.678-9', '1995-03-15', 'active', 'healthy',
    '{"wins":12,"losses":3,"competitions":8}', '{"belt":"negro","dan":1,"category":"senior"}',
    'Laura Rodríguez', '+56 9 7200 0001', 'Capitán del equipo. Excelente actitud.')
  RETURNING id INTO v_ath1_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Valentina Castro', 'valentina.castro@gmail.com', '+56 9 7111 0002', '13.456.789-0', '1998-07-22', 'active', 'healthy',
    '{"wins":8,"losses":2,"competitions":5}', '{"belt":"cafe","dan":0,"category":"senior"}',
    'Roberto Castro', '+56 9 7200 0002')
  RETURNING id INTO v_ath2_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone, notes)
  VALUES (v_club_id, 'Diego Muñoz', 'diego.munoz@gmail.com', '+56 9 7111 0003', '14.567.890-1', '1993-11-08', 'active', 'injured',
    '{"wins":15,"losses":5,"competitions":12}', '{"belt":"negro","dan":2,"category":"senior"}',
    'Carmen Muñoz', '+56 9 7200 0003', 'Lesión en rodilla derecha. Reposo 3 semanas.')
  RETURNING id INTO v_ath3_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Camila Herrera', 'camila.herrera@gmail.com', '+56 9 7111 0004', '15.678.901-2', '2001-05-30', 'active', 'healthy',
    '{"wins":4,"losses":1,"competitions":3}', '{"belt":"verde","dan":0,"category":"junior"}',
    'José Herrera', '+56 9 7200 0004')
  RETURNING id INTO v_ath4_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone, notes)
  VALUES (v_club_id, 'Sebastián López', 'sebastian.lopez@gmail.com', '+56 9 7111 0005', '16.789.012-3', '1999-09-14', 'active', 'observation',
    '{"wins":6,"losses":4,"competitions":6}', '{"belt":"azul","dan":0,"category":"senior"}',
    'María López', '+56 9 7200 0005', 'En observación por fatiga crónica. Reducir intensidad.')
  RETURNING id INTO v_ath5_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Fernanda Torres', 'fernanda.torres@gmail.com', '+56 9 7111 0006', '17.890.123-4', '1996-01-25', 'active', 'healthy',
    '{"wins":10,"losses":2,"competitions":7}', '{"belt":"cafe","dan":0,"category":"senior"}',
    'Hugo Torres', '+56 9 7200 0006')
  RETURNING id INTO v_ath6_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone, notes)
  VALUES (v_club_id, 'Alejandro García', 'alejandro.garcia@gmail.com', '+56 9 7111 0007', '18.901.234-5', '1990-06-18', 'inactive', 'healthy',
    '{"wins":20,"losses":8,"competitions":15}', '{"belt":"negro","dan":3,"category":"senior"}',
    'Isabel García', '+56 9 7200 0007', 'Inactivo desde octubre. Posible reincorporación.')
  RETURNING id INTO v_ath7_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Isidora Martínez', 'isidora.martinez@gmail.com', '+56 9 7111 0008', '19.012.345-6', '2003-12-03', 'active', 'healthy',
    '{"wins":2,"losses":0,"competitions":1}', '{"belt":"amarillo","dan":0,"category":"junior"}',
    'Patricia Martínez', '+56 9 7200 0008')
  RETURNING id INTO v_ath8_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Matías Soto', 'matias.soto@gmail.com', '+56 9 7111 0009', '20.123.456-7', '1997-04-11', 'active', 'healthy',
    '{"wins":9,"losses":3,"competitions":8}', '{"belt":"cafe","dan":0,"category":"senior"}',
    'Rosa Soto', '+56 9 7200 0009')
  RETURNING id INTO v_ath9_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone, notes)
  VALUES (v_club_id, 'Constanza Ramos', 'constanza.ramos@gmail.com', '+56 9 7111 0010', '21.234.567-8', '2000-08-27', 'active', 'observation',
    '{"wins":3,"losses":2,"competitions":3}', '{"belt":"verde","dan":0,"category":"senior"}',
    'Andrés Ramos', '+56 9 7200 0010', 'Control médico pendiente. No competir hasta resultado.')
  RETURNING id INTO v_ath10_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Felipe Díaz', 'felipe.diaz@gmail.com', '+56 9 7111 0011', '22.345.678-9', '1994-02-19', 'active', 'healthy',
    '{"wins":11,"losses":6,"competitions":10}', '{"belt":"negro","dan":1,"category":"senior"}',
    'Gloria Díaz', '+56 9 7200 0011')
  RETURNING id INTO v_ath11_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Javiera Pérez', 'javiera.perez@gmail.com', '+56 9 7111 0012', '23.456.789-0', '2002-10-05', 'active', 'healthy',
    '{"wins":5,"losses":1,"competitions":4}', '{"belt":"azul","dan":0,"category":"junior"}',
    'Luis Pérez', '+56 9 7200 0012')
  RETURNING id INTO v_ath12_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone, notes)
  VALUES (v_club_id, 'Tomás Vargas', 'tomas.vargas@gmail.com', '+56 9 7111 0013', '24.567.890-1', '1991-07-31', 'suspended', 'healthy',
    '{"wins":7,"losses":5,"competitions":7}', '{"belt":"cafe","dan":0,"category":"senior"}',
    'Elena Vargas', '+56 9 7200 0013', 'Suspendido por incumplimiento del reglamento.')
  RETURNING id INTO v_ath13_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Daniela Morales', 'daniela.morales@gmail.com', '+56 9 7111 0014', '25.678.901-2', '1999-03-22', 'active', 'healthy',
    '{"wins":6,"losses":2,"competitions":5}', '{"belt":"azul","dan":0,"category":"senior"}',
    'Ricardo Morales', '+56 9 7200 0014')
  RETURNING id INTO v_ath14_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone, notes)
  VALUES (v_club_id, 'Rodrigo Fuentes', 'rodrigo.fuentes@gmail.com', '+56 9 7111 0015', '26.789.012-3', '1996-09-09', 'active', 'injured',
    '{"wins":8,"losses":4,"competitions":9}', '{"belt":"negro","dan":1,"category":"senior"}',
    'Teresa Fuentes', '+56 9 7200 0015', 'Esguince de tobillo izquierdo. Reposo 2 semanas.')
  RETURNING id INTO v_ath15_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Sofía Núñez', 'sofia.nunez@gmail.com', '+56 9 7111 0016', '27.890.123-4', '2004-01-14', 'active', 'healthy',
    '{"wins":1,"losses":0,"competitions":1}', '{"belt":"blanco","dan":0,"category":"junior"}',
    'Pablo Núñez', '+56 9 7200 0016')
  RETURNING id INTO v_ath16_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Cristóbal Araya', 'cristobal.araya@gmail.com', '+56 9 7111 0017', '28.901.234-5', '1998-05-28', 'active', 'healthy',
    '{"wins":7,"losses":3,"competitions":6}', '{"belt":"cafe","dan":0,"category":"senior"}',
    'Marta Araya', '+56 9 7200 0017')
  RETURNING id INTO v_ath17_id;

  INSERT INTO athletes (club_id, name, email, phone, document_number, birth_date, status, health_status, performance_meta, technical_meta, emergency_contact, emergency_phone)
  VALUES (v_club_id, 'Antonia Vidal', 'antonia.vidal@gmail.com', '+56 9 7111 0018', '29.012.345-6', '2001-11-17', 'active', 'healthy',
    '{"wins":4,"losses":1,"competitions":4}', '{"belt":"verde","dan":0,"category":"junior"}',
    'Claudio Vidal', '+56 9 7200 0018')
  RETURNING id INTO v_ath18_id;

  -- ============================================================
  -- 7. LESIONES (Injuries)
  -- ============================================================
  INSERT INTO injuries (club_id, athlete_id, diagnosis, severity, start_date, estimated_recovery, notes, created_by)
  VALUES (v_club_id, v_ath3_id, 'Lesión ligamentaria rodilla derecha', 'moderate',
    v_today - 10, v_today + 11,
    'Fisioterapia 3 veces por semana. No hacer impacto.', v_clerk_id)
  RETURNING id INTO v_inj1_id;

  INSERT INTO injuries (club_id, athlete_id, diagnosis, severity, start_date, estimated_recovery, notes, created_by)
  VALUES (v_club_id, v_ath15_id, 'Esguince grado II tobillo izquierdo', 'mild',
    v_today - 5, v_today + 9,
    'Reposo relativo. Puede asistir a entrenamientos sin contacto.', v_clerk_id);

  -- ============================================================
  -- 8. SUSCRIPCIONES
  -- ============================================================
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath1_id, v_plan3_id, 'active', v_today - 90, NULL, true, 'transfer')
  RETURNING id INTO v_sub1_id;

  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath2_id, v_plan2_id, 'active', v_today - 60, NULL, true, 'webpay')
  RETURNING id INTO v_sub2_id;

  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath3_id, v_plan3_id, 'paused', v_today - 45, NULL, false, 'cash');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath4_id, v_plan1_id, 'active', v_today - 30, NULL, true, 'mercadopago');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath5_id, v_plan2_id, 'active', v_today - 75, NULL, true, 'webpay');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath6_id, v_plan3_id, 'active', v_today - 120, NULL, true, 'transfer');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew)
  VALUES (v_club_id, v_ath7_id, v_plan2_id, 'cancelled', v_today - 180, v_today - 30, false);
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath8_id, v_plan1_id, 'active', v_today - 15, NULL, true, 'cash');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath9_id, v_plan2_id, 'active', v_today - 90, NULL, true, 'webpay');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew)
  VALUES (v_club_id, v_ath10_id, v_plan1_id, 'active', v_today - 60, NULL, false);
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath11_id, v_plan3_id, 'active', v_today - 150, NULL, true, 'transfer');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath12_id, v_plan2_id, 'active', v_today - 45, NULL, true, 'mercadopago');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew)
  VALUES (v_club_id, v_ath13_id, v_plan1_id, 'cancelled', v_today - 90, v_today - 15, false);
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath14_id, v_plan2_id, 'active', v_today - 30, NULL, true, 'webpay');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath15_id, v_plan3_id, 'active', v_today - 200, NULL, true, 'transfer');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath16_id, v_plan1_id, 'active', v_today - 7, NULL, false, 'cash');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath17_id, v_plan2_id, 'active', v_today - 60, NULL, true, 'webpay');
  INSERT INTO subscriptions (club_id, athlete_id, plan_id, status, start_date, end_date, auto_renew, payment_method)
  VALUES (v_club_id, v_ath18_id, v_plan4_id, 'active', v_today - 90, v_today + 90, false, 'transfer');

  -- ============================================================
  -- 9. PAGOS (mix de estados y meses para los gráficos)
  -- ============================================================
  -- Pagos históricos PAGADOS (para alimentar gráficos de 6 meses)
  INSERT INTO payments (club_id, athlete_id, plan_id, concept, amount, status, due_date, paid_at, payment_method)
  VALUES
    (v_club_id, v_ath1_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-150, (v_today-150+2)::TIMESTAMPTZ, 'transfer'),
    (v_club_id, v_ath1_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-120, (v_today-120+1)::TIMESTAMPTZ, 'transfer'),
    (v_club_id, v_ath1_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-90,  (v_today-90+3)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath1_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-60,  (v_today-60+1)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath1_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-30,  (v_today-30+2)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath2_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-120, (v_today-120+1)::TIMESTAMPTZ, 'webpay'),
    (v_club_id, v_ath2_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-90,  (v_today-90+0)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath2_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-60,  (v_today-60+1)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath2_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-30,  (v_today-30+0)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath4_id,  v_plan1_id, 'Matrícula Plan Básico',       15000, 'paid', v_today-30,  (v_today-30+1)::TIMESTAMPTZ,  'mercadopago'),
    (v_club_id, v_ath4_id,  v_plan1_id, 'Mensualidad Plan Básico',     35000, 'paid', v_today-30,  (v_today-30+1)::TIMESTAMPTZ,  'mercadopago'),
    (v_club_id, v_ath5_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-150, (v_today-150+4)::TIMESTAMPTZ, 'webpay'),
    (v_club_id, v_ath5_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-120, (v_today-120+2)::TIMESTAMPTZ, 'webpay'),
    (v_club_id, v_ath5_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-90,  (v_today-90+1)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath5_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-60,  (v_today-60+5)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath6_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-120, (v_today-120+0)::TIMESTAMPTZ, 'transfer'),
    (v_club_id, v_ath6_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-90,  (v_today-90+1)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath6_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-60,  (v_today-60+0)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath6_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-30,  (v_today-30+2)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath8_id,  v_plan1_id, 'Matrícula Plan Básico',       15000, 'paid', v_today-15,  (v_today-15+1)::TIMESTAMPTZ,  'cash'),
    (v_club_id, v_ath9_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-90,  (v_today-90+3)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath9_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-60,  (v_today-60+1)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath9_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-30,  (v_today-30+0)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath11_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-150, (v_today-150+1)::TIMESTAMPTZ, 'transfer'),
    (v_club_id, v_ath11_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-120, (v_today-120+0)::TIMESTAMPTZ, 'transfer'),
    (v_club_id, v_ath11_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-90,  (v_today-90+2)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath11_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-60,  (v_today-60+1)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath11_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-30,  (v_today-30+0)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath12_id, v_plan2_id, 'Matrícula Plan Intermedio',   15000, 'paid', v_today-45,  (v_today-45+1)::TIMESTAMPTZ,  'mercadopago'),
    (v_club_id, v_ath12_id, v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-45,  (v_today-45+1)::TIMESTAMPTZ,  'mercadopago'),
    (v_club_id, v_ath14_id, v_plan2_id, 'Matrícula Plan Intermedio',   15000, 'paid', v_today-30,  (v_today-30+2)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath15_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-120, (v_today-120+1)::TIMESTAMPTZ, 'transfer'),
    (v_club_id, v_ath15_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-90,  (v_today-90+0)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath15_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'paid', v_today-60,  (v_today-60+3)::TIMESTAMPTZ,  'transfer'),
    (v_club_id, v_ath17_id, v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-60,  (v_today-60+1)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath17_id, v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'paid', v_today-30,  (v_today-30+2)::TIMESTAMPTZ,  'webpay'),
    (v_club_id, v_ath18_id, v_plan4_id, 'Suscripción Semestral',      430000, 'paid', v_today-90,  (v_today-90+1)::TIMESTAMPTZ,  'transfer');

  -- Pagos PENDIENTES (mes actual)
  INSERT INTO payments (club_id, athlete_id, plan_id, concept, amount, status, due_date)
  VALUES
    (v_club_id, v_ath1_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'pending', v_today+5),
    (v_club_id, v_ath2_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'pending', v_today+3),
    (v_club_id, v_ath4_id,  v_plan1_id, 'Mensualidad Plan Básico',     35000, 'pending', v_today+7),
    (v_club_id, v_ath8_id,  v_plan1_id, 'Mensualidad Plan Básico',     35000, 'pending', v_today+2),
    (v_club_id, v_ath10_id, v_plan1_id, 'Mensualidad Plan Básico',     35000, 'pending', v_today+4),
    (v_club_id, v_ath12_id, v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'pending', v_today+6),
    (v_club_id, v_ath14_id, v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'pending', v_today+1),
    (v_club_id, v_ath16_id, v_plan1_id, 'Mensualidad Plan Básico',     35000, 'pending', v_today+8);

  -- Pagos VENCIDOS (morosos)
  INSERT INTO payments (club_id, athlete_id, plan_id, concept, amount, status, due_date)
  VALUES
    (v_club_id, v_ath3_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'overdue', v_today-45),
    (v_club_id, v_ath3_id,  v_plan3_id, 'Mensualidad Plan Elite',      85000, 'overdue', v_today-15),
    (v_club_id, v_ath5_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'overdue', v_today-30),
    (v_club_id, v_ath10_id, v_plan1_id, 'Mensualidad Plan Básico',     35000, 'overdue', v_today-60),
    (v_club_id, v_ath13_id, v_plan1_id, 'Mensualidad Plan Básico',     35000, 'overdue', v_today-75),
    (v_club_id, v_ath15_id, v_plan3_id, 'Mensualidad Plan Elite',      85000, 'overdue', v_today-30);

  -- Pagos CANCELADOS
  INSERT INTO payments (club_id, athlete_id, plan_id, concept, amount, status, due_date, notes)
  VALUES
    (v_club_id, v_ath7_id,  v_plan2_id, 'Mensualidad Plan Intermedio', 55000, 'cancelled', v_today-30, 'Atleta solicitó baja voluntaria.'),
    (v_club_id, v_ath13_id, v_plan1_id, 'Mensualidad Plan Básico',     35000, 'cancelled', v_today-90, 'Cancelado por suspensión disciplinaria.');

  -- ============================================================
  -- 10. HORARIOS (Schedules)
  -- ============================================================
  INSERT INTO schedules (club_id, venue_id, name, description, day_of_week, start_time, end_time, start_date, capacity, access_rule, is_active)
  VALUES (v_club_id, v_venue1_id, 'Entrenamiento General', 'Entrenamiento de técnica y acondicionamiento', ARRAY[1,3,5], '18:00', '19:30', v_today-180, 30, 'subscription', true)
  RETURNING id INTO v_sched1_id;

  INSERT INTO schedules (club_id, venue_id, name, description, day_of_week, start_time, end_time, start_date, capacity, access_rule, is_active)
  VALUES (v_club_id, v_venue1_id, 'Técnica Avanzada', 'Cinturones azul, café y negro', ARRAY[2,4], '19:30', '21:00', v_today-180, 15, 'subscription', true)
  RETURNING id INTO v_sched2_id;

  INSERT INTO schedules (club_id, venue_id, name, description, day_of_week, start_time, end_time, start_date, capacity, access_rule, is_active)
  VALUES (v_club_id, v_venue1_id, 'Sparring y Competencia', 'Combates controlados, preparación para torneos', ARRAY[6], '10:00', '12:00', v_today-180, 20, 'subscription', true)
  RETURNING id INTO v_sched3_id;

  INSERT INTO schedules (club_id, venue_id, name, description, day_of_week, start_time, end_time, start_date, capacity, access_rule, is_active)
  VALUES (v_club_id, v_venue2_id, 'Infantil Sede Norte', 'Clase para menores de 14 años', ARRAY[2,4,6], '16:00', '17:00', v_today-90, 20, 'subscription', true)
  RETURNING id INTO v_sched4_id;

  INSERT INTO schedules (club_id, venue_id, name, description, day_of_week, start_time, end_time, start_date, capacity, access_rule, is_active)
  VALUES (v_club_id, v_venue1_id, 'Preparación Física', 'Entrenamiento funcional y crossfit', ARRAY[1,3,5], '07:00', '08:00', v_today-60, 15, 'open', true)
  RETURNING id INTO v_sched5_id;

  -- ============================================================
  -- 11. ASISTENCIA (últimos 45 días)
  -- ============================================================
  INSERT INTO attendance (club_id, athlete_id, schedule_id, checked_in_at, check_in_lat, check_in_lng, is_valid)
  SELECT
    v_club_id,
    ath_id,
    sched_id,
    (v_today - days_ago)::TIMESTAMPTZ + INTERVAL '18 hours',
    -33.4317 + (random() * 0.0001 - 0.00005),
    -70.6093 + (random() * 0.0001 - 0.00005),
    true
  FROM (VALUES
    (v_ath1_id,  v_sched1_id, 2), (v_ath1_id,  v_sched1_id, 5),  (v_ath1_id,  v_sched1_id, 7),
    (v_ath1_id,  v_sched1_id, 9), (v_ath1_id,  v_sched1_id, 12), (v_ath1_id,  v_sched2_id, 3),
    (v_ath1_id,  v_sched2_id, 6), (v_ath1_id,  v_sched3_id, 8),  (v_ath1_id,  v_sched3_id, 15),
    (v_ath2_id,  v_sched1_id, 1), (v_ath2_id,  v_sched1_id, 4),  (v_ath2_id,  v_sched1_id, 8),
    (v_ath2_id,  v_sched1_id, 11),(v_ath2_id,  v_sched2_id, 2),  (v_ath2_id,  v_sched3_id, 7),
    (v_ath4_id,  v_sched1_id, 3), (v_ath4_id,  v_sched1_id, 6),  (v_ath4_id,  v_sched4_id, 2),
    (v_ath4_id,  v_sched4_id, 5),
    (v_ath5_id,  v_sched1_id, 2), (v_ath5_id,  v_sched1_id, 7),  (v_ath5_id,  v_sched2_id, 4),
    (v_ath6_id,  v_sched1_id, 1), (v_ath6_id,  v_sched2_id, 3),  (v_ath6_id,  v_sched3_id, 6),
    (v_ath6_id,  v_sched1_id, 8), (v_ath6_id,  v_sched2_id, 10),
    (v_ath8_id,  v_sched4_id, 4), (v_ath8_id,  v_sched4_id, 7),  (v_ath8_id,  v_sched4_id, 11),
    (v_ath9_id,  v_sched1_id, 2), (v_ath9_id,  v_sched2_id, 5),  (v_ath9_id,  v_sched1_id, 9),
    (v_ath11_id, v_sched1_id, 1), (v_ath11_id, v_sched2_id, 3),  (v_ath11_id, v_sched3_id, 7),
    (v_ath11_id, v_sched1_id, 10),(v_ath11_id, v_sched2_id, 14),
    (v_ath12_id, v_sched1_id, 4), (v_ath12_id, v_sched1_id, 8),  (v_ath12_id, v_sched4_id, 6),
    (v_ath14_id, v_sched2_id, 2), (v_ath14_id, v_sched1_id, 5),  (v_ath14_id, v_sched2_id, 9),
    (v_ath16_id, v_sched4_id, 3), (v_ath16_id, v_sched4_id, 6),
    (v_ath17_id, v_sched1_id, 1), (v_ath17_id, v_sched2_id, 4),  (v_ath17_id, v_sched1_id, 7),
    (v_ath18_id, v_sched1_id, 2), (v_ath18_id, v_sched4_id, 5),  (v_ath18_id, v_sched3_id, 8)
  ) AS t(ath_id, sched_id, days_ago);

  -- ============================================================
  -- 12. REGLAS (Motor de Reglas)
  -- ============================================================
  INSERT INTO rules (club_id, name, type, description, trigger_condition, action, severity, config, is_active)
  VALUES (v_club_id, 'Bloqueo por deuda mensual', 'financial',
    'Bloquea automáticamente al atleta si tiene 1 o más cuotas vencidas sin pagar.',
    '{"max_overdue_count": 1, "grace_days": 3}',
    'block', 'high', '{"max_overdue_count": 1, "grace_days": 3}', true)
  RETURNING id INTO v_rule1_id;

  INSERT INTO rules (club_id, name, type, description, trigger_condition, action, severity, config, is_active)
  VALUES (v_club_id, 'Advertencia por baja asistencia', 'attendance',
    'Genera advertencia si el atleta tiene menos del 60% de asistencia en los últimos 30 días.',
    '{"min_attendance_pct": 60, "window_days": 30}',
    'warn', 'medium', '{"min_attendance_pct": 60, "window_days": 30}', true)
  RETURNING id INTO v_rule2_id;

  INSERT INTO rules (club_id, name, type, description, trigger_condition, action, severity, config, is_active)
  VALUES (v_club_id, 'Bloqueo por inasistencia crítica', 'attendance',
    'Bloquea al atleta si no ha asistido en más de 21 días consecutivos sin justificación.',
    '{"max_absent_days": 21, "require_justification": true}',
    'block', 'high', '{"max_absent_days": 21}', true)
  RETURNING id INTO v_rule3_id;

  INSERT INTO rules (club_id, name, type, description, trigger_condition, action, severity, config, is_active)
  VALUES (v_club_id, 'Documentos vencidos', 'documentation',
    'Notifica cuando un documento médico del atleta está por vencer en los próximos 30 días.',
    '{"days_before_expiry": 30, "category": "medical"}',
    'notify', 'low', '{"days_before_expiry": 30}', true)
  RETURNING id INTO v_rule4_id;

  INSERT INTO rules (club_id, name, type, description, trigger_condition, action, severity, config, is_active)
  VALUES (v_club_id, 'Suspensión disciplinaria', 'discipline',
    'Bloquea al atleta de competir si ha recibido una sanción disciplinaria activa.',
    '{"block_action": "competition", "block_training": false}',
    'block', 'high', '{"block_action": "competition"}', true);

  -- ============================================================
  -- 13. DOCUMENTOS
  -- ============================================================
  INSERT INTO documents (club_id, athlete_id, name, category, status, expiry_date, notes, uploaded_by)
  VALUES
    (v_club_id, v_ath1_id,  'Ficha Médica Deportiva 2025',    'medical',        'approved', v_today+90,  'Apto para competir', v_clerk_id),
    (v_club_id, v_ath1_id,  'Contrato de Membresía',          'institutional',  'approved', NULL,        NULL, v_clerk_id),
    (v_club_id, v_ath2_id,  'Ficha Médica Deportiva 2025',    'medical',        'approved', v_today+120, NULL, v_clerk_id),
    (v_club_id, v_ath3_id,  'Ficha Médica Deportiva 2025',    'medical',        'approved', v_today+60,  NULL, v_clerk_id),
    (v_club_id, v_ath3_id,  'Certificado Médico Lesión',       'medical',        'approved', v_today+20,  'Baja temporal por lesión rodilla', v_clerk_id),
    (v_club_id, v_ath4_id,  'Autorización de Apoderado',       'authorization',  'approved', NULL,        'Menor de edad', v_clerk_id),
    (v_club_id, v_ath4_id,  'Ficha Médica Pediátrica',         'medical',        'approved', v_today+180, NULL, v_clerk_id),
    (v_club_id, v_ath5_id,  'Ficha Médica Deportiva 2025',    'medical',        'pending',  v_today+45,  'Pendiente de revisión médica', v_clerk_id),
    (v_club_id, v_ath6_id,  'Ficha Médica Deportiva 2025',    'medical',        'approved', v_today+200, NULL, v_clerk_id),
    (v_club_id, v_ath6_id,  'Seguro Deportivo',                'institutional',  'approved', v_today+150, NULL, v_clerk_id),
    (v_club_id, v_ath8_id,  'Autorización de Apoderado',       'authorization',  'pending',  NULL,        'Recién inscrito, pendiente firma apoderado', v_clerk_id),
    (v_club_id, v_ath10_id, 'Ficha Médica Deportiva 2024',    'medical',        'expired',  v_today-30,  'VENCIDA - Requiere renovación urgente', v_clerk_id),
    (v_club_id, v_ath11_id, 'Ficha Médica Deportiva 2025',    'medical',        'approved', v_today+300, NULL, v_clerk_id),
    (v_club_id, v_ath12_id, 'Autorización de Apoderado',       'authorization',  'approved', NULL,        NULL, v_clerk_id),
    (v_club_id, v_ath15_id, 'Certificado Médico Tobillo',      'medical',        'approved', v_today+14,  'Autoriza entrenamiento sin contacto', v_clerk_id);

  -- ============================================================
  -- 14. INVENTARIO
  -- ============================================================
  INSERT INTO inventory_items (club_id, name, category, description, quantity, quantity_min, condition, purchase_date, purchase_price, serial_number, is_active)
  VALUES
    (v_club_id, 'Tatami de competencia (10x10m)', 'infrastructure', 'Tatami modular homologado WKF para competencias', 1, 1, 'good',  '2023-01-15', 1200000, 'TAT-2023-001', true),
    (v_club_id, 'Sacos de box (pesado)',           'equipment',      'Saco relleno de cuero 40kg',                      4, 2, 'good',  '2023-06-01', 85000,   NULL,           true),
    (v_club_id, 'Sacos de box (ligero)',           'equipment',      'Saco ligero para velocidad',                      2, 1, 'fair',  '2022-08-10', 45000,   NULL,           true),
    (v_club_id, 'Guantes de entrenamiento (par)',  'equipment',      'Guantes 12oz cuero, varios talles',               15, 5, 'good',  '2024-01-20', 18000,   NULL,           true),
    (v_club_id, 'Protector bucal',                 'equipment',      'Protector termomoldeable adulto',                 20, 5, 'good',  '2024-02-01', 3500,    NULL,           true),
    (v_club_id, 'Uniforme kimono (talla S)',        'uniform',        'Kimono blanco 100% algodón talla S',              8,  2, 'good',  '2024-03-01', 25000,   NULL,           true),
    (v_club_id, 'Uniforme kimono (talla M)',        'uniform',        'Kimono blanco 100% algodón talla M',              10, 3, 'good',  '2024-03-01', 25000,   NULL,           true),
    (v_club_id, 'Uniforme kimono (talla L)',        'uniform',        'Kimono blanco 100% algodón talla L',              6,  2, 'fair',  '2023-05-15', 25000,   NULL,           true),
    (v_club_id, 'Cuerda de saltar',                'equipment',      'Cuerda de velocidad profesional',                 8,  3, 'good',  '2024-01-10', 8000,    NULL,           true),
    (v_club_id, 'Espejo de entrenamiento (2x1.5m)','infrastructure', 'Espejo de pared fijo para corrección técnica',    3,  2, 'good',  '2022-11-20', 95000,   'ESP-2022-003', true),
    (v_club_id, 'Conos de entrenamiento',          'equipment',      'Set 20 conos plásticos multicolor',               2,  1, 'good',  '2023-09-01', 12000,   NULL,           true),
    (v_club_id, 'Escudo de golpeo',                'equipment',      'Escudo doble cuero grueso',                       6,  2, 'poor',  '2021-06-15', 32000,   NULL,           true);

  -- ============================================================
  -- 15. COMPETENCIAS
  -- ============================================================
  INSERT INTO competitions (club_id, name, type, sport, location, start_date, end_date, status, description, notes)
  VALUES (v_club_id, 'Torneo Regional Karate Santiago 2025', 'tournament', 'Karate',
    'Estadio Santa Laura, Santiago',
    v_today-60, v_today-59, 'finished',
    'Torneo clasificatorio regional. Participaron 8 academias de la Región Metropolitana.',
    'Resultado: 3 oros, 2 platas, 1 bronce.')
  RETURNING id INTO v_comp1_id;

  INSERT INTO competitions (club_id, name, type, sport, location, start_date, end_date, status, description, notes)
  VALUES (v_club_id, 'Copa Santiago MMA Open', 'tournament', 'MMA',
    'Movistar Arena, Santiago',
    v_today+3, v_today+4, 'upcoming',
    'Copa abierta de artes marciales mixtas. Categorías amateur y semi-profesional.',
    'Pre-inscripción confirmada para 6 atletas.')
  RETURNING id INTO v_comp2_id;

  INSERT INTO competitions (club_id, name, type, sport, location, start_date, end_date, status, description, notes)
  VALUES (v_club_id, 'Campeonato Nacional Karate 2025', 'championship', 'Karate',
    'Palacio de los Deportes, Santiago',
    v_today+75, v_today+77, 'upcoming',
    'Campeonato Nacional organizado por la Federación de Karate de Chile.',
    'Clasificados por ranking nacional. Buscar financiamiento para traslados.')
  RETURNING id INTO v_comp3_id;

  -- ============================================================
  -- 16. NÓMINAS (Rosters)
  -- ============================================================
  INSERT INTO rosters (club_id, competition_id, name, match_date, opponent, venue, notes)
  VALUES (v_club_id, v_comp1_id, 'Nómina Torneo Regional - Final', v_today-59,
    'Academia Bushido', 'Estadio Santa Laura', 'Última jornada del torneo regional.')
  RETURNING id INTO v_roster1_id;

  INSERT INTO rosters (club_id, competition_id, name, match_date, opponent, venue, notes)
  VALUES (v_club_id, v_comp2_id, 'Nómina Copa Santiago MMA', v_today+3,
    'Varios rivales', 'Movistar Arena', 'Revisar categorías de peso antes del pesaje.')
  RETURNING id INTO v_roster2_id;

  -- Atletas en nómina 1 (torneo pasado)
  INSERT INTO roster_athletes (roster_id, athlete_id, number, position, is_captain, status)
  VALUES
    (v_roster1_id, v_ath1_id,  1, 'Kata / Kumite -75kg',  true,  'confirmed'),
    (v_roster1_id, v_ath2_id,  2, 'Kumite -61kg',          false, 'confirmed'),
    (v_roster1_id, v_ath6_id,  3, 'Kumite -68kg',          false, 'confirmed'),
    (v_roster1_id, v_ath9_id,  4, 'Kumite -84kg',          false, 'confirmed'),
    (v_roster1_id, v_ath11_id, 5, 'Kata / Kumite +84kg',   false, 'confirmed'),
    (v_roster1_id, v_ath14_id, 6, 'Kumite -61kg',          false, 'confirmed');

  -- Atletas en nómina 2 (próximo torneo)
  INSERT INTO roster_athletes (roster_id, athlete_id, number, position, is_captain, status)
  VALUES
    (v_roster2_id, v_ath1_id,  1, 'MMA Welter',  true,  'confirmed'),
    (v_roster2_id, v_ath6_id,  2, 'MMA Ligero',  false, 'confirmed'),
    (v_roster2_id, v_ath9_id,  3, 'MMA Medio',   false, 'called'),
    (v_roster2_id, v_ath11_id, 4, 'MMA Pesado',  false, 'confirmed'),
    (v_roster2_id, v_ath17_id, 5, 'MMA Ligero',  false, 'called'),
    (v_roster2_id, v_ath3_id,  6, 'MMA Welter',  false, 'absent');  -- lesionado, ausente

  -- ============================================================
  -- 17. MEDIA
  -- ============================================================
  INSERT INTO media_items (club_id, title, type, category, url, thumbnail_url, description, is_public, created_by)
  VALUES
    (v_club_id, 'Final Torneo Regional 2025 - Highlight',   'video',    'highlight', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NULL, 'Mejores momentos de la final del Torneo Regional Santiago 2025.', true,  v_clerk_id),
    (v_club_id, 'Entrenamiento Técnica Avanzada - Feb 2025', 'video',    'training',  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NULL, 'Sesión completa de técnica avanzada con el grupo de cinturones negros.', false, v_clerk_id),
    (v_club_id, 'Medallas Torneo Regional 2025',             'photo',    'match',     'https://picsum.photos/seed/torneo1/800/600',   'https://picsum.photos/seed/torneo1/400/300', 'Foto oficial con medallas ganadas en el torneo regional.', true,  v_clerk_id),
    (v_club_id, 'Entrenamiento Sparring Enero 2025',         'photo',    'training',  'https://picsum.photos/seed/sparring1/800/600', 'https://picsum.photos/seed/sparring1/400/300', 'Registro fotográfico del sparring dominical.', false, v_clerk_id),
    (v_club_id, 'Galería Alumnos Diciembre 2024',            'photo',    'photo',     'https://picsum.photos/seed/galeria1/800/600',  'https://picsum.photos/seed/galeria1/400/300', 'Fotos del recital de fin de año.', true,  v_clerk_id),
    (v_club_id, 'Reglamento Interno 2025',                   'document', 'other',     'https://example.com/docs/reglamento-2025.pdf', NULL, 'Versión actualizada del reglamento interno del club.', false, v_clerk_id);

  -- ============================================================
  -- 18. EGRESOS (Expenses) — para módulo Finanzas
  -- ============================================================
  INSERT INTO expenses (club_id, concept, category, amount, date, paid_to, notes, created_by)
  VALUES
    -- Mes actual
    (v_club_id, 'Arriendo Dojo Principal',               'rent',        450000, v_today,      'Inmobiliaria San Ignacio', 'Arriendo mensual sede principal', v_clerk_id),
    (v_club_id, 'Sueldo Carlos Mendoza - Jefe Técnico',  'salary',      800000, v_today,      'Carlos Mendoza',           'Sueldo marzo 2025', v_clerk_id),
    (v_club_id, 'Sueldo Ana Torres - Entrenadora',       'salary',      650000, v_today,      'Ana Torres',               'Sueldo marzo 2025', v_clerk_id),
    (v_club_id, 'Sueldo Pedro Silva - Prep. Física',     'salary',      500000, v_today,      'Pedro Silva',              'Sueldo marzo 2025', v_clerk_id),
    (v_club_id, 'Insumos de limpieza y mantención',      'maintenance', 45000,  v_today-3,    'Sodimac',                  NULL, v_clerk_id),
    (v_club_id, 'Publicidad Instagram + Facebook Ads',   'marketing',   80000,  v_today-5,    'Meta Ads',                 'Campaña marzo 2025', v_clerk_id),
    -- Mes anterior
    (v_club_id, 'Arriendo Dojo Principal',               'rent',        450000, v_today-30,   'Inmobiliaria San Ignacio', 'Arriendo febrero 2025', v_clerk_id),
    (v_club_id, 'Sueldo Carlos Mendoza - Jefe Técnico',  'salary',      800000, v_today-30,   'Carlos Mendoza',           'Sueldo febrero 2025', v_clerk_id),
    (v_club_id, 'Sueldo Ana Torres - Entrenadora',       'salary',      650000, v_today-30,   'Ana Torres',               'Sueldo febrero 2025', v_clerk_id),
    (v_club_id, 'Sueldo Pedro Silva - Prep. Física',     'salary',      500000, v_today-30,   'Pedro Silva',              'Sueldo febrero 2025', v_clerk_id),
    (v_club_id, 'Reparación tatami',                     'maintenance', 65000,  v_today-25,   'Servicios Deportivos Ltda', 'Reparación bordes tatami', v_clerk_id),
    (v_club_id, 'Compra guantes entrenamiento x5',       'supplies',    90000,  v_today-20,   'ProSport Chile',           '5 pares guantes 12oz', v_clerk_id),
    (v_club_id, 'Arriendo Sede Norte',                   'rent',        280000, v_today-30,   'Arrendataria Norte SpA',   'Arriendo febrero sede norte', v_clerk_id),
    -- Hace 2 meses
    (v_club_id, 'Arriendo Dojo Principal',               'rent',        450000, v_today-60,   'Inmobiliaria San Ignacio', 'Arriendo enero 2025', v_clerk_id),
    (v_club_id, 'Sueldo Carlos Mendoza - Jefe Técnico',  'salary',      800000, v_today-60,   'Carlos Mendoza',           'Sueldo enero 2025', v_clerk_id),
    (v_club_id, 'Sueldo Ana Torres - Entrenadora',       'salary',      650000, v_today-60,   'Ana Torres',               'Sueldo enero 2025', v_clerk_id),
    (v_club_id, 'Inscripción Torneo Regional',           'other',       120000, v_today-55,   'Federación Karate Chile',  'Inscripción 6 atletas', v_clerk_id),
    (v_club_id, 'Uniformes kimono talla M x4',           'supplies',    100000, v_today-50,   'ProSport Chile',           NULL, v_clerk_id),
    (v_club_id, 'Arriendo Sede Norte',                   'rent',        280000, v_today-60,   'Arrendataria Norte SpA',   'Arriendo enero sede norte', v_clerk_id),
    -- Hace 3 meses
    (v_club_id, 'Arriendo Dojo Principal',               'rent',        450000, v_today-90,   'Inmobiliaria San Ignacio', NULL, v_clerk_id),
    (v_club_id, 'Sueldo Carlos Mendoza - Jefe Técnico',  'salary',      800000, v_today-90,   'Carlos Mendoza',           NULL, v_clerk_id),
    (v_club_id, 'Sueldo Ana Torres - Entrenadora',       'salary',      650000, v_today-90,   'Ana Torres',               NULL, v_clerk_id),
    (v_club_id, 'Marketing redes sociales',              'marketing',   60000,  v_today-85,   'Agencia Digital Flow',     NULL, v_clerk_id);

  RAISE NOTICE '✅ Seed completado exitosamente para club_id: %', v_club_id;
  RAISE NOTICE '   → 1 club creado: "Academia Dragón - Demo"';
  RAISE NOTICE '   → 2 sedes, 4 planes, 3 coaches';
  RAISE NOTICE '   → 18 atletas (varied: healthy/injured/observation, active/inactive/suspended)';
  RAISE NOTICE '   → Pagos: ~38 pagados, 8 pendientes, 6 vencidos, 2 cancelados';
  RAISE NOTICE '   → 5 horarios, ~55 registros de asistencia';
  RAISE NOTICE '   → 5 reglas, 15 documentos, 12 items de inventario';
  RAISE NOTICE '   → 3 competencias, 2 nóminas, 6 media items, 22 egresos';

END;
$$;

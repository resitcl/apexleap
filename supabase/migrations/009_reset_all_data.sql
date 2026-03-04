-- ============================================================
-- ApexLeap - Script 009: RESET ALL DATA
-- ⚠️  EJECUTAR EN SUPABASE SQL EDITOR
-- ⚠️  BORRA TODA LA DATA (mantiene el esquema intacto)
-- ============================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'roster_athletes', 'rosters', 'competitions',
    'rule_exceptions', 'media_items', 'documents',
    'attendance', 'check_in_tokens', 'schedules',
    'inventory_items', 'expenses', 'coaches',
    'payments', 'subscriptions', 'injuries',
    'athletes', 'plans', 'rules', 'venues',
    'users', 'user_clubs', 'clubs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
      RAISE NOTICE 'Truncated: %', t;
    ELSE
      RAISE NOTICE 'Skipped (no existe): %', t;
    END IF;
  END LOOP;
  RAISE NOTICE '✅ Reset completado. El esquema permanece intacto.';
END $$;

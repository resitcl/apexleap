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

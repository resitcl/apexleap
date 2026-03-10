-- =============================================
-- Athlete Agreements / Contracts with Digital Signature
-- Integration with GESTDOC for Clave Única signature
-- =============================================

-- Agreement templates defined by each club
CREATE TABLE IF NOT EXISTS agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Template content with {{variables}}
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required_for_enrollment BOOLEAN NOT NULL DEFAULT true, -- Must sign before training
  valid_months INTEGER, -- NULL = permanent, otherwise re-sign after X months
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Signed agreements by athletes
CREATE TABLE IF NOT EXISTS athlete_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES agreement_templates(id) ON DELETE RESTRICT,
  
  -- Signature status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent_to_sign', 'signed', 'rejected', 'expired', 'cancelled')),
  
  -- GESTDOC integration
  gestdoc_document_id TEXT, -- ID returned by GESTDOC
  gestdoc_signing_url TEXT, -- URL for athlete to sign with Clave Única
  gestdoc_signed_document_url TEXT, -- URL of signed PDF
  gestdoc_transaction_id TEXT, -- Transaction ID for verification
  
  -- Signature details
  signed_at TIMESTAMPTZ,
  signer_rut TEXT, -- RUT verified by Clave Única
  signer_name TEXT, -- Name from Clave Única
  signer_ip TEXT,
  
  -- Document snapshot (in case template changes)
  document_content TEXT NOT NULL, -- Rendered content at signing time
  document_variables JSONB, -- Variables used to render
  
  -- Validity
  valid_until TIMESTAMPTZ, -- When agreement expires (if template has valid_months)
  
  -- Metadata
  sent_at TIMESTAMPTZ, -- When sent to GESTDOC
  reminder_sent_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(athlete_id, template_id, status) -- Only one pending/active agreement per template
);

-- Club agreement settings
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS gestdoc_api_key TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS gestdoc_enabled BOOLEAN DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS agreement_intro_text TEXT; -- Custom intro shown before signing

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agreement_templates_club ON agreement_templates(club_id);
CREATE INDEX IF NOT EXISTS idx_athlete_agreements_club ON athlete_agreements(club_id);
CREATE INDEX IF NOT EXISTS idx_athlete_agreements_athlete ON athlete_agreements(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_agreements_status ON athlete_agreements(status);
CREATE INDEX IF NOT EXISTS idx_athlete_agreements_gestdoc ON athlete_agreements(gestdoc_document_id);

-- RLS Policies
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_agreements ENABLE ROW LEVEL SECURITY;

-- Templates: club members can read, admins can write
CREATE POLICY "agreement_templates_select" ON agreement_templates
  FOR SELECT USING (true);

CREATE POLICY "agreement_templates_insert" ON agreement_templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "agreement_templates_update" ON agreement_templates
  FOR UPDATE USING (true);

CREATE POLICY "agreement_templates_delete" ON agreement_templates
  FOR DELETE USING (true);

-- Agreements: club members can read their own, admins can read all
CREATE POLICY "athlete_agreements_select" ON athlete_agreements
  FOR SELECT USING (true);

CREATE POLICY "athlete_agreements_insert" ON athlete_agreements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "athlete_agreements_update" ON athlete_agreements
  FOR UPDATE USING (true);

-- Function to check if athlete has valid agreement
CREATE OR REPLACE FUNCTION athlete_has_valid_agreement(p_athlete_id UUID, p_template_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_agreement BOOLEAN;
BEGIN
  IF p_template_id IS NOT NULL THEN
    -- Check specific template
    SELECT EXISTS(
      SELECT 1 FROM athlete_agreements
      WHERE athlete_id = p_athlete_id
        AND template_id = p_template_id
        AND status = 'signed'
        AND (valid_until IS NULL OR valid_until > now())
    ) INTO v_has_agreement;
  ELSE
    -- Check all required templates for athlete's club
    SELECT NOT EXISTS(
      SELECT 1 FROM agreement_templates t
      WHERE t.club_id = (SELECT club_id FROM athletes WHERE id = p_athlete_id)
        AND t.is_active = true
        AND t.is_required_for_enrollment = true
        AND NOT EXISTS(
          SELECT 1 FROM athlete_agreements a
          WHERE a.athlete_id = p_athlete_id
            AND a.template_id = t.id
            AND a.status = 'signed'
            AND (a.valid_until IS NULL OR a.valid_until > now())
        )
    ) INTO v_has_agreement;
  END IF;
  
  RETURN v_has_agreement;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agreement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agreement_templates_updated_at
  BEFORE UPDATE ON agreement_templates
  FOR EACH ROW EXECUTE FUNCTION update_agreement_updated_at();

CREATE TRIGGER athlete_agreements_updated_at
  BEFORE UPDATE ON athlete_agreements
  FOR EACH ROW EXECUTE FUNCTION update_agreement_updated_at();

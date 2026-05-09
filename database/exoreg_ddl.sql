-- ExoReg — K-dwarf validated / null registry (PostgreSQL 15+)
-- Apply manually or from ops; not run automatically by the app.
-- gaia_source_id: store Gaia DR3 source_id as decimal STRING (avoid JS Number precision).

CREATE TABLE IF NOT EXISTS exoreg_target (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gaia_source_id TEXT NOT NULL,
  display_label TEXT,
  ra_deg DOUBLE PRECISION CHECK (ra_deg IS NULL OR (ra_deg >= 0 AND ra_deg < 360)),
  dec_deg DOUBLE PRECISION CHECK (dec_deg IS NULL OR (dec_deg >= -90 AND dec_deg <= 90)),
  epoch_ref TEXT DEFAULT 'J2016.0',
  published_label TEXT CHECK (published_label IS NULL OR published_label IN ('validated_kdwarf', 'null_kdwarf')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exoreg_target_gaia_unique UNIQUE (gaia_source_id)
);

CREATE INDEX IF NOT EXISTS idx_exoreg_target_published ON exoreg_target (published_label) WHERE published_label IS NOT NULL;

CREATE OR REPLACE FUNCTION exoreg_target_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exoreg_target_updated ON exoreg_target;
CREATE TRIGGER trg_exoreg_target_updated
  BEFORE UPDATE ON exoreg_target
  FOR EACH ROW EXECUTE PROCEDURE exoreg_target_set_updated_at();

CREATE TABLE IF NOT EXISTS exoreg_classification_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL REFERENCES exoreg_target(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('validated_kdwarf', 'null_kdwarf')),
  client_round_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exoreg_class_target ON exoreg_classification_event (target_id);
CREATE INDEX IF NOT EXISTS idx_exoreg_class_user ON exoreg_classification_event (clerk_user_id);

-- Surviving validated K dwarfs (consensus) ready for next pipeline stage
CREATE TABLE IF NOT EXISTS exoreg_pipeline_ready (
  target_id UUID PRIMARY KEY REFERENCES exoreg_target(id) ON DELETE CASCADE,
  gaia_source_id TEXT NOT NULL,
  ra_deg DOUBLE PRECISION,
  dec_deg DOUBLE PRECISION,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 2: automated pipeline writes (optional hooks)
CREATE TABLE IF NOT EXISTS exoreg_processing_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID REFERENCES exoreg_target(id) ON DELETE SET NULL,
  source_system TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exoreg_processing_target ON exoreg_processing_event (target_id);

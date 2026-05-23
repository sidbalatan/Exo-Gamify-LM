-- ExoQuest personal workspace schema (PostgreSQL 15+)
--
-- Gaia DR3 source_id representation
-- -------------------------------
-- - Storage: BIGINT (signed 64-bit). All Gaia DR3 source_id values used in practice
--   are positive and fit in PostgreSQL BIGINT; CHECK enforces gaia_source_id > 0 when set.
-- - JSON / HTTP: expose as DECIMAL STRING (e.g. "6123456789012348928") so JavaScript
--   Number precision is never corrupted (safe integers only up to 2^53 - 1).
-- - Alternate (not used here): NUMERIC(20,0) if you refuse BIGINT semantics; heavier indexes.
--
-- Horizontal scale: PARTITION BY HASH (user_id) with 8 partitions (tune modulus for prod).
-- PK and UNIQUE constraints include partition key (PostgreSQL requirement).

-- Apply to an empty database (or manage via migrations). Re-running is not idempotent.

-- ---------------------------------------------------------------------------
-- enums
CREATE TYPE workspace_target_kind AS ENUM (
  'GAIA_DR3_SOURCE_ID',
  'SKY_COORDS',
  'ALIAS_TEXT'
);

CREATE TYPE workspace_asset_type AS ENUM (
  'IMAGE',
  'PLOT',
  'ARCHIVE_OTHER'
);

CREATE TYPE workspace_pipeline_status AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_email ON profiles (email) WHERE email IS NOT NULL;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 1) Input list: Gaia IDs and/or coordinates
CREATE TABLE workspace_targets (
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  kind workspace_target_kind NOT NULL,
  gaia_source_id BIGINT CHECK (gaia_source_id IS NULL OR gaia_source_id > 0),
  ra_deg DOUBLE PRECISION CHECK (ra_deg IS NULL OR (ra_deg >= 0 AND ra_deg < 360)),
  dec_deg DOUBLE PRECISION CHECK (dec_deg IS NULL OR (dec_deg >= -90 AND dec_deg <= 90)),
  label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
) PARTITION BY HASH (user_id);

DO $$
DECLARE i INT;
BEGIN
  FOR i IN 0..7 LOOP
    EXECUTE format(
      'CREATE TABLE workspace_targets_p%s PARTITION OF workspace_targets FOR VALUES WITH (MODULUS 8, REMAINDER %s);',
      i, i
    );
  END LOOP;
END $$;

CREATE INDEX idx_workspace_targets_gaia
  ON workspace_targets (user_id, gaia_source_id)
  WHERE gaia_source_id IS NOT NULL;

CREATE INDEX idx_workspace_targets_coords
  ON workspace_targets (user_id, ra_deg, dec_deg)
  WHERE ra_deg IS NOT NULL AND dec_deg IS NOT NULL;

CREATE TRIGGER trg_workspace_targets_updated_at
BEFORE UPDATE ON workspace_targets
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Validated K dwarfs (pipeline resume + science object)
CREATE TABLE workspace_k_dwarfs (
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  gaia_source_id BIGINT NOT NULL CHECK (gaia_source_id > 0),
  source_target_id UUID,
  pipeline_stage TEXT NOT NULL DEFAULT 'scout',
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_confidence REAL CHECK (validation_confidence IS NULL OR (validation_confidence >= 0 AND validation_confidence <= 1)),
  catalog_version TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, source_target_id)
    REFERENCES workspace_targets (user_id, id) ON DELETE SET NULL,
  UNIQUE (user_id, gaia_source_id)
) PARTITION BY HASH (user_id);

DO $$
DECLARE i INT;
BEGIN
  FOR i IN 0..7 LOOP
    EXECUTE format(
      'CREATE TABLE workspace_k_dwarfs_p%s PARTITION OF workspace_k_dwarfs FOR VALUES WITH (MODULUS 8, REMAINDER %s);',
      i, i
    );
  END LOOP;
END $$;

CREATE TRIGGER trg_workspace_k_dwarfs_updated_at
BEFORE UPDATE ON workspace_k_dwarfs
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Exoplanets (catalog-backed or pipeline detections)
CREATE TYPE workspace_exoplanet_origin AS ENUM (
  'CATALOG_REFERENCE',
  'PIPELINE_DETECTION',
  'MANUAL'
);

CREATE TABLE workspace_exoplanets (
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  origin workspace_exoplanet_origin NOT NULL,
  host_gaia_source_id BIGINT CHECK (host_gaia_source_id IS NULL OR host_gaia_source_id > 0),
  k_dwarf_id UUID,
  external_ref_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  designation TEXT,
  detection_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, k_dwarf_id)
    REFERENCES workspace_k_dwarfs (user_id, id) ON DELETE SET NULL
) PARTITION BY HASH (user_id);

DO $$
DECLARE i INT;
BEGIN
  FOR i IN 0..7 LOOP
    EXECUTE format(
      'CREATE TABLE workspace_exoplanets_p%s PARTITION OF workspace_exoplanets FOR VALUES WITH (MODULUS 8, REMAINDER %s);',
      i, i
    );
  END LOOP;
END $$;

CREATE INDEX idx_workspace_exoplanets_host
  ON workspace_exoplanets (user_id, host_gaia_source_id)
  WHERE host_gaia_source_id IS NOT NULL;

CREATE TRIGGER trg_workspace_exoplanets_updated_at
BEFORE UPDATE ON workspace_exoplanets
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Saved plots/images (bytes in object storage; metadata here)
CREATE TABLE workspace_assets (
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  asset_type workspace_asset_type NOT NULL,
  title TEXT,
  storage_backend TEXT NOT NULL DEFAULT 'blob',
  object_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  sha256 BYTEA CHECK (octet_length(sha256) = 32 OR sha256 IS NULL),
  provenance_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, object_key)
) PARTITION BY HASH (user_id);

DO $$
DECLARE i INT;
BEGIN
  FOR i IN 0..7 LOOP
    EXECUTE format(
      'CREATE TABLE workspace_assets_p%s PARTITION OF workspace_assets FOR VALUES WITH (MODULUS 8, REMAINDER %s);',
      i, i
    );
  END LOOP;
END $$;

CREATE INDEX idx_workspace_assets_created ON workspace_assets (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Async pipeline runs (optional but scale-friendly)
CREATE TABLE workspace_pipeline_runs (
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  k_dwarf_id UUID NOT NULL,
  status workspace_pipeline_status NOT NULL DEFAULT 'queued',
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB,
  error_text TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, k_dwarf_id)
    REFERENCES workspace_k_dwarfs (user_id, id) ON DELETE CASCADE
) PARTITION BY HASH (user_id);

DO $$
DECLARE i INT;
BEGIN
  FOR i IN 0..7 LOOP
    EXECUTE format(
      'CREATE TABLE workspace_pipeline_runs_p%s PARTITION OF workspace_pipeline_runs FOR VALUES WITH (MODULUS 8, REMAINDER %s);',
      i, i
    );
  END LOOP;
END $$;

CREATE INDEX idx_workspace_pipeline_runs_status
  ON workspace_pipeline_runs (user_id, status, created_at DESC);

COMMENT ON TABLE workspace_targets IS 'User input list: Gaia IDs and/or sky coordinates.';
COMMENT ON TABLE workspace_k_dwarfs IS 'Validated K dwarfs; pipeline_stage + state_json support resume.';
COMMENT ON TABLE workspace_exoplanets IS 'Exoplanet records (catalog or detections) linked to hosts/stars.';
COMMENT ON TABLE workspace_assets IS 'Plot/image metadata; binary lives in object storage at object_key.';
COMMENT ON COLUMN workspace_k_dwarfs.gaia_source_id IS 'Store as BIGINT; API must serialize as string for JSON/JS safety.';

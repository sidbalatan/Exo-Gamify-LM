-- Gamification schema addendum (apply after workspace_ddl.sql)
-- Requires: profiles table, set_updated_at() trigger function

-- ---------------------------------------------------------------------------
-- Player progression (extends profiles)
CREATE TABLE player_stats (
  user_id         TEXT PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  handle          TEXT,
  show_real_name  BOOLEAN NOT NULL DEFAULT false,
  total_score     BIGINT  NOT NULL DEFAULT 0,
  rank_name       TEXT    NOT NULL DEFAULT 'Observer',
  accuracy_rating REAL    NOT NULL DEFAULT 0.5,
  calibration_score REAL  NOT NULL DEFAULT 0.5,
  noise_tolerance REAL    NOT NULL DEFAULT 0.5,
  labels_submitted INT    NOT NULL DEFAULT 0,
  onboarding_done BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_player_stats_updated_at
BEFORE UPDATE ON player_stats
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- Shared light-curve labelling queue (active learning)
CREATE TABLE label_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gaia_source_id   BIGINT NOT NULL,
  tess_sector      INT,
  curve_data_json  JSONB  NOT NULL,
  curve_type       TEXT   NOT NULL DEFAULT 'standard',
  rarity_multiplier REAL  NOT NULL DEFAULT 1.0,
  consensus_label  TEXT,
  label_count      INT    NOT NULL DEFAULT 0,
  pipeline_run_id  UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_label_queue_unlabelled
  ON label_queue (curve_type, created_at)
  WHERE consensus_label IS NULL;

-- ---------------------------------------------------------------------------
-- Individual user label submissions
CREATE TABLE labels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  queue_item_id UUID NOT NULL REFERENCES label_queue(id)   ON DELETE CASCADE,
  label         TEXT NOT NULL,
  confidence    REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  score_awarded INT  NOT NULL DEFAULT 0,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, queue_item_id)
);

CREATE INDEX idx_labels_user ON labels (user_id, submitted_at DESC);

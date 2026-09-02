CREATE TABLE IF NOT EXISTS et4_records (
  experience TEXT NOT NULL,
  global_id TEXT NOT NULL,
  source_id TEXT,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  has_license BOOLEAN NOT NULL DEFAULT FALSE,
  has_description BOOLEAN NOT NULL DEFAULT FALSE,
  has_images BOOLEAN NOT NULL DEFAULT FALSE,
  quality_score SMALLINT,
  quality_status TEXT NOT NULL DEFAULT 'nicht berechenbar',
  missing_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  fulfilled_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL,
  PRIMARY KEY (experience, global_id),
  CONSTRAINT et4_records_quality_score_range
    CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS et4_records_experience_type_idx
  ON et4_records (experience, record_type);

CREATE INDEX IF NOT EXISTS et4_records_experience_changed_idx
  ON et4_records (experience, changed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS et4_records_experience_license_idx
  ON et4_records (experience, has_license, record_type);

CREATE INDEX IF NOT EXISTS et4_records_experience_quality_idx
  ON et4_records (experience, quality_status, record_type);

CREATE INDEX IF NOT EXISTS et4_records_areas_gin_idx
  ON et4_records USING GIN (areas);

CREATE INDEX IF NOT EXISTS et4_records_categories_gin_idx
  ON et4_records USING GIN (categories);

CREATE TABLE IF NOT EXISTS et4_sync_state (
  experience TEXT NOT NULL,
  record_type TEXT NOT NULL,
  last_changed_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  imported_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  PRIMARY KEY (experience, record_type)
);


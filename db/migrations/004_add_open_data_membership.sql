ALTER TABLE et4_records
  ADD COLUMN IF NOT EXISTS is_open_data_published BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS et4_records_open_data_published_idx
  ON et4_records (experience, is_open_data_published, record_type);

CREATE INDEX IF NOT EXISTS et4_records_missing_criteria_gin_idx
  ON et4_records USING GIN (missing_criteria);


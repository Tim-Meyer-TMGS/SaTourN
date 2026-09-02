ALTER TABLE et4_records
  ADD COLUMN IF NOT EXISTS license_type TEXT;

WITH extracted AS (
  SELECT
    record.experience,
    record.global_id,
    NULLIF(UPPER(TRIM((
      SELECT item->>'value'
      FROM jsonb_array_elements(COALESCE(record.payload->'attributes', '[]'::jsonb)) AS item
      WHERE LOWER(item->>'key') = 'license'
      LIMIT 1
    ))), '') AS license_type
  FROM et4_records AS record
)
UPDATE et4_records AS record
SET license_type = extracted.license_type
FROM extracted
WHERE record.experience = extracted.experience
  AND record.global_id = extracted.global_id
  AND record.license_type IS DISTINCT FROM extracted.license_type;

UPDATE et4_records
SET has_license = COALESCE(license_type IN ('CC0', 'CC-BY', 'CC-BY-SA', 'PD'), FALSE)
WHERE has_license IS DISTINCT FROM COALESCE(license_type IN ('CC0', 'CC-BY', 'CC-BY-SA', 'PD'), FALSE);

CREATE INDEX IF NOT EXISTS et4_records_experience_license_type_idx
  ON et4_records (experience, license_type, record_type);

DROP INDEX IF EXISTS et4_records_open_data_published_idx;

ALTER TABLE et4_records
  DROP COLUMN IF EXISTS is_open_data_published;

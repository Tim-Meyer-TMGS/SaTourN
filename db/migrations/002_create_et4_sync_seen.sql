CREATE TABLE IF NOT EXISTS et4_sync_seen (
  sync_token TEXT NOT NULL,
  experience TEXT NOT NULL,
  record_type TEXT NOT NULL,
  global_id TEXT NOT NULL,
  PRIMARY KEY (sync_token, experience, record_type, global_id)
);

CREATE INDEX IF NOT EXISTS et4_sync_seen_lookup_idx
  ON et4_sync_seen (experience, record_type, sync_token);


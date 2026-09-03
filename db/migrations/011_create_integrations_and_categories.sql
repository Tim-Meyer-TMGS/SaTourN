CREATE TABLE IF NOT EXISTS tenant_integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES app_tenant(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  project_key TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_tested_at TIMESTAMPTZ,
  last_test_succeeded BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES public."user"(id) ON DELETE SET NULL,
  UNIQUE (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS tenant_integrations_tenant_idx ON tenant_integrations (tenant_id, active);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  experience TEXT NOT NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  taxonomy TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (experience, taxonomy, name)
);

CREATE INDEX IF NOT EXISTS categories_external_id_idx ON categories (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS categories_name_idx ON categories (LOWER(name));

CREATE TABLE IF NOT EXISTS record_categories (
  experience TEXT NOT NULL,
  record_global_id TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'category',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (experience, record_global_id, category_id, relation_type),
  FOREIGN KEY (experience, record_global_id) REFERENCES et4_records(experience, global_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS record_categories_record_idx ON record_categories (experience, record_global_id);
CREATE INDEX IF NOT EXISTS record_categories_category_idx ON record_categories (category_id);

INSERT INTO categories (id, experience, name, taxonomy)
SELECT
  'cat_' || md5(record.experience || ':' || record.record_type || ':' || category.value),
  record.experience,
  category.value,
  record.record_type
FROM et4_records AS record
CROSS JOIN LATERAL jsonb_array_elements_text(record.categories) AS category(value)
WHERE NULLIF(TRIM(category.value), '') IS NOT NULL
ON CONFLICT (experience, taxonomy, name) DO UPDATE SET updated_at = NOW();

INSERT INTO record_categories (experience, record_global_id, category_id, relation_type)
SELECT record.experience, record.global_id, category.id, 'category'
FROM et4_records AS record
CROSS JOIN LATERAL jsonb_array_elements_text(record.categories) AS value(name)
JOIN categories AS category
  ON category.experience = record.experience
 AND category.taxonomy = record.record_type
 AND category.name = value.name
ON CONFLICT DO NOTHING;

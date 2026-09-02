CREATE TABLE IF NOT EXISTS app_tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_tenant_id TEXT REFERENCES app_tenant(id),
  is_root BOOLEAN NOT NULL DEFAULT FALSE,
  access_all_areas BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  theme TEXT NOT NULL DEFAULT 'satourn',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_area (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_tenant_area (
  tenant_id TEXT NOT NULL REFERENCES app_tenant(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL REFERENCES app_area(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, area_id)
);

CREATE TABLE IF NOT EXISTS app_user_profile (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES app_tenant(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('USER', 'GROUP_ADMIN', 'SUPER_ADMIN')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_user_profile_tenant_idx
  ON app_user_profile (tenant_id, active, role);

CREATE TABLE IF NOT EXISTS app_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_audit_log_created_idx
  ON app_audit_log (created_at DESC);

CREATE TABLE IF NOT EXISTS app_system_metrics (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_tenant (id, name, slug, parent_tenant_id, is_root, access_all_areas, theme)
VALUES ('tenant_tmgs', 'TMGS', 'tmgs', NULL, TRUE, TRUE, 'tmgs')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_root = TRUE,
  access_all_areas = TRUE,
  active = TRUE,
  updated_at = NOW();

INSERT INTO app_tenant (id, name, slug, parent_tenant_id, theme)
VALUES
  ('tenant_saechsische_schweiz', 'Sächsische Schweiz', 'saechsische-schweiz', 'tenant_tmgs', 'saechsische-schweiz'),
  ('tenant_leipzig', 'Leipzig', 'leipzig', 'tenant_tmgs', 'leipzig'),
  ('tenant_chemnitz_zwickau', 'Chemnitz Zwickau Region', 'chemnitz-zwickau-region', 'tenant_tmgs', 'chemnitz-zwickau-region')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_tenant_id = EXCLUDED.parent_tenant_id,
  updated_at = NOW();

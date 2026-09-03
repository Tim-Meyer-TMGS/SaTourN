INSERT INTO app_tenant (id, name, slug, parent_tenant_id, is_root, access_all_areas, active, theme)
VALUES
  ('tenant_chemnitz', 'Chemnitz', 'chemnitz', 'tenant_tmgs', FALSE, FALSE, TRUE, 'chemnitz'),
  ('tenant_dresden', 'Dresden', 'dresden', 'tenant_tmgs', FALSE, FALSE, TRUE, 'dresden'),
  ('tenant_oberlausitz', 'Oberlausitz', 'oberlausitz', 'tenant_tmgs', FALSE, FALSE, TRUE, 'oberlausitz'),
  ('tenant_erzgebirge', 'Erzgebirge', 'erzgebirge', 'tenant_tmgs', FALSE, FALSE, TRUE, 'erzgebirge'),
  ('tenant_vogtland', 'Vogtland', 'vogtland', 'tenant_tmgs', FALSE, FALSE, TRUE, 'vogtland')
ON CONFLICT (id) DO NOTHING;

UPDATE app_tenant
SET name = 'Chemnitz.Zwickau.Region.', updated_at = NOW()
WHERE id = 'tenant_chemnitz_zwickau'
  AND name = 'Chemnitz Zwickau Region';

INSERT INTO app_area (id, external_id, name, slug, active)
VALUES
  ('area_chemnitz_zwickau_region', 'Chemnitz.Zwickau.Region.', 'Chemnitz.Zwickau.Region.', 'chemnitz-zwickau-region', TRUE),
  ('area_rochlitzer_muldental', 'Rochlitzer Muldental', 'Rochlitzer Muldental', 'rochlitzer-muldental', TRUE),
  ('area_zwickau', 'Zwickau', 'Zwickau', 'zwickau', TRUE),
  ('area_lausitzer_seenland', 'Lausitzer Seenland', 'Lausitzer Seenland', 'lausitzer-seenland', TRUE)
ON CONFLICT (id) DO NOTHING;

WITH initial_mapping(tenant_id, area_id) AS (
  VALUES
    ('tenant_chemnitz', 'area_chemnitz'),
    ('tenant_chemnitz_zwickau', 'area_chemnitz'),
    ('tenant_chemnitz_zwickau', 'area_rochlitzer_muldental'),
    ('tenant_chemnitz_zwickau', 'area_zwickau'),
    ('tenant_chemnitz_zwickau', 'area_chemnitz_zwickau_region'),
    ('tenant_dresden', 'area_dresden'),
    ('tenant_dresden', 'area_dresden_elbland'),
    ('tenant_leipzig', 'area_leipzig'),
    ('tenant_leipzig', 'area_leipzig_region'),
    ('tenant_oberlausitz', 'area_oberlausitz'),
    ('tenant_oberlausitz', 'area_lausitzer_seenland'),
    ('tenant_erzgebirge', 'area_erzgebirge'),
    ('tenant_saechsische_schweiz', 'area_saechsische_schweiz'),
    ('tenant_vogtland', 'area_vogtland')
)
INSERT INTO app_tenant_area (tenant_id, area_id)
SELECT mapping.tenant_id, mapping.area_id
FROM initial_mapping AS mapping
WHERE NOT EXISTS (
  SELECT 1 FROM app_system_metrics WHERE key = 'seed.tenant-area-mapping.v1'
)
ON CONFLICT (tenant_id, area_id) DO NOTHING;

INSERT INTO app_system_metrics (key, value, updated_at)
VALUES ('seed.tenant-area-mapping.v1', '{"applied": true}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

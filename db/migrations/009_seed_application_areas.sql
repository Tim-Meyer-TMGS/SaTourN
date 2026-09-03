INSERT INTO app_area (id, external_id, name, slug, active)
VALUES
  ('area_chemnitz', 'Chemnitz', 'Chemnitz', 'chemnitz', TRUE),
  ('area_dresden', 'Dresden', 'Dresden', 'dresden', TRUE),
  ('area_dresden_elbland', 'Dresden Elbland', 'Dresden Elbland', 'dresden-elbland', TRUE),
  ('area_erzgebirge', 'Erzgebirge', 'Erzgebirge', 'erzgebirge', TRUE),
  ('area_leipzig', 'Leipzig', 'Leipzig', 'leipzig', TRUE),
  ('area_leipzig_region', 'Leipzig Region', 'Leipzig Region', 'leipzig-region', TRUE),
  ('area_oberlausitz', 'Oberlausitz', 'Oberlausitz', 'oberlausitz', TRUE),
  ('area_saechsische_schweiz', 'Sächsische Schweiz', 'Sächsische Schweiz', 'saechsische-schweiz', TRUE),
  ('area_vogtland', 'Vogtland', 'Vogtland', 'vogtland', TRUE)
ON CONFLICT (id) DO UPDATE SET
  external_id = EXCLUDED.external_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  active = TRUE,
  updated_at = NOW();

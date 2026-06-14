INSERT INTO services (id, name, slug, active, deleted)
VALUES
  ('service-terapia-individual', 'Terapia Individual', 'terapia-individual', true, false)
ON CONFLICT (slug)
DO UPDATE
SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  deleted = EXCLUDED.deleted,
  updated_at = NOW();

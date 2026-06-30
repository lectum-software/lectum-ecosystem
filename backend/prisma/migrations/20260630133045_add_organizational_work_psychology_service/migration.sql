INSERT INTO services (id, name, slug, active, deleted)
VALUES
  (
    'service-psicologia-organizacional-e-do-trabalho',
    'Psicologia Organizacional e do Trabalho',
    'psicologia-organizacional-e-do-trabalho',
    true,
    false
  )
ON CONFLICT (slug)
DO UPDATE
SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  deleted = EXCLUDED.deleted,
  updated_at = NOW();

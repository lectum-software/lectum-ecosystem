INSERT INTO services (id, name, slug, active, deleted)
VALUES
  ('service-avaliacao-psicologica', 'Avaliação psicológica', 'avaliacao-psicologica', true, false),
  ('service-neuropsicologia', 'Neuropsicologia', 'neuropsicologia', true, false)
ON CONFLICT (slug)
DO UPDATE
SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  deleted = EXCLUDED.deleted,
  updated_at = NOW();
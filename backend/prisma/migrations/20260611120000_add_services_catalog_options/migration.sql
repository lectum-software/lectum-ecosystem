INSERT INTO services (id, name, slug, active, deleted)
VALUES
  ('service-terapia-de-casal', 'Terapia de Casal', 'terapia-de-casal', true, false),
  ('service-terapia-familiar', 'Terapia Familiar', 'terapia-familiar', true, false),
  ('service-coach', 'Coach', 'coach', true, false),
  ('service-orientacao-vocacional', 'Orientação Vocacional', 'orientacao-vocacional', true, false),
  ('service-hipnoterapia', 'Hipnoterapia', 'hipnoterapia', true, false),
  ('service-supervisao-clinica', 'Supervisão Clínica', 'supervisao-clinica', true, false)
ON CONFLICT (slug)
DO UPDATE
SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  deleted = EXCLUDED.deleted,
  updated_at = NOW();
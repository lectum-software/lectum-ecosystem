INSERT INTO specialties (id, name, slug, active, deleted)
VALUES
  ('specialty-separacao-dos-pais', 'Separação dos pais', 'separacao-dos-pais', true, false),
  ('specialty-comportamento-infantil', 'Comportamento infantil', 'comportamento-infantil', true, false),
  ('specialty-processo-de-transicao-de-genero', 'Transição de gênero', 'processo-de-transicao-de-genero', true, false),
  ('specialty-aceitacao-familiar', 'Aceitação familiar', 'aceitacao-familiar', true, false)
ON CONFLICT (slug)
DO UPDATE
SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  deleted = EXCLUDED.deleted,
  updated_at = NOW();
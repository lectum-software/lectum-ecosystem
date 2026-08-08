-- Repair names imported by the historical Latin-1 migration without
-- overwriting catalog entries that were already corrected or customized.
UPDATE specialties AS specialty
SET
  name = correction.name,
  updated_at = NOW()
FROM (
  VALUES
    ('inteligencia-emocional', 'Inteligência Emocional'),
    ('carreira-e-proposito', 'Carreira e Propósito'),
    ('dependencia-emocional', 'Dependência Emocional'),
    ('orientacao-parental', 'Orientação Parental'),
    ('adolescencia', 'Adolescência'),
    ('separacao-dos-pais', 'Separação dos Pais'),
    ('identidade-genero', 'Identidade de Gênero'),
    ('processo-de-transicao-de-genero', 'Processo de Transição de Gênero'),
    ('aceitacao-familiar', 'Aceitação Familiar'),
    ('preconceito-discriminacao', 'Preconceito e Discriminação'),
    ('divorcio', 'Divórcio')
) AS correction(slug, name)
WHERE
  specialty.slug = correction.slug
  AND POSITION(CHR(65533) IN specialty.name) > 0;

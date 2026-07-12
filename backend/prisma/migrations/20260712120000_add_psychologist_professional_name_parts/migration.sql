ALTER TABLE "psychologist_profiles"
  ADD COLUMN "professional_first_name" TEXT,
  ADD COLUMN "professional_last_name" TEXT;

WITH normalized_names AS (
  SELECT
    pp.id,
    trim(
      regexp_replace(
        regexp_replace(COALESCE(u.name, ''), '[[:space:]]+', ' ', 'g'),
        '^(?:(?:dr|dra|doutor|doutora|psicologo|psicologa|psicólogo|psicóloga|psic|psi)\.?[[:space:]]+)+',
        '',
        'i'
      )
    ) AS full_name
  FROM "psychologist_profiles" pp
  INNER JOIN "users" u ON u.id = pp.user_id
)
UPDATE "psychologist_profiles" pp
SET
  "professional_first_name" = NULLIF(split_part(normalized_names.full_name, ' ', 1), ''),
  "professional_last_name" = NULLIF(
    trim(substr(normalized_names.full_name, length(split_part(normalized_names.full_name, ' ', 1)) + 2)),
    ''
  )
FROM normalized_names
WHERE pp.id = normalized_names.id;
-- TASK-65: Admin-managed catalogs and grouped specialties.
CREATE TABLE "specialty_categories" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "specialty_categories_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "specialties" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "specialties" ADD COLUMN "category_id" TEXT;
ALTER TABLE "services" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "approaches" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "profile_catalog_options" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  CONSTRAINT "profile_catalog_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "specialty_categories_slug_key" ON "specialty_categories"("slug");
CREATE INDEX "specialty_categories_slug_active_idx" ON "specialty_categories"("slug", "active");
CREATE INDEX "specialty_categories_active_deleted_position_idx" ON "specialty_categories"("active", "deleted", "position");
CREATE INDEX "specialties_category_id_active_deleted_position_idx" ON "specialties"("category_id", "active", "deleted", "position");
CREATE INDEX "services_active_deleted_position_idx" ON "services"("active", "deleted", "position");
CREATE INDEX "approaches_active_deleted_position_idx" ON "approaches"("active", "deleted", "position");
CREATE UNIQUE INDEX "profile_catalog_options_type_slug_key" ON "profile_catalog_options"("type", "slug");
CREATE INDEX "profile_catalog_options_type_active_deleted_position_idx" ON "profile_catalog_options"("type", "active", "deleted", "position");

INSERT INTO "specialty_categories" ("id", "name", "slug", "active", "position", "deleted")
VALUES
  ('specialty-category-ansiedade-e-transtornos-relacionados', 'Ansiedade e Transtornos Relacionados', 'ansiedade-e-transtornos-relacionados', true, 0, false),
  ('specialty-category-humor-e-saude-mental', 'Humor e Saúde Mental', 'humor-e-saude-mental', true, 10, false),
  ('specialty-category-relacionamentos', 'Relacionamentos', 'relacionamentos', true, 20, false),
  ('specialty-category-autoestima-e-desenvolvimento-pessoal', 'Autoestima e Desenvolvimento Pessoal', 'autoestima-e-desenvolvimento-pessoal', true, 30, false),
  ('specialty-category-trabalho-e-carreira', 'Trabalho e Carreira', 'trabalho-e-carreira', true, 40, false),
  ('specialty-category-neurodivergencias', 'Neurodivergências', 'neurodivergencias', true, 50, false),
  ('specialty-category-infancia-e-adolescencia', 'Infância e Adolescência', 'infancia-e-adolescencia', true, 60, false),
  ('specialty-category-sexualidade-e-diversidade', 'Sexualidade e Diversidade', 'sexualidade-e-diversidade', true, 70, false),
  ('specialty-category-alimentacao-e-corpo', 'Alimentação e Corpo', 'alimentacao-e-corpo', true, 80, false),
  ('specialty-category-dependencias', 'Dependências', 'dependencias', true, 90, false),
  ('specialty-category-luto-e-transicoes-da-vida', 'Luto e Transições da Vida', 'luto-e-transicoes-da-vida', true, 100, false),
  ('specialty-category-saude-da-mulher-e-maternidade', 'Saúde da Mulher e Maternidade', 'saude-da-mulher-e-maternidade', true, 110, false),
  ('specialty-category-saude-e-doencas', 'Saúde e Doenças', 'saude-e-doencas', true, 120, false),
  ('specialty-category-violencia-e-direitos-humanos', 'Violência e Direitos Humanos', 'violencia-e-direitos-humanos', true, 130, false),
  ('specialty-category-temas-gerais', 'Temas Gerais', 'temas-gerais', true, 140, false),
  ('specialty-category-outras-especialidades', 'Outras especialidades', 'outras-especialidades', true, 150, false)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "active" = true,
  "deleted" = false,
  "deleted_at" = NULL,
  "position" = EXCLUDED."position",
  "updated_at" = CURRENT_TIMESTAMP;

WITH specialty_map(category_slug, specialty_slugs) AS (
  VALUES
    ('ansiedade-e-transtornos-relacionados', ARRAY['ansiedade','ansiedade-generalizada-tag','sindrome-do-panico','fobias','toc','estresse','tept-transtorno-de-estresse-pos-traumatico']::TEXT[]),
    ('humor-e-saude-mental', ARRAY['depressao','transtorno-bipolar','burnout','tristeza-persistente','esquizofrenia','transtornos-de-humor']::TEXT[]),
    ('relacionamentos', ARRAY['relacionamentos','relacionamento-abusivo','conflitos-amorosos','conflitos-familiares','casamento','divorcio','dependencia-emocional','ciumes']::TEXT[]),
    ('autoestima-e-desenvolvimento-pessoal', ARRAY['autoestima','autoconhecimento','inteligencia-emocional','desenvolvimento-pessoal','projeto-de-vida','proposito','motivacao','autoconfianca']::TEXT[]),
    ('trabalho-e-carreira', ARRAY['carreira','transicao-de-carreira','produtividade','lideranca','ambiente-corporativo']::TEXT[]),
    ('neurodivergencias', ARRAY['tdah','autismo-tea','altas-habilidades','dislexia','dificuldades-de-aprendizagem']::TEXT[]),
    ('infancia-e-adolescencia', ARRAY['psicologia-infantil','adolescencia','separacao-dos-pais','desenvolvimento-infantil','orientacao-parental','bullying','dificuldades-escolares','comportamento-infantil']::TEXT[]),
    ('sexualidade-e-diversidade', ARRAY['sexualidade','identidade-genero','processo-de-transicao-de-genero','aceitacao-familiar','lgbtqia','sexologia','disfuncoes-sexuais']::TEXT[]),
    ('alimentacao-e-corpo', ARRAY['transtornos-alimentares','anorexia','bulimia','compulsao-alimentar','obesidade','imagem-corporal']::TEXT[]),
    ('dependencias', ARRAY['dependencia-quimica','dependencia-tecnologica','jogos-e-games','compras-compulsivas','vicios']::TEXT[]),
    ('luto-e-transicoes-da-vida', ARRAY['luto','mudancas-de-vida','menopausa','aposentadoria']::TEXT[]),
    ('saude-da-mulher-e-maternidade', ARRAY['saude-da-mulher','gestacao','puerperio','maternidade','saude-mental-materna','pre-natal-psicologico']::TEXT[]),
    ('saude-e-doencas', ARRAY['doencas-cronicas','cancer','dor-cronica','cuidados-paliativos','psicologia-hospitalar']::TEXT[]),
    ('violencia-e-direitos-humanos', ARRAY['violencia-domestica','violencia-de-genero','violencia-sexual','racismo','discriminacao','preconceito']::TEXT[]),
    ('temas-gerais', ARRAY['comunicacao','emocoes','sentimentos','comportamento','saude-mental']::TEXT[])
), positioned AS (
  SELECT c."id" AS category_id, item.slug, ((item.ordinality - 1) * 10)::INTEGER AS position
  FROM specialty_map map
  JOIN "specialty_categories" c ON c."slug" = map.category_slug
  CROSS JOIN LATERAL unnest(map.specialty_slugs) WITH ORDINALITY AS item(slug, ordinality)
)
UPDATE "specialties" s
SET "category_id" = positioned.category_id,
    "position" = positioned.position,
    "updated_at" = CURRENT_TIMESTAMP
FROM positioned
WHERE s."slug" = positioned.slug;

UPDATE "specialties" s
SET "category_id" = c."id",
    "position" = 10000,
    "updated_at" = CURRENT_TIMESTAMP
FROM "specialty_categories" c
WHERE c."slug" = 'outras-especialidades'
  AND s."category_id" IS NULL;

INSERT INTO "approaches" ("id", "name", "slug", "active", "deleted", "position")
VALUES
  ('approach-tcc', 'TCC', 'tcc', true, false, 0),
  ('approach-psicanalise', 'Psicanálise', 'psicanalise', true, false, 10),
  ('approach-gestalt-terapia', 'Gestalt-terapia', 'gestalt-terapia', true, false, 20),
  ('approach-humanista', 'Humanista', 'humanista', true, false, 30),
  ('approach-mindfulness', 'Mindfulness', 'mindfulness', true, false, 40),
  ('approach-analise-do-comportamento-aba', 'Análise do Comportamento (ABA)', 'analise-do-comportamento-aba', true, false, 50),
  ('approach-terapia-sistemica', 'Terapia Sistêmica', 'terapia-sistemica', true, false, 60),
  ('approach-terapia-breve', 'Terapia Breve', 'terapia-breve', true, false, 70)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "active" = true,
  "deleted" = false,
  "deleted_at" = NULL,
  "position" = EXCLUDED."position",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "services" ("id", "name", "slug", "active", "deleted", "position")
VALUES
  ('service-terapia-individual', 'Terapia Individual', 'terapia-individual', true, false, 0),
  ('service-terapia-de-casal', 'Terapia de Casal', 'terapia-de-casal', true, false, 10),
  ('service-avaliacao-psicologica', 'Avaliação Psicológica', 'avaliacao-psicologica', true, false, 20),
  ('service-coach', 'Coach', 'coach', true, false, 30),
  ('service-orientacao-profissional', 'Orientação Profissional', 'orientacao-profissional', true, false, 40),
  ('service-orientacao-vocacional', 'Orientação Vocacional', 'orientacao-vocacional', true, false, 50),
  ('service-psicologia-organizacional-e-do-trabalho', 'Psicologia Organizacional e do Trabalho', 'psicologia-organizacional-e-do-trabalho', true, false, 60),
  ('service-neuropsicologia', 'Neuropsicologia', 'neuropsicologia', true, false, 70),
  ('service-terapia-familiar', 'Terapia Familiar', 'terapia-familiar', true, false, 80),
  ('service-hipnoterapia', 'Hipnoterapia', 'hipnoterapia', true, false, 90),
  ('service-supervisao-clinica', 'Supervisão Clínica', 'supervisao-clinica', true, false, 100)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "active" = true,
  "deleted" = false,
  "deleted_at" = NULL,
  "position" = EXCLUDED."position",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "profile_catalog_options" ("id", "type", "name", "slug", "active", "deleted", "position")
VALUES
  ('profile-catalog-language-portugues', 'language', 'Português', 'portugues', true, false, 0),
  ('profile-catalog-language-ingles', 'language', 'Inglês', 'ingles', true, false, 10),
  ('profile-catalog-language-espanhol', 'language', 'Espanhol', 'espanhol', true, false, 20),
  ('profile-catalog-language-frances', 'language', 'Francês', 'frances', true, false, 30),
  ('profile-catalog-language-italiano', 'language', 'Italiano', 'italiano', true, false, 40),
  ('profile-catalog-language-libras', 'language', 'Libras', 'libras', true, false, 50),
  ('profile-catalog-target-criancas', 'target_audience', 'Crianças', 'criancas', true, false, 0),
  ('profile-catalog-target-adolescentes', 'target_audience', 'Adolescentes', 'adolescentes', true, false, 10),
  ('profile-catalog-target-adultos', 'target_audience', 'Adultos', 'adultos', true, false, 20),
  ('profile-catalog-target-idosos', 'target_audience', 'Idosos', 'idosos', true, false, 30),
  ('profile-catalog-target-casais', 'target_audience', 'Casais', 'casais', true, false, 40),
  ('profile-catalog-target-familias', 'target_audience', 'Famílias', 'familias', true, false, 50),
  ('profile-catalog-target-lgbtqia-plus', 'target_audience', 'Pessoas LGBTQIA+', 'lgbtqia_plus', true, false, 60)
ON CONFLICT ("type", "slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "active" = true,
  "deleted" = false,
  "deleted_at" = NULL,
  "position" = EXCLUDED."position",
  "updated_at" = CURRENT_TIMESTAMP;

ALTER TABLE "specialties" ADD CONSTRAINT "specialties_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "specialty_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
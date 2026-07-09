CREATE TABLE "community_rules" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "community_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "community_rules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "community_rules"
  ADD CONSTRAINT "community_rules_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "community_rules_community_id_active_position_idx"
  ON "community_rules"("community_id", "active", "position");

CREATE INDEX "community_rules_community_id_deleted_position_idx"
  ON "community_rules"("community_id", "deleted", "position");

INSERT INTO "community_rules" (
  "id",
  "community_id",
  "title",
  "description",
  "position",
  "active"
)
SELECT
  'cr_' || substr(md5(c."id" || ':' || rule.position::text), 1, 22) AS "id",
  c."id" AS "community_id",
  rule.title,
  rule.description,
  rule.position,
  true AS "active"
FROM "communities" c
CROSS JOIN (
  VALUES
    (0, 'Respeito e empatia', 'Trate todos com respeito. Comentários ofensivos, preconceituosos ou desrespeitosos não são permitidos.'),
    (1, 'Sem dados pessoais', 'Não compartilhe informações pessoais suas ou de terceiros, como nome completo, telefone, endereço, redes sociais ou documentos.'),
    (2, 'Proibido conteúdo nocivo', 'Não é permitido postar conteúdo que incentive violência, automutilação, ódio ou qualquer tipo de dano.'),
    (3, 'Psicólogos não fazem atendimento', 'Este é um espaço de apoio e orientação. Psicólogos não realizam consultas ou diagnósticos aqui.'),
    (4, 'Para atendimento, use o WhatsApp', 'Para agendar consultas ou falar sobre atendimentos, entre em contato com o profissional pelo WhatsApp.' )
) AS rule(position, title, description)
WHERE c."deleted" = false
  AND NOT EXISTS (
    SELECT 1
    FROM "community_rules" existing
    WHERE existing."community_id" = c."id"
      AND existing."deleted" = false
      AND existing."title" = rule.title
  );

INSERT INTO "communities" (
    "id",
    "name",
    "slug",
    "description",
    "category",
    "members_count",
    "created_at",
    "updated_at"
) VALUES
    (
        'community-ansiedade-em-equilibrio',
        'Ansiedade em equilíbrio',
        'ansiedade-em-equilibrio',
        'Espaço para conversas sobre ansiedade, regulação emocional, rotina e estratégias de cuidado baseadas em acolhimento.',
        'Saúde emocional',
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'community-relacionamentos-com-proposito',
        'Relacionamentos com Propósito',
        'relacionamentos-com-proposito',
        'Comunidade para refletir sobre vínculos, comunicação, limites saudáveis e construção de relações mais conscientes.',
        'Relacionamentos',
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'community-mulheres-em-foco',
        'Mulheres em Foco',
        'mulheres-em-foco',
        'Trocas sobre saúde mental de mulheres, autoestima, ciclos de vida, carreira, família e rede de apoio.',
        'Mulheres',
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'community-autocuidado-em-pratica',
        'Autocuidado em Prática',
        'autocuidado-em-pratica',
        'Lugar para compartilhar práticas realistas de autocuidado, organização emocional e pequenos hábitos sustentáveis.',
        'Autocuidado',
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'community-luto-e-ressignificacao',
        'Luto e Ressignificação',
        'luto-e-ressignificacao',
        'Comunidade de acolhimento para falar sobre perdas, saudade, elaboração do luto e reconstrução de sentido.',
        'Luto',
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("slug") DO UPDATE
SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "category" = EXCLUDED."category",
    "deleted" = FALSE,
    "deleted_at" = NULL,
    "updated_at" = CURRENT_TIMESTAMP;

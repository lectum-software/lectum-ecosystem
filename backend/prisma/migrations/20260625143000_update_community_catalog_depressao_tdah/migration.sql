-- Atualiza o catalogo curado de comunidades solicitado pelo produto.
-- Preserva as comunidades existentes que continuam ativas, adiciona Depressao/TDAH
-- e remove Mulheres/Luto por soft delete para manter historico e integridade referencial.

INSERT INTO "communities" (
    "id",
    "name",
    "slug",
    "description",
    "category",
    "members_count",
    "avatar_url",
    "visual_primary_color",
    "visual_primary_dark_color",
    "visual_soft_color",
    "visual_text_color",
    "visual_gradient_color",
    "created_at",
    "updated_at"
) VALUES
    (
        'community-ansiedade-em-equilibrio',
        'Ansiedade em Equilíbrio',
        'ansiedade-em-equilibrio',
        'Espaço para conversas sobre ansiedade, regulação emocional, rotina e estratégias de cuidado baseadas em acolhimento.',
        'Ansiedade',
        0,
        '/community/icons/ansiedade.png',
        '#FF8A2A',
        '#C95610',
        '#FFF0E3',
        '#8A3A0D',
        '#FFE1C5',
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
        '/community/icons/relacionamentos.png',
        '#FF4548',
        '#C51F2B',
        '#FFE7E7',
        '#8E1B24',
        '#FFD0D2',
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
        '/community/icons/autocuidado.png',
        '#F28AA5',
        '#C85878',
        '#FFEAF0',
        '#8B3150',
        '#FFD4DF',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'community-depressao',
        'Depressão',
        'depressao',
        'Espaço de acolhimento para conversar sobre desânimo, isolamento, recaídas, rotina e caminhos possíveis de cuidado.',
        'Depressão',
        0,
        '/community/icons/depressao.png',
        '#4A8DED',
        '#245FC3',
        '#E7F0FF',
        '#1E4F93',
        '#CCE0FF',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'community-tdah',
        'TDAH',
        'tdah',
        'Comunidade para trocar experiências sobre foco, organização, impulsividade, rotina e estratégias de cuidado para TDAH.',
        'TDAH',
        0,
        '/community/icons/tdah.png',
        '#A24CE1',
        '#7130B5',
        '#F2E7FF',
        '#4F238A',
        '#E2C9FF',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("slug") DO UPDATE
SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "category" = EXCLUDED."category",
    "avatar_url" = EXCLUDED."avatar_url",
    "visual_primary_color" = EXCLUDED."visual_primary_color",
    "visual_primary_dark_color" = EXCLUDED."visual_primary_dark_color",
    "visual_soft_color" = EXCLUDED."visual_soft_color",
    "visual_text_color" = EXCLUDED."visual_text_color",
    "visual_gradient_color" = EXCLUDED."visual_gradient_color",
    "deleted" = FALSE,
    "deleted_at" = NULL,
    "updated_at" = CURRENT_TIMESTAMP;

UPDATE "communities"
SET
    "deleted" = TRUE,
    "deleted_at" = COALESCE("deleted_at", CURRENT_TIMESTAMP),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" IN ('mulheres-em-foco', 'luto-e-ressignificacao');

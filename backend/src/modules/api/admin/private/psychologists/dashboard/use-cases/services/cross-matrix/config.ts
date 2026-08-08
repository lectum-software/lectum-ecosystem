import {
  ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG,
  ADMIN_PROFILE_CONVERSION_SOURCE,
} from "@/utils/admin-profile-conversion";
import {
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_ORDER,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
} from "@/utils/admin-profile-engagement-favorites";
import {
  ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_CONFIG,
  ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_ORDER,
  ADMIN_PROFILE_EXPOSURE_SOURCE,
  ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_CONFIG,
  ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_ORDER,
} from "@/utils/admin-profile-exposure";
import type {
  AdminPsychologistsDashboardProfileCrossMatrixAxisId,
  AdminPsychologistsDashboardProfileCrossMatrixCategory,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import {
  PROFILE_ACTIVITY_CATEGORY_CONFIG,
  PROFILE_ACTIVITY_CATEGORY_ORDER,
  PROFILE_ACTIVITY_SOURCE,
  PROFILE_CONVERSION_CATEGORY_CONFIG,
  PROFILE_CONVERSION_GOAL_CATEGORY_ORDER,
  PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER,
  PROFILE_COVERAGE_CATEGORY_CONFIG,
  PROFILE_COVERAGE_CATEGORY_ORDER,
  PROFILE_COVERAGE_SOURCE,
} from "../support/constants";

export const PROFILE_CROSS_MATRIX_SOURCE = `${ADMIN_PROFILE_CONVERSION_SOURCE}+normalized_30d_absolute_goal+${PROFILE_ACTIVITY_SOURCE}+${PROFILE_COVERAGE_SOURCE}+${ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE}+${ADMIN_PROFILE_EXPOSURE_SOURCE}+profile_video_watch_session+community_post.media_type+post_reply.media_type+profile_view_event.source=profile_page+professional_review.status=publicada+shared_psychologist_public_ranking_helper`;

export const PROFILE_CROSS_MATRIX_DEFAULT_ROW_AXIS_ID = "conversion" as const;

export const PROFILE_CROSS_MATRIX_DEFAULT_COLUMN_AXIS_ID = "community_visibility" as const;

type ProfileCrossMatrixCategoryDefinition = Omit<
  AdminPsychologistsDashboardProfileCrossMatrixCategory,
  "count" | "percentage"
>;

type ProfileCrossMatrixAxisDefinition = {
  categories: ProfileCrossMatrixCategoryDefinition[];
  description: string;
  id: AdminPsychologistsDashboardProfileCrossMatrixAxisId;
  label: string;
  source: string;
};

export type ProfileCrossMatrixAssignments = Record<
  AdminPsychologistsDashboardProfileCrossMatrixAxisId,
  string
>;

const PROFILE_CROSS_MATRIX_COLORS = {
  danger: "#ef4444",
  high: "#13a85b",
  low: "#f59f00",
  none: "#64748b",
  standard: "#308ce8",
} as const;

const PROFILE_VIDEO_RETENTION_CATEGORY_ORDER = [
  "high_presentation_video_retention",
  "standard_presentation_video_retention",
  "low_presentation_video_retention",
  "no_presentation_video_retention",
] as const;

type ProfileVideoRetentionCategoryId = (typeof PROFILE_VIDEO_RETENTION_CATEGORY_ORDER)[number];

const PROFILE_VIDEO_RETENTION_CATEGORY_CONFIG = {
  high_presentation_video_retention: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Retenção média do vídeo de apresentação acima da faixa padrão da plataforma no período selecionado.",
    label: "Alta Retenção",
  },
  low_presentation_video_retention: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Retenção média do vídeo de apresentação abaixo da faixa padrão da plataforma, mas com sessão real no período.",
    label: "Baixa Retenção",
  },
  no_presentation_video_retention: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description:
      "Nenhuma sessão real do vídeo de apresentação com duração suficiente para calcular retenção no período.",
    label: "Sem Retenção",
  },
  standard_presentation_video_retention: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Retenção média do vídeo de apresentação dentro da faixa padrão da plataforma no período selecionado.",
    label: "Retenção Padrão",
  },
} satisfies Record<
  ProfileVideoRetentionCategoryId,
  { color: string; description: string; label: string }
>;

const COMMUNITY_CONTENT_FORMAT_CATEGORY_ORDER = [
  "community_post_video",
  "community_post_without_video",
  "community_reply_video",
  "community_reply_without_video",
  "no_community_content",
] as const;

type CommunityContentFormatCategoryId = (typeof COMMUNITY_CONTENT_FORMAT_CATEGORY_ORDER)[number];

const COMMUNITY_CONTENT_FORMAT_CATEGORY_CONFIG = {
  community_post_video: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Formato autoral predominante: posts em comunidades com pelo menos uma mídia de vídeo no período selecionado.",
    label: "Posts com vídeo",
  },
  community_post_without_video: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Formato autoral predominante: posts em comunidades sem mídia de vídeo no período selecionado.",
    label: "Posts sem vídeo",
  },
  community_reply_video: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Formato autoral predominante: respostas em comunidades com mídia de vídeo no período selecionado.",
    label: "Respostas com vídeo",
  },
  community_reply_without_video: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Formato autoral predominante: respostas em comunidades sem mídia de vídeo no período selecionado.",
    label: "Respostas sem vídeo",
  },
  no_community_content: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description:
      "Psicólogo não publicou posts nem respostas em comunidades no período selecionado.",
    label: "Sem conteúdo",
  },
} satisfies Record<
  CommunityContentFormatCategoryId,
  { color: string; description: string; label: string }
>;

const PROFILE_OPENING_CATEGORY_ORDER = [
  "high_profile_opening",
  "standard_profile_opening",
  "low_profile_opening",
  "no_profile_opening",
] as const;

export type ProfileOpeningCategoryId = (typeof PROFILE_OPENING_CATEGORY_ORDER)[number];

const PROFILE_OPENING_CATEGORY_CONFIG = {
  high_profile_opening: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Aberturas reais do perfil público acima da faixa padrão da plataforma no período selecionado.",
    label: "Alta abertura",
  },
  low_profile_opening: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Aberturas reais do perfil público abaixo da faixa padrão da plataforma, mas com sinal no período.",
    label: "Baixa abertura",
  },
  no_profile_opening: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description: "Nenhuma abertura real do perfil público no período selecionado.",
    label: "Sem abertura",
  },
  standard_profile_opening: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Aberturas reais do perfil público dentro da faixa padrão da plataforma no período selecionado.",
    label: "Abertura padrão",
  },
} satisfies Record<ProfileOpeningCategoryId, { color: string; description: string; label: string }>;

const REVIEWS_CATEGORY_ORDER = [
  "high_reviews",
  "standard_reviews",
  "low_reviews",
  "no_reviews",
] as const;

export type ReviewsCategoryId = (typeof REVIEWS_CATEGORY_ORDER)[number];

const REVIEWS_CATEGORY_CONFIG = {
  high_reviews: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Avaliações publicadas recebidas acima da faixa padrão da plataforma no período selecionado.",
    label: "Muitas avaliações",
  },
  low_reviews: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Avaliações publicadas recebidas abaixo da faixa padrão da plataforma, mas com sinal no período.",
    label: "Poucas avaliações",
  },
  no_reviews: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description: "Nenhuma avaliação publicada recebida no período selecionado.",
    label: "Sem avaliações",
  },
  standard_reviews: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Avaliações publicadas recebidas dentro da faixa padrão da plataforma no período selecionado.",
    label: "Avaliações padrão",
  },
} satisfies Record<ReviewsCategoryId, { color: string; description: string; label: string }>;

export const PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER = [
  "presentation_video_position_top_10",
  "presentation_video_position_top_30",
  "presentation_video_position_top_50",
  "presentation_video_position_50_plus",
] as const;

export type PresentationVideoPositionCategoryId =
  (typeof PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER)[number];

export const PRESENTATION_VIDEO_POSITION_CATEGORY_CONFIG = {
  presentation_video_position_50_plus: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description:
      "Vídeo de apresentação do psicólogo aparece após a posição 50 ou fora da lista pública ranqueada.",
    label: "50+",
  },
  presentation_video_position_top_10: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Vídeo de apresentação do psicólogo aparece entre as 10 primeiras posições da página de psicólogos.",
    label: "Top 10",
  },
  presentation_video_position_top_30: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Vídeo de apresentação do psicólogo aparece entre as posições 11 e 30 da página de psicólogos.",
    label: "Top 30",
  },
  presentation_video_position_top_50: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Vídeo de apresentação do psicólogo aparece entre as posições 31 e 50 da página de psicólogos.",
    label: "Top 50",
  },
} satisfies Record<
  PresentationVideoPositionCategoryId,
  { color: string; description: string; label: string }
>;

const profileCrossMatrixCategory = (
  id: string,
  config: { description: string; label: string },
  color: string,
): ProfileCrossMatrixCategoryDefinition => ({
  color,
  description: config.description,
  id,
  label: config.label,
});

export const PROFILE_CROSS_MATRIX_AXIS_DEFINITIONS: ProfileCrossMatrixAxisDefinition[] = [
  {
    categories: PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        PROFILE_CONVERSION_CATEGORY_CONFIG[id],
        id === "strong_conversion"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_conversion"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_conversion"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.danger,
      ),
    ),
    description: "Faixas de cliques reais no WhatsApp recebidos por psicólogo.",
    id: "conversion",
    label: "Conversão",
    source: ADMIN_PROFILE_CONVERSION_SOURCE,
  },
  {
    categories: PROFILE_CONVERSION_GOAL_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG[id],
        id === "good_conversion"
          ? PROFILE_CROSS_MATRIX_COLORS.standard
          : id === "excellent_conversion"
            ? PROFILE_CROSS_MATRIX_COLORS.high
            : id === "low_conversion"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description:
      "Meta absoluta de cliques no WhatsApp normalizados para 30 dias: Na Meta entre 5 e 9 e Acima da meta a partir de 10 conversões equivalentes.",
    id: "conversion_goal",
    label: "Meta de conversão",
    source: `${ADMIN_PROFILE_CONVERSION_SOURCE}+normalized_30d_absolute_goal`,
  },
  {
    categories: PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        PROFILE_ACTIVITY_CATEGORY_CONFIG[id],
        id === "muito_ativo"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "ativo"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "pouco_ativo"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Volume de posts e respostas autorais criados nas comunidades.",
    id: "activity",
    label: "Atividade comunidade",
    source: PROFILE_ACTIVITY_SOURCE,
  },
  {
    categories: PROFILE_COVERAGE_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        PROFILE_COVERAGE_CATEGORY_CONFIG[id],
        id === "above_average_coverage"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "average_coverage"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "below_average_coverage"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description:
      "Posts únicos de pacientes que receberam ao menos uma resposta do psicólogo no período, comparados à média por psicólogo.",
    id: "coverage",
    label: "Cobertura",
    source: PROFILE_COVERAGE_SOURCE,
  },
  {
    categories: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG[id],
        id === "high_engagement"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_engagement"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_engagement"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Score de engajamento recebido em comunidades por comentários e interações reais.",
    id: "engagement",
    label: "Engajamento comunidade",
    source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
  },
  {
    categories: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG[id],
        id === "high_favorites"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_favorites"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_favorites"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Favoritos reais recebidos pelos psicólogos no período selecionado.",
    id: "favorites",
    label: "Favoritados",
    source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
  },
  {
    categories: PROFILE_OPENING_CATEGORY_ORDER.map((id) => ({
      id,
      ...PROFILE_OPENING_CATEGORY_CONFIG[id],
    })),
    description: "Aberturas reais do perfil público do psicólogo no período selecionado.",
    id: "profile_opening",
    label: "Abertura de perfil",
    source: "profile_view_event.source=profile_page",
  },
  {
    categories: REVIEWS_CATEGORY_ORDER.map((id) => ({
      id,
      ...REVIEWS_CATEGORY_CONFIG[id],
    })),
    description: "Avaliações publicadas recebidas pelo psicólogo no período selecionado.",
    id: "reviews",
    label: "Avaliações",
    source: "professional_review.status=publicada",
  },
  {
    categories: ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_CONFIG[id],
        id === "high_community"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_community"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_community"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Atenção real recebida em conteúdo autoral nas comunidades.",
    id: "community_visibility",
    label: "Visibilidade comunidade",
    source: ADMIN_PROFILE_EXPOSURE_SOURCE,
  },
  {
    categories: ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_CONFIG[id],
        id === "high_video"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_video"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_video"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Tempo real assistido no vídeo de apresentação do perfil.",
    id: "presentation_video_visibility",
    label: "Visibilidade vídeo de apresentação",
    source: ADMIN_PROFILE_EXPOSURE_SOURCE,
  },
  {
    categories: PROFILE_VIDEO_RETENTION_CATEGORY_ORDER.map((id) => ({
      id,
      ...PROFILE_VIDEO_RETENTION_CATEGORY_CONFIG[id],
    })),
    description: "Retenção média real do vídeo de apresentação, por sessões com duração.",
    id: "presentation_video_retention",
    label: "Retenção vídeo de apresentação",
    source: "profile_video_watch_session.watched_seconds/duration_seconds",
  },
  {
    categories: PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER.map((id) => ({
      id,
      ...PRESENTATION_VIDEO_POSITION_CATEGORY_CONFIG[id],
    })),
    description: "Posição do vídeo de apresentação na página pública de psicólogos.",
    id: "presentation_video_position",
    label: "Posição vídeo de apresentação",
    source: "shared_psychologist_public_ranking_helper",
  },
  {
    categories: COMMUNITY_CONTENT_FORMAT_CATEGORY_ORDER.map((id) => ({
      id,
      ...COMMUNITY_CONTENT_FORMAT_CATEGORY_CONFIG[id],
    })),
    description:
      "Formato predominante do conteúdo autoral publicado pelo psicólogo nas comunidades.",
    id: "community_content_format",
    label: "Formato de conteúdo",
    source: "community_post.author_id+post_reply.author_id+media_type",
  },
];

export const classifyProfileVideoRetentionCategory = (input: {
  averageRetention: number | null;
  standardMaxRetention: number | null;
  standardMinRetention: number | null;
}): ProfileVideoRetentionCategoryId => {
  if (input.averageRetention === null || input.averageRetention <= 0) {
    return "no_presentation_video_retention";
  }

  if (input.standardMinRetention === null || input.standardMaxRetention === null) {
    return "standard_presentation_video_retention";
  }
  if (input.averageRetention > input.standardMaxRetention) {
    return "high_presentation_video_retention";
  }
  if (input.averageRetention < input.standardMinRetention) {
    return "low_presentation_video_retention";
  }

  return "standard_presentation_video_retention";
};

export const classifyProfileCrossMatrixCountCategory = <TCategoryId extends string>(input: {
  count: number;
  highCategoryId: TCategoryId;
  lowCategoryId: TCategoryId;
  noCategoryId: TCategoryId;
  standardCategoryId: TCategoryId;
  standardMax: number | null;
  standardMin: number | null;
}): TCategoryId => {
  if (input.count <= 0) return input.noCategoryId;
  if (input.standardMin === null || input.standardMax === null) return input.standardCategoryId;
  if (input.count > input.standardMax) return input.highCategoryId;
  if (input.count < input.standardMin) return input.lowCategoryId;

  return input.standardCategoryId;
};

export type CommunityContentFormatSignals = Record<
  "postText" | "postVideo" | "replyText" | "replyVideo",
  number
>;

export const emptyCommunityContentFormatSignals = (): CommunityContentFormatSignals => ({
  postText: 0,
  postVideo: 0,
  replyText: 0,
  replyVideo: 0,
});

export const classifyCommunityContentFormatCategory = (
  signals: CommunityContentFormatSignals,
): CommunityContentFormatCategoryId => {
  const rankedFormats: Array<{
    count: number;
    id: CommunityContentFormatCategoryId;
    priority: number;
  }> = [
    { count: signals.postVideo, id: "community_post_video", priority: 4 },
    { count: signals.replyVideo, id: "community_reply_video", priority: 3 },
    { count: signals.postText, id: "community_post_without_video", priority: 2 },
    { count: signals.replyText, id: "community_reply_without_video", priority: 1 },
  ];
  const selected = rankedFormats
    .filter((format) => format.count > 0)
    .sort((left, right) => right.count - left.count || right.priority - left.priority)[0];

  return selected?.id ?? "no_community_content";
};

export const classifyPresentationVideoPositionCategory = (
  position: number | null,
): PresentationVideoPositionCategoryId => {
  if (typeof position !== "number" || position > 50) return "presentation_video_position_50_plus";
  if (position <= 10) return "presentation_video_position_top_10";
  if (position <= 30) return "presentation_video_position_top_30";

  return "presentation_video_position_top_50";
};

export const addProfileCrossMatrixCount = <TKey extends string>(
  counts: Map<TKey, number>,
  key: TKey,
) => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

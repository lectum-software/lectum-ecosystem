export type AdminProfileEngagementFavoritesCommunityCategoryId =
  | "high_engagement"
  | "low_engagement"
  | "no_engagement"
  | "standard_engagement";

export type AdminProfileEngagementFavoritesFavoriteCategoryId =
  | "high_favorites"
  | "low_favorites"
  | "no_favorites"
  | "standard_favorites";

export type AdminProfileEngagementFavoritesCombinationId =
  `${AdminProfileEngagementFavoritesCommunityCategoryId}_${AdminProfileEngagementFavoritesFavoriteCategoryId}`;

export type AdminProfileEngagementFavoritesCategoryId =
  | AdminProfileEngagementFavoritesCombinationId
  | "insufficient_data";

export type AdminProfileEngagementFavoritesCommunityBenchmark = {
  basis: "non_zero_patient_community_engagement_score_outside_adaptation_period";
  eligible_psychologists: number;
  engaged_psychologists: number;
  p25_engagement_score: number | null;
  p50_engagement_score: number | null;
  p75_engagement_score: number | null;
  standard_max_engagement_score: number | null;
  standard_min_engagement_score: number | null;
};

export type AdminProfileEngagementFavoritesFavoriteBenchmark = {
  basis: "non_zero_patient_favorites_outside_adaptation_period";
  eligible_psychologists: number;
  favorited_psychologists: number;
  p25_favorites: number | null;
  p50_favorites: number | null;
  p75_favorites: number | null;
  standard_max_favorites: number | null;
  standard_min_favorites: number | null;
};

export type AdminProfileEngagementFavoritesBenchmark = {
  adaptation_period_days: number;
  community_engagement: AdminProfileEngagementFavoritesCommunityBenchmark;
  favorites: AdminProfileEngagementFavoritesFavoriteBenchmark;
};

export type AdminProfileEngagementFavoritesCommunityScoreInput = {
  commentsReceived: number;
  contentSaves: number;
  contentShares: number;
  positiveVotes: number;
};

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE =
  "psychologist_favorite.user.role=paciente+post_reply.received.user.role=paciente+post_vote.value=1.received.user.role=paciente+post_save.received.user.role=paciente+post_reply_save.received.user.role=paciente+post_share.received.user.role=paciente" as const;

export type AdminProfileEngagementFavoritesSource =
  typeof ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE;

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS = {
  adaptation_period_days: 30,
} as const;

export type AdminProfileEngagementFavoritesThresholds =
  typeof ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS;

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SCORE_CONFIG = {
  weights: {
    comments_received: 5,
    content_saves: 2,
    content_shares: 3,
    positive_votes: 1,
  },
} as const;

export type AdminProfileEngagementFavoritesScoreConfig =
  typeof ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SCORE_CONFIG;

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER: AdminProfileEngagementFavoritesCommunityCategoryId[] =
  ["high_engagement", "standard_engagement", "low_engagement", "no_engagement"];

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_ORDER: AdminProfileEngagementFavoritesFavoriteCategoryId[] =
  ["high_favorites", "standard_favorites", "low_favorites", "no_favorites"];

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMBINATION_ORDER: AdminProfileEngagementFavoritesCombinationId[] =
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER.flatMap((engagementId) =>
    ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_ORDER.map(
      (favoritesId) => `${engagementId}_${favoritesId}` as const,
    ),
  );

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_CATEGORY_ORDER: AdminProfileEngagementFavoritesCategoryId[] =
  [...ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMBINATION_ORDER, "insufficient_data"];

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG = {
  high_engagement: {
    description:
      "Score de relacionamento recebido na comunidade acima da faixa padrão da plataforma no período selecionado.",
    label: "Alto Engajamento",
  },
  low_engagement: {
    description:
      "Score de relacionamento recebido na comunidade abaixo da faixa padrão da plataforma, mas com algum sinal no período.",
    label: "Baixo Engajamento",
  },
  no_engagement: {
    description:
      "Nenhum comentário, voto positivo, salvamento ou compartilhamento recebido na comunidade no período.",
    label: "Sem Engajamento",
  },
  standard_engagement: {
    description:
      "Score de relacionamento recebido na comunidade dentro da faixa padrão da plataforma no período selecionado.",
    label: "Engajamento Padrão",
  },
} satisfies Record<
  AdminProfileEngagementFavoritesCommunityCategoryId,
  { description: string; label: string }
>;

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG = {
  high_favorites: {
    description: "Favoritos recebidos acima da faixa padrão da plataforma no período selecionado.",
    label: "Muito favoritado",
  },
  low_favorites: {
    description:
      "Favoritos recebidos abaixo da faixa padrão da plataforma, mas com ao menos um favorito no período.",
    label: "Pouco favoritado",
  },
  no_favorites: {
    description: "Nenhum favorito recebido no período selecionado.",
    label: "Sem favoritos",
  },
  standard_favorites: {
    description: "Favoritos recebidos dentro da faixa padrão da plataforma no período selecionado.",
    label: "Favoritado padrão",
  },
} satisfies Record<
  AdminProfileEngagementFavoritesFavoriteCategoryId,
  { description: string; label: string }
>;

export const ADMIN_PROFILE_ENGAGEMENT_FAVORITES_INSUFFICIENT_DATA_CONFIG = {
  description:
    "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; Engajamento e Favoritos ainda não são comparados com a plataforma.",
  label: "Dados Insuficientes",
} as const;

export const roundAdminProfileEngagementFavoritesNumber = (value: number) =>
  Math.round(value * 10) / 10;

const nearestRankPercentile = (sortedValues: number[], percentile: number) => {
  if (sortedValues.length === 0) return null;

  const rank = Math.ceil((percentile / 100) * sortedValues.length);
  const index = Math.min(sortedValues.length - 1, Math.max(0, rank - 1));

  return sortedValues[index] ?? null;
};

const median = (sortedValues: number[]) => {
  if (sortedValues.length === 0) return null;

  const middle = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 1) return sortedValues[middle] ?? null;

  const left = sortedValues[middle - 1] ?? 0;
  const right = sortedValues[middle] ?? 0;

  return roundAdminProfileEngagementFavoritesNumber((left + right) / 2);
};

export const calculateAdminProfileEngagementFavoritesCommunityScore = (
  input: AdminProfileEngagementFavoritesCommunityScoreInput,
) => {
  const { weights } = ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SCORE_CONFIG;

  return roundAdminProfileEngagementFavoritesNumber(
    Math.max(0, input.commentsReceived) * weights.comments_received +
      Math.max(0, input.contentSaves) * weights.content_saves +
      Math.max(0, input.contentShares) * weights.content_shares +
      Math.max(0, input.positiveVotes) * weights.positive_votes,
  );
};

export const buildAdminProfileEngagementFavoritesBenchmark = (input: {
  communityEngagementScores: number[];
  eligiblePsychologists: number;
  favoriteCounts: number[];
}): AdminProfileEngagementFavoritesBenchmark => {
  const nonZeroCommunityScores = input.communityEngagementScores
    .map(roundAdminProfileEngagementFavoritesNumber)
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  const nonZeroFavorites = input.favoriteCounts
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  const communityP25 = nearestRankPercentile(nonZeroCommunityScores, 25);
  const communityP75 = nearestRankPercentile(nonZeroCommunityScores, 75);
  const favoritesP25 = nearestRankPercentile(nonZeroFavorites, 25);
  const favoritesP75 = nearestRankPercentile(nonZeroFavorites, 75);

  return {
    adaptation_period_days: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
    community_engagement: {
      basis: "non_zero_patient_community_engagement_score_outside_adaptation_period",
      eligible_psychologists: input.eligiblePsychologists,
      engaged_psychologists: nonZeroCommunityScores.length,
      p25_engagement_score: communityP25,
      p50_engagement_score: median(nonZeroCommunityScores),
      p75_engagement_score: communityP75,
      standard_max_engagement_score: communityP75,
      standard_min_engagement_score: communityP25,
    },
    favorites: {
      basis: "non_zero_patient_favorites_outside_adaptation_period",
      eligible_psychologists: input.eligiblePsychologists,
      favorited_psychologists: nonZeroFavorites.length,
      p25_favorites: favoritesP25,
      p50_favorites: median(nonZeroFavorites),
      p75_favorites: favoritesP75,
      standard_max_favorites: favoritesP75,
      standard_min_favorites: favoritesP25,
    },
  };
};

export const classifyAdminProfileEngagementFavoritesCommunityCategory = (input: {
  benchmark: AdminProfileEngagementFavoritesBenchmark;
  engagementScore: number;
  profileAgeDays: number;
}): AdminProfileEngagementFavoritesCommunityCategoryId | "insufficient_data" => {
  if (input.profileAgeDays < ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days) {
    return "insufficient_data";
  }

  if (input.engagementScore <= 0) return "no_engagement";

  const standardMin = input.benchmark.community_engagement.standard_min_engagement_score;
  const standardMax = input.benchmark.community_engagement.standard_max_engagement_score;

  if (standardMin === null || standardMax === null) return "standard_engagement";
  if (input.engagementScore > standardMax) return "high_engagement";
  if (input.engagementScore < standardMin) return "low_engagement";

  return "standard_engagement";
};

export const classifyAdminProfileEngagementFavoritesFavoriteCategory = (input: {
  benchmark: AdminProfileEngagementFavoritesBenchmark;
  favorites: number;
  profileAgeDays: number;
}): AdminProfileEngagementFavoritesFavoriteCategoryId | "insufficient_data" => {
  if (input.profileAgeDays < ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days) {
    return "insufficient_data";
  }

  if (input.favorites <= 0) return "no_favorites";

  const standardMin = input.benchmark.favorites.standard_min_favorites;
  const standardMax = input.benchmark.favorites.standard_max_favorites;

  if (standardMin === null || standardMax === null) return "standard_favorites";
  if (input.favorites > standardMax) return "high_favorites";
  if (input.favorites < standardMin) return "low_favorites";

  return "standard_favorites";
};

export const buildAdminProfileEngagementFavoritesCombinationId = (input: {
  communityCategoryId: AdminProfileEngagementFavoritesCommunityCategoryId;
  favoriteCategoryId: AdminProfileEngagementFavoritesFavoriteCategoryId;
}): AdminProfileEngagementFavoritesCombinationId =>
  `${input.communityCategoryId}_${input.favoriteCategoryId}`;

export const getAdminProfileEngagementFavoritesCombinationConfig = (input: {
  communityCategoryId: AdminProfileEngagementFavoritesCommunityCategoryId;
  favoriteCategoryId: AdminProfileEngagementFavoritesFavoriteCategoryId;
}) => {
  const community =
    ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG[input.communityCategoryId];
  const favorites =
    ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG[input.favoriteCategoryId];

  return {
    description: `${community.description} ${favorites.description}`,
    label: `${community.label} e ${favorites.label}`,
  };
};

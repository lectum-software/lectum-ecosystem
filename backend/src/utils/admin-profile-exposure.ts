export type AdminProfileExposureCategoryId =
  | "high_exposure"
  | "insufficient_data"
  | "low_exposure"
  | "no_exposure"
  | "standard_exposure";

export type AdminProfileExposureBenchmark = {
  adaptation_period_days: number;
  basis: "non_zero_weighted_exposure_score_outside_adaptation_period";
  eligible_psychologists: number;
  exposed_psychologists: number;
  p25_exposure_score: number | null;
  p50_exposure_score: number | null;
  p75_exposure_score: number | null;
  standard_max_exposure_score: number | null;
  standard_min_exposure_score: number | null;
};

export type AdminProfileExposureSignals = {
  exposureScore: number;
  profileAgeDays: number;
};

export const ADMIN_PROFILE_EXPOSURE_CATEGORY_ORDER: AdminProfileExposureCategoryId[] = [
  "high_exposure",
  "standard_exposure",
  "low_exposure",
  "no_exposure",
  "insufficient_data",
];

export const ADMIN_PROFILE_EXPOSURE_SOURCE =
  "profile_view_event.source=profile_page/search_result+profile_video_watch_session+page_view_event.target_type=post/reply" as const;

export type AdminProfileExposureSource = typeof ADMIN_PROFILE_EXPOSURE_SOURCE;

export const ADMIN_PROFILE_EXPOSURE_THRESHOLDS = {
  adaptation_period_days: 30,
  qualified_video_watch_seconds: 3,
  weights: {
    community_post_view: 0.75,
    community_reply_view: 0.5,
    profile_view: 1,
    qualified_video_view: 1.5,
    search_result_impression: 0.25,
  },
} as const;

export type AdminProfileExposureThresholds = typeof ADMIN_PROFILE_EXPOSURE_THRESHOLDS;

export const ADMIN_PROFILE_EXPOSURE_CATEGORY_CONFIG = {
  high_exposure: {
    description:
      "Psicólogo fora da adaptação com score ponderado de Visibilidade acima da faixa padrão da plataforma no período selecionado.",
    label: "Alta Visibilidade",
  },
  insufficient_data: {
    description:
      "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; a Visibilidade ainda não é comparada com a plataforma.",
    label: "Dados Insuficientes",
  },
  low_exposure: {
    description:
      "Psicólogo fora da adaptação, com alguma visibilidade real, mas abaixo da faixa padrão da plataforma no período selecionado.",
    label: "Baixa Visibilidade",
  },
  no_exposure: {
    description:
      "Psicólogo fora da adaptação sem impressão em listagem, abertura de perfil, visualização qualificada de vídeo ou view de conteúdo autoral no período selecionado.",
    label: "Sem Visibilidade",
  },
  standard_exposure: {
    description:
      "Psicólogo fora da adaptação com score ponderado de Visibilidade dentro da faixa padrão da plataforma no período selecionado.",
    label: "Visibilidade Padrão",
  },
} satisfies Record<AdminProfileExposureCategoryId, { description: string; label: string }>;

export const roundAdminProfileExposureNumber = (value: number) => Math.round(value * 100) / 100;

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

  return roundAdminProfileExposureNumber((left + right) / 2);
};

export const calculateAdminProfileExposureScore = (input: {
  communityPostViews: number;
  communityReplyViews: number;
  profileViews: number;
  qualifiedVideoViews: number;
  searchResultImpressions: number;
}) =>
  roundAdminProfileExposureNumber(
    input.searchResultImpressions *
      ADMIN_PROFILE_EXPOSURE_THRESHOLDS.weights.search_result_impression +
      input.communityReplyViews * ADMIN_PROFILE_EXPOSURE_THRESHOLDS.weights.community_reply_view +
      input.communityPostViews * ADMIN_PROFILE_EXPOSURE_THRESHOLDS.weights.community_post_view +
      input.profileViews * ADMIN_PROFILE_EXPOSURE_THRESHOLDS.weights.profile_view +
      input.qualifiedVideoViews * ADMIN_PROFILE_EXPOSURE_THRESHOLDS.weights.qualified_video_view,
  );

export const buildAdminProfileExposureBenchmark = (input: {
  eligiblePsychologists: number;
  exposureScores: number[];
}): AdminProfileExposureBenchmark => {
  const nonZeroExposureScores = input.exposureScores
    .filter((value) => value > 0)
    .map(roundAdminProfileExposureNumber)
    .sort((left, right) => left - right);
  const p25 = nearestRankPercentile(nonZeroExposureScores, 25);
  const p75 = nearestRankPercentile(nonZeroExposureScores, 75);

  return {
    adaptation_period_days: ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
    basis: "non_zero_weighted_exposure_score_outside_adaptation_period",
    eligible_psychologists: input.eligiblePsychologists,
    exposed_psychologists: nonZeroExposureScores.length,
    p25_exposure_score: p25,
    p50_exposure_score: median(nonZeroExposureScores),
    p75_exposure_score: p75,
    standard_max_exposure_score: p75,
    standard_min_exposure_score: p25,
  };
};

export const classifyAdminProfileExposureCategory = (input: {
  benchmark: AdminProfileExposureBenchmark;
  signals: AdminProfileExposureSignals;
}): AdminProfileExposureCategoryId => {
  if (input.signals.profileAgeDays < ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days) {
    return "insufficient_data";
  }

  if (input.signals.exposureScore <= 0) return "no_exposure";

  const standardMin = input.benchmark.standard_min_exposure_score;
  const standardMax = input.benchmark.standard_max_exposure_score;

  if (standardMin === null || standardMax === null) return "standard_exposure";
  if (input.signals.exposureScore > standardMax) return "high_exposure";
  if (input.signals.exposureScore < standardMin) return "low_exposure";

  return "standard_exposure";
};

export type AdminProfileExposureCategoryId =
  | "high_exposure"
  | "insufficient_data"
  | "low_exposure"
  | "no_exposure"
  | "standard_exposure";

export type AdminProfileExposureBenchmark = {
  adaptation_period_days: number;
  basis: "non_zero_attention_seconds_outside_adaptation_period";
  eligible_psychologists: number;
  exposed_psychologists: number;
  p25_exposure_score: number | null;
  p25_visibility_seconds: number | null;
  p50_exposure_score: number | null;
  p50_visibility_seconds: number | null;
  p75_exposure_score: number | null;
  p75_visibility_seconds: number | null;
  standard_max_exposure_score: number | null;
  standard_max_visibility_seconds: number | null;
  standard_min_exposure_score: number | null;
  standard_min_visibility_seconds: number | null;
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
  "page_view_event.target_type=psychologist.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds" as const;

export type AdminProfileExposureSource = typeof ADMIN_PROFILE_EXPOSURE_SOURCE;

export const ADMIN_PROFILE_EXPOSURE_THRESHOLDS = {
  adaptation_period_days: 30,
  attention_unit_seconds: 1,
  content_attention_min_visible_pixels: 160,
  content_attention_min_visible_ratio: 0.35,
  max_attention_seconds_per_session: 86_400,
} as const;

export type AdminProfileExposureThresholds = typeof ADMIN_PROFILE_EXPOSURE_THRESHOLDS;

export const ADMIN_PROFILE_EXPOSURE_CATEGORY_CONFIG = {
  high_exposure: {
    description:
      "Psicólogo fora da adaptação com tempo real de Visibilidade acima da faixa padrão da plataforma no período selecionado.",
    label: "Alta Visibilidade",
  },
  insufficient_data: {
    description:
      "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; a Visibilidade ainda não é comparada com a plataforma.",
    label: "Dados Insuficientes",
  },
  low_exposure: {
    description:
      "Psicólogo fora da adaptação, com algum tempo real de Visibilidade, mas abaixo da faixa padrão da plataforma no período selecionado.",
    label: "Baixa Visibilidade",
  },
  no_exposure: {
    description:
      "Psicólogo fora da adaptação sem tempo real de atenção em perfil, vídeo de apresentação ou conteúdo autoral no período selecionado.",
    label: "Sem Visibilidade",
  },
  standard_exposure: {
    description:
      "Psicólogo fora da adaptação com tempo real de Visibilidade dentro da faixa padrão da plataforma no período selecionado.",
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
  communityPostAttentionSeconds: number;
  communityReplyAttentionSeconds: number;
  profileAttentionSeconds: number;
  profileVideoAttentionSeconds: number;
}) =>
  roundAdminProfileExposureNumber(
    input.communityPostAttentionSeconds +
      input.communityReplyAttentionSeconds +
      Math.max(input.profileAttentionSeconds, input.profileVideoAttentionSeconds),
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
    basis: "non_zero_attention_seconds_outside_adaptation_period",
    eligible_psychologists: input.eligiblePsychologists,
    exposed_psychologists: nonZeroExposureScores.length,
    p25_exposure_score: p25,
    p25_visibility_seconds: p25,
    p50_exposure_score: median(nonZeroExposureScores),
    p50_visibility_seconds: median(nonZeroExposureScores),
    p75_exposure_score: p75,
    p75_visibility_seconds: p75,
    standard_max_exposure_score: p75,
    standard_max_visibility_seconds: p75,
    standard_min_exposure_score: p25,
    standard_min_visibility_seconds: p25,
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

export type AdminProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion"
  | "standard_conversion"
  | "strong_conversion";

export type AdminProfileConversionBenchmark = {
  adaptation_period_days: number;
  basis: "non_zero_whatsapp_clicks_outside_adaptation_period";
  eligible_psychologists: number;
  non_zero_whatsapp_psychologists: number;
  p25_whatsapp_clicks: number | null;
  p50_whatsapp_clicks: number | null;
  p75_whatsapp_clicks: number | null;
  standard_max_whatsapp_clicks: number | null;
  standard_min_whatsapp_clicks: number | null;
};

export type AdminProfileConversionSignals = {
  benchmark: AdminProfileConversionBenchmark;
  profileAgeDays: number;
  whatsappClicks: number;
};

export const ADMIN_PROFILE_CONVERSION_CATEGORY_ORDER: AdminProfileConversionCategoryId[] = [
  "strong_conversion",
  "standard_conversion",
  "low_conversion",
  "no_conversion",
  "insufficient_data",
];

export const ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER: Exclude<
  AdminProfileConversionCategoryId,
  "insufficient_data"
>[] = ["strong_conversion", "standard_conversion", "low_conversion", "no_conversion"];

export const ADMIN_PROFILE_CONVERSION_SOURCE =
  "contact_request.channel=whatsapp+user.createdAt+platform_percentiles" as const;

export type AdminProfileConversionSource = typeof ADMIN_PROFILE_CONVERSION_SOURCE;

export const ADMIN_PROFILE_CONVERSION_THRESHOLDS = {
  adaptation_period_days: 30,
} as const;

export type AdminProfileConversionThresholds = typeof ADMIN_PROFILE_CONVERSION_THRESHOLDS;

export const ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG = {
  insufficient_data: {
    description:
      "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; a Conversão ainda não é comparada com a plataforma.",
    label: "Dados Insuficientes",
  },
  low_conversion: {
    description:
      "Psicólogo fora da adaptação, com pelo menos um clique no WhatsApp, mas abaixo da faixa padrão da plataforma no período selecionado.",
    label: "Baixa Conversão",
  },
  no_conversion: {
    description:
      "Psicólogo fora da adaptação que não recebeu nenhum clique no WhatsApp no período selecionado.",
    label: "Sem Conversão",
  },
  standard_conversion: {
    description:
      "Psicólogo fora da adaptação com cliques no WhatsApp dentro da faixa padrão da plataforma no período selecionado.",
    label: "Conversão Padrão",
  },
  strong_conversion: {
    description:
      "Psicólogo fora da adaptação com cliques no WhatsApp acima da faixa padrão da plataforma no período selecionado.",
    label: "Alta Conversão",
  },
} satisfies Record<AdminProfileConversionCategoryId, { description: string; label: string }>;

export const roundAdminProfileConversionNumber = (value: number) => Math.round(value * 10) / 10;

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

  return roundAdminProfileConversionNumber((left + right) / 2);
};

export const buildAdminProfileConversionBenchmark = (input: {
  eligiblePsychologists: number;
  whatsappClicks: number[];
}): AdminProfileConversionBenchmark => {
  const nonZeroWhatsappClicks = input.whatsappClicks
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  const p25 = nearestRankPercentile(nonZeroWhatsappClicks, 25);
  const p75 = nearestRankPercentile(nonZeroWhatsappClicks, 75);

  return {
    adaptation_period_days: ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
    basis: "non_zero_whatsapp_clicks_outside_adaptation_period",
    eligible_psychologists: input.eligiblePsychologists,
    non_zero_whatsapp_psychologists: nonZeroWhatsappClicks.length,
    p25_whatsapp_clicks: p25,
    p50_whatsapp_clicks: median(nonZeroWhatsappClicks),
    p75_whatsapp_clicks: p75,
    standard_max_whatsapp_clicks: p75,
    standard_min_whatsapp_clicks: p25,
  };
};

export const classifyAdminProfileConversionCategory = (
  signals: AdminProfileConversionSignals,
): AdminProfileConversionCategoryId => {
  if (signals.profileAgeDays < ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days) {
    return "insufficient_data";
  }

  if (signals.whatsappClicks <= 0) return "no_conversion";

  const standardMin = signals.benchmark.standard_min_whatsapp_clicks;
  const standardMax = signals.benchmark.standard_max_whatsapp_clicks;

  if (standardMin === null || standardMax === null) return "standard_conversion";
  if (signals.whatsappClicks > standardMax) return "strong_conversion";
  if (signals.whatsappClicks < standardMin) return "low_conversion";

  return "standard_conversion";
};

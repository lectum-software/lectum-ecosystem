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

export type AdminProfileConversionQualityId =
  | "excellent_conversion"
  | "good_conversion"
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion";

export type AdminProfileConversionPlatformPositionId =
  | "above_reference"
  | "at_reference"
  | "below_reference"
  | "insufficient_data"
  | "unavailable";

export type AdminProfileConversionSignals = {
  benchmark: AdminProfileConversionBenchmark;
  profileAgeDays: number;
  whatsappClicks: number;
};

export type AdminProfileConversionQualitySignals = {
  activeDays: number;
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

export const ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS = {
  excellent_whatsapp_clicks_30d: 10,
  good_whatsapp_clicks_30d: 5,
} as const;

export type AdminProfileConversionAbsoluteThresholds =
  typeof ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS;

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

export const ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG = {
  excellent_conversion: {
    description:
      "Ritmo mensal estimado de WhatsApp igual ou superior ao patamar excelente definido para o perfil individual.",
    label: "Conversão Excelente",
  },
  good_conversion: {
    description:
      "Ritmo mensal estimado de WhatsApp igual ou superior ao mínimo saudável definido para o perfil individual.",
    label: "Conversão Boa",
  },
  insufficient_data: {
    description:
      "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; a qualidade absoluta de Conversão ainda não é avaliada.",
    label: "Dados Insuficientes",
  },
  low_conversion: {
    description:
      "Ritmo mensal estimado de WhatsApp abaixo do mínimo saudável definido para o perfil individual.",
    label: "Conversão Baixa",
  },
  no_conversion: {
    description: "Psicólogo não recebeu nenhum clique no WhatsApp no período selecionado.",
    label: "Sem Conversão",
  },
} satisfies Record<AdminProfileConversionQualityId, { description: string; label: string }>;

export const ADMIN_PROFILE_CONVERSION_PLATFORM_POSITION_CONFIG = {
  above_reference: {
    description:
      "Cliques no WhatsApp acima da mediana da plataforma entre psicólogos fora da adaptação e com ao menos um clique no período.",
    label: "Acima da referência da plataforma",
  },
  at_reference: {
    description:
      "Cliques no WhatsApp alinhados à mediana da plataforma entre psicólogos fora da adaptação e com ao menos um clique no período.",
    label: "Na referência da plataforma",
  },
  below_reference: {
    description:
      "Cliques no WhatsApp abaixo da mediana da plataforma entre psicólogos fora da adaptação e com ao menos um clique no período.",
    label: "Abaixo da referência da plataforma",
  },
  insufficient_data: {
    description: "Perfil em adaptação; a comparação com a plataforma ainda não é aplicada.",
    label: "Sem comparação durante adaptação",
  },
  unavailable: {
    description:
      "A plataforma ainda não possui psicólogos elegíveis com clique no WhatsApp suficiente para calcular a mediana do período.",
    label: "Sem referência da plataforma",
  },
} satisfies Record<
  AdminProfileConversionPlatformPositionId,
  { description: string; label: string }
>;

export const roundAdminProfileConversionNumber = (value: number) => Math.round(value * 10) / 10;

export const normalizeAdminProfileConversionToThirtyDays = (
  whatsappClicks: number,
  activeDays: number,
) => {
  if (activeDays <= 0) return 0;

  return roundAdminProfileConversionNumber((whatsappClicks / activeDays) * 30);
};

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

export const classifyAdminProfileConversionQuality = (
  signals: AdminProfileConversionQualitySignals,
): AdminProfileConversionQualityId => {
  if (signals.profileAgeDays < ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days) {
    return "insufficient_data";
  }

  if (signals.whatsappClicks <= 0) return "no_conversion";

  const normalizedWhatsappClicks30d = normalizeAdminProfileConversionToThirtyDays(
    signals.whatsappClicks,
    signals.activeDays,
  );

  if (
    normalizedWhatsappClicks30d >=
    ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS.excellent_whatsapp_clicks_30d
  ) {
    return "excellent_conversion";
  }

  if (
    normalizedWhatsappClicks30d >=
    ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS.good_whatsapp_clicks_30d
  ) {
    return "good_conversion";
  }

  return "low_conversion";
};

export const classifyAdminProfileConversionPlatformPosition = (
  signals: AdminProfileConversionSignals,
): AdminProfileConversionPlatformPositionId => {
  if (signals.profileAgeDays < ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days) {
    return "insufficient_data";
  }

  const reference = signals.benchmark.p50_whatsapp_clicks;
  if (reference === null) return "unavailable";
  if (signals.whatsappClicks > reference) return "above_reference";
  if (signals.whatsappClicks < reference) return "below_reference";

  return "at_reference";
};

export const buildAdminProfileConversionHeadline = (input: {
  platformPositionId: AdminProfileConversionPlatformPositionId;
  qualityId: AdminProfileConversionQualityId;
}) => {
  const quality = ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG[input.qualityId];
  const platformPosition =
    ADMIN_PROFILE_CONVERSION_PLATFORM_POSITION_CONFIG[input.platformPositionId];
  const lowerPlatformPosition = platformPosition.label.toLocaleLowerCase("pt-BR");

  if (input.qualityId === "insufficient_data" || input.platformPositionId === "insufficient_data") {
    return "Dados insuficientes para avaliar a Conversão.";
  }

  if (input.platformPositionId === "unavailable") {
    return `${quality.label}, sem referência da plataforma no período.`;
  }

  if (input.qualityId === "no_conversion") {
    return `${quality.label} no período, ${lowerPlatformPosition}.`;
  }

  if (input.platformPositionId === "below_reference") {
    return `${quality.label}, mas ${lowerPlatformPosition}.`;
  }

  return `${quality.label}, ${lowerPlatformPosition}.`;
};

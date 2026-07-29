export type AdminProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "strong_conversion"
  | "unconverted_interest"
  | "unconverted_traffic";

export type AdminProfileConversionSignals = {
  exposureCount: number;
  favorites: number;
  whatsappClicks: number;
  whatsappConversionRate: number | null;
};

export const ADMIN_PROFILE_CONVERSION_CATEGORY_ORDER: AdminProfileConversionCategoryId[] = [
  "strong_conversion",
  "unconverted_interest",
  "unconverted_traffic",
  "low_conversion",
  "insufficient_data",
];

export const ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER: Exclude<
  AdminProfileConversionCategoryId,
  "insufficient_data"
>[] = ["strong_conversion", "unconverted_interest", "unconverted_traffic", "low_conversion"];

export const ADMIN_PROFILE_CONVERSION_EXPOSURE_SOURCE =
  "profile_view_event.source=profile_page/search_result+profile_video_watch_session.qualified>=3s+page_view_event.target_type=post/community_post/reply/post_reply+contact_request+psychologist_favorite" as const;

export type AdminProfileConversionSource = typeof ADMIN_PROFILE_CONVERSION_EXPOSURE_SOURCE;

export const ADMIN_PROFILE_CONVERSION_QUALIFIED_VIDEO_WATCH_SECONDS = 3;

export const ADMIN_PROFILE_CONVERSION_THRESHOLDS = {
  exposure_minimum: 50,
  favorites_interest_minimum: 5,
  low_conversion_rate_percent: 2,
  qualified_video_watch_seconds: ADMIN_PROFILE_CONVERSION_QUALIFIED_VIDEO_WATCH_SECONDS,
  strong_conversion_rate_percent: 5,
  unconverted_exposure_minimum: 60,
  whatsapp_minimum_for_strong_conversion: 3,
} as const;

export type AdminProfileConversionThresholds = typeof ADMIN_PROFILE_CONVERSION_THRESHOLDS;

export const ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG = {
  insufficient_data: {
    description:
      "Exposição abaixo do mínimo para avaliar a taxa de conversão com segurança no período analisado.",
    label: "Dados Insuficientes",
  },
  low_conversion: {
    description:
      "Exposição suficiente, mas taxa de cliques no WhatsApp abaixo do corte de Alta Conversão e sem concentração clara de exposição ou interesse não convertido.",
    label: "Baixa Conversão",
  },
  strong_conversion: {
    description:
      "Exposição suficiente, volume mínimo de cliques no WhatsApp e taxa de conversão alta sobre a exposição.",
    label: "Alta Conversão",
  },
  unconverted_interest: {
    description:
      "Muitos favoritos, mas poucos cliques no WhatsApp ou taxa de conversão abaixo de Alta Conversão.",
    label: "Interesse Não Convertido",
  },
  unconverted_traffic: {
    description:
      "Muita exposição do psicólogo em perfil, busca, vídeo ou comunidade, mas poucos cliques no WhatsApp.",
    label: "Exposição Não Convertida",
  },
} satisfies Record<AdminProfileConversionCategoryId, { description: string; label: string }>;

export const roundAdminProfileConversionPercent = (value: number) => Math.round(value * 10) / 10;

export const calculateAdminProfileConversionRatePercent = (input: {
  exposureCount: number;
  whatsappClicks: number;
}) =>
  input.exposureCount > 0
    ? roundAdminProfileConversionPercent((input.whatsappClicks / input.exposureCount) * 100)
    : null;

export const classifyAdminProfileConversionCategory = (
  signals: AdminProfileConversionSignals,
): AdminProfileConversionCategoryId => {
  const rate = signals.whatsappConversionRate;
  const hasMinimumExposure =
    signals.exposureCount >= ADMIN_PROFILE_CONVERSION_THRESHOLDS.exposure_minimum;
  const hasStrongConversionRate =
    typeof rate === "number" &&
    rate >= ADMIN_PROFILE_CONVERSION_THRESHOLDS.strong_conversion_rate_percent;
  const hasLowConversionRate =
    rate === null || rate < ADMIN_PROFILE_CONVERSION_THRESHOLDS.low_conversion_rate_percent;

  if (
    hasMinimumExposure &&
    signals.whatsappClicks >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.whatsapp_minimum_for_strong_conversion &&
    hasStrongConversionRate
  ) {
    return "strong_conversion";
  }

  if (
    signals.exposureCount >= ADMIN_PROFILE_CONVERSION_THRESHOLDS.unconverted_exposure_minimum &&
    hasLowConversionRate
  ) {
    return "unconverted_traffic";
  }

  if (
    signals.favorites >= ADMIN_PROFILE_CONVERSION_THRESHOLDS.favorites_interest_minimum &&
    (signals.whatsappClicks <
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.whatsapp_minimum_for_strong_conversion ||
      !hasStrongConversionRate)
  ) {
    return "unconverted_interest";
  }

  if (!hasMinimumExposure) return "insufficient_data";

  return "low_conversion";
};

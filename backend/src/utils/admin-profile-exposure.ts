export type AdminProfileExposureAggregateCategoryId =
  | "high_exposure"
  | "insufficient_data"
  | "low_exposure"
  | "no_exposure"
  | "standard_exposure";

export type AdminProfileExposureCommunityCategoryId =
  | "high_community"
  | "low_community"
  | "no_community"
  | "standard_community";

export type AdminProfileExposureVideoCategoryId =
  | "high_video"
  | "low_video"
  | "no_video"
  | "standard_video";

export type AdminProfileExposureCombinationId =
  `${AdminProfileExposureCommunityCategoryId}_${AdminProfileExposureVideoCategoryId}`;

export type AdminProfileExposureCategoryId =
  | AdminProfileExposureCombinationId
  | "insufficient_data";

export type AdminProfileExposureSurfaceBenchmark = {
  basis:
    | "non_zero_community_attention_seconds_outside_adaptation_period"
    | "non_zero_presentation_video_attention_seconds_outside_adaptation_period";
  eligible_psychologists: number;
  p25_visibility_seconds: number | null;
  p50_visibility_seconds: number | null;
  p75_visibility_seconds: number | null;
  standard_max_visibility_seconds: number | null;
  standard_min_visibility_seconds: number | null;
  visible_psychologists: number;
};

export type AdminProfileExposureBenchmark = {
  adaptation_period_days: number;
  basis: "non_zero_attention_seconds_outside_adaptation_period";
  community_visibility: AdminProfileExposureSurfaceBenchmark & {
    basis: "non_zero_community_attention_seconds_outside_adaptation_period";
  };
  eligible_psychologists: number;
  exposed_psychologists: number;
  p25_exposure_score: number | null;
  p25_visibility_seconds: number | null;
  p50_exposure_score: number | null;
  p50_visibility_seconds: number | null;
  p75_exposure_score: number | null;
  p75_visibility_seconds: number | null;
  presentation_video: AdminProfileExposureSurfaceBenchmark & {
    basis: "non_zero_presentation_video_attention_seconds_outside_adaptation_period";
  };
  standard_max_exposure_score: number | null;
  standard_max_visibility_seconds: number | null;
  standard_min_exposure_score: number | null;
  standard_min_visibility_seconds: number | null;
};

export type AdminProfileExposureSignals = {
  exposureScore: number;
  profileAgeDays: number;
};

export const ADMIN_PROFILE_EXPOSURE_AGGREGATE_CATEGORY_ORDER: AdminProfileExposureAggregateCategoryId[] =
  ["high_exposure", "standard_exposure", "low_exposure", "no_exposure", "insufficient_data"];

export const ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_ORDER: AdminProfileExposureCommunityCategoryId[] =
  ["high_community", "standard_community", "low_community", "no_community"];

export const ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_ORDER: AdminProfileExposureVideoCategoryId[] = [
  "high_video",
  "standard_video",
  "low_video",
  "no_video",
];

export const ADMIN_PROFILE_EXPOSURE_COMBINATION_ORDER: AdminProfileExposureCombinationId[] =
  ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_ORDER.flatMap((communityId) =>
    ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_ORDER.map(
      (videoId) => `${communityId}_${videoId}` as AdminProfileExposureCombinationId,
    ),
  );

export const ADMIN_PROFILE_EXPOSURE_CATEGORY_ORDER: AdminProfileExposureCategoryId[] = [
  ...ADMIN_PROFILE_EXPOSURE_COMBINATION_ORDER,
  "insufficient_data",
];

export const ADMIN_PROFILE_EXPOSURE_SOURCE =
  "content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds" as const;

export type AdminProfileExposureSource = typeof ADMIN_PROFILE_EXPOSURE_SOURCE;

export const ADMIN_PROFILE_EXPOSURE_THRESHOLDS = {
  adaptation_period_days: 30,
  attention_unit_seconds: 1,
  content_attention_min_visible_pixels: 160,
  content_attention_min_visible_ratio: 0.35,
  max_attention_seconds_per_session: 86_400,
} as const;

export type AdminProfileExposureThresholds = typeof ADMIN_PROFILE_EXPOSURE_THRESHOLDS;

export const ADMIN_PROFILE_EXPOSURE_AGGREGATE_CATEGORY_CONFIG = {
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
      "Psicólogo fora da adaptação sem tempo real de atenção em conteúdo autoral na comunidade ou no vídeo de apresentação no período selecionado.",
    label: "Sem Visibilidade",
  },
  standard_exposure: {
    description:
      "Psicólogo fora da adaptação com tempo real de Visibilidade dentro da faixa padrão da plataforma no período selecionado.",
    label: "Visibilidade Padrão",
  },
} satisfies Record<AdminProfileExposureAggregateCategoryId, { description: string; label: string }>;

export const ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_CONFIG = {
  high_community: {
    description:
      "Atenção em conteúdo autoral nas comunidades acima da faixa padrão da plataforma no período selecionado; inclui feed, páginas de comunidade e detalhes, em texto, imagem ou vídeo.",
    label: "Alta Comunidade",
  },
  low_community: {
    description:
      "Atenção em conteúdo autoral nas comunidades abaixo da faixa padrão da plataforma, mas com algum sinal no período; inclui feed, páginas de comunidade e detalhes, em texto, imagem ou vídeo.",
    label: "Baixa Comunidade",
  },
  no_community: {
    description:
      "Nenhuma atenção registrada em conteúdo autoral nas comunidades no período selecionado.",
    label: "Sem Comunidade",
  },
  standard_community: {
    description:
      "Atenção em conteúdo autoral nas comunidades dentro da faixa padrão da plataforma no período selecionado; inclui feed, páginas de comunidade e detalhes, em texto, imagem ou vídeo.",
    label: "Comunidade Padrão",
  },
} satisfies Record<AdminProfileExposureCommunityCategoryId, { description: string; label: string }>;

export const ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_CONFIG = {
  high_video: {
    description:
      "Tempo assistido no vídeo de apresentação acima da faixa padrão da plataforma no período selecionado.",
    label: "Alto Vídeo",
  },
  low_video: {
    description:
      "Tempo assistido no vídeo de apresentação abaixo da faixa padrão da plataforma, mas com algum sinal no período.",
    label: "Baixo Vídeo",
  },
  no_video: {
    description: "Nenhum tempo assistido no vídeo de apresentação no período selecionado.",
    label: "Vídeo sem view",
  },
  standard_video: {
    description:
      "Tempo assistido no vídeo de apresentação dentro da faixa padrão da plataforma no período selecionado.",
    label: "Vídeo Padrão",
  },
} satisfies Record<AdminProfileExposureVideoCategoryId, { description: string; label: string }>;

export const ADMIN_PROFILE_EXPOSURE_INSUFFICIENT_DATA_CONFIG = {
  description:
    "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; a Visibilidade Comunidade x Vídeo ainda não é comparada com a plataforma.",
  label: "Dados Insuficientes",
} as const;

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

const buildSurfaceBenchmark = <TBasis extends AdminProfileExposureSurfaceBenchmark["basis"]>(
  basis: TBasis,
  eligiblePsychologists: number,
  visibilitySeconds: number[],
): AdminProfileExposureSurfaceBenchmark & { basis: TBasis } => {
  const nonZeroVisibilitySeconds = visibilitySeconds
    .filter((value) => value > 0)
    .map(roundAdminProfileExposureNumber)
    .sort((left, right) => left - right);
  const p25 = nearestRankPercentile(nonZeroVisibilitySeconds, 25);
  const p75 = nearestRankPercentile(nonZeroVisibilitySeconds, 75);

  return {
    basis,
    eligible_psychologists: eligiblePsychologists,
    p25_visibility_seconds: p25,
    p50_visibility_seconds: median(nonZeroVisibilitySeconds),
    p75_visibility_seconds: p75,
    standard_max_visibility_seconds: p75,
    standard_min_visibility_seconds: p25,
    visible_psychologists: nonZeroVisibilitySeconds.length,
  };
};

export const calculateAdminProfileExposureScore = (input: {
  communityPostAttentionSeconds: number;
  communityReplyAttentionSeconds: number;
  profileAttentionSeconds: number;
  profileVideoAttentionSeconds: number;
}) =>
  roundAdminProfileExposureNumber(
    Math.max(0, input.communityPostAttentionSeconds) +
      Math.max(0, input.communityReplyAttentionSeconds) +
      Math.max(0, input.profileVideoAttentionSeconds),
  );

export const buildAdminProfileExposureBenchmark = (input: {
  communityVisibilitySeconds?: number[];
  eligiblePsychologists: number;
  exposureScores: number[];
  presentationVideoSeconds?: number[];
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
    community_visibility: buildSurfaceBenchmark(
      "non_zero_community_attention_seconds_outside_adaptation_period",
      input.eligiblePsychologists,
      input.communityVisibilitySeconds ?? input.exposureScores,
    ),
    eligible_psychologists: input.eligiblePsychologists,
    exposed_psychologists: nonZeroExposureScores.length,
    p25_exposure_score: p25,
    p25_visibility_seconds: p25,
    p50_exposure_score: median(nonZeroExposureScores),
    p50_visibility_seconds: median(nonZeroExposureScores),
    p75_exposure_score: p75,
    p75_visibility_seconds: p75,
    presentation_video: buildSurfaceBenchmark(
      "non_zero_presentation_video_attention_seconds_outside_adaptation_period",
      input.eligiblePsychologists,
      input.presentationVideoSeconds ?? input.exposureScores,
    ),
    standard_max_exposure_score: p75,
    standard_max_visibility_seconds: p75,
    standard_min_exposure_score: p25,
    standard_min_visibility_seconds: p25,
  };
};

export const classifyAdminProfileExposureAggregateCategory = (input: {
  benchmark: AdminProfileExposureBenchmark;
  signals: AdminProfileExposureSignals;
}): AdminProfileExposureAggregateCategoryId => {
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

export const classifyAdminProfileExposureCategory = classifyAdminProfileExposureAggregateCategory;

const classifySurfaceCategory = <TCategory extends string>(input: {
  highCategoryId: TCategory;
  lowCategoryId: TCategory;
  noCategoryId: TCategory;
  profileAgeDays: number;
  standardCategoryId: TCategory;
  standardMaxVisibilitySeconds: number | null;
  standardMinVisibilitySeconds: number | null;
  visibilitySeconds: number;
}): TCategory | "insufficient_data" => {
  if (input.profileAgeDays < ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days) {
    return "insufficient_data";
  }

  if (input.visibilitySeconds <= 0) return input.noCategoryId;

  if (input.standardMinVisibilitySeconds === null || input.standardMaxVisibilitySeconds === null) {
    return input.standardCategoryId;
  }
  if (input.visibilitySeconds > input.standardMaxVisibilitySeconds) return input.highCategoryId;
  if (input.visibilitySeconds < input.standardMinVisibilitySeconds) return input.lowCategoryId;

  return input.standardCategoryId;
};

export const classifyAdminProfileExposureCommunityCategory = (input: {
  benchmark: AdminProfileExposureBenchmark;
  profileAgeDays: number;
  visibilitySeconds: number;
}): AdminProfileExposureCommunityCategoryId | "insufficient_data" =>
  classifySurfaceCategory({
    highCategoryId: "high_community",
    lowCategoryId: "low_community",
    noCategoryId: "no_community",
    profileAgeDays: input.profileAgeDays,
    standardCategoryId: "standard_community",
    standardMaxVisibilitySeconds:
      input.benchmark.community_visibility.standard_max_visibility_seconds,
    standardMinVisibilitySeconds:
      input.benchmark.community_visibility.standard_min_visibility_seconds,
    visibilitySeconds: input.visibilitySeconds,
  });

export const classifyAdminProfileExposureVideoCategory = (input: {
  benchmark: AdminProfileExposureBenchmark;
  profileAgeDays: number;
  visibilitySeconds: number;
}): AdminProfileExposureVideoCategoryId | "insufficient_data" =>
  classifySurfaceCategory({
    highCategoryId: "high_video",
    lowCategoryId: "low_video",
    noCategoryId: "no_video",
    profileAgeDays: input.profileAgeDays,
    standardCategoryId: "standard_video",
    standardMaxVisibilitySeconds:
      input.benchmark.presentation_video.standard_max_visibility_seconds,
    standardMinVisibilitySeconds:
      input.benchmark.presentation_video.standard_min_visibility_seconds,
    visibilitySeconds: input.visibilitySeconds,
  });

export const buildAdminProfileExposureCombinationId = (input: {
  communityCategoryId: AdminProfileExposureCommunityCategoryId;
  videoCategoryId: AdminProfileExposureVideoCategoryId;
}): AdminProfileExposureCombinationId => `${input.communityCategoryId}_${input.videoCategoryId}`;

export const getAdminProfileExposureCombinationConfig = (input: {
  communityCategoryId: AdminProfileExposureCommunityCategoryId;
  videoCategoryId: AdminProfileExposureVideoCategoryId;
}) => {
  const community = ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_CONFIG[input.communityCategoryId];
  const video = ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_CONFIG[input.videoCategoryId];

  return {
    community_id: input.communityCategoryId,
    community_label: community.label,
    description: `${community.description} ${video.description}`,
    label: `${community.label} e ${video.label}`,
    video_id: input.videoCategoryId,
    video_label: video.label,
  };
};

export const getAdminProfileExposureCategoryConfig = (
  categoryId: AdminProfileExposureCategoryId,
) => {
  if (categoryId === "insufficient_data") {
    return {
      community_id: null,
      community_label: null,
      description: ADMIN_PROFILE_EXPOSURE_INSUFFICIENT_DATA_CONFIG.description,
      label: ADMIN_PROFILE_EXPOSURE_INSUFFICIENT_DATA_CONFIG.label,
      video_id: null,
      video_label: null,
    };
  }

  const communityCategoryId = ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_ORDER.find((communityId) =>
    categoryId.startsWith(`${communityId}_`),
  );
  const videoCategoryId = ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_ORDER.find((videoId) =>
    categoryId.endsWith(`_${videoId}`),
  );

  if (!communityCategoryId || !videoCategoryId) {
    return {
      community_id: null,
      community_label: null,
      description: "Categoria de Visibilidade Comunidade x Vídeo não reconhecida.",
      label: "Visibilidade não classificada",
      video_id: null,
      video_label: null,
    };
  }

  return getAdminProfileExposureCombinationConfig({
    communityCategoryId,
    videoCategoryId,
  });
};

import { ADMIN_PROFILE_CONVERSION_SOURCE } from "@/utils/admin-profile-conversion";
import {
  type AdminPsychologistWhatsappTrafficOriginSourceId,
  roundOneDecimal,
} from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistsDashboardProfileConversionBehaviorElementId,
  AdminPsychologistsDashboardProfileConversionBehaviorMetric,
  AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type { AdminPsychologistProfileRecord } from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import type { PresentationVideoPositionCategoryId } from "../cross-matrix/config";
import {
  classifyPresentationVideoPositionCategory,
  PRESENTATION_VIDEO_POSITION_CATEGORY_CONFIG,
  PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER,
} from "../cross-matrix/config";
import { pickCurrentPlan } from "../plan/segments";

export const PROFILE_CONVERSION_BEHAVIOR_SOURCE = `${ADMIN_PROFILE_CONVERSION_SOURCE}+profile_view_event+page_view_event+profile_video_watch_session+important_action_event+content_attention_session+content_video_watch_session+community_post.media_type+post_reply.media_type+post_vote+post_save+post_reply_save+post_share+shared_psychologist_public_ranking_helper`;

export const PROFILE_CONVERSION_BEHAVIOR_COLUMNS: Array<{
  description: string;
  id: AdminPsychologistsDashboardProfileConversionBehaviorElementId;
  label: string;
}> = [
  {
    description:
      "Retenção, consumo, engajamento no vídeo, cliques de WhatsApp originados por vídeo e posição média na lista pública.",
    id: "presentation_video",
    label: "Vídeo de apresentação",
  },
  {
    description:
      "Aberturas do perfil público, permanência, navegação por abas internas, favoritos e cliques de WhatsApp feitos dentro do perfil.",
    id: "profile",
    label: "Perfil",
  },
  {
    description:
      "Conteúdos, atividade autoral, permanência, retenção em vídeos, interações recebidas, score de engajamento e WhatsApp vindo da comunidade.",
    id: "communities",
    label: "Comunidade",
  },
  {
    description: "Média de cliques de WhatsApp originados em favoritos por profissional da faixa.",
    id: "favorite",
    label: "Favoritos",
  },
];

export const PROFILE_CONVERSION_BEHAVIOR_VIDEO_SOURCE_IDS: AdminPsychologistWhatsappTrafficOriginSourceId[] =
  ["explore", "search_filters"];

export const PROFILE_CONVERSION_BEHAVIOR_PROFILE_SOURCE_IDS: AdminPsychologistWhatsappTrafficOriginSourceId[] =
  ["profile"];

export const PROFILE_CONVERSION_BEHAVIOR_FAVORITES_SOURCE_IDS: AdminPsychologistWhatsappTrafficOriginSourceId[] =
  ["favorites"];

export const PROFILE_CONVERSION_BEHAVIOR_COMMUNITY_SOURCE_IDS: AdminPsychologistWhatsappTrafficOriginSourceId[] =
  [
    "community_post_video",
    "community_post_text",
    "community_reply_video",
    "community_reply_text",
    "community_top_mentors",
  ];

export const buildProfileConversionBehaviorCellId = (
  rowId: AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  elementId: AdminPsychologistsDashboardProfileConversionBehaviorElementId,
) => `${rowId}_${elementId}` as const;

export const buildProfileConversionBehaviorMetric = (metric: {
  description: string;
  display_value?: string | null;
  id: string;
  label: string;
  source: string;
  tone?: AdminPsychologistsDashboardProfileConversionBehaviorMetric["tone"];
  unit?: AdminPsychologistsDashboardProfileConversionBehaviorMetric["unit"];
  unavailable_reason?: string | null;
  value: number | null;
}): AdminPsychologistsDashboardProfileConversionBehaviorMetric => ({
  description: metric.description,
  display_value: metric.display_value ?? null,
  id: metric.id,
  label: metric.label,
  source: metric.source,
  tone:
    metric.tone ?? (typeof metric.value !== "number" || metric.value <= 0 ? "zero" : "standard"),
  unit: metric.unit ?? "count",
  unavailable_reason: metric.unavailable_reason ?? null,
  value: typeof metric.value === "number" ? roundOneDecimal(metric.value) : null,
});

export const averageProfileConversionBehaviorValue = (values: number[]) =>
  values.length > 0
    ? roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

const PROFILE_CONVERSION_BEHAVIOR_NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export const formatProfileConversionBehaviorNumber = (value: number) =>
  PROFILE_CONVERSION_BEHAVIOR_NUMBER_FORMATTER.format(roundOneDecimal(value));

export const formatProfileConversionBehaviorMetricNumber = (
  value: number | null,
  fallback: string,
) => (typeof value === "number" ? formatProfileConversionBehaviorNumber(value) : fallback);

export const formatProfileConversionBehaviorPercentage = (
  value: number | null,
  fallback: string,
) => (typeof value === "number" ? `${formatProfileConversionBehaviorNumber(value)}%` : fallback);

export const formatProfileConversionBehaviorSeconds = (value: number | null, fallback: string) => {
  if (typeof value !== "number") return fallback;

  const roundedSeconds = Math.max(0, Math.round(value));
  if (roundedSeconds < 60) return `${roundedSeconds}s`;

  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`;
};

export const formatProfileConversionBehaviorCount = (
  value: number,
  singular: string,
  plural: string,
) => `${formatProfileConversionBehaviorNumber(value)} ${value === 1 ? singular : plural}`;

const describeProfileConversionBehaviorOrdinal = (position: number | null) =>
  typeof position === "number" ? `${formatProfileConversionBehaviorNumber(position)}ª` : null;

type ProfileConversionBehaviorMetricTone =
  AdminPsychologistsDashboardProfileConversionBehaviorMetric["tone"];

type ProfileConversionBehaviorPositionRangeSignal = {
  count: number;
  description: string;
  label: string;
  percentage: number;
  tone: ProfileConversionBehaviorMetricTone;
  total: number;
};

const PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TONE = {
  presentation_video_position_50_plus: "zero",
  presentation_video_position_top_10: "above",
  presentation_video_position_top_30: "standard",
  presentation_video_position_top_50: "below",
} satisfies Record<PresentationVideoPositionCategoryId, ProfileConversionBehaviorMetricTone>;

const PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TIE_PRIORITY = {
  presentation_video_position_50_plus: 4,
  presentation_video_position_top_50: 3,
  presentation_video_position_top_30: 2,
  presentation_video_position_top_10: 1,
} satisfies Record<PresentationVideoPositionCategoryId, number>;

export const describeProfileConversionBehaviorPositionRange = (
  positions: Array<number | null>,
): ProfileConversionBehaviorPositionRangeSignal | null => {
  if (positions.length <= 0) return null;

  const counts = new Map<PresentationVideoPositionCategoryId, number>();
  for (const position of positions) {
    const categoryId = classifyPresentationVideoPositionCategory(position);
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  const selected = PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER.map((id) => ({
    count: counts.get(id) ?? 0,
    id,
  })).toSorted((left, right) => {
    if (right.count !== left.count) return right.count - left.count;

    return (
      PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TIE_PRIORITY[right.id] -
      PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TIE_PRIORITY[left.id]
    );
  })[0];

  if (!selected || selected.count <= 0) return null;

  const config = PRESENTATION_VIDEO_POSITION_CATEGORY_CONFIG[selected.id];
  const percentage = roundOneDecimal((selected.count / positions.length) * 100);

  return {
    count: selected.count,
    description: `Faixa predominante de posição entre os profissionais com vídeo publicado: ${config.label} (${formatProfileConversionBehaviorCount(selected.count, "profissional", "profissionais")} de ${formatProfileConversionBehaviorCount(positions.length, "profissional com vídeo", "profissionais com vídeo")}, ${formatProfileConversionBehaviorPercentage(percentage, "0%")}). Profissionais com vídeo sem posição confiável entram em 50+.`,
    label: config.label,
    percentage,
    tone: PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TONE[selected.id],
    total: positions.length,
  };
};

export const describeProfileConversionBehaviorRankingRange = (
  rangeSignal: ProfileConversionBehaviorPositionRangeSignal | null,
  averagePosition: number | null,
) => {
  if (!rangeSignal) return "posição ainda sem base na listagem";

  const ordinal = describeProfileConversionBehaviorOrdinal(averagePosition);
  const rangeDescription = `posição predominante em ${rangeSignal.label} (${formatProfileConversionBehaviorCount(rangeSignal.count, "profissional", "profissionais")} de ${formatProfileConversionBehaviorCount(rangeSignal.total, "profissional com vídeo", "profissionais com vídeo")})`;

  if (!ordinal) return rangeDescription;

  return `${rangeDescription}, com média ${ordinal}`;
};

export const describeProfileConversionBehaviorVolume = (
  value: number,
  thresholds: [number, number],
) => {
  if (value <= 0) return "sem sinal registrado";
  if (value >= thresholds[1]) return "alto";
  if (value >= thresholds[0]) return "padrão";

  return "baixo";
};

type ProfileConversionBehaviorSemanticSignal = {
  label: string;
  tone: ProfileConversionBehaviorMetricTone;
};

export const classifyProfileConversionBehaviorHigherIsBetterTone = (
  value: number | null,
  thresholds: [number, number],
): ProfileConversionBehaviorMetricTone => {
  if (typeof value !== "number" || value <= 0) return "zero";
  if (value >= thresholds[1]) return "above";
  if (value >= thresholds[0]) return "standard";

  return "below";
};

export const classifyProfileConversionBehaviorPositionTone = (
  position: number | null,
): ProfileConversionBehaviorMetricTone => {
  if (typeof position !== "number" || position <= 0) return "zero";
  if (position <= 10) return "above";
  if (position <= 30) return "standard";

  return "below";
};

export const describeProfileConversionBehaviorActivitySignal = (
  actionsPerPsychologist: number | null,
): ProfileConversionBehaviorSemanticSignal => {
  if (typeof actionsPerPsychologist !== "number" || actionsPerPsychologist <= 0) {
    return { label: "Sem atividade", tone: "zero" };
  }
  if (actionsPerPsychologist >= 10) return { label: "Muito ativo", tone: "above" };
  if (actionsPerPsychologist >= 3) return { label: "Atividade padr\u00e3o", tone: "standard" };

  return { label: "Baixa atividade", tone: "below" };
};

export const describeProfileConversionBehaviorEngagementSignal = (
  engagementPerPsychologist: number | null,
): ProfileConversionBehaviorSemanticSignal => {
  if (typeof engagementPerPsychologist !== "number" || engagementPerPsychologist <= 0) {
    return { label: "Sem engajamento", tone: "zero" };
  }
  if (engagementPerPsychologist >= 10) return { label: "Alto engajamento", tone: "above" };
  if (engagementPerPsychologist >= 3) return { label: "Engajamento padr\u00e3o", tone: "standard" };

  return { label: "Baixo engajamento", tone: "below" };
};

export const describeProfileConversionBehaviorDominantContentFormat = (params: {
  text: number;
  textLabel: string;
  video: number;
  videoLabel: string;
  zeroLabel: string;
}): ProfileConversionBehaviorSemanticSignal => {
  const total = params.text + params.video;
  if (total <= 0) return { label: params.zeroLabel, tone: "zero" };

  if (params.video > params.text) {
    return {
      label: `${formatProfileConversionBehaviorPercentage((params.video / total) * 100, "0%")} ${params.videoLabel}`,
      tone: "above",
    };
  }

  if (params.text > params.video) {
    return {
      label: `${formatProfileConversionBehaviorPercentage((params.text / total) * 100, "0%")} ${params.textLabel}`,
      tone: "standard",
    };
  }

  return {
    label: `${formatProfileConversionBehaviorPercentage(50, "50%")} ${params.textLabel} e ${params.videoLabel}`,
    tone: "standard",
  };
};

export const describeProfileConversionBehaviorDominantTabSignal = (params: {
  publicationsTabOpens: number;
  reviewsTabOpens: number;
}): ProfileConversionBehaviorSemanticSignal => {
  const total = params.publicationsTabOpens + params.reviewsTabOpens;
  if (total <= 0) return { label: "Sem aba predominante", tone: "zero" };
  if (params.publicationsTabOpens === params.reviewsTabOpens) {
    return { label: "Publica\u00e7\u00f5es e avalia\u00e7\u00f5es", tone: "standard" };
  }

  return params.publicationsTabOpens > params.reviewsTabOpens
    ? { label: "Aba Publica\u00e7\u00f5es", tone: "standard" }
    : { label: "Aba Avalia\u00e7\u00f5es", tone: "standard" };
};

export const formatProfileConversionBehaviorPerPsychologistValue = (value: number | null) =>
  formatProfileConversionBehaviorMetricNumber(value, "0");

export const formatProfileConversionBehaviorOpeningsValue = (value: number | null) =>
  typeof value === "number"
    ? formatProfileConversionBehaviorCount(value, "abertura", "aberturas")
    : "0 aberturas";

export const describeProfileConversionBehaviorDominantPlan = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
): ProfileConversionBehaviorSemanticSignal & { value: number } => {
  const counts = new Map<string, { count: number; label: string }>();

  for (const profile of profiles) {
    const plan = pickCurrentPlan(profile, date);
    const key = plan?.plan.slug ?? "none";
    const label = plan?.plan.name?.trim() || "Sem plano";
    const current = counts.get(key) ?? { count: 0, label };
    counts.set(key, { ...current, count: current.count + 1 });
  }

  const dominant = [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;

    return left.label.localeCompare(right.label, "pt-BR");
  })[0];

  if (!dominant || dominant.label === "Sem plano") {
    return { label: "Sem plano", tone: "zero", value: dominant?.count ?? 0 };
  }

  return { label: dominant.label, tone: "standard", value: dominant.count };
};

export const describeProfileConversionBehaviorDominantProfileTab = (params: {
  publicationsTabOpens: number;
  reviewsTabOpens: number;
}) => {
  const total = params.publicationsTabOpens + params.reviewsTabOpens;
  if (total <= 0) return "não houve abertura relevante das abas Publicações ou Avaliações";

  if (params.publicationsTabOpens === params.reviewsTabOpens) {
    return `Publicações e Avaliações empataram, com ${formatProfileConversionBehaviorCount(params.publicationsTabOpens, "abertura", "aberturas")} cada`;
  }

  return params.publicationsTabOpens > params.reviewsTabOpens
    ? `a aba Publicações predomina, com ${formatProfileConversionBehaviorCount(params.publicationsTabOpens, "abertura", "aberturas")}`
    : `a aba Avaliações predomina, com ${formatProfileConversionBehaviorCount(params.reviewsTabOpens, "abertura", "aberturas")}`;
};

import {
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG,
  ADMIN_PROFILE_CONVERSION_CATEGORY_ORDER,
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER,
  type classifyAdminProfileConversionQuality,
} from "@/utils/admin-profile-conversion";
import type { AdminProfileEngagementFavoritesCombinationId } from "@/utils/admin-profile-engagement-favorites";
import { ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMBINATION_ORDER } from "@/utils/admin-profile-engagement-favorites";
import type { AdminProfileExposureCombinationId } from "@/utils/admin-profile-exposure";
import {
  ADMIN_PROFILE_EXPOSURE_CATEGORY_ORDER,
  ADMIN_PROFILE_EXPOSURE_COMBINATION_ORDER,
} from "@/utils/admin-profile-exposure";
import { ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE } from "@/utils/admin-profile-received-engagement";
import type {
  AdminPsychologistsDashboardDeviceType,
  AdminPsychologistsDashboardPlanSegment,
  AdminPsychologistsDashboardPreSignupConversion,
  AdminPsychologistsDashboardProfileActivityCategoryId,
  AdminPsychologistsDashboardProfileConversionCategoryId,
  AdminPsychologistsDashboardProfileConversionEngagementCategoryId,
  AdminPsychologistsDashboardProfileConversionEngagementLevelId,
  AdminPsychologistsDashboardProfileConversionEngagementQuadrantId,
  AdminPsychologistsDashboardProfileConversionGoalCategoryId,
  AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  AdminPsychologistsDashboardProfileCoverageCategoryId,
  AdminPsychologistsDashboardProfileExposureCategoryId,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";

export const DEFAULT_PERIOD_DAYS = 7;

export const MAX_PERIOD_DAYS = 3660;

export const MS_PER_DAY = 86_400_000;

export const COURTESY_SUBSCRIPTION_SOURCE = "admin_grant";

export const STATUS_ACTIVE = "ativa";

export const STATUS_CANCELLED = "cancelada";

export const FREE_PLAN_SLUG = "gratuito";

export const DIRECTORY_FILTER_SEARCH_ACTION_SOURCE =
  "important_action_event.action_type=psychologist_directory_filter_search";

export const CITY_FILTER_MINIMUM_SEARCHES = 10;

export const RECEIVED_ENGAGEMENT_SOURCE = ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE;

export const PROFILE_CONVERSION_ENGAGEMENT_MIN_ACTIVE_DAYS = 7;

export const PROFILE_CONVERSION_ENGAGEMENT_MINIMUM_SIGNAL_30D = 3;

export const PROFILE_CONVERSION_ENGAGEMENT_ENGAGED_INTERACTIONS_30D = 6;

export const PROFILE_CONVERSION_ENGAGEMENT_VERY_ENGAGED_INTERACTIONS_30D = 12;

export const PRE_SIGNUP_CONVERSION_FIRST_TOUCH_LIMIT = 6;

export const PRE_SIGNUP_CONVERSION_FIRST_TOUCH_SAMPLE_THRESHOLD = 3;

export const PROFILE_ACTIVITY_SOURCE = "community_post.author_id+post_reply.author_id";

export const PROFILE_COVERAGE_SOURCE =
  "post_reply.author_id+post_reply.post.author.role=paciente+distinct(post_id)" as const;

export const PROFILE_ACTIVITY_THRESHOLDS = {
  active_min_actions: 6,
  low_activity_min_actions: 3,
  very_active_min_actions: 12,
} as const;

export const PRE_SIGNUP_CONVERSION_SESSION_LABEL = "Sessão sem página capturada";

export const PRE_SIGNUP_CONVERSION_COVERAGE_NOTE =
  "Grupo de psicólogos cadastrados no período, considerando também a navegação anônima anterior que pôde ser associada ao cadastro. Outros visitantes não entram neste bloco.";

export const PLAN_SEGMENT_OPTIONS: Array<{
  id: AdminPsychologistsDashboardPlanSegment;
  label: string;
}> = [
  { id: "all", label: "Todos" },
  { id: "subscribers", label: "Assinantes" },
  { id: "free", label: "Gratuitos" },
  { id: "courtesy", label: "Cortesia" },
];

export const PROFILE_CONVERSION_CATEGORY_ORDER =
  ADMIN_PROFILE_CONVERSION_CATEGORY_ORDER as AdminPsychologistsDashboardProfileConversionCategoryId[];

export const PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER =
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER as AdminPsychologistsDashboardProfileConversionEngagementCategoryId[];

export const PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER =
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER as AdminPsychologistsDashboardProfileConversionMatrixCategoryId[];

export const PROFILE_CONVERSION_GOAL_CATEGORY_ORDER: AdminPsychologistsDashboardProfileConversionGoalCategoryId[] =
  ["good_conversion", "excellent_conversion", "low_conversion", "insufficient_data"];

export const normalizeProfileConversionGoalCategory = (
  categoryId: ReturnType<typeof classifyAdminProfileConversionQuality>,
): AdminPsychologistsDashboardProfileConversionGoalCategoryId =>
  categoryId === "no_conversion" ? "low_conversion" : categoryId;

export const PROFILE_ACTIVITY_CATEGORY_ORDER: AdminPsychologistsDashboardProfileActivityCategoryId[] =
  ["muito_ativo", "ativo", "pouco_ativo", "sem_base"];

export const PROFILE_COVERAGE_CATEGORY_ORDER: AdminPsychologistsDashboardProfileCoverageCategoryId[] =
  ["above_average_coverage", "average_coverage", "below_average_coverage", "no_coverage"];

export const PROFILE_ACTIVITY_CATEGORY_CONFIG = {
  ativo: {
    description:
      "Psicólogo com volume padrão de ações autorais nas comunidades no período selecionado.",
    label: "Ativo",
  },
  muito_ativo: {
    description:
      "Psicólogo com volume alto de ações autorais nas comunidades no período selecionado.",
    label: "Muito ativo",
  },
  pouco_ativo: {
    description: "Psicólogo com poucas ações autorais nas comunidades no período selecionado.",
    label: "Pouco ativo",
  },
  sem_base: {
    description:
      "Psicólogo com menos de três ações autorais nas comunidades no período selecionado.",
    label: "Sem base",
  },
} satisfies Record<
  AdminPsychologistsDashboardProfileActivityCategoryId,
  { description: string; label: string }
>;

export const PROFILE_COVERAGE_CATEGORY_CONFIG = {
  above_average_coverage: {
    description:
      "Psicólogo respondeu mais posts únicos de pacientes do que a média dos psicólogos no período selecionado.",
    label: "Alta cobertura",
  },
  average_coverage: {
    description:
      "Psicólogo respondeu exatamente a média de posts únicos de pacientes no período selecionado.",
    label: "Cobertura padrão",
  },
  below_average_coverage: {
    description:
      "Psicólogo respondeu ao menos um post único de paciente, mas ficou abaixo da média do período selecionado.",
    label: "Baixa cobertura",
  },
  no_coverage: {
    description: "Psicólogo não respondeu posts únicos de pacientes no período selecionado.",
    label: "Sem cobertura",
  },
} satisfies Record<
  AdminPsychologistsDashboardProfileCoverageCategoryId,
  { description: string; label: string }
>;

export const PROFILE_CONVERSION_ENGAGEMENT_LEVEL_ORDER: AdminPsychologistsDashboardProfileConversionEngagementLevelId[] =
  ["very_engaged", "engaged", "low_engaged", "no_engagement"];

export const PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER =
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMBINATION_ORDER as AdminProfileEngagementFavoritesCombinationId[];

export const PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER =
  ADMIN_PROFILE_EXPOSURE_COMBINATION_ORDER as AdminProfileExposureCombinationId[];

export const PROFILE_CONVERSION_CATEGORY_CONFIG =
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG satisfies Record<
    AdminPsychologistsDashboardProfileConversionCategoryId,
    { description: string; label: string }
  >;

export const PROFILE_EXPOSURE_CATEGORY_ORDER =
  ADMIN_PROFILE_EXPOSURE_CATEGORY_ORDER as AdminPsychologistsDashboardProfileExposureCategoryId[];

const PROFILE_CONVERSION_ENGAGEMENT_LEVEL_CONFIG = {
  engaged: {
    description: "interações recebidas consistentes em perfil e comunidades",
    label: "Engajamento Padrão",
  },
  low_engaged: {
    description: "poucas interações recebidas em perfil e comunidades",
    label: "Baixo Engajamento",
  },
  no_engagement: {
    description: "nenhuma interação recebida em perfil ou comunidades no período",
    label: "Sem Engajamento",
  },
  very_engaged: {
    description: "volume muito alto de interações recebidas em perfil e comunidades",
    label: "Alto Engajamento",
  },
} satisfies Record<
  AdminPsychologistsDashboardProfileConversionEngagementLevelId,
  { description: string; label: string }
>;

export const buildProfileConversionEngagementQuadrantId = (
  profileConversionCategoryId: AdminPsychologistsDashboardProfileConversionEngagementCategoryId,
  engagementLevel: AdminPsychologistsDashboardProfileConversionEngagementLevelId,
): AdminPsychologistsDashboardProfileConversionEngagementQuadrantId => {
  const id = `${profileConversionCategoryId}_${engagementLevel}`;

  return id as AdminPsychologistsDashboardProfileConversionEngagementQuadrantId;
};

export const PROFILE_CONVERSION_ENGAGEMENT_QUADRANT_ORDER: AdminPsychologistsDashboardProfileConversionEngagementQuadrantId[] =
  PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER.flatMap((profileConversionCategoryId) =>
    PROFILE_CONVERSION_ENGAGEMENT_LEVEL_ORDER.map((engagementLevel) =>
      buildProfileConversionEngagementQuadrantId(profileConversionCategoryId, engagementLevel),
    ),
  );

export const mapProfileConversionCategoryToEngagementAxis = (
  profileConversionCategoryId: AdminPsychologistsDashboardProfileConversionCategoryId,
): AdminPsychologistsDashboardProfileConversionEngagementCategoryId =>
  profileConversionCategoryId === "insufficient_data"
    ? "standard_conversion"
    : profileConversionCategoryId;

export const getProfileConversionEngagementQuadrantConfig = (input: {
  engagementLevel: AdminPsychologistsDashboardProfileConversionEngagementLevelId;
  profileConversionCategoryId: AdminPsychologistsDashboardProfileConversionEngagementCategoryId;
}) => {
  const profileConversion = PROFILE_CONVERSION_CATEGORY_CONFIG[input.profileConversionCategoryId];
  const engagement = PROFILE_CONVERSION_ENGAGEMENT_LEVEL_CONFIG[input.engagementLevel];

  return {
    description: `Psicólogos em ${profileConversion.label} com ${engagement.description}.`,
    label: `${profileConversion.label} + ${engagement.label}`,
  };
};

export const DEVICE_LABELS: Record<AdminPsychologistsDashboardDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
};

export const GENDER_LABELS: Record<string, string> = {
  feminina: "Feminino",
  feminino: "Feminino",
  female: "Feminino",
  homem: "Masculino",
  male: "Masculino",
  masculina: "Masculino",
  masculino: "Masculino",
  mulher: "Feminino",
  nao_binario: "Não binário",
  não_binário: "Não binário",
  outro: "Outro",
  other: "Outro",
};

export const RACE_COLOR_LABELS: Record<string, string> = {
  amarela: "Amarela",
  amarelo: "Amarela",
  branca: "Branca",
  branco: "Branca",
  indigena: "Indígena",
  indígena: "Indígena",
  parda: "Parda",
  pardo: "Parda",
  preta: "Preta",
  preto: "Preta",
};

export const RELIGION_LABELS: Record<string, string> = {
  ateu_agnostico: "Ateu/Agnóstico",
  budista: "Budista",
  catolica: "Católica",
  católico: "Católica",
  catolico: "Católica",
  evangelica: "Evangélica",
  evangelico: "Evangélica",
  espírita: "Espírita",
  espirita: "Espírita",
  islamica: "Islâmica",
  islamico: "Islâmica",
  judaica: "Judaica",
  judaico: "Judaica",
  outra: "Outra",
  outro: "Outra",
  sem_religiao: "Sem religião",
  umbanda_candomble: "Umbanda/Candomblé",
};

export const FILTER_SEARCH_TARGET_TYPES = {
  approaches: ["psychologist_filter_approach"],
  cities: ["psychologist_filter_city"],
  features: ["psychologist_filter_feature"],
  genders: ["psychologist_filter_gender"],
  languages: ["psychologist_filter_language"],
  modalities: ["psychologist_filter_modality"],
  race_colors: ["psychologist_filter_race_color"],
  religions: ["psychologist_filter_religion"],
  services: ["psychologist_filter_service"],
  specialties: ["psychologist_filter_specialty"],
  states: ["psychologist_filter_state"],
  target_audiences: ["psychologist_filter_target_audience"],
} satisfies Record<string, string[]>;

export const PRE_SIGNUP_CONVERSION_BUCKETS = [
  { id: "same_day", label: "Mesmo dia" },
  { id: "days_1_3", label: "1-3 dias" },
  { id: "days_4_7", label: "4-7 dias" },
  { id: "days_8_30", label: "8-30 dias" },
  { id: "over_30", label: "Mais de 30 dias" },
  { id: "no_history", label: "Sem trilha capturada" },
] as const satisfies Array<{
  id: AdminPsychologistsDashboardPreSignupConversion["buckets"][number]["id"];
  label: string;
}>;

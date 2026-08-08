import {
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
} from "@/utils/admin-profile-conversion";
import { roundOneDecimal } from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileActivityCategoryId,
  AdminPsychologistsDashboardProfileActivityResults,
  AdminPsychologistsDashboardProfileActivityTotals,
  AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrantId,
  AdminPsychologistsDashboardProfileConversionActivityMatrixResults,
  AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  AdminPsychologistsDashboardProfileCoverageCategoryId,
  AdminPsychologistsDashboardProfileCoverageResults,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistCommunityTrafficPlatformDataset,
  AdminPsychologistEventRecord,
  AdminPsychologistProfileRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import { dateInRange } from "../pre-signup/conversion";
import {
  PROFILE_ACTIVITY_CATEGORY_CONFIG,
  PROFILE_ACTIVITY_CATEGORY_ORDER,
  PROFILE_ACTIVITY_SOURCE,
  PROFILE_ACTIVITY_THRESHOLDS,
  PROFILE_CONVERSION_CATEGORY_CONFIG,
  PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER,
  PROFILE_COVERAGE_CATEGORY_CONFIG,
  PROFILE_COVERAGE_CATEGORY_ORDER,
  PROFILE_COVERAGE_SOURCE,
} from "../support/constants";
import { safePercentage } from "../support/metrics";
import {
  countEventsByPsychologist,
  getProfileActiveDaysInRange,
  getProfileAgeDaysUntil,
} from "./conversion";
import {
  buildProfileConversionMatrixRows,
  classifyProfileConversionMatrixCategory,
  emptyProfileConversionMatrixRowTotals,
} from "./favorites-matrix";

export const emptyProfileActivityTotals = (): AdminPsychologistsDashboardProfileActivityTotals => ({
  actions: 0,
  posts: 0,
  replies: 0,
});

const addProfileActivityTotals = (
  target: AdminPsychologistsDashboardProfileActivityTotals,
  source: AdminPsychologistsDashboardProfileActivityTotals,
) => {
  target.actions += source.actions;
  target.posts += source.posts;
  target.replies += source.replies;
};

export const classifyProfileActivityCategory = (
  actions: number,
): AdminPsychologistsDashboardProfileActivityCategoryId => {
  if (actions >= PROFILE_ACTIVITY_THRESHOLDS.very_active_min_actions) return "muito_ativo";
  if (actions >= PROFILE_ACTIVITY_THRESHOLDS.active_min_actions) return "ativo";
  if (actions >= PROFILE_ACTIVITY_THRESHOLDS.low_activity_min_actions) return "pouco_ativo";

  return "sem_base";
};

export const buildProfileActivityResults = (params: {
  communityPosts: AdminPsychologistCommunityTrafficPlatformDataset["posts"];
  communityReplies: AdminPsychologistCommunityTrafficPlatformDataset["replies"];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
}): AdminPsychologistsDashboardProfileActivityResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const signalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileActivityTotals
  >();
  const ensureSignals = (psychologistId: string) => {
    const current = signalsByPsychologistId.get(psychologistId) ?? emptyProfileActivityTotals();
    signalsByPsychologistId.set(psychologistId, current);

    return current;
  };

  for (const post of params.communityPosts) {
    if (
      !analyzedPsychologistIds.has(post.author_id) ||
      !dateInRange(post.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureSignals(post.author_id);
    signals.actions += 1;
    signals.posts += 1;
  }

  for (const reply of params.communityReplies) {
    if (
      !analyzedPsychologistIds.has(reply.author_id) ||
      !dateInRange(reply.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureSignals(reply.author_id);
    signals.actions += 1;
    signals.replies += 1;
  }

  const categories = new Map(
    PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileActivityTotals(),
      },
    ]),
  );
  const totalSignals = {
    ...emptyProfileActivityTotals(),
    psychologists: params.profiles.length,
    psychologists_with_actions: 0,
  };

  for (const profile of params.profiles) {
    const signals = signalsByPsychologistId.get(profile.user.id) ?? emptyProfileActivityTotals();
    const categoryId = classifyProfileActivityCategory(signals.actions);
    const category = categories.get(categoryId);

    addProfileActivityTotals(totalSignals, signals);
    if (signals.actions > 0) totalSignals.psychologists_with_actions += 1;
    if (category) {
      category.count += 1;
      addProfileActivityTotals(category.totals, signals);
    }
  }

  return {
    categories: PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) => {
      const config = PROFILE_ACTIVITY_CATEGORY_CONFIG[id];
      const values = categories.get(id) ?? {
        count: 0,
        totals: emptyProfileActivityTotals(),
      };

      return {
        count: values.count,
        description: config.description,
        id,
        label: config.label,
        percentage: safePercentage(values.count, params.profiles.length),
        totals: values.totals,
      };
    }),
    description:
      "Classificação interna e agregada dos psicólogos por ações autorais reais nas comunidades no período selecionado: posts publicados e respostas criadas.",
    source: PROFILE_ACTIVITY_SOURCE,
    thresholds: PROFILE_ACTIVITY_THRESHOLDS,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Atividade."
        : null,
  };
};

export const buildProfileCoverageCountsByPsychologistId = (params: {
  communityReplies: AdminPsychologistCommunityTrafficPlatformDataset["replies"];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
}) => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const coveredPatientPostIdsByPsychologistId = new Map<string, Set<string>>();

  for (const reply of params.communityReplies) {
    if (
      !analyzedPsychologistIds.has(reply.author_id) ||
      !dateInRange(reply.createdAt, params.range) ||
      reply.post.author.role !== "paciente"
    ) {
      continue;
    }

    const current = coveredPatientPostIdsByPsychologistId.get(reply.author_id) ?? new Set<string>();
    current.add(reply.post_id);
    coveredPatientPostIdsByPsychologistId.set(reply.author_id, current);
  }

  return new Map(
    [...coveredPatientPostIdsByPsychologistId.entries()].map(([psychologistId, postIds]) => [
      psychologistId,
      postIds.size,
    ]),
  );
};

export const classifyProfileCoverageCategory = (
  patientPostsAnswered: number,
  averagePatientPostsAnswered: number,
): AdminPsychologistsDashboardProfileCoverageCategoryId => {
  if (patientPostsAnswered <= 0 || averagePatientPostsAnswered <= 0) return "no_coverage";
  if (patientPostsAnswered > averagePatientPostsAnswered) return "above_average_coverage";
  if (patientPostsAnswered < averagePatientPostsAnswered) return "below_average_coverage";

  return "average_coverage";
};

export const buildProfileCoverageResults = (params: {
  communityReplies: AdminPsychologistCommunityTrafficPlatformDataset["replies"];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
}): AdminPsychologistsDashboardProfileCoverageResults => {
  const coverageCountsByPsychologistId = buildProfileCoverageCountsByPsychologistId(params);
  const totalPsychologists = params.profiles.length;
  const totalPatientPostsAnswered = [...coverageCountsByPsychologistId.values()].reduce(
    (total, count) => total + count,
    0,
  );
  const averagePatientPostsAnswered =
    totalPsychologists > 0 ? totalPatientPostsAnswered / totalPsychologists : 0;
  const categories = new Map(
    PROFILE_COVERAGE_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: {
          patient_posts_answered: 0,
        },
      },
    ]),
  );
  let psychologistsWithCoverage = 0;

  for (const profile of params.profiles) {
    const patientPostsAnswered = coverageCountsByPsychologistId.get(profile.user.id) ?? 0;
    const categoryId = classifyProfileCoverageCategory(
      patientPostsAnswered,
      averagePatientPostsAnswered,
    );
    const category = categories.get(categoryId);

    if (patientPostsAnswered > 0) psychologistsWithCoverage += 1;
    if (category) {
      category.count += 1;
      category.totals.patient_posts_answered += patientPostsAnswered;
    }
  }

  return {
    categories: PROFILE_COVERAGE_CATEGORY_ORDER.map((id) => {
      const config = PROFILE_COVERAGE_CATEGORY_CONFIG[id];
      const values = categories.get(id) ?? {
        count: 0,
        totals: {
          patient_posts_answered: 0,
        },
      };

      return {
        count: values.count,
        description: config.description,
        id,
        label: config.label,
        percentage: safePercentage(values.count, totalPsychologists),
        totals: values.totals,
      };
    }),
    description:
      "Classificação interna e agregada dos psicólogos por quantidade de posts únicos de pacientes que receberam ao menos uma resposta do psicólogo no período selecionado.",
    source: PROFILE_COVERAGE_SOURCE,
    totals: {
      average_patient_posts_answered: roundOneDecimal(averagePatientPostsAnswered),
      patient_posts_answered: totalPatientPostsAnswered,
      psychologists: totalPsychologists,
      psychologists_with_coverage: psychologistsWithCoverage,
    },
    unavailable_reason:
      totalPsychologists === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Cobertura."
        : null,
  };
};

const buildProfileConversionActivityMatrixQuadrantId = (
  rowId: AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  columnId: AdminPsychologistsDashboardProfileActivityCategoryId,
): AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrantId =>
  `${rowId}_${columnId}` as AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrantId;

export const buildProfileConversionActivityMatrixResults = (params: {
  communityPosts: AdminPsychologistCommunityTrafficPlatformDataset["posts"];
  communityReplies: AdminPsychologistCommunityTrafficPlatformDataset["replies"];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionActivityMatrixResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const signalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileActivityTotals
  >();
  const ensureSignals = (psychologistId: string) => {
    const current = signalsByPsychologistId.get(psychologistId) ?? emptyProfileActivityTotals();
    signalsByPsychologistId.set(psychologistId, current);

    return current;
  };

  for (const post of params.communityPosts) {
    if (
      !analyzedPsychologistIds.has(post.author_id) ||
      !dateInRange(post.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureSignals(post.author_id);
    signals.actions += 1;
    signals.posts += 1;
  }

  for (const reply of params.communityReplies) {
    if (
      !analyzedPsychologistIds.has(reply.author_id) ||
      !dateInRange(reply.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureSignals(reply.author_id);
    signals.actions += 1;
    signals.replies += 1;
  }

  const eligibleConversionProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const profileConversionBenchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: eligibleConversionProfiles.length,
    whatsappClicks: eligibleConversionProfiles.map(
      (profile) => whatsappClickCounts.get(profile.user.id) ?? 0,
    ),
  });
  const rows = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileConversionMatrixRowTotals(),
      },
    ]),
  );
  const columns = new Map(
    PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileActivityTotals(),
      },
    ]),
  );
  const quadrants = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_ACTIVITY_CATEGORY_ORDER.map((columnId) => [
        buildProfileConversionActivityMatrixQuadrantId(rowId, columnId),
        {
          count: 0,
          totals: emptyProfileActivityTotals(),
        },
      ]),
    ),
  );
  const totalSignals = {
    ...emptyProfileActivityTotals(),
    psychologists: params.profiles.length,
    psychologists_with_actions: 0,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const signals = signalsByPsychologistId.get(psychologistId) ?? emptyProfileActivityTotals();
    const rowId = classifyProfileConversionMatrixCategory({
      activeDays,
      benchmark: profileConversionBenchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const columnId = classifyProfileActivityCategory(signals.actions);
    const quadrantId = buildProfileConversionActivityMatrixQuadrantId(rowId, columnId);
    const row = rows.get(rowId);
    const column = columns.get(columnId);
    const quadrant = quadrants.get(quadrantId);

    addProfileActivityTotals(totalSignals, signals);
    if (signals.actions > 0) totalSignals.psychologists_with_actions += 1;
    if (row) {
      row.count += 1;
      row.totals.whatsapp_clicks += whatsappClicks;
    }
    if (column) {
      column.count += 1;
      addProfileActivityTotals(column.totals, signals);
    }
    if (quadrant) {
      quadrant.count += 1;
      addProfileActivityTotals(quadrant.totals, signals);
    }
  }

  const totalPsychologists = params.profiles.length;

  return {
    columns: PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) => {
      const config = PROFILE_ACTIVITY_CATEGORY_CONFIG[id];
      const values = columns.get(id) ?? {
        count: 0,
        totals: emptyProfileActivityTotals(),
      };

      return {
        count: values.count,
        description: config.description,
        id,
        label: config.label,
        percentage: safePercentage(values.count, totalPsychologists),
        totals: values.totals,
      };
    }),
    description:
      "Matriz observacional entre Conversao e Atividade autoral nas comunidades, usando posts publicados e respostas criadas no periodo para indicar o comportamento predominante de cada faixa de conversao.",
    quadrants: PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_ACTIVITY_CATEGORY_ORDER.map((columnId) => {
        const quadrantId = buildProfileConversionActivityMatrixQuadrantId(rowId, columnId);
        const rowConfig = PROFILE_CONVERSION_CATEGORY_CONFIG[rowId];
        const columnConfig = PROFILE_ACTIVITY_CATEGORY_CONFIG[columnId];
        const values = quadrants.get(quadrantId) ?? {
          count: 0,
          totals: emptyProfileActivityTotals(),
        };

        return {
          column_id: columnId,
          column_label: columnConfig.label,
          count: values.count,
          description: `Psicologos em ${rowConfig.label} com ${columnConfig.label}.`,
          id: quadrantId,
          label: `${rowConfig.label} + ${columnConfig.label}`,
          percentage: safePercentage(values.count, totalPsychologists),
          row_id: rowId,
          row_label: rowConfig.label,
          totals: values.totals,
        };
      }),
    ),
    rows: buildProfileConversionMatrixRows(rows, totalPsychologists),
    source: `${ADMIN_PROFILE_CONVERSION_SOURCE}+${PROFILE_ACTIVITY_SOURCE}`,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicologos ativos no fim do periodo selecionado para cruzar Conversao com Atividade."
        : null,
  };
};

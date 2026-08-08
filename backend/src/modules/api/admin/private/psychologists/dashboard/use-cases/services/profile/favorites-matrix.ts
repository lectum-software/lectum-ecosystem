import {
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
} from "@/utils/admin-profile-conversion";
import type { AdminProfileEngagementFavoritesCombinationId } from "@/utils/admin-profile-engagement-favorites";
import {
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS,
  buildAdminProfileEngagementFavoritesBenchmark,
  buildAdminProfileEngagementFavoritesCombinationId,
  classifyAdminProfileEngagementFavoritesCommunityCategory,
  classifyAdminProfileEngagementFavoritesFavoriteCategory,
} from "@/utils/admin-profile-engagement-favorites";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrantId,
  AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults,
  AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  AdminPsychologistsDashboardProfileEngagementFavoritesTotals,
  AdminPsychologistsDashboardProfileExposureTotals,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistEventRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistReceivedEngagementEventRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  PROFILE_CONVERSION_CATEGORY_CONFIG,
  PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER,
  PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER,
} from "../support/constants";
import { safePercentage } from "../support/metrics";
import {
  classifyProfileConversionCategory,
  countEventsByPsychologist,
  getProfileActiveDaysInRange,
  getProfileAgeDaysUntil,
} from "./conversion";
import {
  addProfileEngagementFavoritesTotals,
  buildProfileEngagementFavoritesSignalTotals,
  countReceivedEngagementEventsByPsychologist,
  emptyProfileEngagementFavoritesTotals,
  emptyReceivedEngagementSignalCounts,
  getProfileEngagementFavoritesCategoryConfig,
} from "./engagement-favorites";

export const classifyProfileConversionMatrixCategory = (signals: {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
}): AdminPsychologistsDashboardProfileConversionMatrixCategoryId => {
  const categoryId = classifyProfileConversionCategory({
    ...signals,
    profileAgeDays: Math.max(
      signals.profileAgeDays,
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
    ),
  });

  return categoryId === "insufficient_data" ? "no_conversion" : categoryId;
};

export const emptyProfileConversionMatrixRowTotals = () => ({
  whatsapp_clicks: 0,
});

export const buildProfileConversionMatrixRows = (
  rows: Map<
    AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
    {
      count: number;
      totals: ReturnType<typeof emptyProfileConversionMatrixRowTotals>;
    }
  >,
  totalPsychologists: number,
) =>
  PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => {
    const config = PROFILE_CONVERSION_CATEGORY_CONFIG[id];
    const values = rows.get(id) ?? {
      count: 0,
      totals: emptyProfileConversionMatrixRowTotals(),
    };

    return {
      count: values.count,
      description: config.description,
      id,
      label: config.label,
      percentage: safePercentage(values.count, totalPsychologists),
      totals: values.totals,
    };
  });

const buildProfileConversionEngagementFavoritesMatrixQuadrantId = (
  rowId: AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  columnId: AdminProfileEngagementFavoritesCombinationId,
): AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrantId =>
  `${rowId}_${columnId}` as AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrantId;

const classifyProfileEngagementFavoritesMatrixColumn = (input: {
  benchmark: ReturnType<typeof buildAdminProfileEngagementFavoritesBenchmark>;
  profileAgeDays: number;
  signals: AdminPsychologistsDashboardProfileEngagementFavoritesTotals;
}): AdminProfileEngagementFavoritesCombinationId => {
  const profileAgeDays = Math.max(
    input.profileAgeDays,
    ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
  );
  const communityCategoryId = classifyAdminProfileEngagementFavoritesCommunityCategory({
    benchmark: input.benchmark,
    engagementScore: input.signals.community_engagement_score,
    profileAgeDays,
  });
  const favoriteCategoryId = classifyAdminProfileEngagementFavoritesFavoriteCategory({
    benchmark: input.benchmark,
    favorites: input.signals.favorites,
    profileAgeDays,
  });

  if (communityCategoryId === "insufficient_data" || favoriteCategoryId === "insufficient_data") {
    return "no_engagement_no_favorites";
  }

  return buildAdminProfileEngagementFavoritesCombinationId({
    communityCategoryId,
    favoriteCategoryId,
  });
};

export const buildProfileConversionEngagementFavoritesMatrixResults = (params: {
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const receivedEngagementEvents = params.receivedEngagementEvents.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const receivedEngagementCounts =
    countReceivedEngagementEventsByPsychologist(receivedEngagementEvents);
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const signalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileEngagementFavoritesTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const counts =
      receivedEngagementCounts.get(psychologistId) ?? emptyReceivedEngagementSignalCounts();

    signalsByPsychologistId.set(
      psychologistId,
      buildProfileEngagementFavoritesSignalTotals({
        commentsReceived: counts.commentsReceived,
        contentSaves: counts.contentSaves,
        contentShares: counts.contentShares,
        favorites: counts.profileFavorites,
        positiveVotes: counts.positiveVotes,
        whatsappClicks: whatsappClickCounts.get(psychologistId) ?? 0,
      }),
    );
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
  const eligibleEngagementFavoritesProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileEngagementFavoritesBenchmark({
    communityEngagementScores: eligibleEngagementFavoritesProfiles.map(
      (profile) => signalsByPsychologistId.get(profile.user.id)?.community_engagement_score ?? 0,
    ),
    eligiblePsychologists: eligibleEngagementFavoritesProfiles.length,
    favoriteCounts: eligibleEngagementFavoritesProfiles.map(
      (profile) => signalsByPsychologistId.get(profile.user.id)?.favorites ?? 0,
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
    PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileEngagementFavoritesTotals(),
      },
    ]),
  );
  const quadrants = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER.map((columnId) => [
        buildProfileConversionEngagementFavoritesMatrixQuadrantId(rowId, columnId),
        {
          count: 0,
          totals: emptyProfileEngagementFavoritesTotals(),
        },
      ]),
    ),
  );
  const totalSignals = {
    ...emptyProfileEngagementFavoritesTotals(),
    adaptation_psychologists: params.profiles.length - eligibleEngagementFavoritesProfiles.length,
    eligible_psychologists: eligibleEngagementFavoritesProfiles.length,
    psychologists: params.profiles.length,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const signals =
      signalsByPsychologistId.get(psychologistId) ?? emptyProfileEngagementFavoritesTotals();
    const rowId = classifyProfileConversionMatrixCategory({
      activeDays,
      benchmark: profileConversionBenchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const columnId = classifyProfileEngagementFavoritesMatrixColumn({
      benchmark,
      profileAgeDays,
      signals,
    });
    const quadrantId = buildProfileConversionEngagementFavoritesMatrixQuadrantId(rowId, columnId);
    const row = rows.get(rowId);
    const column = columns.get(columnId);
    const quadrant = quadrants.get(quadrantId);

    addProfileEngagementFavoritesTotals(totalSignals, signals);
    if (row) {
      row.count += 1;
      row.totals.whatsapp_clicks += whatsappClicks;
    }
    if (column) {
      column.count += 1;
      addProfileEngagementFavoritesTotals(column.totals, signals);
    }
    if (quadrant) {
      quadrant.count += 1;
      addProfileEngagementFavoritesTotals(quadrant.totals, signals);
    }
  }

  const totalPsychologists = params.profiles.length;

  return {
    columns: PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER.map((id) => {
      const config = getProfileEngagementFavoritesCategoryConfig(id);
      const values = columns.get(id) ?? {
        count: 0,
        totals: emptyProfileEngagementFavoritesTotals(),
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
      "Matriz observacional entre Conversão e as 16 combinações de Engajamento comunitário recebido x Favoritos. Perfis em adaptação são projetados nos mesmos 16 eixos para manter a leitura do funil fechada, sem alterar ranking ou punir profissionais.",
    quadrants: PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER.map((columnId) => {
        const quadrantId = buildProfileConversionEngagementFavoritesMatrixQuadrantId(
          rowId,
          columnId,
        );
        const rowConfig = PROFILE_CONVERSION_CATEGORY_CONFIG[rowId];
        const columnConfig = getProfileEngagementFavoritesCategoryConfig(columnId);
        const values = quadrants.get(quadrantId) ?? {
          count: 0,
          totals: emptyProfileEngagementFavoritesTotals(),
        };

        return {
          column_id: columnId,
          column_label: columnConfig.label,
          count: values.count,
          description: `Psicólogos em ${rowConfig.label} com ${columnConfig.label}.`,
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
    source: `${ADMIN_PROFILE_CONVERSION_SOURCE}+${ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE}`,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para cruzar Conversão com Engajamentos e Favoritos."
        : null,
  };
};

export type ProfileConversionVisibilityMatrixTotals =
  AdminPsychologistsDashboardProfileExposureTotals & {
    whatsapp_clicks: number;
  };

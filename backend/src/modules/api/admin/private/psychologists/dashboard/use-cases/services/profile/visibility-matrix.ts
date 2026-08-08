import {
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
} from "@/utils/admin-profile-conversion";
import type { AdminProfileExposureCombinationId } from "@/utils/admin-profile-exposure";
import {
  ADMIN_PROFILE_EXPOSURE_SOURCE,
  ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
  buildAdminProfileExposureBenchmark,
  buildAdminProfileExposureCombinationId,
  classifyAdminProfileExposureCommunityCategory,
  classifyAdminProfileExposureVideoCategory,
  getAdminProfileExposureCategoryConfig,
} from "@/utils/admin-profile-exposure";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrantId,
  AdminPsychologistsDashboardProfileConversionVisibilityMatrixResults,
  AdminPsychologistsDashboardProfileExposureTotals,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistAttentionRecord,
  AdminPsychologistContentAttentionRecord,
  AdminPsychologistEventRecord,
  AdminPsychologistProfileRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  PROFILE_CONVERSION_CATEGORY_CONFIG,
  PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER,
  PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER,
} from "../support/constants";
import { safePercentage } from "../support/metrics";
import {
  countEventsByPsychologist,
  getProfileActiveDaysInRange,
  getProfileAgeDaysUntil,
} from "./conversion";
import {
  addProfileExposureTotals,
  buildProfileExposureSignalTotals,
  emptyProfileExposureTotals,
  getProfileExposureCommunityVisibilitySeconds,
  getProfileExposureVideoVisibilitySeconds,
} from "./exposure";
import type { ProfileConversionVisibilityMatrixTotals } from "./favorites-matrix";
import {
  buildProfileConversionMatrixRows,
  classifyProfileConversionMatrixCategory,
  emptyProfileConversionMatrixRowTotals,
} from "./favorites-matrix";

const emptyProfileConversionVisibilityMatrixTotals =
  (): ProfileConversionVisibilityMatrixTotals => ({
    ...emptyProfileExposureTotals(),
    whatsapp_clicks: 0,
  });

const addProfileConversionVisibilityMatrixTotals = (
  target: ProfileConversionVisibilityMatrixTotals,
  signals: AdminPsychologistsDashboardProfileExposureTotals,
  whatsappClicks: number,
) => {
  addProfileExposureTotals(target, signals);
  target.whatsapp_clicks += whatsappClicks;
};

const buildProfileConversionVisibilityMatrixQuadrantId = (
  rowId: AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  columnId: AdminProfileExposureCombinationId,
): AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrantId =>
  `${rowId}_${columnId}` as AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrantId;

const classifyProfileVisibilityMatrixColumn = (input: {
  benchmark: ReturnType<typeof buildAdminProfileExposureBenchmark>;
  profileAgeDays: number;
  signals: AdminPsychologistsDashboardProfileExposureTotals;
}): AdminProfileExposureCombinationId => {
  const profileAgeDays = Math.max(
    input.profileAgeDays,
    ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
  );
  const communityCategoryId = classifyAdminProfileExposureCommunityCategory({
    benchmark: input.benchmark,
    profileAgeDays,
    visibilitySeconds: getProfileExposureCommunityVisibilitySeconds(input.signals),
  });
  const videoCategoryId = classifyAdminProfileExposureVideoCategory({
    benchmark: input.benchmark,
    profileAgeDays,
    visibilitySeconds: getProfileExposureVideoVisibilitySeconds(input.signals),
  });

  if (communityCategoryId === "insufficient_data" || videoCategoryId === "insufficient_data") {
    return "no_community_no_video";
  }

  return buildAdminProfileExposureCombinationId({
    communityCategoryId,
    videoCategoryId,
  });
};

export const buildProfileConversionVisibilityMatrixResults = (params: {
  communityContentAttentionSeconds: AdminPsychologistContentAttentionRecord[];
  profileAttentionSeconds: AdminPsychologistAttentionRecord[];
  profileVideoAttentionSeconds: AdminPsychologistAttentionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionVisibilityMatrixResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const attentionSecondsByPsychologist = (records: AdminPsychologistAttentionRecord[]) => {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (!analyzedPsychologistIds.has(record.psychologist_id)) continue;

      counts.set(
        record.psychologist_id,
        (counts.get(record.psychologist_id) ?? 0) + record.attention_seconds,
      );
    }

    return counts;
  };
  const contentAttentionByPsychologistAndType = (
    records: AdminPsychologistContentAttentionRecord[],
    targetType: AdminPsychologistContentAttentionRecord["target_type"],
  ) =>
    attentionSecondsByPsychologist(records.filter((record) => record.target_type === targetType));
  const profileAttentionCounts = attentionSecondsByPsychologist(params.profileAttentionSeconds);
  const profileVideoAttentionCounts = attentionSecondsByPsychologist(
    params.profileVideoAttentionSeconds,
  );
  const communityPostAttentionCounts = contentAttentionByPsychologistAndType(
    params.communityContentAttentionSeconds,
    "post",
  );
  const communityReplyAttentionCounts = contentAttentionByPsychologistAndType(
    params.communityContentAttentionSeconds,
    "reply",
  );
  const exposureSignalsByPsychologist = new Map<
    string,
    AdminPsychologistsDashboardProfileExposureTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    exposureSignalsByPsychologist.set(
      psychologistId,
      buildProfileExposureSignalTotals({
        communityPostAttentionSeconds: communityPostAttentionCounts.get(psychologistId) ?? 0,
        communityReplyAttentionSeconds: communityReplyAttentionCounts.get(psychologistId) ?? 0,
        profileAttentionSeconds: profileAttentionCounts.get(psychologistId) ?? 0,
        profileVideoAttentionSeconds: profileVideoAttentionCounts.get(psychologistId) ?? 0,
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
  const eligibleVisibilityProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileExposureBenchmark({
    communityVisibilitySeconds: eligibleVisibilityProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologist.get(profile.user.id);

      return signals ? getProfileExposureCommunityVisibilitySeconds(signals) : 0;
    }),
    eligiblePsychologists: eligibleVisibilityProfiles.length,
    exposureScores: eligibleVisibilityProfiles.map(
      (profile) => exposureSignalsByPsychologist.get(profile.user.id)?.exposure_score ?? 0,
    ),
    presentationVideoSeconds: eligibleVisibilityProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologist.get(profile.user.id);

      return signals ? getProfileExposureVideoVisibilitySeconds(signals) : 0;
    }),
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
    PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileExposureTotals(),
      },
    ]),
  );
  const quadrants = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER.map((columnId) => [
        buildProfileConversionVisibilityMatrixQuadrantId(rowId, columnId),
        {
          count: 0,
          totals: emptyProfileConversionVisibilityMatrixTotals(),
        },
      ]),
    ),
  );
  const totalSignals = {
    ...emptyProfileExposureTotals(),
    adaptation_psychologists: params.profiles.length - eligibleVisibilityProfiles.length,
    eligible_psychologists: eligibleVisibilityProfiles.length,
    psychologists: params.profiles.length,
    whatsapp_clicks: whatsappClickEvents.length,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const signals =
      exposureSignalsByPsychologist.get(psychologistId) ?? emptyProfileExposureTotals();
    const rowId = classifyProfileConversionMatrixCategory({
      activeDays,
      benchmark: profileConversionBenchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const columnId = classifyProfileVisibilityMatrixColumn({
      benchmark,
      profileAgeDays,
      signals,
    });
    const quadrantId = buildProfileConversionVisibilityMatrixQuadrantId(rowId, columnId);
    const row = rows.get(rowId);
    const column = columns.get(columnId);
    const quadrant = quadrants.get(quadrantId);

    addProfileExposureTotals(totalSignals, signals);
    if (row) {
      row.count += 1;
      row.totals.whatsapp_clicks += whatsappClicks;
    }
    if (column) {
      column.count += 1;
      addProfileExposureTotals(column.totals, signals);
    }
    if (quadrant) {
      quadrant.count += 1;
      addProfileConversionVisibilityMatrixTotals(quadrant.totals, signals, whatsappClicks);
    }
  }

  const totalPsychologists = params.profiles.length;

  return {
    columns: PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER.map((id) => {
      const config = getAdminProfileExposureCategoryConfig(id);
      const values = columns.get(id) ?? {
        count: 0,
        totals: emptyProfileExposureTotals(),
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
      "Matriz observacional entre Conversão e as 16 combinações de Visibilidade em comunidades x Vídeo de apresentação. Perfis em adaptação são projetados nos mesmos 16 eixos para manter a leitura do funil fechada, sem alterar ranking ou punir profissionais.",
    quadrants: PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER.map((columnId) => {
        const quadrantId = buildProfileConversionVisibilityMatrixQuadrantId(rowId, columnId);
        const rowConfig = PROFILE_CONVERSION_CATEGORY_CONFIG[rowId];
        const columnConfig = getAdminProfileExposureCategoryConfig(columnId);
        const values = quadrants.get(quadrantId) ?? {
          count: 0,
          totals: emptyProfileConversionVisibilityMatrixTotals(),
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
    source: `${ADMIN_PROFILE_CONVERSION_SOURCE}+${ADMIN_PROFILE_EXPOSURE_SOURCE}`,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para cruzar Conversão com Visibilidade."
        : null,
  };
};

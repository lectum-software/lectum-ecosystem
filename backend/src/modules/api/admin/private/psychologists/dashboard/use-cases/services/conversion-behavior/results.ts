import {
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
} from "@/utils/admin-profile-conversion";
import type { AdminPsychologistsDashboardProfileConversionBehaviorResults } from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type { AdminPsychologistProfileRecord } from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  countEventsByPsychologist,
  getProfileActiveDaysInRange,
  getProfileAgeDaysUntil,
} from "../profile/conversion";
import {
  buildProfileConversionMatrixRows,
  classifyProfileConversionMatrixCategory,
  emptyProfileConversionMatrixRowTotals,
} from "../profile/favorites-matrix";
import { PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER } from "../support/constants";
import {
  buildCommunitiesBehaviorCell,
  buildFavoriteBehaviorCell,
} from "./community-favorite-cells";
import {
  buildProfileConversionBehaviorRowContext,
  type ProfileConversionBehaviorParams,
} from "./context";
import {
  buildPresentationVideoBehaviorCell,
  buildProfileBehaviorCell,
} from "./presentation-profile-cells";
import { PROFILE_CONVERSION_BEHAVIOR_COLUMNS, PROFILE_CONVERSION_BEHAVIOR_SOURCE } from "./support";

export const buildProfileConversionBehaviorResults = (
  params: ProfileConversionBehaviorParams,
): AdminPsychologistsDashboardProfileConversionBehaviorResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));

  const whatsappClickEvents = params.whatsappContactRequests.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );

  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);

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

  const rowCounters = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileConversionMatrixRowTotals(),
      },
    ]),
  );

  const profilesByRow = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => [
      id,
      [] as AdminPsychologistProfileRecord[],
    ]),
  );

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const rowId = classifyProfileConversionMatrixCategory({
      activeDays: getProfileActiveDaysInRange(profile, params.range),
      benchmark: profileConversionBenchmark,
      profileAgeDays: getProfileAgeDaysUntil(profile, params.range.end),
      whatsappClicks: whatsappClickCounts.get(psychologistId) ?? 0,
    });
    const row = rowCounters.get(rowId);
    const rowProfiles = profilesByRow.get(rowId);

    if (row) {
      row.count += 1;
      row.totals.whatsapp_clicks += whatsappClickCounts.get(psychologistId) ?? 0;
    }
    if (rowProfiles) rowProfiles.push(profile);
  }

  const rows = buildProfileConversionMatrixRows(rowCounters, params.profiles.length);

  const cells = rows.flatMap((row) => {
    const rowProfiles = profilesByRow.get(row.id) ?? [];
    const context = buildProfileConversionBehaviorRowContext({ params, row, rowProfiles });

    return [
      buildPresentationVideoBehaviorCell(context),
      buildProfileBehaviorCell(context),
      buildCommunitiesBehaviorCell(context),
      buildFavoriteBehaviorCell(context),
    ];
  });

  return {
    cells,
    columns: PROFILE_CONVERSION_BEHAVIOR_COLUMNS,
    description:
      "Tabela observacional que detalha, em tags, os sinais predominantes de vídeo de apresentação, perfil, comunidade e favoritos para cada faixa de Conversão.",
    rows,
    source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para detalhar comportamento por Conversão."
        : null,
  };
};

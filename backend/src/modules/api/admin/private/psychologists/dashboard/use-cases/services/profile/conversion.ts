import {
  ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS,
  ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG,
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
  classifyAdminProfileConversionCategory,
  classifyAdminProfileConversionQuality,
  normalizeAdminProfileConversionToThirtyDays,
} from "@/utils/admin-profile-conversion";
import { roundOneDecimal } from "@/utils/admin-psychologist-analytics";
import { daysBetweenInclusive, endOfDate, startOfDate } from "@/utils/date-range";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileConversionCategoryId,
  AdminPsychologistsDashboardProfileConversionGoalResults,
  AdminPsychologistsDashboardProfileConversionResults,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistEventRecord,
  AdminPsychologistProfileRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  normalizeProfileConversionGoalCategory,
  PROFILE_CONVERSION_CATEGORY_CONFIG,
  PROFILE_CONVERSION_CATEGORY_ORDER,
  PROFILE_CONVERSION_GOAL_CATEGORY_ORDER,
} from "../support/constants";
import { safePercentage } from "../support/metrics";

type ProfileConversionSignalCounts = {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
};

export const countEventsByPsychologist = (events: AdminPsychologistEventRecord[]) => {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.psychologist_id, (counts.get(event.psychologist_id) ?? 0) + 1);
  }

  return counts;
};

export const getProfileActiveDaysInRange = (
  profile: AdminPsychologistProfileRecord,
  range: AdminPsychologistsDashboardDateRange,
) => {
  const rangeStart = startOfDate(range.start);
  const rangeEnd = endOfDate(range.end);
  const profileStart = startOfDate(profile.user.createdAt);
  const activeStart = profileStart > rangeStart ? profileStart : rangeStart;

  if (activeStart > rangeEnd) return 0;

  return daysBetweenInclusive(activeStart, rangeEnd);
};

export const getProfileAgeDaysUntil = (profile: AdminPsychologistProfileRecord, date: Date) => {
  const profileStart = startOfDate(profile.user.createdAt);
  const rangeEnd = endOfDate(date);

  if (profileStart > rangeEnd) return 0;

  return daysBetweenInclusive(profileStart, rangeEnd);
};

export const classifyProfileConversionCategory = (
  signals: ProfileConversionSignalCounts,
): AdminPsychologistsDashboardProfileConversionCategoryId => {
  return classifyAdminProfileConversionCategory(signals);
};

export const buildProfileConversionResults = (params: {
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const eligibleProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: eligibleProfiles.length,
    whatsappClicks: eligibleProfiles.map(
      (profile) => whatsappClickCounts.get(profile.user.id) ?? 0,
    ),
  });
  const categories = new Map(
    PROFILE_CONVERSION_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: {
          whatsapp_clicks: 0,
        },
      },
    ]),
  );

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const categoryId = classifyProfileConversionCategory({
      activeDays,
      benchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const category = categories.get(categoryId);

    if (category) {
      category.count += 1;
      category.totals.whatsapp_clicks += whatsappClicks;
    }
  }

  const totalPsychologists = params.profiles.length;

  return {
    benchmark,
    categories: PROFILE_CONVERSION_CATEGORY_ORDER.map((id) => {
      const config = PROFILE_CONVERSION_CATEGORY_CONFIG[id];
      const values = categories.get(id) ?? {
        count: 0,
        totals: {
          whatsapp_clicks: 0,
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
      "Classificação interna e agregada dos psicólogos por volume bruto de cliques no WhatsApp comparado aos percentis da plataforma na janela selecionada; não é pública, não ranqueia e não pune profissionais.",
    source: ADMIN_PROFILE_CONVERSION_SOURCE,
    thresholds: ADMIN_PROFILE_CONVERSION_THRESHOLDS,
    totals: {
      adaptation_psychologists: totalPsychologists - benchmark.eligible_psychologists,
      eligible_psychologists: benchmark.eligible_psychologists,
      non_zero_whatsapp_psychologists: benchmark.non_zero_whatsapp_psychologists,
      psychologists: totalPsychologists,
      whatsapp_clicks: whatsappClickEvents.length,
    },
    unavailable_reason:
      totalPsychologists === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar conversão."
        : null,
  };
};

export const buildProfileConversionGoalResults = (params: {
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionGoalResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const categories = new Map(
    PROFILE_CONVERSION_GOAL_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: {
          normalized_whatsapp_clicks_30d: 0,
          whatsapp_clicks: 0,
        },
      },
    ]),
  );

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const normalizedWhatsappClicks30d = normalizeAdminProfileConversionToThirtyDays(
      whatsappClicks,
      activeDays,
    );
    const categoryId = normalizeProfileConversionGoalCategory(
      classifyAdminProfileConversionQuality({
        activeDays,
        profileAgeDays,
        whatsappClicks,
      }),
    );
    const category = categories.get(categoryId);

    if (category) {
      category.count += 1;
      category.totals.whatsapp_clicks += whatsappClicks;
      category.totals.normalized_whatsapp_clicks_30d = roundOneDecimal(
        category.totals.normalized_whatsapp_clicks_30d + normalizedWhatsappClicks30d,
      );
    }
  }

  const totalPsychologists = params.profiles.length;
  const goalPsychologists =
    (categories.get("good_conversion")?.count ?? 0) +
    (categories.get("excellent_conversion")?.count ?? 0);

  return {
    categories: PROFILE_CONVERSION_GOAL_CATEGORY_ORDER.map((id) => {
      const config = ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG[id];
      const values = categories.get(id) ?? {
        count: 0,
        totals: {
          normalized_whatsapp_clicks_30d: 0,
          whatsapp_clicks: 0,
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
      "Meta operacional de conversão por cliques no WhatsApp normalizados para 30 dias: na meta entre 5 e 9 conversões equivalentes e acima da meta a partir de 10.",
    source: ADMIN_PROFILE_CONVERSION_SOURCE,
    thresholds: {
      ...ADMIN_PROFILE_CONVERSION_THRESHOLDS,
      absolute: ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS,
    },
    totals: {
      adaptation_psychologists: categories.get("insufficient_data")?.count ?? 0,
      excellent_goal_psychologists: categories.get("excellent_conversion")?.count ?? 0,
      goal_psychologists: goalPsychologists,
      psychologists: totalPsychologists,
      whatsapp_clicks: whatsappClickEvents.length,
    },
    unavailable_reason:
      totalPsychologists === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Meta de conversão."
        : null,
  };
};

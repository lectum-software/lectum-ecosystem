import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
} from "@/utils/admin-profile-conversion";
import { rankPsychologistCandidates } from "@/utils/psychologist-public-ranking";
import type {
  AdminPsychologistsListFilters,
  AdminPsychologistsListOption,
  AdminPsychologistsListQuery,
} from "../../DTOs/IAdminPsychologistsListDTO";
import { AdminPsychologistsListRepository } from "../../repositories/AdminPsychologistsListRepository";
import type {
  AdminPsychologistListProfileRecord,
  AdminPsychologistListSpecialtyCatalogRecord,
} from "../../repositories/interfaces/IAdminPsychologistsListRepository";
import { matchesFilters } from "./filters";

import {
  buildItem,
  matchesSignalFilters,
  profileActiveDaysUntil,
  roundScore,
  sortItems,
} from "./items";
import {
  ENGAGEMENT_CATEGORIES,
  EXPERIENCE_LABELS,
  EXPERIENCES,
  GENDER_LABELS,
  jsonStringArray,
  MODALITY_LABELS,
  mapCountGroups,
  mapExperience,
  mapReceivedEngagementCounts,
  mapStatus,
  normalizeKey,
  normalizePagination,
  normalizeSort,
  PROFILE_CONVERSION_CATEGORIES,
  PROFILE_CONVERSION_ENGAGEMENT_QUADRANTS,
  PROFILE_STATUSES,
  pickCurrentPlan,
  REGISTRY_STATUSES,
  SORTS,
  STATUS_LABELS,
  STATUSES,
} from "./list-support";

export const addOptionCount = (
  map: Map<string, { count: number; label: string }>,
  id: string,
  label: string,
) => {
  const normalizedId = id.trim();
  const normalizedLabel = label.trim();
  if (!normalizedId || !normalizedLabel) return;

  const current = map.get(normalizedId);
  map.set(normalizedId, {
    count: (current?.count ?? 0) + 1,
    label: current?.label ?? normalizedLabel,
  });
};

export const optionsFromMap = (map: Map<string, { count: number; label: string }>) =>
  [...map.entries()]
    .map(
      ([id, item]): AdminPsychologistsListOption => ({
        count: item.count,
        id,
        label: item.label,
      }),
    )
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

export const optionsFromSpecialtyCatalog = (
  catalog: AdminPsychologistListSpecialtyCatalogRecord[],
  counts: Map<string, { count: number; label: string }>,
): AdminPsychologistsListOption[] =>
  catalog.map((item) => ({
    count: counts.get(item.slug)?.count ?? 0,
    id: item.slug,
    label: item.name,
  }));

export const buildFilters = (
  profiles: AdminPsychologistListProfileRecord[],
  date: Date,
  specialtyCatalog: AdminPsychologistListSpecialtyCatalogRecord[],
): AdminPsychologistsListFilters => {
  const approaches = new Map<string, { count: number; label: string }>();
  const cities = new Map<string, { count: number; label: string }>();
  const experienceRanges = new Map<string, { count: number; label: string }>();
  const genders = new Map<string, { count: number; label: string }>();
  const languages = new Map<string, { count: number; label: string }>();
  const modalities = new Map<string, { count: number; label: string }>();
  const plans = new Map<string, { count: number; label: string }>();
  const raceColors = new Map<string, { count: number; label: string }>();
  const religions = new Map<string, { count: number; label: string }>();
  const services = new Map<string, { count: number; label: string }>();
  const specialties = new Map<string, { count: number; label: string }>();
  const states = new Map<string, { count: number; label: string }>();
  const statuses = new Map<string, { count: number; label: string }>();
  const targetAudience = new Map<string, { count: number; label: string }>();

  for (const profile of profiles) {
    const status = mapStatus(profile, date);
    const plan = pickCurrentPlan(profile, date);
    const experience = mapExperience(profile);

    addOptionCount(statuses, status, STATUS_LABELS[status]);
    addOptionCount(experienceRanges, experience, EXPERIENCE_LABELS[experience]);
    addOptionCount(plans, plan?.plan.slug ?? "sem_plano", plan?.plan.name ?? "Sem plano ativo");

    if (profile.professional_address_state?.trim()) {
      const state = profile.professional_address_state.trim().toUpperCase();
      addOptionCount(states, state, state);
    }

    if (profile.professional_address_city?.trim()) {
      const city = profile.professional_address_city.trim();
      addOptionCount(cities, city, city);
    }

    for (const { approach } of profile.user.psychologist_approaches) {
      addOptionCount(approaches, approach.slug, approach.name);
    }

    for (const { specialty } of profile.user.psychologist_specialties) {
      addOptionCount(specialties, specialty.slug, specialty.name);
    }

    for (const { service } of profile.user.psychologist_services) {
      addOptionCount(services, service.slug, service.name);
    }

    for (const audience of jsonStringArray(profile.target_audience)) {
      addOptionCount(targetAudience, normalizeKey(audience), audience);
    }

    for (const language of jsonStringArray(profile.languages)) {
      addOptionCount(languages, normalizeKey(language), language);
    }

    if (profile.modality?.trim()) {
      const key = normalizeKey(profile.modality);
      addOptionCount(modalities, key, MODALITY_LABELS[key] ?? profile.modality.trim());
    }

    if (profile.gender?.trim()) {
      const key = normalizeKey(profile.gender);
      addOptionCount(genders, key, GENDER_LABELS[key] ?? profile.gender.trim());
    }

    if (profile.race_color?.trim()) {
      const raceColor = profile.race_color.trim();
      addOptionCount(raceColors, normalizeKey(raceColor), raceColor);
    }

    if (profile.religion?.trim()) {
      const religion = profile.religion.trim();
      addOptionCount(religions, normalizeKey(religion), religion);
    }
  }

  return {
    approaches: optionsFromMap(approaches),
    cities: optionsFromMap(cities),
    experience_ranges: optionsFromMap(experienceRanges),
    genders: optionsFromMap(genders),
    languages: optionsFromMap(languages),
    modalities: optionsFromMap(modalities),
    plans: optionsFromMap(plans),
    race_colors: optionsFromMap(raceColors),
    religions: optionsFromMap(religions),
    services: optionsFromMap(services),
    specialties: optionsFromSpecialtyCatalog(specialtyCatalog, specialties),
    states: optionsFromMap(states),
    statuses: optionsFromMap(statuses),
    target_audience: optionsFromMap(targetAudience),
  };
};

export const activeFiltersCount = (query: AdminPsychologistsListQuery) =>
  [
    query.q,
    query.state,
    query.city,
    query.status,
    query.plan,
    query.profile_status,
    query.registry_status,
    query.profile_conversion,
    query.profile_conversion_engagement,
    query.engagement,
    query.experience,
    query.available_today,
    query.more_experienced,
    query.verified,
    query.discount_first_session,
    query.accepts_insurance,
    query.social_value,
    query.target_audience,
    query.specialty,
    query.approach,
    query.service,
    query.modality,
    query.language,
    query.gender,
    query.race_color,
    query.religion,
  ].filter((value) => value !== undefined && value !== null && value !== "").length;

export const listAdminPsychologists = async (
  query: AdminPsychologistsListQuery,
): Promise<Resolve> => {
  if (
    (query.status && !STATUSES.has(query.status)) ||
    (query.experience && !EXPERIENCES.has(query.experience)) ||
    (query.profile_status && !PROFILE_STATUSES.has(query.profile_status)) ||
    (query.registry_status && !REGISTRY_STATUSES.has(query.registry_status)) ||
    (query.profile_conversion && !PROFILE_CONVERSION_CATEGORIES.has(query.profile_conversion)) ||
    (query.profile_conversion_engagement &&
      !PROFILE_CONVERSION_ENGAGEMENT_QUADRANTS.has(query.profile_conversion_engagement)) ||
    (query.engagement && !ENGAGEMENT_CATEGORIES.has(query.engagement)) ||
    (query.sort && !SORTS.has(query.sort))
  ) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  const repository = new AdminPsychologistsListRepository();
  const now = new Date();
  const sort = normalizeSort(query.sort);
  const pagination = normalizePagination(query);

  const [profiles, rankingCandidates, specialtyCatalog] = await Promise.all([
    repository.listPsychologistProfiles(),
    repository.listPublicRankingCandidates(),
    repository.listSpecialtyCatalog(),
  ]);

  const ids = profiles.map((profile) => profile.user.id);
  const [favoriteGroups, receivedEngagementGroups, whatsappGroups, ranked] = await Promise.all([
    repository.listFavoriteCounts(ids),
    repository.listReceivedEngagementCounts(ids),
    repository.listWhatsappClickCounts(ids),
    rankPsychologistCandidates(rankingCandidates, null),
  ]);

  const favoriteCounts = mapCountGroups(favoriteGroups);
  const receivedEngagementCounts = mapReceivedEngagementCounts(receivedEngagementGroups);
  const whatsappCounts = mapCountGroups(whatsappGroups);
  const benchmarkEligibleProfiles = profiles.filter(
    (profile) =>
      profileActiveDaysUntil(profile.user.createdAt, now) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const profileConversionBenchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: benchmarkEligibleProfiles.length,
    whatsappClicks: benchmarkEligibleProfiles.map(
      (profile) => whatsappCounts.get(profile.user.id) ?? 0,
    ),
  });
  const rankingById = new Map(
    ranked.map(({ item, ranking }, index) => [
      item.user.id,
      {
        position: index + 1,
        score: roundScore(ranking.score),
      },
    ]),
  );

  const allItems = profiles
    .filter((profile) => matchesFilters(profile, query, now))
    .map((profile) =>
      buildItem(profile, {
        benchmark: profileConversionBenchmark,
        date: now,
        favoriteCounts,
        rankingById,
        receivedEngagementCounts,
        whatsappCounts,
      }),
    )
    .filter((item) => matchesSignalFilters(item, query));
  const sortedItems = sortItems(allItems, sort);
  const count = sortedItems.length;
  const pages = Math.max(1, Math.ceil(count / pagination.limit));
  const responsePage = Math.min(pagination.page, pages);
  const responseSkip = (responsePage - 1) * pagination.limit;
  const data = sortedItems.slice(responseSkip, responseSkip + pagination.limit);

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      active_filters_count: activeFiltersCount(query),
      count,
      data,
      filters: buildFilters(profiles, now, specialtyCatalog),
      page: responsePage,
      pages,
      per_page: pagination.limit,
      sort,
      source:
        "user+psychologist_profile+professional_subscription+public_ranking+contact_request+psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share" as const,
    },
  };
};

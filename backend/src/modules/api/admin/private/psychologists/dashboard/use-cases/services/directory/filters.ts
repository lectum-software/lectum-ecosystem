import { crpExperienceYears } from "@/utils/professional-experience";
import type {
  AdminPsychologistsDashboardBooleanBreakdown,
  AdminPsychologistsDashboardBreakdownItem,
  AdminPsychologistsDashboardDirectoryFilterItem,
  AdminPsychologistsDashboardDirectoryFilters,
  AdminPsychologistsDashboardFilterSearchDimension,
  AdminPsychologistsDashboardFilterSearches,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistDirectoryFilterSearchRecord,
  AdminPsychologistProfileRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  currentWeekdayValue,
  humanizeFilterValue,
  parseCityFilterTarget,
} from "../pre-signup/conversion";
import { buildBreakdown, hasVerifiedEntitlementAt } from "../subscriptions/timeline";
import {
  CITY_FILTER_MINIMUM_SEARCHES,
  DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
  FILTER_SEARCH_TARGET_TYPES,
} from "../support/constants";
import { normalizeKey, safePercentage } from "../support/metrics";

const buildOptionLookup = (options: AdminPsychologistsDashboardDirectoryFilterItem[] = []) => {
  const lookup = new Map<string, AdminPsychologistsDashboardDirectoryFilterItem>();

  for (const option of options) {
    for (const value of [option.id, option.slug, option.label]) {
      const key = normalizeKey(value);
      if (key) lookup.set(key, option);
    }
  }

  return lookup;
};

const buildFilterSearchDimension = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  minimumCount?: number;
  options?: AdminPsychologistsDashboardDirectoryFilterItem[];
  targetTypes: string[];
}): AdminPsychologistsDashboardFilterSearchDimension => {
  const optionLookup = buildOptionLookup(params.options);
  const itemsById = new Map<string, { count: number; label: string }>();
  const targetTypes = new Set(params.targetTypes);

  for (const option of params.options ?? []) {
    const id = option.slug || option.id;
    if (!id) continue;

    itemsById.set(id, {
      count: 0,
      label: option.label,
    });
  }

  for (const action of params.actions) {
    if (!action.target_type || !targetTypes.has(action.target_type)) continue;

    const targetId = action.target_id?.trim();
    if (!targetId) continue;

    const normalizedTarget = normalizeKey(targetId);
    if (!normalizedTarget) continue;

    const option = optionLookup.get(normalizedTarget);
    if (params.options && !option) continue;

    const id = option?.slug || option?.id || normalizedTarget;
    const current = itemsById.get(id);

    itemsById.set(id, {
      count: (current?.count ?? 0) + 1,
      label: current?.label ?? option?.label ?? humanizeFilterValue(targetId),
    });
  }

  const allItems = buildBreakdown(
    itemsById,
    [...itemsById.values()].reduce((sum, item) => sum + item.count, 0),
  );
  const minimumCount = params.minimumCount;
  const visibleItems =
    typeof minimumCount === "number"
      ? allItems.filter((item) => item.count >= minimumCount)
      : allItems;
  const total = visibleItems.reduce((sum, item) => sum + item.count, 0);

  return {
    items: visibleItems.map((item) => ({
      ...item,
      percentage: safePercentage(item.count, total),
    })),
    source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
    total,
  };
};

const buildCityFilterSearchDimension = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  supplyItems: AdminPsychologistsDashboardBreakdownItem[];
}): AdminPsychologistsDashboardFilterSearchDimension => {
  const itemsById = new Map<string, { count: number; hasSupply: boolean; label: string }>();
  const supplyItemsByCity = new Map<string, AdminPsychologistsDashboardBreakdownItem[]>();
  const targetTypes = new Set(FILTER_SEARCH_TARGET_TYPES.cities);

  for (const item of params.supplyItems) {
    itemsById.set(item.id, {
      count: 0,
      hasSupply: item.count > 0,
      label: item.label,
    });

    const city = item.label.split("/")[0]?.trim();
    const cityKey = city ? normalizeKey(city) : "";
    if (!cityKey) continue;

    supplyItemsByCity.set(cityKey, [...(supplyItemsByCity.get(cityKey) ?? []), item]);
  }

  for (const action of params.actions) {
    if (!action.target_type || !targetTypes.has(action.target_type)) continue;

    const targetId = action.target_id?.trim();
    if (!targetId) continue;

    const parsed = parseCityFilterTarget(targetId);
    if (!parsed.city) continue;

    const sameCitySupplyItems = supplyItemsByCity.get(normalizeKey(parsed.city)) ?? [];
    const matchedSupplyItem = parsed.state
      ? sameCitySupplyItems.find((item) => item.id === parsed.id)
      : sameCitySupplyItems.length === 1
        ? sameCitySupplyItems[0]
        : null;
    const id = matchedSupplyItem?.id ?? parsed.id;
    const current = itemsById.get(id);

    itemsById.set(id, {
      count: (current?.count ?? 0) + 1,
      hasSupply: current?.hasSupply ?? Boolean(matchedSupplyItem?.count),
      label: current?.label ?? matchedSupplyItem?.label ?? parsed.label,
    });
  }

  const visibleItems = [...itemsById.entries()]
    .filter(([, item]) => item.hasSupply || item.count >= CITY_FILTER_MINIMUM_SEARCHES)
    .map(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: 0,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    });
  const total = visibleItems.reduce((sum, item) => sum + item.count, 0);

  return {
    items: visibleItems.map((item) => ({
      ...item,
      percentage: safePercentage(item.count, total),
    })),
    source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
    total,
  };
};

export const buildFilterSearches = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  citySupplyItems: AdminPsychologistsDashboardBreakdownItem[];
  directoryFilters: AdminPsychologistsDashboardDirectoryFilters;
}): AdminPsychologistsDashboardFilterSearches => ({
  available: true,
  description:
    "Buscas por filtros aplicados no diretório público de psicólogos, sem armazenar o texto livre pesquisado.",
  dimensions: {
    approaches: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.approaches,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.approaches,
    }),
    cities: buildCityFilterSearchDimension({
      actions: params.actions,
      supplyItems: params.citySupplyItems,
    }),
    features: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.features,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.features,
    }),
    genders: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.genders,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.genders,
    }),
    languages: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.languages,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.languages,
    }),
    modalities: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.modalities,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.modalities,
    }),
    race_colors: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.race_colors,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.race_colors,
    }),
    religions: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.religions,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.religions,
    }),
    services: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.services,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.services,
    }),
    specialties: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.specialties,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.specialties,
    }),
    states: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.states,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.states,
    }),
    target_audiences: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.target_audiences,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.target_audiences,
    }),
  },
  minimum_city_searches: CITY_FILTER_MINIMUM_SEARCHES,
  source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
});

export const booleanBreakdown = (params: {
  falseLabel?: string;
  source: string;
  total: number;
  trueCount: number;
  trueLabel?: string;
}): AdminPsychologistsDashboardBooleanBreakdown => ({
  false_count: Math.max(0, params.total - params.trueCount),
  false_label: params.falseLabel ?? "Não",
  source: params.source,
  true_count: params.trueCount,
  true_label: params.trueLabel ?? "Sim",
  true_percentage: safePercentage(params.trueCount, params.total),
});

export const jsonStringArray = (value: AdminPsychologistProfileRecord["target_audience"]) => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

const profileMatchesPatientModality = (
  profile: AdminPsychologistProfileRecord,
  modality: "online" | "presencial",
) => {
  const key = normalizeKey(profile.modality ?? "");

  if (modality === "online") return key === "online" || key === "hibrido" || key === "hybrid";

  return key === "presencial" || key === "hibrido" || key === "hybrid";
};

export const buildPatientModalityBreakdown = (
  profiles: AdminPsychologistProfileRecord[],
): AdminPsychologistsDashboardBreakdownItem[] => {
  const total = profiles.length;

  return [
    {
      count: profiles.filter((profile) => profileMatchesPatientModality(profile, "online")).length,
      id: "online",
      label: "Online",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profileMatchesPatientModality(profile, "presencial"))
        .length,
      id: "presencial",
      label: "Presencial",
      percentage: 0,
    },
  ].map((item) => ({
    ...item,
    percentage: safePercentage(item.count, total),
  }));
};

const isAvailableToday = (profile: AdminPsychologistProfileRecord) =>
  jsonStringArray(profile.available_days).includes(currentWeekdayValue());

const isMoreExperienced = (profile: AdminPsychologistProfileRecord) =>
  profile.show_experience_tag && (crpExperienceYears(profile.crp_registration_date) ?? 0) >= 10;

export const buildFeatureBreakdown = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
): AdminPsychologistsDashboardBreakdownItem[] => {
  const total = profiles.length;
  const items: AdminPsychologistsDashboardBreakdownItem[] = [
    {
      count: profiles.filter(isAvailableToday).length,
      id: "available_today",
      label: "Disponível hoje",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => hasVerifiedEntitlementAt(profile, date)).length,
      id: "verified",
      label: "Somente verificados",
      percentage: 0,
    },
    {
      count: profiles.filter(isMoreExperienced).length,
      id: "more_experienced",
      label: "Mais experientes",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.discount_first_session).length,
      id: "discount_first_session",
      label: "Desconto na 1ª sessão",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.accepts_insurance).length,
      id: "accepts_insurance",
      label: "Aceita convênios",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.social_value).length,
      id: "social_value",
      label: "Valor social",
      percentage: 0,
    },
  ];

  return items.map((item) => ({
    ...item,
    percentage: safePercentage(item.count, total),
  }));
};

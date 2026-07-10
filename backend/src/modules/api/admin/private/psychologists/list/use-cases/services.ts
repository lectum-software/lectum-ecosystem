import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { crpExperienceYears } from "@/utils/professional-experience";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import { rankPsychologistCandidates } from "@/utils/psychologist-public-ranking";
import type {
  AdminPsychologistsListExperience,
  AdminPsychologistsListFilters,
  AdminPsychologistsListItem,
  AdminPsychologistsListOption,
  AdminPsychologistsListQuery,
  AdminPsychologistsListSort,
  IAdminPsychologistsListDTO,
} from "../DTOs/IAdminPsychologistsListDTO";
import { AdminPsychologistsListRepository } from "../repositories/AdminPsychologistsListRepository";
import type {
  AdminPsychologistCountGroup,
  AdminPsychologistListProfileRecord,
  AdminPsychologistListSubscriptionRecord,
} from "../repositories/interfaces/IAdminPsychologistsListRepository";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const STATUS_ACTIVE = "ativa";
const FREE_PLAN_SLUG = "gratuito";

const SORTS = new Set<AdminPsychologistsListSort>([
  "relevance",
  "rating",
  "favorites",
  "whatsapp",
  "recent",
  "name",
]);
const STATUSES = new Set<AdminPsychologistsListItem["status"]>([
  "verified",
  "free",
  "unpublished",
  "pending",
]);
const EXPERIENCES = new Set<AdminPsychologistsListExperience>(["0_4", "5_9", "10_plus", "unknown"]);

const EXPERIENCE_LABELS: Record<AdminPsychologistsListExperience, string> = {
  "0_4": "0 a 4 anos",
  "5_9": "5 a 9 anos",
  "10_plus": "10 anos+",
  unknown: "Sem data de CRP",
};

const STATUS_LABELS: Record<AdminPsychologistsListItem["status"], string> = {
  free: "Gratuitos",
  pending: "Pendentes",
  unpublished: "Não publicados",
  verified: "Verificados",
};

const MODALITY_LABELS: Record<string, string> = {
  hibrido: "Híbrido",
  hybrid: "Híbrido",
  online: "Online",
  presencial: "Presencial",
};

const GENDER_LABELS: Record<string, string> = {
  feminina: "Feminino",
  feminino: "Feminino",
  female: "Feminino",
  homem: "Masculino",
  male: "Masculino",
  masculina: "Masculino",
  masculino: "Masculino",
  mulher: "Feminino",
  nao_binario: "Outro",
  outro: "Outro",
  other: "Outro",
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeName = (name: string) =>
  normalizeProfessionalDisplayName(name) || name.replace(/\s+/g, " ").trim() || "Psicólogo";

const normalizePagination = (query: AdminPsychologistsListQuery) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    limit,
    page,
    skip: (page - 1) * limit,
  };
};

const normalizeSort = (value?: string): AdminPsychologistsListSort => {
  if (value && SORTS.has(value as AdminPsychologistsListSort)) {
    return value as AdminPsychologistsListSort;
  }

  return "relevance";
};

const jsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

const subscriptionActiveAt = (
  subscription: AdminPsychologistListSubscriptionRecord,
  date: Date,
) => {
  if (subscription.status !== STATUS_ACTIVE) return false;
  if (subscription.createdAt > date) return false;

  return !subscription.current_period_end || subscription.current_period_end > date;
};

const isFreeSubscription = (subscription: AdminPsychologistListSubscriptionRecord) =>
  subscription.plan.slug === FREE_PLAN_SLUG;

const isProfessionalPlan = (subscription: AdminPsychologistListSubscriptionRecord) =>
  subscription.plan.slug !== FREE_PLAN_SLUG;

const activeSubscriptionsAt = (profile: AdminPsychologistListProfileRecord, date: Date) =>
  profile.subscriptions.filter((subscription) => subscriptionActiveAt(subscription, date));

const hasActiveFreeAt = (profile: AdminPsychologistListProfileRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).some(isFreeSubscription);

const activeProfessionalSubscriptionsAt = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
) => activeSubscriptionsAt(profile, date).filter(isProfessionalPlan);

const hasVerifiedEntitlementAt = (profile: AdminPsychologistListProfileRecord, date: Date) => {
  const entitlements = activeProfessionalSubscriptionsAt(profile, date);
  if (entitlements.length === 0) return false;

  if (profile.cfp_verified_at && profile.cfp_verified_at <= date) return true;

  return entitlements.some(
    (subscription) =>
      subscription.source === "admin_grant" &&
      (subscription.grant_started_at ?? subscription.createdAt) <= date,
  );
};

const pickCurrentPlan = (profile: AdminPsychologistListProfileRecord, date: Date) => {
  const active = activeSubscriptionsAt(profile, date);
  if (active.length === 0) return null;

  return [...active].sort((left, right) => {
    const leftProfessional = Number(isProfessionalPlan(left));
    const rightProfessional = Number(isProfessionalPlan(right));
    if (leftProfessional !== rightProfessional) return rightProfessional - leftProfessional;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

const mapStatus = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
): AdminPsychologistsListItem["status"] => {
  if (hasVerifiedEntitlementAt(profile, date)) return "verified";
  if (!profile.published) return "unpublished";
  if (hasActiveFreeAt(profile, date)) return "free";

  return "pending";
};

const mapExperience = (
  profile: AdminPsychologistListProfileRecord,
): AdminPsychologistsListExperience => {
  const years = crpExperienceYears(profile.crp_registration_date);
  if (years === null) return "unknown";
  if (years >= 10) return "10_plus";
  if (years >= 5) return "5_9";

  return "0_4";
};

const mapCountGroups = (groups: AdminPsychologistCountGroup[]) =>
  new Map(groups.map((group) => [group.psychologist_id, group._count._all]));

const getNormalizedOptionMatch = (current: string | null | undefined, expected?: string) => {
  if (!expected) return true;
  if (!current) return false;

  return normalizeKey(current) === normalizeKey(expected);
};

const getExactTextMatch = (current: string | null | undefined, expected?: string) => {
  if (!expected) return true;
  if (!current) return false;

  return normalizeSearchText(current).trim() === normalizeSearchText(expected).trim();
};

const matchesJsonArray = (value: unknown, expected?: string) => {
  if (!expected) return true;

  return jsonStringArray(value).some((item) => normalizeKey(item) === normalizeKey(expected));
};

const matchesSearch = (profile: AdminPsychologistListProfileRecord, search?: string) => {
  const normalized = normalizeSearchText(search).trim();
  if (!normalized) return true;

  const crpDigits = (profile.crp ?? "").replace(/\D/g, "");
  const searchDigits = search?.replace(/\D/g, "") ?? "";
  const haystack = [profile.user.name, profile.crp]
    .map((value) => normalizeSearchText(value))
    .join(" ");

  return haystack.includes(normalized) || Boolean(searchDigits && crpDigits.includes(searchDigits));
};

const matchesFilters = (
  profile: AdminPsychologistListProfileRecord,
  query: AdminPsychologistsListQuery,
  date: Date,
) => {
  const plan = pickCurrentPlan(profile, date);
  const planSlug = plan?.plan.slug ?? "sem_plano";

  return (
    matchesSearch(profile, query.q) &&
    getExactTextMatch(profile.professional_address_state, query.state) &&
    getExactTextMatch(profile.professional_address_city, query.city) &&
    (!query.status || mapStatus(profile, date) === query.status) &&
    (!query.plan || planSlug === query.plan) &&
    (!query.experience || mapExperience(profile) === query.experience) &&
    (typeof query.discount_first_session !== "boolean" ||
      profile.discount_first_session === query.discount_first_session) &&
    (typeof query.accepts_insurance !== "boolean" ||
      profile.accepts_insurance === query.accepts_insurance) &&
    (typeof query.social_value !== "boolean" || profile.social_value === query.social_value) &&
    matchesJsonArray(profile.target_audience, query.target_audience) &&
    (!query.approach ||
      profile.user.psychologist_approaches.some(({ approach }) =>
        getNormalizedOptionMatch(approach.slug, query.approach),
      )) &&
    (!query.service ||
      profile.user.psychologist_services.some(({ service }) =>
        getNormalizedOptionMatch(service.slug, query.service),
      )) &&
    getNormalizedOptionMatch(profile.modality, query.modality) &&
    matchesJsonArray(profile.languages, query.language) &&
    getNormalizedOptionMatch(profile.gender, query.gender)
  );
};

const roundScore = (value: number) => Math.round(value * 1000) / 10;
const ratingAverage = (value: number) => Math.round((value / 100) * 10) / 10;

const buildItem = (
  profile: AdminPsychologistListProfileRecord,
  params: {
    date: Date;
    favoriteCounts: Map<string, number>;
    rankingById: Map<string, { position: number; score: number }>;
    whatsappCounts: Map<string, number>;
  },
): AdminPsychologistsListItem => {
  const plan = pickCurrentPlan(profile, params.date);
  const ranking = params.rankingById.get(profile.user.id);
  const status = mapStatus(profile, params.date);

  return {
    accepts_insurance: profile.accepts_insurance,
    avatar: profile.user.avatar,
    city: profile.professional_address_city,
    created_at: profile.user.createdAt,
    crp: profile.crp,
    detail_url: `/psicologos/${profile.user.id}`,
    discount_first_session: profile.discount_first_session,
    experience_years: crpExperienceYears(profile.crp_registration_date),
    favorites_count: params.favoriteCounts.get(profile.user.id) ?? 0,
    gender: profile.gender,
    id: profile.user.id,
    name: normalizeName(profile.user.name),
    plan_name: plan?.plan.name ?? null,
    plan_slug: plan?.plan.slug ?? null,
    public_profile_url: `/psychologists/${profile.user.id}`,
    published: profile.published,
    ranking_position: ranking?.position ?? null,
    ranking_score: ranking?.score ?? null,
    rating_avg: ratingAverage(profile.rating_avg),
    rating_count: profile.rating_count,
    social_value: profile.social_value,
    state: profile.professional_address_state,
    status,
    verified: status === "verified",
    whatsapp_clicks_count: params.whatsappCounts.get(profile.user.id) ?? 0,
  };
};

const sortItems = (items: AdminPsychologistsListItem[], sort: AdminPsychologistsListSort) => {
  const sorted = [...items];

  return sorted.sort((left, right) => {
    if (sort === "relevance") {
      const leftRanked = left.ranking_position !== null;
      const rightRanked = right.ranking_position !== null;
      if (leftRanked !== rightRanked) return Number(rightRanked) - Number(leftRanked);
      if (left.ranking_position !== null && right.ranking_position !== null) {
        return left.ranking_position - right.ranking_position;
      }
    }

    if (sort === "rating") {
      if (right.rating_avg !== left.rating_avg) return right.rating_avg - left.rating_avg;
      if (right.rating_count !== left.rating_count) return right.rating_count - left.rating_count;
    }

    if (sort === "favorites" && right.favorites_count !== left.favorites_count) {
      return right.favorites_count - left.favorites_count;
    }

    if (sort === "whatsapp" && right.whatsapp_clicks_count !== left.whatsapp_clicks_count) {
      return right.whatsapp_clicks_count - left.whatsapp_clicks_count;
    }

    if (sort === "recent" && right.created_at.getTime() !== left.created_at.getTime()) {
      return right.created_at.getTime() - left.created_at.getTime();
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
};

const addOptionCount = (
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

const optionsFromMap = (map: Map<string, { count: number; label: string }>) =>
  [...map.entries()]
    .map(
      ([id, item]): AdminPsychologistsListOption => ({
        count: item.count,
        id,
        label: item.label,
      }),
    )
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

const buildFilters = (
  profiles: AdminPsychologistListProfileRecord[],
  date: Date,
): AdminPsychologistsListFilters => {
  const approaches = new Map<string, { count: number; label: string }>();
  const cities = new Map<string, { count: number; label: string }>();
  const experienceRanges = new Map<string, { count: number; label: string }>();
  const genders = new Map<string, { count: number; label: string }>();
  const languages = new Map<string, { count: number; label: string }>();
  const modalities = new Map<string, { count: number; label: string }>();
  const plans = new Map<string, { count: number; label: string }>();
  const services = new Map<string, { count: number; label: string }>();
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
  }

  return {
    approaches: optionsFromMap(approaches),
    cities: optionsFromMap(cities),
    experience_ranges: optionsFromMap(experienceRanges),
    genders: optionsFromMap(genders),
    languages: optionsFromMap(languages),
    modalities: optionsFromMap(modalities),
    plans: optionsFromMap(plans),
    services: optionsFromMap(services),
    states: optionsFromMap(states),
    statuses: optionsFromMap(statuses),
    target_audience: optionsFromMap(targetAudience),
  };
};

const activeFiltersCount = (query: AdminPsychologistsListQuery) =>
  [
    query.q,
    query.state,
    query.city,
    query.status,
    query.plan,
    query.experience,
    query.discount_first_session,
    query.accepts_insurance,
    query.social_value,
    query.target_audience,
    query.approach,
    query.service,
    query.modality,
    query.language,
    query.gender,
  ].filter((value) => value !== undefined && value !== null && value !== "").length;

export const listAdminPsychologists = async (
  query: AdminPsychologistsListQuery,
): Promise<Resolve> => {
  if (
    (query.status && !STATUSES.has(query.status)) ||
    (query.experience && !EXPERIENCES.has(query.experience)) ||
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

  const [profiles, rankingCandidates] = await Promise.all([
    repository.listPsychologistProfiles(),
    repository.listPublicRankingCandidates(),
  ]);

  const ids = profiles.map((profile) => profile.user.id);
  const [favoriteGroups, whatsappGroups, ranked] = await Promise.all([
    repository.listFavoriteCounts(ids),
    repository.listWhatsappClickCounts(ids),
    rankPsychologistCandidates(rankingCandidates, null),
  ]);

  const favoriteCounts = mapCountGroups(favoriteGroups);
  const whatsappCounts = mapCountGroups(whatsappGroups);
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
        date: now,
        favoriteCounts,
        rankingById,
        whatsappCounts,
      }),
    );
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
      filters: buildFilters(profiles, now),
      page: responsePage,
      pages,
      per_page: pagination.limit,
      sort,
      source: "user+psychologist_profile+professional_subscription+public_ranking" as const,
    },
  };
};

export default async (data: IAdminPsychologistsListDTO): Promise<Resolve> => {
  return listAdminPsychologists(data.q ?? {});
};

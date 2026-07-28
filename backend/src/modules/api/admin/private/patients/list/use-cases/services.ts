import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { diagnoseAdminCommunityEngagement } from "@/utils/admin-community-engagement-diagnosis";
import type {
  AdminPatientsListEngagementId,
  AdminPatientsListFilters,
  AdminPatientsListIntentId,
  AdminPatientsListItem,
  AdminPatientsListOption,
  AdminPatientsListProvider,
  AdminPatientsListQuery,
  AdminPatientsListSort,
  AdminPatientsListStatus,
  IAdminPatientsListDTO,
} from "../DTOs/IAdminPatientsListDTO";
import {
  type AdminPatientListRecord,
  AdminPatientsListRepository,
} from "../repositories/AdminPatientsListRepository";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const MS_PER_DAY = 86_400_000;

type PatientsListIntentSignals = Awaited<
  ReturnType<AdminPatientsListRepository["listIntentSignals"]>
>;

type PatientsListCommunityEngagementSignals = Awaited<
  ReturnType<AdminPatientsListRepository["listCommunityEngagementEvents"]>
>;

type PatientsListIntentCounts = {
  favorites: number;
  profile_views: number;
  repeated_profile_views: number;
  whatsapp_clicks: number;
};

type PatientsListCommunityEngagementCounts = {
  interactions: number;
  normalizedInteractions: number;
  posts: number;
  replies: number;
  saves: number;
  votes: number;
};

type PatientsListClassifications = {
  engagementByPatientId: Map<string, AdminPatientsListEngagementId>;
  intentByPatientId: Map<string, AdminPatientsListIntentId>;
};

const SORTS = new Set<AdminPatientsListSort>(["recent", "name"]);
const STATUSES = new Set<AdminPatientsListStatus>(["active", "inactive"]);
const PROVIDERS = new Set<AdminPatientsListProvider>(["email_password", "google"]);

const GENDER_LABELS: Record<string, string> = {
  female: "Feminino",
  feminina: "Feminino",
  feminino: "Feminino",
  homem: "Masculino",
  male: "Masculino",
  masculina: "Masculino",
  masculino: "Masculino",
  mulher: "Feminino",
  nao_binario: "Outro",
  nao_informado: "Não informado",
  não_binário: "Outro",
  outro: "Outro",
  other: "Outro",
};

const PROVIDER_LABELS: Record<AdminPatientsListProvider, string> = {
  email_password: "E-mail e senha",
  google: "Google",
};

const STATUS_LABELS: Record<AdminPatientsListStatus, AdminPatientsListItem["status_label"]> = {
  active: "Ativo",
  inactive: "Inativo",
};
const PATIENT_LIST_SOURCE =
  "user+patient_profile+visitor_location+profile_view_event+psychologist_favorite+contact_request+community_post+post_reply+post_vote+post_save+post_reply_save" as const;
const PATIENT_LIST_COMMUNITY_ENGAGEMENT_SOURCE =
  "community_post+post_reply+post_vote+post_save+post_reply_save" as const;
const PATIENT_INTENT_SCORE_WEIGHTS = {
  favorites: 20,
  profile_views: 3,
  repeated_profile_views: 5,
  whatsapp_clicks: 45,
} as const satisfies Record<keyof PatientsListIntentCounts, number>;
const PATIENT_INTENT_SCORE_CAPS = {
  favorites: 40,
  profile_views: 30,
  repeated_profile_views: 20,
  whatsapp_clicks: 90,
} as const satisfies Record<keyof PatientsListIntentCounts, number>;
const PATIENT_INTENT_LABELS = {
  cold: "Frio",
  curious: "Curioso",
  objective: "Interessado",
  very_qualified: "Qualificado",
} as const satisfies Record<AdminPatientsListIntentId, AdminPatientsListItem["intent"]["label"]>;
const PATIENT_ENGAGEMENT_LABELS = {
  engaged: "Engajado",
  low_engagement: "Pouco engajado",
  no_engagement: "Sem engajamento",
  very_engaged: "Muito engajado",
} as const satisfies Record<
  AdminPatientsListEngagementId,
  AdminPatientsListItem["engagement"]["label"]
>;

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

const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Paciente";

const normalizeGender = (value?: string | null) => {
  const key = normalizeKey(value || "nao_informado");

  return {
    id: key || "nao_informado",
    label: GENDER_LABELS[key] ?? value?.trim() ?? "Não informado",
  };
};

const providerFromRaw = (provider?: string | null): AdminPatientsListProvider =>
  (provider ?? "").trim().toLowerCase() === "google" ? "google" : "email_password";

const normalizePagination = (query: AdminPatientsListQuery) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    limit,
    page,
    skip: (page - 1) * limit,
  };
};

const normalizeSort = (value?: string): AdminPatientsListSort => {
  if (value && SORTS.has(value as AdminPatientsListSort)) return value as AdminPatientsListSort;

  return "recent";
};

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

const patientActiveDaysUntil = (patientCreatedAt: Date, date: Date) => {
  const createdAt = startOfDate(patientCreatedAt);
  const until = startOfDate(date);

  if (createdAt > until) return 0;

  return daysBetweenInclusive(createdAt, until);
};

const normalizeCountToThirtyDays = (count: number, activeDays: number) => {
  if (activeDays <= 0) return 0;

  return Math.round((count / activeDays) * 30 * 10) / 10;
};

const statusFromPatient = (patient: AdminPatientListRecord): AdminPatientsListStatus =>
  patient.active ? "active" : "inactive";

const createIntentCounts = (): PatientsListIntentCounts => ({
  favorites: 0,
  profile_views: 0,
  repeated_profile_views: 0,
  whatsapp_clicks: 0,
});

const scoreContribution = (metricId: keyof PatientsListIntentCounts, value: number) =>
  Math.min(
    PATIENT_INTENT_SCORE_CAPS[metricId],
    Math.max(0, value) * PATIENT_INTENT_SCORE_WEIGHTS[metricId],
  );

const patientIntentScore = (counts: PatientsListIntentCounts) =>
  Math.min(
    100,
    Math.round(
      scoreContribution("profile_views", counts.profile_views) +
        scoreContribution("repeated_profile_views", counts.repeated_profile_views) +
        scoreContribution("favorites", counts.favorites) +
        scoreContribution("whatsapp_clicks", counts.whatsapp_clicks),
    ),
  );

const classifyPatientIntent = (counts: PatientsListIntentCounts): AdminPatientsListIntentId => {
  const score = patientIntentScore(counts);

  if (counts.whatsapp_clicks > 0 || score >= 45) return "very_qualified";
  if (counts.favorites > 0 || score >= 20) return "objective";
  if (counts.profile_views > 0 || counts.repeated_profile_views > 0 || score > 0) {
    return "curious";
  }

  return "cold";
};

const getIntentCountsForPatient = (
  countsByPatient: Map<string, PatientsListIntentCounts>,
  patientId: string,
) => {
  const current = countsByPatient.get(patientId);
  if (current) return current;

  const next = createIntentCounts();
  countsByPatient.set(patientId, next);
  return next;
};

const createCommunityEngagementCounts = (): PatientsListCommunityEngagementCounts => ({
  interactions: 0,
  normalizedInteractions: 0,
  posts: 0,
  replies: 0,
  saves: 0,
  votes: 0,
});

const getCommunityEngagementCountsForPatient = (
  countsByPatient: Map<string, PatientsListCommunityEngagementCounts>,
  patientId: string,
) => {
  const current = countsByPatient.get(patientId);
  if (current) return current;

  const next = createCommunityEngagementCounts();
  countsByPatient.set(patientId, next);
  return next;
};

const classifyPatientCommunityEngagement = (
  counts: PatientsListCommunityEngagementCounts,
): AdminPatientsListEngagementId => {
  if (counts.interactions <= 0) return "no_engagement";

  const diagnosis = diagnoseAdminCommunityEngagement({
    interactions: counts.normalizedInteractions,
    source: PATIENT_LIST_COMMUNITY_ENGAGEMENT_SOURCE,
  });

  if (diagnosis.id === "muito_ativo") return "very_engaged";
  if (diagnosis.id === "ativo") return "engaged";

  return "low_engagement";
};

const buildPatientListClassifications = (
  patients: Pick<AdminPatientsListItem, "created_at" | "id">[],
  params: {
    communityEngagementSignals: PatientsListCommunityEngagementSignals;
    intentSignals: PatientsListIntentSignals;
  },
): PatientsListClassifications => {
  const patientIds = patients.map((patient) => patient.id);
  const patientIdSet = new Set(patientIds);
  const countsByPatient = new Map<string, PatientsListIntentCounts>();
  const communityEngagementCountsByPatient = new Map<
    string,
    PatientsListCommunityEngagementCounts
  >();
  const profilePsychologistsByPatient = new Map<string, Set<string>>();
  const intentByPatientId = new Map<string, AdminPatientsListIntentId>();
  const engagementByPatientId = new Map<string, AdminPatientsListEngagementId>();

  for (const view of params.intentSignals.profileViews) {
    if (!view.viewer_id || !patientIdSet.has(view.viewer_id)) continue;

    const counts = getIntentCountsForPatient(countsByPatient, view.viewer_id);
    counts.profile_views += 1;

    if (!profilePsychologistsByPatient.has(view.viewer_id)) {
      profilePsychologistsByPatient.set(view.viewer_id, new Set());
    }
    profilePsychologistsByPatient.get(view.viewer_id)?.add(view.psychologist_id);
  }

  for (const [patientId, psychologists] of profilePsychologistsByPatient.entries()) {
    const counts = getIntentCountsForPatient(countsByPatient, patientId);
    counts.repeated_profile_views = Math.max(0, counts.profile_views - psychologists.size);
  }

  for (const favorite of params.intentSignals.favorites) {
    if (!patientIdSet.has(favorite.user_id)) continue;

    getIntentCountsForPatient(countsByPatient, favorite.user_id).favorites += 1;
  }

  for (const click of params.intentSignals.whatsappClicks) {
    if (!click.user_id || !patientIdSet.has(click.user_id)) continue;

    getIntentCountsForPatient(countsByPatient, click.user_id).whatsapp_clicks += 1;
  }

  for (const event of params.communityEngagementSignals) {
    if (!patientIdSet.has(event.patient_id)) continue;

    const counts = getCommunityEngagementCountsForPatient(
      communityEngagementCountsByPatient,
      event.patient_id,
    );
    counts.interactions += 1;

    if (event.type === "post") counts.posts += 1;
    else if (event.type === "reply") counts.replies += 1;
    else if (event.type === "vote") counts.votes += 1;
    else counts.saves += 1;
  }

  const today = new Date();
  for (const patient of patients) {
    const intentCounts = countsByPatient.get(patient.id) ?? createIntentCounts();
    intentByPatientId.set(patient.id, classifyPatientIntent(intentCounts));

    const engagementCounts =
      communityEngagementCountsByPatient.get(patient.id) ?? createCommunityEngagementCounts();
    engagementCounts.normalizedInteractions = normalizeCountToThirtyDays(
      engagementCounts.interactions,
      patientActiveDaysUntil(patient.created_at, today),
    );
    engagementByPatientId.set(patient.id, classifyPatientCommunityEngagement(engagementCounts));
  }

  return {
    engagementByPatientId,
    intentByPatientId,
  };
};

const matchesSearch = (patient: AdminPatientListRecord, search?: string) => {
  const normalized = normalizeSearchText(search).trim();
  if (!normalized) return true;

  const haystack = [patient.name, patient.email, patient.id].map(normalizeSearchText).join(" ");

  return haystack.includes(normalized);
};

const matchesFilters = (patient: AdminPatientListRecord, query: AdminPatientsListQuery) => {
  const gender = normalizeGender(patient.patient_profile?.gender).id;
  const provider = providerFromRaw(patient.provider);
  const status = statusFromPatient(patient);

  return (
    matchesSearch(patient, query.q) &&
    (!query.status || query.status === status) &&
    (!query.provider || query.provider === provider) &&
    (!query.gender || normalizeKey(query.gender) === gender)
  );
};

const mapPatient = (patient: AdminPatientListRecord): AdminPatientsListItem => {
  const latestLocation = patient.visitor_locations[0] ?? null;
  const provider = providerFromRaw(patient.provider);
  const status = statusFromPatient(patient);
  const gender = normalizeGender(patient.patient_profile?.gender);

  return {
    avatar: patient.avatar,
    city: latestLocation?.city ?? null,
    country: latestLocation?.country ?? null,
    created_at: patient.createdAt,
    detail_url: `/pacientes/${patient.id}`,
    email: patient.email,
    engagement: {
      id: "no_engagement",
      label: PATIENT_ENGAGEMENT_LABELS.no_engagement,
    },
    gender: patient.patient_profile?.gender ?? null,
    gender_label: gender.label,
    id: patient.id,
    intent: {
      id: "cold",
      label: PATIENT_INTENT_LABELS.cold,
    },
    last_location_at: latestLocation?.createdAt ?? null,
    name: normalizeName(patient.name),
    onboarding_completed_at: patient.patient_profile?.onboarding_completed_at ?? null,
    provider: patient.provider,
    provider_label: PROVIDER_LABELS[provider],
    state: latestLocation?.state ?? null,
    status,
    status_label: STATUS_LABELS[status],
  };
};

const sortItems = (items: AdminPatientsListItem[], sort: AdminPatientsListSort) => {
  const sorted = [...items];

  return sorted.sort((left, right) => {
    if (sort === "recent" && right.created_at.getTime() !== left.created_at.getTime()) {
      return right.created_at.getTime() - left.created_at.getTime();
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
};

const enrichPatientIntentAndEngagement = (
  item: AdminPatientsListItem,
  classifications: PatientsListClassifications,
): AdminPatientsListItem => {
  const intentId = classifications.intentByPatientId.get(item.id) ?? "cold";
  const engagementId = classifications.engagementByPatientId.get(item.id) ?? "no_engagement";

  return {
    ...item,
    engagement: {
      id: engagementId,
      label: PATIENT_ENGAGEMENT_LABELS[engagementId],
    },
    intent: {
      id: intentId,
      label: PATIENT_INTENT_LABELS[intentId],
    },
  };
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
      ([id, item]): AdminPatientsListOption => ({
        count: item.count,
        id,
        label: item.label,
      }),
    )
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

const buildFilters = (patients: AdminPatientListRecord[]): AdminPatientsListFilters => {
  const genders = new Map<string, { count: number; label: string }>();
  const providers = new Map<string, { count: number; label: string }>();
  const statuses = new Map<string, { count: number; label: string }>();

  for (const patient of patients) {
    const gender = normalizeGender(patient.patient_profile?.gender);
    const provider = providerFromRaw(patient.provider);
    const status = statusFromPatient(patient);

    addOptionCount(genders, gender.id, gender.label);
    addOptionCount(providers, provider, PROVIDER_LABELS[provider]);
    addOptionCount(statuses, status, STATUS_LABELS[status]);
  }

  return {
    genders: optionsFromMap(genders),
    providers: optionsFromMap(providers),
    statuses: optionsFromMap(statuses),
  };
};

const activeFiltersCount = (query: AdminPatientsListQuery) =>
  [query.q, query.status, query.provider, query.gender].filter(
    (value) => value !== undefined && value !== null && value !== "",
  ).length;

export const listAdminPatients = async (query: AdminPatientsListQuery): Promise<Resolve> => {
  if (
    (query.sort && !SORTS.has(query.sort)) ||
    (query.status && !STATUSES.has(query.status)) ||
    (query.provider && !PROVIDERS.has(query.provider))
  ) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  const repository = new AdminPatientsListRepository();
  const sort = normalizeSort(query.sort);
  const pagination = normalizePagination(query);
  const patients = await repository.listPatients();
  const filteredPatients = patients.filter((patient) => matchesFilters(patient, query));
  const sortedItems = sortItems(filteredPatients.map(mapPatient), sort);
  const count = sortedItems.length;
  const pages = Math.max(1, Math.ceil(count / pagination.limit));
  const responsePage = Math.min(pagination.page, pages);
  const responseSkip = (responsePage - 1) * pagination.limit;
  const pageData = sortedItems.slice(responseSkip, responseSkip + pagination.limit);
  const patientIds = pageData.map((patient) => patient.id);
  const [intentSignals, communityEngagementSignals] = await Promise.all([
    repository.listIntentSignals(patientIds),
    repository.listCommunityEngagementEvents(patientIds),
  ]);
  const classifications = buildPatientListClassifications(pageData, {
    communityEngagementSignals,
    intentSignals,
  });
  const data = pageData.map((patient) =>
    enrichPatientIntentAndEngagement(patient, classifications),
  );

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      active_filters_count: activeFiltersCount(query),
      count,
      data,
      filters: buildFilters(patients),
      page: responsePage,
      pages,
      per_page: pagination.limit,
      sort,
      source: PATIENT_LIST_SOURCE,
    },
  };
};

export default async (data: IAdminPatientsListDTO): Promise<Resolve> => {
  return listAdminPatients(data.q ?? {});
};

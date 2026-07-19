import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPatientsListFilters,
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

const statusFromPatient = (patient: AdminPatientListRecord): AdminPatientsListStatus =>
  patient.active ? "active" : "inactive";

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
    gender: patient.patient_profile?.gender ?? null,
    gender_label: gender.label,
    id: patient.id,
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
  const data = sortedItems.slice(responseSkip, responseSkip + pagination.limit);

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
      source: "user+patient_profile+visitor_location" as const,
    },
  };
};

export default async (data: IAdminPatientsListDTO): Promise<Resolve> => {
  return listAdminPatients(data.q ?? {});
};

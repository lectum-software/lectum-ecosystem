import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { IAdminPsychologistDetailDTO } from "../../detail/DTOs/IAdminPsychologistDetailDTO";
import { showAdminPsychologist } from "../../detail/use-cases/services";
import type {
  AdminPsychologistPersonalDataInput,
  AdminPsychologistProfessionalDataInput,
  IAdminPsychologistUpdatePersonalDataDTO,
  IAdminPsychologistUpdateProfessionalDataDTO,
} from "../DTOs/IAdminPsychologistProfileEditDTO";
import {
  type AdminPsychologistPersonalProfileUpdate,
  type AdminPsychologistProfessionalProfileUpdate,
  type AdminPsychologistProfileEditAudit,
  type AdminPsychologistProfileEditCatalog,
  type AdminPsychologistProfileEditCatalogOption,
  type AdminPsychologistProfileEditRecord,
  AdminPsychologistProfileEditRepository,
} from "../repositories/AdminPsychologistProfileEditRepository";

const APPROVED_REGISTRY_STATUS = "aprovado";
const ADMIN_SOURCE = "admin_panel";

const PERSONAL_FIELD_LABELS: Record<string, string> = {
  address: "Endereço",
  address_city: "Cidade",
  address_complement: "Complemento",
  address_district: "Bairro",
  address_number: "Número",
  address_state: "UF",
  address_street: "Logradouro",
  address_zip: "CEP",
  birthdate: "Data de nascimento",
  cpf: "CPF",
  gender: "Gênero",
  race_color: "Raça/cor",
  religion: "Religião",
  whatsapp: "WhatsApp",
};

const PROFESSIONAL_FIELD_LABELS: Record<string, string> = {
  approach_ids: "Abordagens",
  languages: "Idiomas",
  modality: "Formato de atendimento",
  service_ids: "Serviços",
  specialty_ids: "Especialidades",
  target_audience: "Público atendido",
};

const trimToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const normalizeCpf = (value?: string | null) => {
  const digits = onlyDigits(value);
  return digits || null;
};

const normalizeWhatsapp = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (!digits) return null;
  return `+${digits.slice(0, 15)}`;
};

const normalizeList = (value?: string[]) => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
};

const jsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return normalizeList(value.map((item) => String(item)));
};

const dateKey = (date?: Date | null) => {
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeBirthdate = (value?: string | null) => {
  const rawValue = value?.trim();
  if (!rawValue) return null;

  const dateOnly = rawValue.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) return null;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayTime = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const minimumBirthdateTime = Date.UTC(1900, 0, 1);

  if (time > todayTime || time < minimumBirthdateTime) return null;

  return parsed;
};

const calcCpfDigit = (base: string, factor: number) => {
  const sum = base
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
};

const isValidCpf = (value?: string | null) => {
  const cpf = normalizeCpf(value);
  if (!cpf) return true;
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  return (
    calcCpfDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    calcCpfDigit(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
};

const maskCpf = (value?: string | null) => {
  const digits = normalizeCpf(value);
  if (!digits) return null;
  if (digits.length !== 11) return "CPF informado";

  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
};

const maskPhone = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (!digits) return null;
  if (digits.length <= 4) return "Telefone informado";

  return `***${digits.slice(-4)}`;
};

const safeText = (value?: string | null) => trimToNull(value) ?? null;

const compareDates = (left?: Date | null, right?: Date | null) => dateKey(left) === dateKey(right);

const arraysEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  return sortedLeft.every((item, index) => item === sortedRight[index]);
};

const valueOrCurrent = <T>(payload: Record<string, unknown>, key: string, current: T, next: T) =>
  Object.hasOwn(payload, key) ? next : current;

const normalizeState = (value?: string | null) => trimToNull(value)?.toUpperCase() ?? null;

const safeAddressStatus = (fields: Array<string | null | undefined>) =>
  fields.some((field) => Boolean(trimToNull(field))) ? "Endereço informado" : null;

const formatSafePersonalValue = (
  key: string,
  value: string | Date | null | undefined,
): string | null => {
  if (key === "cpf") return maskCpf(value as string | null | undefined);
  if (key === "whatsapp") return maskPhone(value as string | null | undefined);
  if (key === "birthdate")
    return value instanceof Date ? dateKey(value) : safeText(value as string);

  return safeText(value as string | null | undefined);
};

const profileNotFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist_profile" }),
});

const adminRequired = () => ({
  status: 403,
  ...error("role_not_authorized", {}),
});

const detailResponse = async (id: string, messageKey: string): Promise<Resolve> => {
  const detail = await showAdminPsychologist({ p: { id } } as IAdminPsychologistDetailDTO);

  return {
    status: detail.status ?? 200,
    ...msg(messageKey, {}),
    data: detail.data,
  };
};

const addSafeDiff = ({
  after,
  before,
  changedFields,
  key,
  next,
  previous,
}: {
  after: Record<string, string | null>;
  before: Record<string, string | null>;
  changedFields: string[];
  key: string;
  next: string | Date | null | undefined;
  previous: string | Date | null | undefined;
}) => {
  const label = PERSONAL_FIELD_LABELS[key] ?? PROFESSIONAL_FIELD_LABELS[key] ?? key;
  changedFields.push(label);
  before[label] = formatSafePersonalValue(key, previous);
  after[label] = formatSafePersonalValue(key, next);
};

const buildPersonalPlan = (
  profile: AdminPsychologistProfileEditRecord,
  input: AdminPsychologistPersonalDataInput,
) => {
  const current = {
    address_city: trimToNull(profile.professional_address_city),
    address_complement: trimToNull(profile.professional_address_complement),
    address_district: trimToNull(profile.professional_address_district),
    address_number: trimToNull(profile.professional_address_number),
    address_state: normalizeState(profile.professional_address_state),
    address_street: trimToNull(profile.professional_address_street),
    address_zip: trimToNull(profile.professional_address_zip),
    birthdate: profile.birthdate,
    cpf: normalizeCpf(profile.cpf),
    gender: trimToNull(profile.gender),
    race_color: trimToNull(profile.race_color),
    religion: trimToNull(profile.religion),
    whatsapp: normalizeWhatsapp(profile.whatsapp),
  };

  const next = {
    address_city: valueOrCurrent(
      input,
      "address_city",
      current.address_city,
      trimToNull(input.address_city),
    ),
    address_complement: valueOrCurrent(
      input,
      "address_complement",
      current.address_complement,
      trimToNull(input.address_complement),
    ),
    address_district: valueOrCurrent(
      input,
      "address_district",
      current.address_district,
      trimToNull(input.address_district),
    ),
    address_number: valueOrCurrent(
      input,
      "address_number",
      current.address_number,
      trimToNull(input.address_number),
    ),
    address_state: valueOrCurrent(
      input,
      "address_state",
      current.address_state,
      normalizeState(input.address_state),
    ),
    address_street: valueOrCurrent(
      input,
      "address_street",
      current.address_street,
      trimToNull(input.address_street),
    ),
    address_zip: valueOrCurrent(
      input,
      "address_zip",
      current.address_zip,
      trimToNull(input.address_zip),
    ),
    birthdate: valueOrCurrent(
      input,
      "birthdate",
      current.birthdate,
      normalizeBirthdate(input.birthdate),
    ),
    cpf: valueOrCurrent(input, "cpf", current.cpf, normalizeCpf(input.cpf)),
    gender: valueOrCurrent(input, "gender", current.gender, trimToNull(input.gender)),
    race_color: valueOrCurrent(
      input,
      "race_color",
      current.race_color,
      trimToNull(input.race_color),
    ),
    religion: valueOrCurrent(input, "religion", current.religion, trimToNull(input.religion)),
    whatsapp: valueOrCurrent(
      input,
      "whatsapp",
      current.whatsapp,
      normalizeWhatsapp(input.whatsapp),
    ),
  };

  return { current, next };
};

const buildPersonalAudit = ({
  adminId,
  changedFieldKeys,
  input,
  next,
  previous,
  profile,
}: {
  adminId: string;
  changedFieldKeys: string[];
  input: AdminPsychologistPersonalDataInput;
  next: ReturnType<typeof buildPersonalPlan>["next"];
  previous: ReturnType<typeof buildPersonalPlan>["current"];
  profile: AdminPsychologistProfileEditRecord;
}): AdminPsychologistProfileEditAudit | null => {
  if (changedFieldKeys.length === 0) return null;

  const changedFields: string[] = [];
  const safeBefore: Record<string, string | null> = {};
  const safeAfter: Record<string, string | null> = {};
  const addressFieldKeys = changedFieldKeys.filter((key) => key.startsWith("address_"));

  for (const key of changedFieldKeys.filter((item) => !item.startsWith("address_"))) {
    addSafeDiff({
      after: safeAfter,
      before: safeBefore,
      changedFields,
      key,
      next: next[key as keyof typeof next] as string | Date | null,
      previous: previous[key as keyof typeof previous] as string | Date | null,
    });
  }

  if (addressFieldKeys.length > 0) {
    changedFields.push(PERSONAL_FIELD_LABELS.address);
    safeBefore[PERSONAL_FIELD_LABELS.address] = safeAddressStatus([
      previous.address_street,
      previous.address_number,
      previous.address_complement,
      previous.address_district,
      previous.address_zip,
      previous.address_city,
      previous.address_state,
    ]);
    safeAfter[PERSONAL_FIELD_LABELS.address] = safeAddressStatus([
      next.address_street,
      next.address_number,
      next.address_complement,
      next.address_district,
      next.address_zip,
      next.address_city,
      next.address_state,
    ]);
  }

  return {
    action: "psychologist_personal_data_updated",
    adminId,
    changedFields,
    metadata: {
      address_field_keys: addressFieldKeys,
      changed_field_keys: changedFieldKeys,
      cpf_change_confirmed:
        previous.cpf !== next.cpf && profile.crp_status === APPROVED_REGISTRY_STATUS
          ? Boolean(input.confirm_cpf_change)
          : false,
      profile_id: profile.id,
      source: ADMIN_SOURCE,
    },
    reason: trimToNull(input.reason),
    safeAfter: safeAfter as Prisma.InputJsonObject,
    safeBefore: safeBefore as Prisma.InputJsonObject,
    targetId: profile.user_id,
  };
};

const currentRelationIds = (profile: AdminPsychologistProfileEditRecord) => ({
  approach_ids: normalizeList(profile.user.psychologist_approaches.map((item) => item.approach_id)),
  service_ids: normalizeList(profile.user.psychologist_services.map((item) => item.service_id)),
  specialty_ids: normalizeList(
    profile.user.psychologist_specialties.map((item) => item.specialty_id),
  ),
});

const currentRelationNames = (profile: AdminPsychologistProfileEditRecord) => ({
  approach_ids: new Map(
    profile.user.psychologist_approaches.map((item) => [item.approach_id, item.approach.name]),
  ),
  service_ids: new Map(
    profile.user.psychologist_services.map((item) => [item.service_id, item.service.name]),
  ),
  specialty_ids: new Map(
    profile.user.psychologist_specialties.map((item) => [item.specialty_id, item.specialty.name]),
  ),
});

const assertCatalogSelection = (
  selected: string[],
  activeItems: AdminPsychologistProfileEditCatalog[],
  currentIds: string[],
  catalog: string,
) => {
  const valid = new Set([...activeItems.map((item) => item.id), ...currentIds]);
  const invalid = selected.filter((id) => !valid.has(id));

  return invalid.length > 0
    ? { status: 400, ...error("invalid_catalog_selection", { catalog }) }
    : null;
};

const canonicalizeOptions = ({
  currentValues,
  options,
  selected,
  storeAs,
}: {
  currentValues: string[];
  options: AdminPsychologistProfileEditCatalogOption[];
  selected: string[];
  storeAs: "name" | "slug";
}) => {
  const current = new Set(currentValues);
  const byAnyValue = new Map<string, AdminPsychologistProfileEditCatalogOption>();
  for (const option of options) {
    byAnyValue.set(option.id, option);
    byAnyValue.set(option.name, option);
    byAnyValue.set(option.slug, option);
  }

  const invalid: string[] = [];
  const canonical = selected.map((value) => {
    const option = byAnyValue.get(value);
    if (option) return storeAs === "slug" ? option.slug : option.name;
    if (current.has(value)) return value;
    invalid.push(value);
    return value;
  });

  return { canonical: normalizeList(canonical), invalid };
};

const labelsFromIds = (
  ids: string[],
  activeItems: AdminPsychologistProfileEditCatalog[],
  currentNames: Map<string, string>,
) => {
  const names = new Map(activeItems.map((item) => [item.id, item.name]));

  return ids.map((id) => names.get(id) ?? currentNames.get(id) ?? "Item indisponível");
};

const labelsFromOptions = (
  values: string[],
  options: AdminPsychologistProfileEditCatalogOption[],
) => {
  const names = new Map<string, string>();
  for (const option of options) {
    names.set(option.id, option.name);
    names.set(option.name, option.name);
    names.set(option.slug, option.name);
  }

  return values.map((value) => names.get(value) ?? value);
};

const modalityLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    hibrido: "Híbrido",
    online: "Online",
    presencial: "Presencial",
  };

  return value ? (labels[value] ?? value) : null;
};

const addProfessionalDiff = ({
  after,
  before,
  changedFields,
  key,
  next,
  previous,
}: {
  after: Record<string, string | null>;
  before: Record<string, string | null>;
  changedFields: string[];
  key: string;
  next: string[] | string | null;
  previous: string[] | string | null;
}) => {
  const label = PROFESSIONAL_FIELD_LABELS[key] ?? key;
  changedFields.push(label);
  before[label] = Array.isArray(previous) ? previous.join(", ") || null : previous;
  after[label] = Array.isArray(next) ? next.join(", ") || null : next;
};

const buildProfessionalAudit = ({
  activeApproaches,
  activeLanguages,
  activeServices,
  activeSpecialties,
  activeTargetAudience,
  adminId,
  changedFieldKeys,
  currentNames,
  input,
  next,
  previous,
  profile,
}: {
  activeApproaches: AdminPsychologistProfileEditCatalog[];
  activeLanguages: AdminPsychologistProfileEditCatalogOption[];
  activeServices: AdminPsychologistProfileEditCatalog[];
  activeSpecialties: AdminPsychologistProfileEditCatalog[];
  activeTargetAudience: AdminPsychologistProfileEditCatalogOption[];
  adminId: string;
  changedFieldKeys: string[];
  currentNames: ReturnType<typeof currentRelationNames>;
  input: AdminPsychologistProfessionalDataInput;
  next: {
    approach_ids: string[];
    languages: string[];
    modality: string | null;
    service_ids: string[];
    specialty_ids: string[];
    target_audience: string[];
  };
  previous: {
    approach_ids: string[];
    languages: string[];
    modality: string | null;
    service_ids: string[];
    specialty_ids: string[];
    target_audience: string[];
  };
  profile: AdminPsychologistProfileEditRecord;
}): AdminPsychologistProfileEditAudit | null => {
  if (changedFieldKeys.length === 0) return null;

  const changedFields: string[] = [];
  const safeBefore: Record<string, string | null> = {};
  const safeAfter: Record<string, string | null> = {};

  for (const key of changedFieldKeys) {
    if (key === "specialty_ids") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromIds(next.specialty_ids, activeSpecialties, currentNames.specialty_ids),
        previous: labelsFromIds(
          previous.specialty_ids,
          activeSpecialties,
          currentNames.specialty_ids,
        ),
      });
      continue;
    }

    if (key === "service_ids") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromIds(next.service_ids, activeServices, currentNames.service_ids),
        previous: labelsFromIds(previous.service_ids, activeServices, currentNames.service_ids),
      });
      continue;
    }

    if (key === "approach_ids") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromIds(next.approach_ids, activeApproaches, currentNames.approach_ids),
        previous: labelsFromIds(previous.approach_ids, activeApproaches, currentNames.approach_ids),
      });
      continue;
    }

    if (key === "languages") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromOptions(next.languages, activeLanguages),
        previous: labelsFromOptions(previous.languages, activeLanguages),
      });
      continue;
    }

    if (key === "target_audience") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromOptions(next.target_audience, activeTargetAudience),
        previous: labelsFromOptions(previous.target_audience, activeTargetAudience),
      });
      continue;
    }

    addProfessionalDiff({
      after: safeAfter,
      before: safeBefore,
      changedFields,
      key,
      next: modalityLabel(next.modality),
      previous: modalityLabel(previous.modality),
    });
  }

  return {
    action: "psychologist_professional_data_updated",
    adminId,
    changedFields,
    metadata: {
      changed_field_keys: changedFieldKeys,
      profile_id: profile.id,
      source: ADMIN_SOURCE,
    },
    reason: trimToNull(input.reason),
    safeAfter: safeAfter as Prisma.InputJsonObject,
    safeBefore: safeBefore as Prisma.InputJsonObject,
    targetId: profile.user_id,
  };
};

export const updateAdminPsychologistPersonalData = async (
  data: IAdminPsychologistUpdatePersonalDataDTO,
): Promise<Resolve> => {
  const adminId = trimToNull(data.admin?.id);
  if (!adminId) return adminRequired();

  const repository = new AdminPsychologistProfileEditRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return profileNotFound();

  const { current, next } = buildPersonalPlan(profile, data.b);

  if (Object.hasOwn(data.b, "cpf") && next.cpf && !isValidCpf(next.cpf)) {
    return { status: 400, ...error("invalid_cpf", {}) };
  }

  if (Object.hasOwn(data.b, "birthdate") && data.b.birthdate && !next.birthdate) {
    return { status: 400, ...error("invalid_birthdate", {}) };
  }

  const whatsappDigits = onlyDigits(next.whatsapp);
  if (next.whatsapp && (whatsappDigits.length < 8 || whatsappDigits.length > 15)) {
    return { status: 400, ...error("invalid_phone", {}) };
  }

  const changedFieldKeys: string[] = [];
  if (current.cpf !== next.cpf) changedFieldKeys.push("cpf");
  if (current.whatsapp !== next.whatsapp) changedFieldKeys.push("whatsapp");
  if (!compareDates(current.birthdate, next.birthdate)) changedFieldKeys.push("birthdate");
  if (current.gender !== next.gender) changedFieldKeys.push("gender");
  if (current.race_color !== next.race_color) changedFieldKeys.push("race_color");
  if (current.religion !== next.religion) changedFieldKeys.push("religion");
  for (const key of [
    "address_street",
    "address_number",
    "address_complement",
    "address_district",
    "address_zip",
    "address_city",
    "address_state",
  ] as const) {
    if (current[key] !== next[key]) changedFieldKeys.push(key);
  }

  if (
    current.cpf !== next.cpf &&
    profile.crp_status === APPROVED_REGISTRY_STATUS &&
    !data.b.confirm_cpf_change
  ) {
    return {
      status: 400,
      ...error("admin_psychologist_profile_cpf_change_confirmation_required", {}),
    };
  }

  if (changedFieldKeys.length === 0) {
    return detailResponse(profile.user_id, "admin_psychologist_profile_no_changes");
  }

  const audit = buildPersonalAudit({
    adminId,
    changedFieldKeys,
    input: data.b,
    next,
    previous: current,
    profile,
  });

  const profileUpdate: AdminPsychologistPersonalProfileUpdate = {
    birthdate: next.birthdate,
    cpf: next.cpf,
    gender: next.gender,
    professional_address_city: next.address_city,
    professional_address_complement: next.address_complement,
    professional_address_district: next.address_district,
    professional_address_number: next.address_number,
    professional_address_state: next.address_state,
    professional_address_street: next.address_street,
    professional_address_zip: next.address_zip,
    race_color: next.race_color,
    religion: next.religion,
    whatsapp: next.whatsapp,
  };

  await repository.updatePersonalData(profile.id, { audit, profile: profileUpdate });

  return detailResponse(profile.user_id, "admin_psychologist_profile_personal_updated");
};

export const updateAdminPsychologistProfessionalData = async (
  data: IAdminPsychologistUpdateProfessionalDataDTO,
): Promise<Resolve> => {
  const adminId = trimToNull(data.admin?.id);
  if (!adminId) return adminRequired();

  const repository = new AdminPsychologistProfileEditRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return profileNotFound();

  const currentIds = currentRelationIds(profile);
  const currentNames = currentRelationNames(profile);
  const previous = {
    approach_ids: currentIds.approach_ids,
    languages: jsonStringArray(profile.languages),
    modality: trimToNull(profile.modality),
    service_ids: currentIds.service_ids,
    specialty_ids: currentIds.specialty_ids,
    target_audience: jsonStringArray(profile.target_audience),
  };

  const selectedIds = {
    approach_ids: Object.hasOwn(data.b, "approach_ids")
      ? normalizeList(data.b.approach_ids)
      : previous.approach_ids,
    service_ids: Object.hasOwn(data.b, "service_ids")
      ? normalizeList(data.b.service_ids)
      : previous.service_ids,
    specialty_ids: Object.hasOwn(data.b, "specialty_ids")
      ? normalizeList(data.b.specialty_ids)
      : previous.specialty_ids,
  };
  const selectedLanguages = Object.hasOwn(data.b, "languages")
    ? normalizeList(data.b.languages)
    : previous.languages;
  const selectedTargetAudience = Object.hasOwn(data.b, "target_audience")
    ? normalizeList(data.b.target_audience)
    : previous.target_audience;
  const nextModality = Object.hasOwn(data.b, "modality")
    ? trimToNull(data.b.modality)
    : previous.modality;

  if (nextModality && !["online", "presencial", "hibrido"].includes(nextModality)) {
    return {
      status: 400,
      ...error("admin_psychologist_profile_invalid_modality", {}),
    };
  }

  const [
    activeSpecialties,
    activeServices,
    activeApproaches,
    activeLanguages,
    activeTargetAudience,
  ] = await Promise.all([
    repository.listActiveSpecialties(selectedIds.specialty_ids),
    repository.listActiveServices(selectedIds.service_ids),
    repository.listActiveApproaches(selectedIds.approach_ids),
    repository.listActiveProfileOptions("language", selectedLanguages),
    repository.listActiveProfileOptions("target_audience", selectedTargetAudience),
  ]);

  const specialtyError = assertCatalogSelection(
    selectedIds.specialty_ids,
    activeSpecialties,
    previous.specialty_ids,
    "specialty",
  );
  if (specialtyError) return specialtyError;

  const serviceError = assertCatalogSelection(
    selectedIds.service_ids,
    activeServices,
    previous.service_ids,
    "service",
  );
  if (serviceError) return serviceError;

  const approachError = assertCatalogSelection(
    selectedIds.approach_ids,
    activeApproaches,
    previous.approach_ids,
    "approach",
  );
  if (approachError) return approachError;

  const nextLanguages = canonicalizeOptions({
    currentValues: previous.languages,
    options: activeLanguages,
    selected: selectedLanguages,
    storeAs: "name",
  });
  if (nextLanguages.invalid.length > 0) {
    return { status: 400, ...error("invalid_catalog_selection", { catalog: "language" }) };
  }

  const nextTargetAudience = canonicalizeOptions({
    currentValues: previous.target_audience,
    options: activeTargetAudience,
    selected: selectedTargetAudience,
    storeAs: "slug",
  });
  if (nextTargetAudience.invalid.length > 0) {
    return { status: 400, ...error("invalid_catalog_selection", { catalog: "target_audience" }) };
  }

  const next = {
    approach_ids: selectedIds.approach_ids,
    languages: nextLanguages.canonical,
    modality: nextModality,
    service_ids: selectedIds.service_ids,
    specialty_ids: selectedIds.specialty_ids,
    target_audience: nextTargetAudience.canonical,
  };

  const changedFieldKeys: string[] = [];
  if (!arraysEqual(previous.specialty_ids, next.specialty_ids))
    changedFieldKeys.push("specialty_ids");
  if (!arraysEqual(previous.service_ids, next.service_ids)) changedFieldKeys.push("service_ids");
  if (!arraysEqual(previous.approach_ids, next.approach_ids)) changedFieldKeys.push("approach_ids");
  if (!arraysEqual(previous.languages, next.languages)) changedFieldKeys.push("languages");
  if (!arraysEqual(previous.target_audience, next.target_audience))
    changedFieldKeys.push("target_audience");
  if (previous.modality !== next.modality) changedFieldKeys.push("modality");

  if (changedFieldKeys.length === 0) {
    return detailResponse(profile.user_id, "admin_psychologist_profile_no_changes");
  }

  const audit = buildProfessionalAudit({
    activeApproaches,
    activeLanguages,
    activeServices,
    activeSpecialties,
    activeTargetAudience,
    adminId,
    changedFieldKeys,
    currentNames,
    input: data.b,
    next,
    previous,
    profile,
  });

  const profileUpdate: AdminPsychologistProfessionalProfileUpdate = {
    languages: next.languages as Prisma.InputJsonValue,
    modality: next.modality,
    target_audience: next.target_audience as Prisma.InputJsonValue,
  };

  await repository.updateProfessionalData(profile, {
    approachIds: next.approach_ids,
    audit,
    profile: profileUpdate,
    serviceIds: next.service_ids,
    specialtyIds: next.specialty_ids,
  });

  return detailResponse(profile.user_id, "admin_psychologist_profile_professional_updated");
};

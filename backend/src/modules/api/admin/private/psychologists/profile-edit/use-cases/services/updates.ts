import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error } from "@/helpers/translate";
import type {
  IAdminPsychologistUpdatePersonalDataDTO,
  IAdminPsychologistUpdateProfessionalDataDTO,
} from "../../DTOs/IAdminPsychologistProfileEditDTO";
import {
  type AdminPsychologistPersonalProfileUpdate,
  type AdminPsychologistProfessionalProfileUpdate,
  AdminPsychologistProfileEditRepository,
} from "../../repositories/AdminPsychologistProfileEditRepository";

import {
  APPROVED_REGISTRY_STATUS,
  adminRequired,
  arraysEqual,
  buildPersonalAudit,
  buildPersonalPlan,
  compareDates,
  detailResponse,
  isValidCpf,
  jsonStringArray,
  normalizeList,
  onlyDigits,
  profileNotFound,
  trimToNull,
} from "./personal";

import {
  assertCatalogSelection,
  buildProfessionalAudit,
  canonicalizeOptions,
  currentRelationIds,
  currentRelationNames,
} from "./professional";

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

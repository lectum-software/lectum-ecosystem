import { error, msg } from "@/helpers/translate";
import {
  buildProfessionalFullDisplayName,
  normalizeProfessionalNamePart,
} from "@/utils/professional-name";
import type {
  FreeProfessionalProfileUpdateBody,
  IFreeProfessionalProfileShowDTO,
  IFreeProfessionalProfileUpdateDTO,
} from "../../DTOs/IFreeProfileDTO";
import { FreeProfileRepository } from "../../repositories/FreeProfileRepository";

import {
  assertCatalogIds,
  hasAcademicContent,
  hasLockedProfessionalIdentityFields,
  hasRequiredPublishingFields,
  normalizeAcademic,
  normalizeAcademicFormations,
  normalizeAddress,
  normalizeBirthdate,
  normalizeCpf,
  normalizeList,
  normalizeWhatsapp,
  onlyDigits,
  paidRegistryVerificationRequired,
  requiresPaidRegistryVerification,
  trimToNull,
  updateSchema,
} from "./profile-validation";

export const show = async (data: IFreeProfessionalProfileShowDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const profile = await repository.show(data.auth.id!);

  if (!profile) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(profile)) {
    return paidRegistryVerificationRequired();
  }

  return {
    status: 200,
    ...msg("show", {}),
    data: profile,
  };
};

export const update = async (data: IFreeProfessionalProfileUpdateDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const parsed = updateSchema.safeParse(data.b || {});

  if (!parsed.success) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
      data: parsed.error.flatten(),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return paidRegistryVerificationRequired();
  }

  const lockIdentityFields = hasLockedProfessionalIdentityFields(current);
  const cpf = lockIdentityFields
    ? normalizeCpf(current.profile.cpf)
    : normalizeCpf(parsed.data.cpf);
  if (cpf?.length !== 11) {
    return {
      status: 400,
      ...error("invalid_cpf", {}),
    };
  }

  const birthdate = normalizeBirthdate(
    typeof parsed.data.birthdate === "string" ? parsed.data.birthdate : null,
  );
  if (!birthdate) {
    return {
      status: 400,
      ...error("invalid_birthdate", {}),
    };
  }

  const whatsapp = normalizeWhatsapp(parsed.data.whatsapp);
  const whatsappDigits = onlyDigits(whatsapp);
  if (whatsapp && (whatsappDigits.length < 8 || whatsappDigits.length > 15)) {
    return {
      status: 400,
      ...error("invalid_phone", {}),
    };
  }

  const academicFormations = normalizeAcademicFormations(parsed.data.academic_formations);
  const legacyAcademic = normalizeAcademic(parsed.data.academic);
  const resolvedAcademicFormations =
    academicFormations.length > 0
      ? academicFormations
      : hasAcademicContent(legacyAcademic)
        ? [legacyAcademic]
        : [];
  const primaryAcademic = resolvedAcademicFormations[0] || legacyAcademic;
  const professionalFirstName = normalizeProfessionalNamePart(parsed.data.professional_first_name);
  const professionalLastName = normalizeProfessionalNamePart(parsed.data.professional_last_name);

  if (!professionalFirstName || !professionalLastName) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  const body: Required<FreeProfessionalProfileUpdateBody> = {
    name: buildProfessionalFullDisplayName({
      fallbackName: parsed.data.name,
      firstName: professionalFirstName,
      lastName: professionalLastName,
    }),
    professional_first_name: professionalFirstName,
    professional_last_name: professionalLastName,
    cpf,
    birthdate,
    gender: trimToNull(parsed.data.gender),
    race_color: trimToNull(parsed.data.race_color),
    religion: trimToNull(parsed.data.religion),
    crp_region: lockIdentityFields
      ? trimToNull(current.profile.crp_region)
      : trimToNull(parsed.data.crp_region),
    crp_number: lockIdentityFields
      ? trimToNull(current.profile.crp_number)
      : trimToNull(parsed.data.crp_number),
    whatsapp,
    headline: trimToNull(parsed.data.headline),
    bio: trimToNull(parsed.data.bio),
    modality: parsed.data.modality || null,
    languages: normalizeList(parsed.data.languages),
    target_audience: normalizeList(parsed.data.target_audience),
    discount_first_session: Boolean(parsed.data.discount_first_session),
    social_value: Boolean(parsed.data.social_value),
    accepts_insurance: Boolean(parsed.data.accepts_insurance),
    show_experience_tag: current.plan.is_free
      ? false
      : Boolean(parsed.data.show_experience_tag ?? true),
    academic: primaryAcademic,
    academic_formations: resolvedAcademicFormations,
    available_days: normalizeList(parsed.data.available_days),
    address: normalizeAddress(parsed.data.address),
    specialty_ids: normalizeList(parsed.data.specialty_ids),
    service_ids: normalizeList(parsed.data.service_ids),
    approach_ids: normalizeList(parsed.data.approach_ids),
    published: Boolean(parsed.data.published),
  };

  if (body.target_audience.length === 0) {
    return {
      status: 400,
      ...error("professional_profile_target_audience_required", {}),
    };
  }

  if (body.specialty_ids.length > current.plan.specialty_limit) {
    return {
      status: 400,
      ...error("professional_profile_specialty_limit", { limit: current.plan.specialty_limit }),
    };
  }

  if (body.service_ids.length > current.plan.service_limit) {
    return {
      status: 400,
      ...error("professional_profile_service_limit", { limit: current.plan.service_limit }),
    };
  }

  if (body.approach_ids.length > current.plan.approach_limit) {
    return {
      status: 400,
      ...error("professional_profile_approach_limit", { limit: current.plan.approach_limit }),
    };
  }

  const specialtyError = assertCatalogIds(
    body.specialty_ids,
    current.catalogs.specialties.map((item) => item.id),
    "specialty",
  );
  if (specialtyError) return { status: 400, ...specialtyError };

  const serviceError = assertCatalogIds(
    body.service_ids,
    current.catalogs.services.map((item) => item.id),
    "service",
  );
  if (serviceError) return { status: 400, ...serviceError };

  const approachError = assertCatalogIds(
    body.approach_ids,
    current.catalogs.approaches.map((item) => item.id),
    "approach",
  );
  if (approachError) return { status: 400, ...approachError };

  if (body.published && !hasRequiredPublishingFields(body, current.profile)) {
    return {
      status: 400,
      ...error("free_profile_publish_requirements", {}),
    };
  }

  const updated = await repository.update(data.auth.id!, body, {
    canUploadVideo: current.plan.can_upload_video,
    lockIdentityFields,
  });

  return {
    status: 200,
    ...msg("professional_profile_updated", {}),
    data: updated,
  };
};

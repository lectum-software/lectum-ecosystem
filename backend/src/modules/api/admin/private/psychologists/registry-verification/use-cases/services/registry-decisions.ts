import type { Resolve } from "@/helpers/return";
import { msg } from "@/helpers/translate";
import type {
  IAdminPsychologistRegistryVerificationApproveDTO,
  IAdminPsychologistRegistryVerificationRejectDTO,
  IAdminPsychologistRegistryVerificationUpdateIdentityDTO,
} from "../../DTOs/IAdminPsychologistRegistryVerificationDTO";
import { AdminPsychologistRegistryVerificationRepository } from "../../repositories/AdminPsychologistRegistryVerificationRepository";

import {
  buildResponse,
  notFound,
  parseRegistrationDate,
  serviceError,
  toAuditProfile,
} from "./registry-response";

import {
  APPROVE_CONFIRMATION,
  buildCrp,
  isValidCpf,
  MANUAL_PROVIDER,
  onlyDigits,
  REJECT_CONFIRMATION,
  SAVE_CONFIRMATION,
  splitCrp,
  toActor,
  trimOrNull,
} from "./registry-support";

export const updateRegistryIdentity = async (
  data: IAdminPsychologistRegistryVerificationUpdateIdentityDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistRegistryVerificationRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  const confirmation = data.b.confirmation?.trim();
  if (confirmation !== SAVE_CONFIRMATION) {
    return serviceError(400, "admin_registry_identity_confirmation_invalid");
  }

  const regionalCrp = trimOrNull(data.b.regional_crp);
  const registrationNumber = trimOrNull(data.b.crp);
  if (!regionalCrp || !registrationNumber) {
    return serviceError(400, "admin_registry_identity_invalid");
  }

  let registrationDate: Date;
  try {
    registrationDate = parseRegistrationDate(data.b.crp_registration_date);
  } catch (err) {
    const code = err instanceof Error ? err.message : "crp_registration_date_invalid";
    return serviceError(
      400,
      code === "crp_registration_date_future"
        ? "admin_registry_verification_date_future"
        : "admin_registry_verification_date_invalid",
    );
  }

  const crp = buildCrp(regionalCrp, registrationNumber);
  if (!crp) return serviceError(400, "admin_registry_identity_invalid");

  await repository.updateIdentity(profile.id, {
    crp,
    registrationDate,
  });

  const updatedProfile = await repository.findPsychologist(data.p.id);

  return {
    status: 200,
    ...msg("update", {}),
    data: updatedProfile ? buildResponse(updatedProfile) : null,
  };
};

export const approveRegistryVerification = async (
  data: IAdminPsychologistRegistryVerificationApproveDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistRegistryVerificationRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  if (!buildResponse(profile).actions.can_approve_manually) {
    return serviceError(400, "admin_registry_verification_approval_not_allowed");
  }

  const confirmation = data.b.confirmation?.trim();
  if (confirmation !== APPROVE_CONFIRMATION) {
    return serviceError(400, "admin_registry_verification_approval_confirmation_invalid");
  }

  if (data.b.situation_confirmed !== true) {
    return serviceError(400, "admin_registry_verification_situation_not_confirmed");
  }

  const cpf = onlyDigits(data.b.cpf);
  if (!isValidCpf(cpf)) return serviceError(400, "admin_registry_verification_cpf_invalid");

  const regionalCrp = trimOrNull(data.b.regional_crp);
  const registrationNumber = trimOrNull(data.b.crp);
  const notes = trimOrNull(data.b.notes);
  if (!regionalCrp || !registrationNumber) {
    return serviceError(400, "admin_registry_verification_approval_invalid");
  }

  let registrationDate: Date;
  try {
    registrationDate = parseRegistrationDate(data.b.crp_registration_date);
  } catch (err) {
    const code = err instanceof Error ? err.message : "crp_registration_date_invalid";
    return serviceError(
      400,
      code === "crp_registration_date_future"
        ? "admin_registry_verification_date_future"
        : "admin_registry_verification_date_invalid",
    );
  }

  const previous = await repository.getPreviousProfile(profile.id);
  if (!previous) return notFound();

  const checkedAt = new Date();
  const crp = buildCrp(regionalCrp, registrationNumber);
  if (!crp) return serviceError(400, "admin_registry_verification_approval_invalid");

  const actor = toActor(data.auth ?? data.admin);
  await repository.approveManual(profile.id, {
    checkedAt,
    cpf,
    crp,
    raw: {
      admin: actor,
      checked_at: checkedAt.toISOString(),
      decision: "approved",
      input: {
        cpf,
        crp: registrationNumber,
        crp_registration_date: registrationDate.toISOString(),
        regional_crp: regionalCrp,
        situation_confirmed: true,
      },
      next: {
        cfp_verified_at: previous.cfp_verified_at?.toISOString() ?? null,
        cpf,
        crp,
        crp_registration_date: registrationDate.toISOString(),
        crp_status: "aprovado",
      },
      ...(notes ? { notes } : {}),
      previous: toAuditProfile(previous),
      source: MANUAL_PROVIDER,
      verification_origin: MANUAL_PROVIDER,
    },
    registrationDate,
    registrationNumber,
    regionalCrp,
  });

  const updatedProfile = await repository.findPsychologist(data.p.id);

  return {
    status: 200,
    ...msg("update", {}),
    data: updatedProfile ? buildResponse(updatedProfile) : null,
  };
};

export const rejectRegistryVerification = async (
  data: IAdminPsychologistRegistryVerificationRejectDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistRegistryVerificationRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  if (!buildResponse(profile).actions.can_reject_manually) {
    return serviceError(400, "admin_registry_verification_rejection_not_allowed");
  }

  const confirmation = data.b.confirmation?.trim();
  if (confirmation !== REJECT_CONFIRMATION) {
    return serviceError(400, "admin_registry_verification_rejection_confirmation_invalid");
  }

  const reason = trimOrNull(data.b.reason);
  if (!reason) return serviceError(400, "admin_registry_verification_rejection_invalid");

  const previous = await repository.getPreviousProfile(profile.id);
  if (!previous) return notFound();

  const checkedAt = new Date();
  const { regional_crp, registration_number } = splitCrp(previous.crp);
  const actor = toActor(data.auth ?? data.admin);

  await repository.rejectManual(profile.id, {
    checkedAt,
    cpf: onlyDigits(previous.cpf) || null,
    raw: {
      admin: actor,
      checked_at: checkedAt.toISOString(),
      decision: "rejected",
      input: {
        cpf: trimOrNull(previous.cpf),
        crp: registration_number,
        crp_registration_date: previous.crp_registration_date?.toISOString() ?? null,
        regional_crp,
      },
      next: {
        ...toAuditProfile(previous),
        crp_status: "rejeitado",
      },
      previous: toAuditProfile(previous),
      reason,
      source: MANUAL_PROVIDER,
      verification_origin: MANUAL_PROVIDER,
    },
    registrationNumber: registration_number,
    regionalCrp: regional_crp,
  });

  const updatedProfile = await repository.findPsychologist(data.p.id);

  return {
    status: 200,
    ...msg("update", {}),
    data: updatedProfile ? buildResponse(updatedProfile) : null,
  };
};

import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { parseGrantCrpRegistrationDate } from "@/operations/subscriptions/grant-professional-subscription-service";
import { crpExperienceYears } from "@/utils/professional-experience";
import type {
  AdminPsychologistRegistryVerificationDTO,
  AdminRegistryVerificationSource,
  AdminRegistryVerificationStatus,
  IAdminPsychologistRegistryVerificationShowDTO,
} from "../../DTOs/IAdminPsychologistRegistryVerificationDTO";
import {
  type AdminPsychologistRegistryVerificationPreviousRecord,
  type AdminPsychologistRegistryVerificationRecord,
  AdminPsychologistRegistryVerificationRepository,
} from "../../repositories/AdminPsychologistRegistryVerificationRepository";

import {
  APPROVE_CONFIRMATION,
  activeAdminGrantSubscription,
  actorFromRaw,
  attemptStatusFromRaw,
  currentRegistryPlan,
  getRawRecord,
  getString,
  isManualCheck,
  latestManualApproval,
  latestManualCheck,
  mapAttempt,
  maskCpf,
  REJECT_CONFIRMATION,
  SAVE_CONFIRMATION,
  sourceLabel,
  splitCrp,
  trimOrNull,
} from "./registry-support";

export const summarizeVerification = (
  profile: AdminPsychologistRegistryVerificationRecord,
): AdminPsychologistRegistryVerificationDTO["summary"] => {
  const latestManual = latestManualCheck(profile.registry_checks);
  const latestManualApproved = latestManualApproval(profile.registry_checks);
  const raw = getRawRecord(latestManual?.raw);
  const latestCheck = profile.registry_checks[0] ?? null;
  const latestRaw = getRawRecord(latestCheck?.raw);
  const latestStatus = attemptStatusFromRaw(latestRaw);
  const adminGrant = activeAdminGrantSubscription(profile);
  const activeAdminGrant = Boolean(adminGrant);
  const plan = currentRegistryPlan(profile);
  const manualApprovalIsCurrent = Boolean(
    latestManualApproved &&
      (!profile.cfp_verified_at || latestManualApproved.checked_at >= profile.cfp_verified_at),
  );
  const manualActor = latestManual
    ? actorFromRaw(getRawRecord(latestManual.raw))
    : adminGrant?.granted_by
      ? {
          email: null,
          id: null,
          name: adminGrant.granted_by,
        }
      : null;
  let status: AdminRegistryVerificationStatus = "pendente";
  let status_label = "Pendente";
  let source: AdminRegistryVerificationSource = "pendente";

  if (manualApprovalIsCurrent) {
    status = "aprovado";
    source = "manual_admin";
    status_label = "Aprovado manualmente";
  } else if (activeAdminGrant) {
    status = "aprovado";
    source = "admin_grant";
    status_label = "Ativado manualmente";
  } else if (profile.crp_status === "aprovado") {
    status = "aprovado";

    if (profile.cfp_verified_at) {
      source = "api_automatica";
      status_label = "Aprovado via API automática";
    } else if (latestManualApproved) {
      source = "manual_admin";
      status_label = "Aprovado manualmente";
    } else {
      source = "api_automatica";
      status_label = "Aprovado";
    }
  } else if (profile.crp_status === "rejeitado") {
    status = "rejeitado";
    source = latestManual ? "manual_admin" : "pendente";
    status_label = "Rejeitado";
  } else if (latestStatus === "provider_rate_limited") {
    status = "limite_tentativas";
    source = "api_automatica";
    status_label = "Limite de tentativas atingido";
  } else if (latestStatus === "provider_unavailable" || latestStatus === "provider_config_error") {
    status = "api_indisponivel";
    source = "api_automatica";
    status_label = "API automática indisponível";
  } else if (profile.crp_status === "em_analise") {
    status = "em_analise";
    source = latestCheck
      ? isManualCheck(latestCheck)
        ? "manual_admin"
        : "api_automatica"
      : "pendente";
    status_label = "Em análise";
  }

  return {
    approval_label: status === "aprovado" ? "Ativo" : "Pendente",
    cfp_verified_at: profile.cfp_verified_at,
    crp_status: profile.crp_status,
    latest_manual_admin: manualActor,
    latest_manual_checked_at:
      latestManual?.checked_at ?? adminGrant?.grant_started_at ?? adminGrant?.createdAt ?? null,
    latest_manual_notes:
      getString(raw, "notes") ??
      getString(raw, "observation") ??
      trimOrNull(adminGrant?.grant_notes),
    latest_manual_reason: getString(raw, "reason") ?? trimOrNull(adminGrant?.grant_reason),
    plan_label: plan.label,
    plan_type: plan.type,
    source,
    source_label: sourceLabel(source),
    status,
    status_label,
  };
};

export const buildResponse = (
  profile: AdminPsychologistRegistryVerificationRecord,
): AdminPsychologistRegistryVerificationDTO => {
  const { regional_crp, registration_number } = splitCrp(profile.crp);
  const summary = summarizeVerification(profile);
  const canManuallyReview =
    summary.plan_type === "profissional" && summary.approval_label !== "Ativo";

  return {
    actions: {
      can_approve_manually: canManuallyReview,
      can_reject_manually: canManuallyReview,
      strong_approve_confirmation: APPROVE_CONFIRMATION,
      strong_reject_confirmation: REJECT_CONFIRMATION,
      strong_save_confirmation: SAVE_CONFIRMATION,
    },
    identity: {
      cpf: trimOrNull(profile.cpf),
      cpf_masked: maskCpf(profile.cpf),
      crp: trimOrNull(profile.crp),
      crp_registration_date: profile.crp_registration_date,
      experience_years: crpExperienceYears(profile.crp_registration_date),
      regional_crp,
      registration_number,
    },
    latest_attempts: profile.registry_checks.map(mapAttempt),
    source: "psychologist_profile+professional_registry_check",
    summary,
  };
};

export const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist_profile" }),
});

export const serviceError = (status: number, code: string): Resolve => ({
  status,
  ...error(code, {}),
});

export const parseRegistrationDate = (value: string): Date => {
  try {
    return parseGrantCrpRegistrationDate(value);
  } catch (err) {
    const code = err instanceof Error ? err.message : "crp_registration_date_invalid";
    throw new Error(code);
  }
};

export const toAuditProfile = (profile: AdminPsychologistRegistryVerificationPreviousRecord) => ({
  cfp_verified_at: profile.cfp_verified_at?.toISOString() ?? null,
  cpf: trimOrNull(profile.cpf),
  crp: trimOrNull(profile.crp),
  crp_registration_date: profile.crp_registration_date?.toISOString() ?? null,
  crp_status: profile.crp_status,
  id: profile.id,
  user_id: profile.user_id,
});

export const showRegistryVerification = async (
  data: IAdminPsychologistRegistryVerificationShowDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistRegistryVerificationRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  return {
    status: 200,
    ...msg("show", {}),
    data: buildResponse(profile),
  };
};

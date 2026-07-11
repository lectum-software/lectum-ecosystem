import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { admin } from "@/interfaces/objects";
import { parseGrantCrpRegistrationDate } from "@/operations/subscriptions/grant-professional-subscription-service";
import { crpExperienceYears } from "@/utils/professional-experience";
import { parseStoredCrp } from "@/utils/professional-registry";
import type {
  AdminPsychologistRegistryVerificationAttempt,
  AdminPsychologistRegistryVerificationDTO,
  AdminRegistryVerificationActor,
  AdminRegistryVerificationSource,
  AdminRegistryVerificationStatus,
  IAdminPsychologistRegistryVerificationApproveDTO,
  IAdminPsychologistRegistryVerificationRejectDTO,
  IAdminPsychologistRegistryVerificationShowDTO,
  IAdminPsychologistRegistryVerificationUpdateIdentityDTO,
} from "../DTOs/IAdminPsychologistRegistryVerificationDTO";
import {
  type AdminPsychologistRegistryVerificationCheck,
  type AdminPsychologistRegistryVerificationPreviousRecord,
  type AdminPsychologistRegistryVerificationRecord,
  AdminPsychologistRegistryVerificationRepository,
} from "../repositories/AdminPsychologistRegistryVerificationRepository";

const MANUAL_PROVIDER = "manual_admin";
const APPROVE_CONFIRMATION = "APROVAR CRP";
const REJECT_CONFIRMATION = "REJEITAR CRP";
const SAVE_CONFIRMATION = "SALVAR REGISTRO";

type RawRecord = Record<string, unknown>;

type AttemptStatus =
  | "empty"
  | "provider_config_error"
  | "provider_error"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "provider_validation_error"
  | "success";

const trimOrNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const isRecord = (value: unknown): value is RawRecord =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getString = (record: RawRecord | null, key: string) => {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getRawRecord = (value: unknown) => (isRecord(value) ? value : null);

const getNestedRecord = (record: RawRecord | null, key: string) => {
  const value = record?.[key];
  return isRecord(value) ? value : null;
};

const calcCpfDigit = (base: string, factor: number) => {
  const sum = base
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
};

const isValidCpf = (value: string) => {
  const digits = onlyDigits(value);

  return (
    digits.length === 11 &&
    !/^(\d)\1+$/.test(digits) &&
    calcCpfDigit(digits.slice(0, 9), 10) === Number(digits[9]) &&
    calcCpfDigit(digits.slice(0, 10), 11) === Number(digits[10])
  );
};

const maskCpf = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return trimOrNull(value);

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const buildCrp = (regionalCrp: string, registrationNumber: string) =>
  [regionalCrp.trim(), registrationNumber.trim()].filter(Boolean).join("/") || null;

const splitCrp = (crp: string | null) => {
  const { crp_number, crp_region } = parseStoredCrp(crp);

  return {
    regional_crp: trimOrNull(crp_region),
    registration_number: trimOrNull(crp_number),
  };
};

const toActor = (adminUser?: admin | null): AdminRegistryVerificationActor => ({
  email: trimOrNull(adminUser?.email),
  id: trimOrNull(adminUser?.id),
  name: trimOrNull(adminUser?.name),
});

const actorFromRaw = (raw: RawRecord | null): AdminRegistryVerificationActor | null => {
  const adminRecord = getNestedRecord(raw, "admin") ?? getNestedRecord(raw, "responsible_admin");
  if (!adminRecord) return null;

  return {
    email: getString(adminRecord, "email"),
    id: getString(adminRecord, "id"),
    name: getString(adminRecord, "name"),
  };
};

const isManualCheck = (check: AdminPsychologistRegistryVerificationCheck) => {
  const raw = getRawRecord(check.raw);

  return (
    check.provider === MANUAL_PROVIDER ||
    getString(raw, "source") === MANUAL_PROVIDER ||
    getString(raw, "verification_origin") === MANUAL_PROVIDER
  );
};

const attemptStatusFromRaw = (raw: RawRecord | null): AttemptStatus | null => {
  const value = getString(raw, "attempt_status");
  if (
    value === "empty" ||
    value === "provider_config_error" ||
    value === "provider_error" ||
    value === "provider_rate_limited" ||
    value === "provider_unavailable" ||
    value === "provider_validation_error" ||
    value === "success"
  ) {
    return value;
  }

  return null;
};

const resultLabel = (check: AdminPsychologistRegistryVerificationCheck) => {
  const raw = getRawRecord(check.raw);
  const status = attemptStatusFromRaw(raw);

  if (isManualCheck(check)) {
    return check.found ? "Aprovado manualmente" : "Rejeitado manualmente";
  }

  if (check.found) return "Resultado encontrado";
  if (status === "provider_rate_limited") return "Limite de tentativas da API automática";
  if (status === "provider_unavailable" || status === "provider_config_error") {
    return "API automática indisponível";
  }
  if (status === "provider_validation_error") return "Dados recusados pela verificação automática";
  if (status === "empty") return "Nenhum registro encontrado";

  return "Tentativa sem aprovação";
};

const mapAttempt = (
  check: AdminPsychologistRegistryVerificationCheck,
): AdminPsychologistRegistryVerificationAttempt => {
  const raw = getRawRecord(check.raw);
  const manual = isManualCheck(check);

  return {
    checked_at: check.checked_at,
    cpf_masked: maskCpf(check.cpf),
    found: check.found,
    id: check.id,
    notes: getString(raw, "notes") ?? getString(raw, "observation"),
    reason: getString(raw, "reason"),
    regional_crp: trimOrNull(check.uf),
    registration_number: trimOrNull(check.registro),
    result_label: resultLabel(check),
    source: manual ? "manual_admin" : "api_automatica",
    source_label: manual ? "Aprovação manual" : "API automática",
    responsible_admin: manual ? actorFromRaw(raw) : null,
  };
};

const latestManualCheck = (checks: AdminPsychologistRegistryVerificationCheck[]) =>
  checks.find(isManualCheck) ?? null;

const latestManualApproval = (checks: AdminPsychologistRegistryVerificationCheck[]) =>
  checks.find((check) => isManualCheck(check) && check.found) ?? null;

type RegistryPlan = {
  label: "Cortesia" | "Gratuito" | "Profissional";
  type: "cortesia" | "gratuito" | "profissional";
};

const activeAdminGrantSubscription = (profile: AdminPsychologistRegistryVerificationRecord) =>
  profile.subscriptions.find((subscription) => subscription.source === "admin_grant") ?? null;

const currentRegistryPlan = (
  profile: AdminPsychologistRegistryVerificationRecord,
): RegistryPlan => {
  const subscriptions = [...profile.subscriptions].sort((left, right) => {
    const leftCourtesy = Number(left.source === "admin_grant");
    const rightCourtesy = Number(right.source === "admin_grant");
    if (leftCourtesy !== rightCourtesy) return rightCourtesy - leftCourtesy;

    const leftProfessional = Number(left.plan.slug !== "gratuito");
    const rightProfessional = Number(right.plan.slug !== "gratuito");
    if (leftProfessional !== rightProfessional) return rightProfessional - leftProfessional;

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
  const current = subscriptions[0] ?? null;

  if (!current || current.plan.slug === "gratuito") {
    return {
      label: "Gratuito",
      type: "gratuito",
    };
  }

  if (current.source === "admin_grant") {
    return {
      label: "Cortesia",
      type: "cortesia",
    };
  }

  return {
    label: "Profissional",
    type: "profissional",
  };
};

const sourceLabel = (source: AdminRegistryVerificationSource) => {
  if (source === "manual_admin" || source === "admin_grant") return "Manual";
  if (source === "api_automatica") return "Via API";

  return "Sem origem aprovada";
};

const summarizeVerification = (
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

const buildResponse = (
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

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist_profile" }),
});

const serviceError = (status: number, code: string): Resolve => ({
  status,
  ...error(code, {}),
});

const parseRegistrationDate = (value: string): Date => {
  try {
    return parseGrantCrpRegistrationDate(value);
  } catch (err) {
    const code = err instanceof Error ? err.message : "crp_registration_date_invalid";
    throw new Error(code);
  }
};

const toAuditProfile = (profile: AdminPsychologistRegistryVerificationPreviousRecord) => ({
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

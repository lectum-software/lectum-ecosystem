import type { admin } from "@/interfaces/objects";
import { parseStoredCrp } from "@/utils/professional-registry";
import type {
  AdminPsychologistRegistryVerificationAttempt,
  AdminRegistryVerificationActor,
  AdminRegistryVerificationSource,
} from "../../DTOs/IAdminPsychologistRegistryVerificationDTO";
import type {
  AdminPsychologistRegistryVerificationCheck,
  AdminPsychologistRegistryVerificationRecord,
} from "../../repositories/AdminPsychologistRegistryVerificationRepository";

export const MANUAL_PROVIDER = "manual_admin";

export const APPROVE_CONFIRMATION = "APROVAR CRP";

export const REJECT_CONFIRMATION = "REJEITAR CRP";

export const SAVE_CONFIRMATION = "SALVAR REGISTRO";

export type RawRecord = Record<string, unknown>;

export type AttemptStatus =
  | "empty"
  | "provider_config_error"
  | "provider_error"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "provider_validation_error"
  | "success";

export const trimOrNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

export const isRecord = (value: unknown): value is RawRecord =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const getString = (record: RawRecord | null, key: string) => {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const getRawRecord = (value: unknown) => (isRecord(value) ? value : null);

export const getNestedRecord = (record: RawRecord | null, key: string) => {
  const value = record?.[key];
  return isRecord(value) ? value : null;
};

export const calcCpfDigit = (base: string, factor: number) => {
  const sum = base
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
};

export const isValidCpf = (value: string) => {
  const digits = onlyDigits(value);

  return (
    digits.length === 11 &&
    !/^(\d)\1+$/.test(digits) &&
    calcCpfDigit(digits.slice(0, 9), 10) === Number(digits[9]) &&
    calcCpfDigit(digits.slice(0, 10), 11) === Number(digits[10])
  );
};

export const maskCpf = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return trimOrNull(value);

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const buildCrp = (regionalCrp: string, registrationNumber: string) =>
  [regionalCrp.trim(), registrationNumber.trim()].filter(Boolean).join("/") || null;

export const splitCrp = (crp: string | null) => {
  const { crp_number, crp_region } = parseStoredCrp(crp);

  return {
    regional_crp: trimOrNull(crp_region),
    registration_number: trimOrNull(crp_number),
  };
};

export const toActor = (adminUser?: admin | null): AdminRegistryVerificationActor => ({
  email: trimOrNull(adminUser?.email),
  id: trimOrNull(adminUser?.id),
  name: trimOrNull(adminUser?.name),
});

export const actorFromRaw = (raw: RawRecord | null): AdminRegistryVerificationActor | null => {
  const adminRecord = getNestedRecord(raw, "admin") ?? getNestedRecord(raw, "responsible_admin");
  if (!adminRecord) return null;

  return {
    email: getString(adminRecord, "email"),
    id: getString(adminRecord, "id"),
    name: getString(adminRecord, "name"),
  };
};

export const isManualCheck = (check: AdminPsychologistRegistryVerificationCheck) => {
  const raw = getRawRecord(check.raw);

  return (
    check.provider === MANUAL_PROVIDER ||
    getString(raw, "source") === MANUAL_PROVIDER ||
    getString(raw, "verification_origin") === MANUAL_PROVIDER
  );
};

export const attemptStatusFromRaw = (raw: RawRecord | null): AttemptStatus | null => {
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

export const resultLabel = (check: AdminPsychologistRegistryVerificationCheck) => {
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

export const mapAttempt = (
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

export const latestManualCheck = (checks: AdminPsychologistRegistryVerificationCheck[]) =>
  checks.find(isManualCheck) ?? null;

export const latestManualApproval = (checks: AdminPsychologistRegistryVerificationCheck[]) =>
  checks.find((check) => isManualCheck(check) && check.found) ?? null;

export type RegistryPlan = {
  label: "Cortesia" | "Gratuito" | "Profissional";
  type: "cortesia" | "gratuito" | "profissional";
};

export const activeAdminGrantSubscription = (
  profile: AdminPsychologistRegistryVerificationRecord,
) => profile.subscriptions.find((subscription) => subscription.source === "admin_grant") ?? null;

export const currentRegistryPlan = (
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

export const sourceLabel = (source: AdminRegistryVerificationSource) => {
  if (source === "manual_admin" || source === "admin_grant") return "Manual";
  if (source === "api_automatica") return "Via API";

  return "Sem origem aprovada";
};

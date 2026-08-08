import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { IAdminPsychologistDetailDTO } from "../../../detail/DTOs/IAdminPsychologistDetailDTO";
import { showAdminPsychologist } from "../../../detail/use-cases/services";
import type { AdminPsychologistPersonalDataInput } from "../../DTOs/IAdminPsychologistProfileEditDTO";
import type {
  AdminPsychologistProfileEditAudit,
  AdminPsychologistProfileEditRecord,
} from "../../repositories/AdminPsychologistProfileEditRepository";

export const APPROVED_REGISTRY_STATUS = "aprovado";

export const ADMIN_SOURCE = "admin_panel";

export const PERSONAL_FIELD_LABELS: Record<string, string> = {
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

export const PROFESSIONAL_FIELD_LABELS: Record<string, string> = {
  approach_ids: "Abordagens",
  languages: "Idiomas",
  modality: "Formato de atendimento",
  service_ids: "Serviços",
  specialty_ids: "Especialidades",
  target_audience: "Público atendido",
};

export const trimToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

export const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

export const normalizeCpf = (value?: string | null) => {
  const digits = onlyDigits(value);
  return digits || null;
};

export const normalizeWhatsapp = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (!digits) return null;
  return `+${digits.slice(0, 15)}`;
};

export const normalizeList = (value?: string[]) => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
};

export const jsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return normalizeList(value.map((item) => String(item)));
};

export const dateKey = (date?: Date | null) => {
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const normalizeBirthdate = (value?: string | null) => {
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

export const calcCpfDigit = (base: string, factor: number) => {
  const sum = base
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
};

export const isValidCpf = (value?: string | null) => {
  const cpf = normalizeCpf(value);
  if (!cpf) return true;
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  return (
    calcCpfDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    calcCpfDigit(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
};

export const maskCpf = (value?: string | null) => {
  const digits = normalizeCpf(value);
  if (!digits) return null;
  if (digits.length !== 11) return "CPF informado";

  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
};

export const maskPhone = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (!digits) return null;
  if (digits.length <= 4) return "Telefone informado";

  return `***${digits.slice(-4)}`;
};

export const safeText = (value?: string | null) => trimToNull(value) ?? null;

export const compareDates = (left?: Date | null, right?: Date | null) =>
  dateKey(left) === dateKey(right);

export const arraysEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  return sortedLeft.every((item, index) => item === sortedRight[index]);
};

export const valueOrCurrent = <T>(
  payload: Record<string, unknown>,
  key: string,
  current: T,
  next: T,
) => (Object.hasOwn(payload, key) ? next : current);

export const normalizeState = (value?: string | null) => trimToNull(value)?.toUpperCase() ?? null;

export const safeAddressStatus = (fields: Array<string | null | undefined>) =>
  fields.some((field) => Boolean(trimToNull(field))) ? "Endereço informado" : null;

export const formatSafePersonalValue = (
  key: string,
  value: string | Date | null | undefined,
): string | null => {
  if (key === "cpf") return maskCpf(value as string | null | undefined);
  if (key === "whatsapp") return maskPhone(value as string | null | undefined);
  if (key === "birthdate")
    return value instanceof Date ? dateKey(value) : safeText(value as string);

  return safeText(value as string | null | undefined);
};

export const profileNotFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist_profile" }),
});

export const adminRequired = () => ({
  status: 403,
  ...error("role_not_authorized", {}),
});

export const detailResponse = async (id: string, messageKey: string): Promise<Resolve> => {
  const detail = await showAdminPsychologist({ p: { id } } as IAdminPsychologistDetailDTO);

  return {
    status: detail.status ?? 200,
    ...msg(messageKey, {}),
    data: detail.data,
  };
};

export const addSafeDiff = ({
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

export const buildPersonalPlan = (
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

export const buildPersonalAudit = ({
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

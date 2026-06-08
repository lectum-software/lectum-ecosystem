import { parsePhoneNumberFromString } from "libphonenumber-js";
import { error, msg } from "@/helpers/translate";
import type { IProfileDTO, IUpdateProfileDTO } from "../DTOs/IProfileDTO";
import { ProfileRepository } from "../repositories/ProfileRepository";

const normalizeNullableText = (value?: string | null) => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizePhone = (value?: string | null) => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;

  const parsed = parsePhoneNumberFromString(normalized, "BR");
  if (!parsed?.isValid()) return null;

  return parsed.number;
};

export const show = async (data: IProfileDTO) => {
  if (data.auth.role !== "paciente") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new ProfileRepository();
  const res = await repository.getOrCreate(data.auth.id!);

  return {
    status: 200,
    ...msg("show", {}),
    data: res,
  };
};

export const update = async (data: IUpdateProfileDTO) => {
  if (data.auth.role !== "paciente") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const phone = normalizePhone(data.b.phone);
  if (data.b.phone && !phone) {
    return {
      status: 400,
      ...error("invalid_phone", {}),
    };
  }

  const repository = new ProfileRepository();
  const res = await repository.update({
    ...data,
    b: {
      ...data.b,
      name: data.b.name.trim(),
      phone,
      bio: normalizeNullableText(data.b.bio),
      goal: data.b.goal ?? null,
      gender: data.b.gender ?? null,
      birthdate: data.b.birthdate ?? null,
    },
  });

  return {
    status: 200,
    ...msg("patient_profile_updated", {}),
    data: res,
  };
};

export default show;

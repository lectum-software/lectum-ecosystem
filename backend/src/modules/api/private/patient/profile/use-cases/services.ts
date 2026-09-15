import { parsePhoneNumberFromString } from "libphonenumber-js";
import { error, msg } from "@/helpers/translate";
import { publicFileUrl } from "@/utils/public-origin";
import type { IProfileDTO, IUpdateProfileDTO, IUploadAvatarDTO } from "../DTOs/IProfileDTO";
import { ProfileRepository } from "../repositories/ProfileRepository";

const normalizeNullableText = (value?: string | null) => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeState = (value?: IUpdateProfileDTO["b"]["state"]) =>
  (normalizeNullableText(value)?.toUpperCase() ?? null) as IUpdateProfileDTO["b"]["state"];

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

  const city = normalizeNullableText(data.b.city);
  const state = normalizeState(data.b.state);
  if (Boolean(city) !== Boolean(state)) {
    return {
      status: 400,
      ...error("patient_profile_location_pair_required", {}),
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
      city,
      goal: data.b.goal ?? null,
      gender: data.b.gender ?? null,
      birthdate: data.b.birthdate ?? null,
      state,
    },
  });

  return {
    status: 200,
    ...msg("patient_profile_updated", {}),
    data: res,
  };
};

export const uploadAvatar = async (data: IUploadAvatarDTO) => {
  if (data.auth.role !== "paciente") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const key = data.file?.path || data.file?.key;
  if (!key?.startsWith("patient/avatar/")) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  const repository = new ProfileRepository();
  const avatarUrl = publicFileUrl(key);
  const profile = await repository.updateAvatar(data.auth.id!, avatarUrl);

  if (!profile) {
    return {
      status: 404,
      ...error("not_found", { model: "patient_profile" }),
    };
  }

  return {
    status: 200,
    ...msg("patient_profile_avatar_uploaded", {}),
    data: {
      avatar_url: avatarUrl,
      profile,
    },
  };
};

export const removeAvatar = async (data: IProfileDTO) => {
  if (data.auth.role !== "paciente") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new ProfileRepository();
  const profile = await repository.removeAvatar(data.auth.id!);

  if (!profile) {
    return {
      status: 404,
      ...error("not_found", { model: "patient_profile" }),
    };
  }

  return {
    status: 200,
    ...msg("patient_profile_avatar_removed", {}),
    data: {
      profile,
    },
  };
};

export default show;

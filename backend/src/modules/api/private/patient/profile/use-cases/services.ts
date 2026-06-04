import { error, msg } from "@/helpers/translate";
import type { IProfileDTO } from "../DTOs/IProfileDTO";
import { ProfileRepository } from "../repositories/ProfileRepository";

export default async (data: IProfileDTO) => {
  if (data.auth.role !== "paciente") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const _PROFILE = new ProfileRepository();
  const res = await _PROFILE.getOrCreate(data.auth.id!);

  return {
    status: 200,
    ...msg("show", {}),
    data: res,
  };
};

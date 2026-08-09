import { error, msg } from "@/helpers/translate";
import type { IOnboardingDTO } from "../DTOs/IOnboardingDTO";
import { OnboardingRepository } from "../repositories/OnboardingRepository";

export default async (data: IOnboardingDTO) => {
  if (data.auth.role !== "paciente") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const _PROFILE = new OnboardingRepository();
  const res = await _PROFILE.complete(data);

  return {
    status: 200,
    ...msg("patient_onboarding_success", {}),
    data: res,
  };
};

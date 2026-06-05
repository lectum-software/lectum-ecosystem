import { callEndpoint } from "@/api/generator";
import type { patient_profile } from "@/api/generator/types";
import { handleReq } from "@/api/handle";

export type PatientOnboardingGoal = "encontrar_psicologo" | "conhecer_comunidade";
export type PatientOnboardingGender =
  | "feminino"
  | "masculino"
  | "nao_binario"
  | "prefiro_nao_dizer";

export type CompletePatientOnboardingPayload = {
  name?: string;
  gender?: PatientOnboardingGender;
  goal?: PatientOnboardingGoal;
  birthdate?: string;
  phone?: string;
};

export const getPatientProfile = async () => {
  const handle = callEndpoint({
    route: "/api/private/patient/profile",
  });

  return handleReq<patient_profile>(handle);
};

export const completePatientOnboarding = async (body: CompletePatientOnboardingPayload) => {
  const handle = callEndpoint({
    route: "/api/private/patient/onboarding",
    method: "PUT",
    body,
  });

  return handleReq<patient_profile>({
    ...handle,
    hideError: true,
  });
};

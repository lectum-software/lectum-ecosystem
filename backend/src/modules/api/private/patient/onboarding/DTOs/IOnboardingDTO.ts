import type { user } from "@/interfaces/objects";

export type PatientOnboardingGoal = "encontrar_psicologo" | "conhecer_comunidade";
export type PatientOnboardingGender =
  | "feminino"
  | "masculino"
  | "nao_binario"
  | "prefiro_nao_dizer";

export interface IOnboardingDTO {
  b: {
    name?: string;
    gender?: PatientOnboardingGender;
    goal?: PatientOnboardingGoal;
    birthdate?: Date;
    phone?: string;
  };
  auth: user;
}

import type { user } from "@/interfaces/objects";

export type PatientOnboardingGoal = "encontrar_psicologo" | "conhecer_comunidade";

export interface IOnboardingDTO {
  b: {
    goal?: PatientOnboardingGoal;
    birthdate?: Date;
    phone?: string;
  };
  auth: user;
}

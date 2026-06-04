import type { patient_profile } from "@/interfaces/objects";
import type { IOnboardingDTO } from "../../DTOs/IOnboardingDTO";

export interface IOnboardingRepository {
  getOrCreate(userId: string): Promise<patient_profile>;
  complete(props: IOnboardingDTO): Promise<patient_profile>;
}

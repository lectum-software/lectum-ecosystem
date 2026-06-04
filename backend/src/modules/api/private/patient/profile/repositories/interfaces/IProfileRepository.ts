import type { patient_profile } from "@/interfaces/objects";

export interface IProfileRepository {
  getOrCreate(userId: string): Promise<patient_profile>;
}

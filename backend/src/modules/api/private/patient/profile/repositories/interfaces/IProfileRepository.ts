import type { patient_profile } from "@/interfaces/objects";
import type { IUpdateProfileDTO, PatientPrivateProfileResponse } from "../../DTOs/IProfileDTO";

export interface IProfileRepository {
  getOrCreate(userId: string): Promise<patient_profile>;
  update(data: IUpdateProfileDTO): Promise<PatientPrivateProfileResponse>;
  updateAvatar(userId: string, avatarUrl: string): Promise<PatientPrivateProfileResponse | null>;
  removeAvatar(userId: string): Promise<PatientPrivateProfileResponse | null>;
}

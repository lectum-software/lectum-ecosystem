import type {
  FreeProfessionalProfileResponse,
  FreeProfessionalProfileUpdateBody,
} from "../../DTOs/IFreeProfileDTO";

export interface IFreeProfileRepository {
  show(userId: string): Promise<FreeProfessionalProfileResponse | null>;
  update(
    userId: string,
    body: Required<FreeProfessionalProfileUpdateBody>,
  ): Promise<FreeProfessionalProfileResponse | null>;
  updateAvatar(userId: string, avatarUrl: string): Promise<FreeProfessionalProfileResponse | null>;
  removeAvatar(userId: string): Promise<FreeProfessionalProfileResponse | null>;
}

import type {
  FreeProfessionalProfileResponse,
  FreeProfessionalProfileUpdateBody,
} from "../../DTOs/IFreeProfileDTO";

export interface IFreeProfileRepository {
  show(userId: string): Promise<FreeProfessionalProfileResponse | null>;
  update(
    userId: string,
    body: Required<FreeProfessionalProfileUpdateBody>,
    options: { canUseProfessionalFeatures: boolean },
  ): Promise<FreeProfessionalProfileResponse | null>;
  updateAvatar(userId: string, avatarUrl: string): Promise<FreeProfessionalProfileResponse | null>;
  removeAvatar(userId: string): Promise<FreeProfessionalProfileResponse | null>;
  updateVideo(userId: string, videoUrl: string): Promise<FreeProfessionalProfileResponse | null>;
  updateCoverImage(
    userId: string,
    coverImageUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null>;
  updateVideoCover(
    userId: string,
    videoCoverUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null>;
  removeVideo(userId: string): Promise<FreeProfessionalProfileResponse | null>;
  removeCoverImage(userId: string): Promise<FreeProfessionalProfileResponse | null>;
}

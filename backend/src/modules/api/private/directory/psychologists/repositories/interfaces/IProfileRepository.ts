import type {
  DirectoryPsychologistPostsResponse,
  DirectoryPsychologistProfile,
  DirectoryPsychologistReviewsResponse,
  IProfileListDTO,
  IProfileShowDTO,
} from "../../DTOs/IProfileDTO";

export interface IProfileRepository {
  hasPublishedProfile: (psychologistId: string) => Promise<boolean>;
  show: (data: IProfileShowDTO) => Promise<DirectoryPsychologistProfile | null>;
  posts: (data: IProfileListDTO) => Promise<DirectoryPsychologistPostsResponse>;
  reviews: (data: IProfileListDTO) => Promise<DirectoryPsychologistReviewsResponse>;
}

import type {
  FollowActionResponse,
  FollowIndexResponse,
  IFollowIndexDTO,
} from "../../DTOs/IFollowDTO";

export interface IFollowRepository {
  index: (data: IFollowIndexDTO) => Promise<FollowIndexResponse>;
  hasPublishedPsychologist: (psychologistId: string) => Promise<boolean>;
  follow: (userId: string, psychologistId: string) => Promise<FollowActionResponse>;
  unfollow: (userId: string, psychologistId: string) => Promise<FollowActionResponse>;
}

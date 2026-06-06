import type { FavoriteActionResponse } from "../../DTOs/IFavoriteDTO";

export interface IFavoriteRepository {
  hasPublishedPsychologist: (psychologistId: string) => Promise<boolean>;
  favorite: (userId: string, psychologistId: string) => Promise<FavoriteActionResponse>;
  unfavorite: (userId: string, psychologistId: string) => Promise<FavoriteActionResponse>;
}

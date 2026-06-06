import type {
  FavoriteActionResponse,
  FavoriteIndexResponse,
  IFavoriteIndexDTO,
} from "../../DTOs/IFavoriteDTO";

export interface IFavoriteRepository {
  index: (data: IFavoriteIndexDTO) => Promise<FavoriteIndexResponse>;
  hasPublishedPsychologist: (psychologistId: string) => Promise<boolean>;
  favorite: (userId: string, psychologistId: string) => Promise<FavoriteActionResponse>;
  unfavorite: (userId: string, psychologistId: string) => Promise<FavoriteActionResponse>;
}

import type { user } from "@/interfaces/objects";

export type FavoriteActionResponse = {
  psychologist_id: string;
  favorited: boolean;
};

export interface IFavoriteDTO {
  p: {
    id: string;
  };
  auth: user;
}

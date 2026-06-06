import { error, msg } from "@/helpers/translate";
import type { IFavoriteDTO } from "../DTOs/IFavoriteDTO";
import { FavoriteRepository } from "../repositories/FavoriteRepository";

type FavoriteAction = "favorite" | "unfavorite";

export default async (data: IFavoriteDTO, action: FavoriteAction) => {
  if (data.auth.role !== "paciente") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new FavoriteRepository();
  const psychologistId = data.p.id;
  const isPublishedPsychologist = await repository.hasPublishedPsychologist(psychologistId);

  if (!isPublishedPsychologist) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const res =
    action === "favorite"
      ? await repository.favorite(data.auth.id!, psychologistId)
      : await repository.unfavorite(data.auth.id!, psychologistId);

  return {
    status: 200,
    ...msg(action === "favorite" ? "favorite_success" : "unfavorite_success", {}),
    data: res,
  };
};

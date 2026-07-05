import { error, msg } from "@/helpers/translate";
import { notifyNewPsychologistFavorite } from "@/main/notification/domain-events";
import type { IFavoriteActionDTO, IFavoriteIndexDTO } from "../DTOs/IFavoriteDTO";
import { FavoriteRepository } from "../repositories/FavoriteRepository";

type FavoriteAction = "favorite" | "unfavorite";

export const index = async (data: IFavoriteIndexDTO) => {
  const repository = new FavoriteRepository();
  const res = await repository.index(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const action = async (data: IFavoriteActionDTO, actionType: FavoriteAction) => {
  const repository = new FavoriteRepository();
  const psychologistId = data.p.id;

  if (actionType === "favorite" && data.auth.id === psychologistId) {
    return {
      status: 403,
      ...error("favorite_own_profile", {}),
    };
  }

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
    actionType === "favorite"
      ? await repository.favorite(data.auth.id!, psychologistId)
      : await repository.unfavorite(data.auth.id!, psychologistId);
  const { notification_event_id: notificationEventId, ...response } = res;

  if (actionType === "favorite" && notificationEventId) {
    await notifyNewPsychologistFavorite({
      actorId: data.auth.id!,
      favoriteId: notificationEventId,
      psychologistId,
    });
  }

  return {
    status: 200,
    ...msg(actionType === "favorite" ? "favorite_success" : "unfavorite_success", {}),
    data: response,
  };
};

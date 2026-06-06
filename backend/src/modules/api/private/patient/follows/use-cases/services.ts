import { error, msg } from "@/helpers/translate";
import type { IFollowActionDTO, IFollowIndexDTO } from "../DTOs/IFollowDTO";
import { FollowRepository } from "../repositories/FollowRepository";

type FollowAction = "follow" | "unfollow";

const ensurePatient = (data: { auth: { role?: string | null } }) => {
  if (data.auth.role === "paciente") return null;

  return {
    status: 403,
    ...error("role_not_authorized", {}),
  };
};

export const index = async (data: IFollowIndexDTO) => {
  const unauthorized = ensurePatient(data);
  if (unauthorized) return unauthorized;

  const repository = new FollowRepository();
  const res = await repository.index(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const action = async (data: IFollowActionDTO, actionType: FollowAction) => {
  const unauthorized = ensurePatient(data);
  if (unauthorized) return unauthorized;

  const repository = new FollowRepository();
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
    actionType === "follow"
      ? await repository.follow(data.auth.id!, psychologistId)
      : await repository.unfollow(data.auth.id!, psychologistId);

  return {
    status: 200,
    ...msg(actionType === "follow" ? "follow_success" : "unfollow_success", {}),
    data: res,
  };
};

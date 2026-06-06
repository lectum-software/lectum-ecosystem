import { error, msg } from "@/helpers/translate";
import type { IIndexDTO } from "../DTOs/IIndexDTO";
import type { IProfileListDTO, IProfileShowDTO } from "../DTOs/IProfileDTO";
import { IndexRepository } from "../repositories/IndexRepository";
import { ProfileRepository } from "../repositories/ProfileRepository";

export default async (data: IIndexDTO) => {
  const repository = new IndexRepository();
  const res = await repository.index(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const show = async (data: IProfileShowDTO) => {
  const repository = new ProfileRepository();
  const res = await repository.show(data);

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  return {
    status: 200,
    ...msg("show", {}),
    data: res,
  };
};

export const posts = async (data: IProfileListDTO) => {
  const repository = new ProfileRepository();
  const exists = await repository.hasPublishedProfile(data.p.id);

  if (!exists) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const res = await repository.posts(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const reviews = async (data: IProfileListDTO) => {
  const repository = new ProfileRepository();
  const exists = await repository.hasPublishedProfile(data.p.id);

  if (!exists) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const res = await repository.reviews(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

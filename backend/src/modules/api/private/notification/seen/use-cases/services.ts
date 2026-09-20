import { msg } from "@/helpers/translate";
import type { ISeenDTO } from "../DTOs/ISeenDTO";
import { SeenRepository } from "../repositories/SeenRepository";

export default async (data: ISeenDTO) => {
  const _NOTIFICATION = new SeenRepository();

  const res = await _NOTIFICATION.seen(data);

  return {
    status: 200,
    ...msg("update", {
      //If you need a custom text
    }),
    data: res,
  };
};

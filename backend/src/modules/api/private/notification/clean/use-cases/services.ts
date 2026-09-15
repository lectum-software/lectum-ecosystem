import { msg } from "@/helpers/translate";
import type { ICleanDTO } from "../DTOs/ICleanDTO";
import { CleanRepository } from "../repositories/CleanRepository";

export default async (data: ICleanDTO) => {
  const _NOTIFICATION = new CleanRepository();

  const res = await _NOTIFICATION.clean(data);

  return {
    status: 200,
    ...msg("update", {
      //If you need a custom text
    }),
    data: res,
  };
};

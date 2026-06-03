import { msg } from "@/helpers/translate";
import type { IShowDTO } from "../DTOs/IShowDTO";
import { ShowRepository } from "../repositories/ShowRepository";

export default async (data: IShowDTO) => {
  const _PREFERENCE = new ShowRepository();
  const res = await _PREFERENCE.getOrCreate(data.auth.id!);

  return {
    status: 200,
    ...msg("show", {
      //If you need a custom text
    }),
    data: res,
  };
};

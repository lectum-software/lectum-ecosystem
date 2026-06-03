import { msg } from "@/helpers/translate";
import type { IIndexDTO } from "../DTOs/IIndexDTO";
import { IndexRepository } from "../repositories/IndexRepository";

export default async (data: IIndexDTO) => {
  const _NOTIFICATION = new IndexRepository();
  const res = await _NOTIFICATION.index(data);
  return {
    status: 200,
    ...msg("index", {
      //If you need a custom text
    }),
    data: res,
  };
};

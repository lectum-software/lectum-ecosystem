import { msg } from "@/helpers/translate";
import type { IUpdateDTO } from "../DTOs/IUpdateDTO";
import { UpdateRepository } from "../repositories/UpdateRepository";

export default async (data: IUpdateDTO) => {
  const _PREFERENCE = new UpdateRepository();
  const res = await _PREFERENCE.upsert(data.auth.id!, data.b.prefs);

  return {
    status: 200,
    ...msg("update", {
      //If you need a custom text
    }),
    data: res,
  };
};

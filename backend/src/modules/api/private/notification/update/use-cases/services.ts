import { error, msg } from "@/helpers/translate";
import type { IUpdateDTO } from "../DTOs/IUpdateDTO";
import { UpdateRepository } from "../repositories/UpdateRepository";

export default async (data: IUpdateDTO) => {
  const _NOTIFICATION = new UpdateRepository();

  const find = await _NOTIFICATION.find(data);
  if (!find)
    return {
      status: 404,
      ...error("not_found", {
        //If you need a custom text
      }),
      type: 3,
    };

  let res = null;
  res = await _NOTIFICATION.update(data);

  return {
    status: 200,
    ...msg("update", {
      //If you need a custom text
    }),
    data: res,
  };
};

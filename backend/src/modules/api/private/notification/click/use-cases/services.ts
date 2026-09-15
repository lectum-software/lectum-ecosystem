import { error, msg } from "@/helpers/translate";
import type { IClickDTO } from "../DTOs/IClickDTO";
import { ClickRepository } from "../repositories/ClickRepository";

export default async (data: IClickDTO) => {
  const repository = new ClickRepository();
  const find = await repository.find(data);

  if (!find) {
    return {
      status: 404,
      ...error("not_found", {}),
      type: 3,
    };
  }

  const res = await repository.click(data);

  return {
    status: 200,
    ...msg("update", {}),
    data: res,
  };
};

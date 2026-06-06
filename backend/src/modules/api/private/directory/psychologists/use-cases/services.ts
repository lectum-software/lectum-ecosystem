import { msg } from "@/helpers/translate";
import type { IIndexDTO } from "../DTOs/IIndexDTO";
import { IndexRepository } from "../repositories/IndexRepository";

export default async (data: IIndexDTO) => {
  const repository = new IndexRepository();
  const res = await repository.index(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

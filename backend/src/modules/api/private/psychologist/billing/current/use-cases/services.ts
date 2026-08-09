import { error, msg } from "@/helpers/translate";
import type { ICurrentDTO } from "../DTOs/ICurrentDTO";
import { CurrentRepository } from "../repositories/CurrentRepository";

export default async (data: ICurrentDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new CurrentRepository();
  const current = await repository.show(data.auth.id!);

  return {
    status: 200,
    ...msg("show", {}),
    data: { current },
  };
};

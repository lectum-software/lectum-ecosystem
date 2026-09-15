import { error, msg } from "@/helpers/translate";
import type { IPlansDTO } from "../DTOs/IPlansDTO";
import { PlansRepository } from "../repositories/PlansRepository";

export default async (data: IPlansDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new PlansRepository();
  const plans = await repository.index();

  return {
    status: 200,
    ...msg("show", {}),
    data: { plans },
  };
};

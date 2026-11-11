import { error, msg } from "@/helpers/translate";
import type { IPlansDTO } from "../DTOs/IPlansDTO";
import { PlansRepository } from "../repositories/PlansRepository";
import { projectPlanAdmissionOffer, readPlanAdmissionContext } from "./admission-offer";

export default async (data: IPlansDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new PlansRepository();
  const context = readPlanAdmissionContext();
  const catalog = await repository.index(context.identity);
  const plans = catalog.plans.map((plan) =>
    plan.slug === "profissional"
      ? { ...plan, admission_offer: projectPlanAdmissionOffer(plan, context, catalog) }
      : plan,
  );

  return {
    status: 200,
    ...msg("show", {}),
    data: { plans },
  };
};

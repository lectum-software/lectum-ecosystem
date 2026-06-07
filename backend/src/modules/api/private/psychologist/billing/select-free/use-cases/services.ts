import { error, msg } from "@/helpers/translate";
import type { ISelectFreeDTO } from "../DTOs/ISelectFreeDTO";
import { SelectFreeRepository } from "../repositories/SelectFreeRepository";

export default async (data: ISelectFreeDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new SelectFreeRepository();
  const profile = await repository.findProfileByUserId(data.auth.id!);

  if (!profile || profile.deleted) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  const freePlan = await repository.findPlanBySlug("gratuito");

  if (!freePlan?.id) {
    return {
      status: 404,
      ...error("not_found", { model: "subscription_plan" }),
    };
  }

  const activeProfessional = await repository.findActiveProfessionalSubscription(profile.id!);

  if (activeProfessional) {
    return {
      status: 409,
      ...error("professional_subscription_active", {}),
    };
  }

  const current = await repository.findCurrentSubscription(profile.id!);

  if (current?.plan?.slug === "gratuito" && current.status === "ativa") {
    return {
      status: 200,
      ...msg("billing_free_selected", {}),
      data: { current },
    };
  }

  const next = await repository.createFreeSubscription(profile.id!, freePlan.id!);

  return {
    status: 200,
    ...msg("billing_free_selected", {}),
    data: { current: next },
  };
};

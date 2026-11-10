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

  const result = await repository.createFreeSubscription(profile.id!, freePlan.id!);
  if (result.type === "profile_not_found" || result.type === "plan_not_found") {
    return {
      status: 404,
      ...error("not_found", {
        model: result.type === "profile_not_found" ? "psychologist_profile" : "subscription_plan",
      }),
    };
  }
  if (result.type !== "selected") {
    return {
      status: 409,
      ...error(
        result.type === "entitlement_conflict"
          ? "professional_subscription_active"
          : "billing_operation_conflict",
        {},
      ),
    };
  }

  return {
    status: 200,
    ...msg("billing_free_selected", {}),
    data: { current: result.current },
  };
};

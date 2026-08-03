import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { AdminSettingsSubscriptionPlanDTO } from "../DTOs/IAdminSettingsSubscriptionPlanDTO";
import { AdminSettingsSubscriptionPlanRepository } from "../repositories/AdminSettingsSubscriptionPlanRepository";
import type { AdminSettingsSubscriptionPlanRecord } from "../repositories/interfaces/IAdminSettingsSubscriptionPlanRepository";

const toPlanDTO = (
  plan: AdminSettingsSubscriptionPlanRecord,
): AdminSettingsSubscriptionPlanDTO => ({
  active: plan.active,
  created_at: plan.createdAt.toISOString(),
  currency: "BRL",
  gateway_plan_configured: Boolean(plan.gateway_plan_id),
  id: plan.id,
  interval: plan.interval,
  name: plan.name,
  price_cents: plan.price_cents,
  slug: plan.slug,
  source: "subscription_plan",
  updated_at: plan.updatedAt.toISOString(),
});

export const show = async (): Promise<Resolve> => {
  const repository = new AdminSettingsSubscriptionPlanRepository();
  const plan = await repository.findProfessionalPlan();

  if (!plan) {
    return {
      status: 404,
      ...error("not_found", { model: "subscription_plan" }),
    };
  }

  return {
    status: 200,
    ...msg("show", {}),
    data: {
      plan: toPlanDTO(plan),
    },
  };
};

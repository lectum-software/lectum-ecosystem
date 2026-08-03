import prisma from "@/infra/database/prisma";
import type {
  AdminSettingsSubscriptionPlanRecord,
  IAdminSettingsSubscriptionPlanRepository,
} from "./interfaces/IAdminSettingsSubscriptionPlanRepository";

export class AdminSettingsSubscriptionPlanRepository
  implements IAdminSettingsSubscriptionPlanRepository
{
  async findProfessionalPlan(): Promise<AdminSettingsSubscriptionPlanRecord | null> {
    return prisma.subscription_plan.findFirst({
      where: {
        deleted: false,
        slug: "profissional",
      },
      select: {
        active: true,
        createdAt: true,
        gateway_plan_id: true,
        id: true,
        interval: true,
        name: true,
        price_cents: true,
        slug: true,
        updatedAt: true,
      },
    });
  }
}

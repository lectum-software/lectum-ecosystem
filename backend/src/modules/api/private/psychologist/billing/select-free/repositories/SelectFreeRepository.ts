import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  professional_subscription,
  psychologist_profile,
  subscription_plan,
} from "@/interfaces/objects";
import { normalizeFreePlanProfileCatalogLimits } from "@/modules/billing/free-subscription";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import {
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";
import type { ISelectFreeRepository, SelectFreeResult } from "./interfaces/ISelectFreeRepository";

export class SelectFreeRepository implements ISelectFreeRepository {
  readonly profileRepository: ORM["psychologist_profile"];
  readonly planRepository: ORM["subscription_plan"];
  readonly subscriptionRepository: ORM["professional_subscription"];

  constructor() {
    this.profileRepository = prisma.psychologist_profile;
    this.planRepository = prisma.subscription_plan;
    this.subscriptionRepository = prisma.professional_subscription;
  }

  async findProfileByUserId(
    userId: string,
  ): Promise<Pick<psychologist_profile, "id" | "deleted"> | null> {
    return this.profileRepository.findUnique({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        deleted: true,
      },
    });
  }

  async findPlanBySlug(slug: "gratuito"): Promise<subscription_plan | null> {
    return this.planRepository.findFirst({
      where: {
        slug,
        active: true,
        deleted: false,
      },
    });
  }

  async findCurrentSubscription(psychologistId: string): Promise<professional_subscription | null> {
    const activeFree = await this.subscriptionRepository.findFirst({
      where: {
        ...activeFreeSubscriptionWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (activeFree) return activeFree;

    return this.subscriptionRepository.findFirst({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findActiveProfessionalSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        ...activeProfessionalEntitlementWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createFreeSubscription(psychologistId: string, planId: string): Promise<SelectFreeResult> {
    return withSerializableTransaction(async (tx): Promise<SelectFreeResult> => {
      // Same profile lock/MVCC version as checkout, courtesy and account deletion.
      const profiles = await tx.$queryRaw<Array<{ user_id: string }>>`
        UPDATE psychologist_profiles p SET updated_at = p.updated_at FROM users u
        WHERE p.id = ${psychologistId} AND u.id = p.user_id
        AND p.deleted = false AND u.deleted = false AND u.active = true
        RETURNING p.user_id`;
      if (profiles.length !== 1) return { type: "profile_not_found" };
      const freePlan = await tx.subscription_plan.findFirst({
        where: { id: planId, slug: "gratuito", active: true, deleted: false },
      });
      if (!freePlan) return { type: "plan_not_found" };
      const entitlement = await tx.professional_subscription.findFirst({
        where: { ...activeProfessionalEntitlementWhere(), psychologist_id: psychologistId },
        select: { id: true },
      });
      if (entitlement) return { type: "entitlement_conflict" };
      const pending = await tx.billing_operation.findFirst({
        where: {
          user_id: profiles[0].user_id,
          state: {
            in: ["reserved", "creating", "requires_confirmation", "processing", "review_required"],
          },
        },
        select: { id: true },
      });
      const external = await tx.professional_subscription.findFirst({
        where: {
          psychologist_id: psychologistId,
          deleted: false,
          gateway_subscription_id: { not: null },
          status: { in: ["ativa", "inadimplente", "inativa"] },
        },
        select: { id: true },
      });
      if (pending || external) return { type: "operation_conflict" };
      const current = await tx.professional_subscription.findFirst({
        where: { ...activeFreeSubscriptionWhere(), psychologist_id: psychologistId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      });
      if (current) return { type: "selected", current };

      await tx.professional_subscription.updateMany({
        where: {
          psychologist_id: psychologistId,
          deleted: false,
          // Selecting free is never a cancellation request to an external provider.
          gateway: null,
          gateway_subscription_id: null,
          status: {
            not: "cancelada",
          },
        },
        data: {
          status: "cancelada",
        },
      });

      const created = await tx.professional_subscription.create({
        data: {
          psychologist_id: psychologistId,
          plan_id: planId,
          status: "ativa",
          source: "free_signup",
          gateway: null,
          gateway_subscription_id: null,
          current_period_end: null,
          grant_reason: null,
          grant_notes: null,
          granted_by: null,
          grant_started_at: null,
        },
        include: {
          plan: true,
        },
      });

      await normalizeFreePlanProfileCatalogLimits({
        psychologistId,
        tx,
      });

      return { type: "selected", current: created };
    });
  }
}

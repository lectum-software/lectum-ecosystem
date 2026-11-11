import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";
import type { IPlansRepository, PlanAdmissionCatalog } from "./interfaces/IPlansRepository";

export class PlansRepository implements IPlansRepository {
  /** A publication cannot mix a new offer revision with the previous immutable price. */
  async index(identity: StripeIdentity | null) {
    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const plans = await tx.subscription_plan.findMany({
          where: { active: true, deleted: false },
          orderBy: [{ price_cents: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        });
        const professional = plans.find((plan) => plan.slug === "profissional");
        const catalog =
          professional && identity
            ? await readPlanAdmissionCatalog(tx, professional.id, identity)
            : { offer: null, price: null };
        return { plans, ...catalog };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}

export const readPlanAdmissionCatalog = async (
  tx: Prisma.TransactionClient,
  planId: string,
  identity: StripeIdentity,
): Promise<PlanAdmissionCatalog> => {
  const scope = {
    plan_id: planId,
    gateway: "stripe",
    mode: identity.mode,
    account_id: identity.accountId,
  };
  const offer = await tx.billing_offer.findFirst({ where: scope });
  const price = offer
    ? await tx.billing_price_version.findFirst({ where: { id: offer.price_version_id, ...scope } })
    : null;
  return { offer, price };
};

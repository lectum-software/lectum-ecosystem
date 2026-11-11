import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";
import type {
  AdminSettingsSubscriptionPlanRecord,
  AdminSettingsSubscriptionRecords,
  IAdminSettingsSubscriptionPlanRepository,
} from "./interfaces/IAdminSettingsSubscriptionPlanRepository";

const planSelect = {
  active: true,
  createdAt: true,
  gateway_plan_id: true,
  id: true,
  interval: true,
  name: true,
  price_cents: true,
  slug: true,
  updatedAt: true,
} satisfies Prisma.subscription_planSelect;

export class AdminSettingsSubscriptionPlanRepository
  implements IAdminSettingsSubscriptionPlanRepository
{
  async findProfessionalPlan(): Promise<AdminSettingsSubscriptionPlanRecord | null> {
    return prisma.subscription_plan.findFirst({
      where: {
        deleted: false,
        slug: "profissional",
      },
      select: planSelect,
    });
  }

  /** One local snapshot: paused offers and inactive plans remain observable. */
  async findSettings(identity: StripeIdentity | null): Promise<AdminSettingsSubscriptionRecords> {
    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const plan = await tx.subscription_plan.findFirst({
          where: { deleted: false, slug: "profissional" },
          select: planSelect,
        });
        const catalog = plan && identity ? await readScopedCatalog(tx, plan.id, identity) : null;
        return { plan, offer: catalog?.offer ?? null, price: catalog?.price ?? null };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}

/** Accepts the existing transaction to preserve offer/immutable-price coherence. */
export async function readScopedCatalog(
  tx: Prisma.TransactionClient,
  planId: string,
  identity: StripeIdentity,
) {
  const scope = {
    plan_id: planId,
    gateway: "stripe",
    mode: identity.mode,
    account_id: identity.accountId,
  };
  const offer = await tx.billing_offer.findFirst({ where: scope });
  if (!offer) return { offer: null, price: null };
  const price = await tx.billing_price_version.findFirst({
    where: { id: offer.price_version_id, ...scope },
    select: {
      id: true,
      amount_cents: true,
      currency: true,
      interval: true,
      interval_count: true,
      created_at: true,
    },
  });
  return {
    offer: {
      price_version_id: offer.price_version_id,
      revision: offer.revision,
      checkout_enabled: offer.checkout_enabled,
      updated_at: offer.updated_at,
    },
    price,
  };
}

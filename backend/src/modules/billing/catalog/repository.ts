import type { Prisma } from "@/external/generated/prisma/client";
import { isSupportedStripeCheckoutPrice } from "../stripe/checkout-price-policy";
import { CatalogError } from "./policy";

export async function catalogActor(tx: Prisma.TransactionClient, actorId: string) {
  const actor = await tx.admin.findFirst({
    where: { id: actorId, active: true, deleted: false, confirmed: true, need_reset: false },
    select: { id: true },
  });
  if (!actor) throw new CatalogError("catalog_actor_invalid");
  return actor;
}
export async function catalogOfferContext(
  tx: Prisma.TransactionClient,
  scope: { mode: string; account_id: string },
  lock = false,
) {
  const plan = await tx.subscription_plan.findFirst({
    where: { slug: "profissional", deleted: false },
    select: { id: true, active: true },
  });
  if (!plan) throw new CatalogError("catalog_not_configured");
  if (lock) await tx.$queryRaw`SELECT id FROM subscription_plans WHERE id = ${plan.id} FOR UPDATE`;
  const where = { plan_id: plan.id, gateway: "stripe", ...scope };
  const offer = await tx.billing_offer.findFirst({ where });
  return { plan, offer, where };
}
export async function catalogContext(
  tx: Prisma.TransactionClient,
  scope: { mode: string; account_id: string },
  lock = false,
) {
  const { plan, offer, where } = await catalogOfferContext(tx, scope, lock);
  const current = offer
    ? await tx.billing_price_version.findFirst({ where: { id: offer.price_version_id, ...where } })
    : await tx.billing_price_version.findFirst({
        where,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
      });
  if (
    !current ||
    !isSupportedStripeCheckoutPrice(current) ||
    !/^prod_[A-Za-z0-9]{1,100}$/.test(current.external_product_id)
  )
    throw new CatalogError("catalog_not_configured");
  return { plan, offer, current, where };
}
export async function catalogAudit(
  tx: Prisma.TransactionClient,
  input: {
    actorId: string;
    targetType: string;
    targetId: string;
    action: string;
    before?: Prisma.InputJsonObject;
    after: Prisma.InputJsonObject;
  },
) {
  await tx.admin_activity_log.create({
    data: {
      admin_id: input.actorId,
      target_type: input.targetType,
      target_id: input.targetId,
      domain: "billing",
      action: input.action,
      source: "admin_panel",
      reason: "versioned_price_management",
      changed_fields: Object.keys(input.after),
      ...(input.before ? { safe_before: input.before } : {}),
      safe_after: input.after,
      metadata: { gateway: "stripe", existing_contracts_changed: false },
    },
  });
}

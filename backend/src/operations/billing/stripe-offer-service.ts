import type { Prisma } from "@/external/generated/prisma/client";
import { getStripeGateway } from "@/modules/billing/payment-gateway";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import {
  assertImmutableStripePrice,
  assertStripeOfferActivationReady,
  assertStripeOfferPrice,
  planStripeOfferChange,
  type StripeOfferArguments,
  StripeOfferError,
} from "./stripe-offer-policy";

const findCatalog = async (tx: Prisma.TransactionClient, args: StripeOfferArguments) => {
  const actor = await tx.admin.findFirst({
    where: {
      id: args.actorAdminId,
      active: true,
      deleted: false,
      confirmed: true,
      need_reset: false,
    },
    select: { id: true },
  });
  const plan = await tx.subscription_plan.findFirst({
    where: { slug: "profissional", active: true, deleted: false },
    select: { id: true },
  });
  if (!actor || !plan) throw new StripeOfferError();
  // Serialize catalog operators, including the initial absent offer, without changing the plan.
  await tx.$queryRaw`SELECT id FROM subscription_plans WHERE id = ${plan.id} FOR UPDATE`;
  const offer = await tx.billing_offer.findUnique({
    where: {
      plan_id_gateway_mode: { plan_id: plan.id, gateway: "stripe", mode: args.expectedMode },
    },
  });
  const version = await tx.billing_price_version.findUnique({
    where: {
      gateway_mode_account_id_external_price_id: {
        gateway: "stripe",
        mode: args.expectedMode,
        account_id: args.expectedAccountId,
        external_price_id: args.priceId,
      },
    },
  });
  return { actor, plan, offer, version };
};

/** Local catalog only. Never creates a Stripe Price or changes existing subscription items. */
export const configureStripeOffer = async (args: StripeOfferArguments) => {
  assertStripeOfferActivationReady(args);
  const gateway = getStripeGateway();
  const remote = await gateway.getStripePlan(args.priceId);
  assertStripeOfferPrice(args, gateway.identity, remote);
  if (args.sales === "enable") await gateway.verifyCheckoutReadiness();
  return withSerializableTransaction(async (tx) => {
    const { actor, plan, offer, version } = await findCatalog(tx, args);
    if (version) assertImmutableStripePrice(version, plan.id, remote);
    const change = planStripeOfferChange(
      args,
      offer,
      Boolean(version && offer?.price_version_id === version.id),
    );
    const result = {
      mode: args.expectedMode,
      amount_cents: remote.amountCents,
      currency: remote.currency,
      interval: remote.interval,
      current_revision: offer?.revision ?? 0,
      next_revision: change.revision,
      checkout_enabled: change.enabled,
      changed: change.changed,
      applied: false,
      end_to_end_readiness_verified: false,
    };
    if (!args.apply || !change.changed) return result;
    const saved =
      version ??
      (await tx.billing_price_version.create({
        data: {
          plan_id: plan.id,
          gateway: "stripe",
          mode: remote.mode,
          account_id: remote.accountId,
          external_product_id: remote.productId,
          external_price_id: remote.priceId,
          amount_cents: remote.amountCents,
          currency: remote.currency,
          interval: remote.interval,
          interval_count: remote.intervalCount,
        },
      }));
    let offerId: string;
    if (offer) {
      const updated = await tx.billing_offer.updateMany({
        where: {
          id: offer.id,
          revision: args.expectedRevision,
          account_id: args.expectedAccountId,
        },
        data: {
          price_version_id: saved.id,
          checkout_enabled: change.enabled,
          revision: change.revision,
        },
      });
      if (updated.count !== 1) throw new StripeOfferError();
      offerId = offer.id;
    } else {
      const created = await tx.billing_offer.create({
        data: {
          plan_id: plan.id,
          gateway: "stripe",
          mode: remote.mode,
          account_id: remote.accountId,
          price_version_id: saved.id,
          checkout_enabled: change.enabled,
          revision: change.revision,
        },
      });
      offerId = created.id;
    }
    await tx.admin_activity_log.create({
      data: {
        admin_id: actor.id,
        target_type: "billing_offer",
        target_id: offerId,
        domain: "billing",
        action: "stripe_offer_configured",
        source: "operator_cli",
        reason: args.reason,
        changed_fields: ["price_version_id", "checkout_enabled", "revision"],
        ...(offer
          ? {
              safe_before: {
                price_version_id: offer.price_version_id,
                checkout_enabled: offer.checkout_enabled,
                revision: offer.revision,
              },
            }
          : {}),
        safe_after: {
          price_version_id: saved.id,
          checkout_enabled: change.enabled,
          revision: change.revision,
          amount_cents: remote.amountCents,
          currency: remote.currency,
          interval: remote.interval,
        },
        metadata: { gateway: "stripe", mode: remote.mode, existing_contracts_changed: false },
      },
    });
    return { ...result, applied: true };
  });
};

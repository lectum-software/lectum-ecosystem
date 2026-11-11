import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { getStripeGateway } from "../payment-gateway";
import { getNewSubscriptionGatewayName } from "../payment-gateway/stripe-config";
import {
  assertImmutableStripePrice,
  assertStripeOfferActivationReady,
  assertStripeOfferPrice,
} from "./offer-policy";
import { CatalogError, catalogScope } from "./policy";
import { catalogActor, catalogAudit, catalogContext, catalogOfferContext } from "./repository";

const checkRevision = (expected: number, actual: number) => {
  if (!Number.isSafeInteger(expected) || expected < 0 || expected !== actual)
    throw new CatalogError("catalog_conflict");
};
const safeOffer = (
  row: { revision: number; checkout_enabled: boolean; price_version_id: string },
  changed: boolean,
) => ({
  revision: row.revision,
  checkout_enabled: row.checkout_enabled,
  price_version_id: row.price_version_id,
  changed,
  existing_contracts_changed: false as const,
});
function assertPublicationGates() {
  if (
    getNewSubscriptionGatewayName() !== "stripe" ||
    process.env.BILLING_STRIPE_COLLECTION_ENABLED !== "true" ||
    process.env.BILLING_STRIPE_RECONCILIATION_ENABLED !== "true"
  )
    throw new CatalogError("catalog_publication_blocked");
}
/** All remote verification precedes the transaction; the transaction revalidates revision/product/scope. */
export async function setCatalogOffer(
  actorId: string,
  input: {
    expected_revision: number;
    price_version_id?: string;
    enabled?: boolean;
    confirm_publish?: boolean;
    confirm_new_adhesions_only?: boolean;
  },
) {
  const scope = catalogScope();
  if (input.enabled === false) return pauseCatalogOffer(actorId, input.expected_revision);
  const preview = await withSerializableTransaction(async (tx) => {
    await catalogActor(tx, actorId);
    const context = await catalogContext(tx, scope);
    checkRevision(input.expected_revision, context.offer?.revision ?? 0);
    const version = input.price_version_id
      ? await tx.billing_price_version.findFirst({
          where: { id: input.price_version_id, ...context.where },
        })
      : context.current;
    if (!version || version.external_product_id !== context.current.external_product_id)
      throw new CatalogError("catalog_invalid_input");
    return { ...context, version };
  });
  const publishing = input.enabled === true;
  if (
    (publishing && input.confirm_publish !== true) ||
    (!publishing && input.confirm_new_adhesions_only !== true)
  )
    throw new CatalogError("catalog_invalid_input");
  if (publishing && !preview.offer) throw new CatalogError("catalog_publication_blocked");
  if (publishing) assertPublicationGates();
  const args = {
    apply: true,
    expectedAccountId: scope.account_id,
    expectedMode: scope.mode,
    expectedRevision: input.expected_revision,
    priceId: preview.version.external_price_id,
    actorAdminId: actorId,
    reason: publishing ? ("enable_checkout" as const) : ("replace_offer" as const),
    sales: publishing ? ("enable" as const) : ("disable" as const),
  };
  assertStripeOfferActivationReady(args);
  const gateway = getStripeGateway();
  const remote = await gateway.getStripePlan(preview.version.external_price_id);
  assertStripeOfferPrice(args, gateway.identity, remote);
  assertImmutableStripePrice(preview.version, preview.plan.id, remote);
  if (publishing) await gateway.verifyCheckoutReadiness();
  return withSerializableTransaction(async (tx) => {
    await catalogActor(tx, actorId);
    const context = await catalogContext(tx, scope, true);
    checkRevision(input.expected_revision, context.offer?.revision ?? 0);
    if (
      !context.plan.active ||
      context.current.external_product_id !== preview.version.external_product_id
    )
      throw new CatalogError("catalog_publication_blocked");
    if (publishing) {
      assertPublicationGates();
      assertStripeOfferActivationReady(args);
    }
    const version = await tx.billing_price_version.findFirst({
      where: { id: preview.version.id, ...context.where },
    });
    if (!version) throw new CatalogError("catalog_conflict");
    assertImmutableStripePrice(version, context.plan.id, remote);
    const enabled = publishing;
    if (
      context.offer?.price_version_id === version.id &&
      context.offer?.checkout_enabled === enabled
    )
      return safeOffer(context.offer, false);
    if (!context.offer) {
      const offer = await tx.billing_offer.create({
        data: {
          ...context.where,
          price_version_id: version.id,
          checkout_enabled: enabled,
          revision: 1,
        },
      });
      await catalogAudit(tx, {
        actorId,
        targetType: "billing_offer",
        targetId: offer.id,
        action: "stripe_offer_linked_paused",
        after: { revision: 1, price_version_id: version.id, checkout_enabled: enabled },
      });
      return safeOffer(offer, true);
    }
    const count = await tx.billing_offer.updateMany({
      where: {
        id: context.offer.id,
        revision: input.expected_revision,
        account_id: scope.account_id,
      },
      data: { price_version_id: version.id, checkout_enabled: enabled, revision: { increment: 1 } },
    });
    if (count.count !== 1) throw new CatalogError("catalog_conflict");
    const offer = await tx.billing_offer.findUniqueOrThrow({ where: { id: context.offer.id } });
    await catalogAudit(tx, {
      actorId,
      targetType: "billing_offer",
      targetId: offer.id,
      action: publishing ? "stripe_offer_published" : "stripe_offer_linked_paused",
      before: {
        revision: context.offer?.revision ?? 0,
        price_version_id: context.offer?.price_version_id,
        checkout_enabled: context.offer?.checkout_enabled,
      },
      after: {
        revision: offer.revision,
        price_version_id: offer.price_version_id,
        checkout_enabled: offer.checkout_enabled,
      },
    });
    return safeOffer(offer, true);
  });
}
/** Pause never instantiates a gateway, retrieves a key, or contacts Stripe. */
export async function pauseCatalogOffer(actorId: string, expectedRevision: number) {
  const scope = catalogScope();
  return withSerializableTransaction(async (tx) => {
    await catalogActor(tx, actorId);
    const context = await catalogOfferContext(tx, scope, true);
    if (!context.offer) throw new CatalogError("catalog_not_configured");
    checkRevision(expectedRevision, context.offer?.revision ?? 0);
    if (!context.offer?.checkout_enabled) return safeOffer(context.offer, false);
    const offer = await tx.billing_offer.update({
      where: { id: context.offer.id },
      data: { checkout_enabled: false, revision: { increment: 1 } },
    });
    await catalogAudit(tx, {
      actorId,
      targetType: "billing_offer",
      targetId: offer.id,
      action: "stripe_offer_paused",
      before: { revision: context.offer?.revision ?? 0, checkout_enabled: true },
      after: { revision: offer.revision, checkout_enabled: false },
    });
    return safeOffer(offer, true);
  });
}

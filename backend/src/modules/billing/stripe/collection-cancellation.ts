import prisma from "@/infra/database/prisma";
import { getStripeGateway } from "../payment-gateway";
import type { StripeIdentity } from "../payment-gateway/stripe-types";
import { CREDIT_COLLECTION_POLICY } from "./collection-policy";
import { StripeBillingError } from "./policy";

export const CREDIT_CANCELLATION_REQUESTED = "manual_credit_cancel_requested_v1";

/** Same row lock as collection claim/renew. Never release this fence after an ambiguous cancellation. */
export const prepareStripeCreditCancellation = async (
  localSubscriptionId: string,
  identity: StripeIdentity,
) =>
  prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; collection_policy: string | null }>>`
      SELECT id, collection_policy FROM professional_subscriptions
      WHERE id = ${localSubscriptionId} AND gateway = 'stripe'
      AND gateway_mode = ${identity.mode} AND gateway_account_id = ${identity.accountId}
      FOR UPDATE`;
    if (rows.length !== 1) throw new StripeBillingError("billing_operation_not_found", 404);
    const local = rows[0];
    if (local.collection_policy === null) return false;
    if (
      ![CREDIT_COLLECTION_POLICY, CREDIT_CANCELLATION_REQUESTED].includes(local.collection_policy)
    )
      throw new StripeBillingError("billing_operation_conflict");
    const running = await tx.billing_operation.count({
      where: {
        subscription_id: local.id,
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        kind: "collection",
        state: { notIn: ["complete", "failed"] },
        lease_token: { not: null },
        lease_until: { gt: new Date() },
      },
    });
    if (running) throw new StripeBillingError("billing_operation_pending");
    await tx.professional_subscription.update({
      where: { id: local.id },
      data: { collection_policy: CREDIT_CANCELLATION_REQUESTED },
    });
    return true;
  });

/** Called after the durable fence and before canceling the provider subscription. Never refunds/captures. */
export const cancelPendingStripeCreditIntents = async (
  localSubscriptionId: string,
  identity: StripeIdentity,
) => {
  const gateway = getStripeGateway();
  if (gateway.identity.mode !== identity.mode || gateway.identity.accountId !== identity.accountId)
    throw new StripeBillingError("billing_operation_conflict");
  const local = await prisma.professional_subscription.findFirst({
    where: {
      id: localSubscriptionId,
      gateway: "stripe",
      gateway_mode: identity.mode,
      gateway_account_id: identity.accountId,
    },
  });
  if (!local || ![CREDIT_CANCELLATION_REQUESTED, null].includes(local.collection_policy))
    throw new StripeBillingError("billing_operation_conflict");
  if (local.collection_policy === null) return;
  const operations = await prisma.billing_operation.findMany({
    where: {
      subscription_id: local.id,
      gateway: "stripe",
      mode: identity.mode,
      account_id: identity.accountId,
      kind: "collection",
      state: { notIn: ["complete", "failed"] },
    },
    take: 21,
  });
  if (operations.length > 20) throw new StripeBillingError("billing_operation_review_required");
  for (const operation of operations) {
    if (operation.lease_token && operation.lease_until && operation.lease_until > new Date())
      throw new StripeBillingError("billing_operation_pending");
    const [customer, price] = await Promise.all([
      prisma.billing_customer.findFirst({
        where: {
          id: operation.customer_id ?? "",
          user_id: operation.user_id,
          gateway: "stripe",
          mode: identity.mode,
          account_id: identity.accountId,
        },
      }),
      prisma.billing_price_version.findFirst({
        where: {
          id: operation.price_version_id ?? "",
          gateway: "stripe",
          mode: identity.mode,
          account_id: identity.accountId,
        },
      }),
    ]);
    if (
      !customer?.external_customer_id ||
      !price ||
      !operation.provider_subscription_id ||
      operation.provider_subscription_id !== local.gateway_subscription_id ||
      !operation.provider_invoice_id ||
      !operation.provider_payment_method_id ||
      price.id !== local.price_version_id ||
      price.amount_cents !== local.contracted_amount_cents ||
      price.currency !== "BRL"
    )
      throw new StripeBillingError("billing_operation_conflict");
    const input = {
      localSubscriptionId: local.id,
      subscriptionId: operation.provider_subscription_id,
      customerId: customer.external_customer_id,
      invoiceId: operation.provider_invoice_id,
      priceId: price.external_price_id,
      amountCents: price.amount_cents,
      attemptId: operation.id,
      paymentMethodId: operation.provider_payment_method_id,
    };
    const intent = operation.provider_intent_id
      ? await gateway.cancelCreditInvoiceIntent({
          ...input,
          intentId: operation.provider_intent_id,
        })
      : await gateway.findCreditInvoiceIntent(input);
    const canceled =
      intent && intent.status !== "canceled" && intent.status !== "succeeded"
        ? await gateway.cancelCreditInvoiceIntent({ ...input, intentId: intent.intentId })
        : intent;
    if (canceled && !["canceled", "succeeded"].includes(canceled.status))
      throw new StripeBillingError("billing_operation_pending");
    if (canceled?.status === "succeeded") {
      // A real capture remains a financial fact, even when access is canceled afterwards.
      await prisma.billing_operation.updateMany({
        where: { id: operation.id, state: { notIn: ["complete", "failed"] } },
        data: { state: "review_required", last_error_code: "captured_before_cancellation" },
      });
      continue;
    }
    await prisma.$transaction(async (tx) => {
      await tx.billing_operation.updateMany({
        where: { id: operation.id, state: { notIn: ["complete", "failed"] } },
        data: {
          state: "failed",
          last_error_code: "collection_canceled",
          completed_at: new Date(),
          lease_token: null,
          lease_until: null,
        },
      });
      if (operation.parent_operation_id && canceled?.status === "canceled")
        await tx.billing_operation.updateMany({
          where: {
            id: operation.parent_operation_id,
            kind: "checkout",
            subscription_id: local.id,
            user_id: operation.user_id,
            gateway: "stripe",
            mode: identity.mode,
            account_id: identity.accountId,
            provider_intent_id: canceled.intentId,
            state: { notIn: ["complete", "failed"] },
          },
          data: {
            state: "failed",
            last_error_code: "collection_canceled",
            completed_at: new Date(),
          },
        });
    });
  }
};

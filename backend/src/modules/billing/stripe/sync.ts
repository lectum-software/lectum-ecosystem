import prisma from "@/infra/database/prisma";
import { getStripeGateway } from "../payment-gateway";
import type { StripeCanonicalSubscription, StripeIdentity } from "../payment-gateway/stripe-types";
import { refreshStripeCardProjection } from "./card-projection";
import {
  isCurrentOriginalCheckoutPaymentComplete,
  isOriginalCheckoutCaptureComplete,
  unresolvedTerminalCheckoutUpdate,
} from "./checkout-completion";
import { FinancialLedgerRepository } from "./financial-ledger/repository";
import {
  canonicalTerminal,
  hasPaidCurrentPeriod,
  isCourtesySetupVerified,
  resolveStripeEntitlement,
  StripeBillingError,
} from "./policy";
import { TERMINAL_OPERATION_STATES } from "./recovery-policy";

const identityWhere = (identity: StripeIdentity) => ({
  gateway: "stripe",
  gateway_mode: identity.mode,
  gateway_account_id: identity.accountId,
  deleted: false,
});

export const syncStripeSubscription = async (
  remoteId: string,
  expectedLocalId?: string,
  options: { verifiedCreditSetupId?: string } = {},
) => {
  const gateway = getStripeGateway();
  const identity = gateway.identity;
  let local = await prisma.professional_subscription.findFirst({
    where: {
      ...identityWhere(identity),
      gateway_subscription_id: remoteId,
      ...(expectedLocalId ? { id: expectedLocalId } : {}),
    },
  });
  let remote: StripeCanonicalSubscription;
  if (!local) {
    const reference = await gateway.getStripeSubscription(remoteId);
    if (
      !reference.localSubscriptionId ||
      (expectedLocalId && reference.localSubscriptionId !== expectedLocalId)
    )
      throw new StripeBillingError("billing_operation_conflict");
    local = await prisma.professional_subscription.findFirst({
      where: {
        ...identityWhere(identity),
        id: reference.localSubscriptionId,
        OR: [{ gateway_subscription_id: null }, { gateway_subscription_id: remoteId }],
      },
    });
  }
  if (!local) throw new StripeBillingError("billing_operation_not_found", 404);
  // Snapshot the local revision before reading canonical state. Concurrent writes cause a retry, not overwrite.
  remote = await gateway.getStripeSubscription(remoteId);
  const profile = await prisma.psychologist_profile.findFirst({
    where: { id: local.psychologist_id, deleted: false, user: { active: true, deleted: false } },
    select: { user_id: true },
  });
  const customer = profile
    ? await prisma.billing_customer.findFirst({
        where: {
          user_id: profile.user_id,
          gateway: "stripe",
          mode: identity.mode,
          account_id: identity.accountId,
          external_customer_id: remote.customerId,
        },
      })
    : null;
  const price = local.price_version_id
    ? await prisma.billing_price_version.findFirst({
        where: {
          id: local.price_version_id,
          gateway: "stripe",
          mode: identity.mode,
          account_id: identity.accountId,
        },
      })
    : null;
  if (
    !customer ||
    !price ||
    remote.localSubscriptionId !== local.id ||
    remote.subscriptionId !== remoteId ||
    remote.accountId !== identity.accountId ||
    remote.mode !== identity.mode ||
    price.external_price_id !== remote.priceId ||
    price.amount_cents !== remote.amountCents ||
    price.currency !== remote.currency ||
    price.interval !== remote.interval ||
    local.contracted_amount_cents !== price.amount_cents ||
    local.contracted_currency !== price.currency ||
    local.contracted_interval !== price.interval ||
    local.contracted_interval_count !== price.interval_count
  )
    throw new StripeBillingError("billing_operation_conflict");
  const operation = remote.attemptId
    ? await prisma.billing_operation.findFirst({
        where: {
          id: remote.attemptId,
          subscription_id: local.id,
          customer_id: customer.id,
          user_id: profile!.user_id,
          gateway: "stripe",
          mode: identity.mode,
          account_id: identity.accountId,
          kind: "checkout",
          price_version_id: price.id,
          OR: [{ provider_subscription_id: null }, { provider_subscription_id: remoteId }],
        },
      })
    : null;
  if (!operation) throw new StripeBillingError("billing_operation_conflict");
  const now = new Date();
  const state = resolveStripeEntitlement(remote, local, now);
  const applied = await prisma.professional_subscription.updateMany({
    where: {
      id: local.id,
      updatedAt: local.updatedAt,
      status: local.status,
      current_period_end: local.current_period_end,
      gateway_subscription_id: local.gateway_subscription_id,
      ...identityWhere(identity),
    },
    data: {
      gateway_subscription_id: remoteId,
      status: state.status,
      current_period_end: state.currentPeriodEnd,
      billing_grace_ends_at: null,
      billing_issue_started_at: null,
      billing_downgraded_at: null,
      billing_last_notice_key: null,
    },
  });
  if (!applied.count) throw new StripeBillingError("billing_operation_pending");
  const currentPaidCheckout = isCurrentOriginalCheckoutPaymentComplete(
    operation,
    remote,
    state.status,
    now,
  );
  const entitlementActive =
    hasPaidCurrentPeriod(remote, now) &&
    ["ativa", "cancelada"].includes(state.status) &&
    Boolean(state.currentPeriodEnd && state.currentPeriodEnd > now);
  const originalReceipt =
    !currentPaidCheckout && !TERMINAL_OPERATION_STATES.includes(operation.state)
      ? await new FinancialLedgerRepository().originalCheckoutReceipt(operation, remoteId)
      : null;
  // A captured original payment closes its operation even after expiry/refund; it grants no current access.
  const historicalCaptureCompleted = isOriginalCheckoutCaptureComplete(
    operation,
    originalReceipt,
    local.contracted_amount_cents,
    now,
  );
  const operationCompleted = currentPaidCheckout || historicalCaptureCompleted;
  const setup =
    operation.intent === "courtesy_renewal" &&
    operation.intent_kind === "setup" &&
    operation.provider_intent_id &&
    options.verifiedCreditSetupId === operation.provider_intent_id &&
    remote.gatewayStatus === "trialing"
      ? await gateway.retrieveSetup(operation.provider_intent_id)
      : null;
  const scheduled = isCourtesySetupVerified({
    intent: operation.intent,
    intentKind: operation.intent_kind,
    pinnedIntentId: operation.provider_intent_id,
    scheduledStart: operation.scheduled_start_at,
    previousStatus: local.status,
    remote,
    setup,
    verifiedCreditSetupId: options.verifiedCreditSetupId,
  });
  if (operationCompleted || scheduled) {
    try {
      await refreshStripeCardProjection({
        userId: profile!.user_id,
        psychologistId: local.psychologist_id,
        localSubscriptionId: local.id,
        subscriptionId: remoteId,
        customerId: remote.customerId,
      });
    } catch {
      // The display is secondary to paid evidence; never expose provider details or undo paid entitlement.
      console.warn("[BILLING_STRIPE] Resumo do cartão aguardando atualização.");
    }
  }
  // Recover a missing local binding after a response was lost; only exact provider metadata is accepted.
  if (remote.attemptId) {
    await prisma.billing_operation.updateMany({
      where: {
        id: remote.attemptId,
        kind: "checkout",
        subscription_id: local.id,
        user_id: profile!.user_id,
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        state: { notIn: TERMINAL_OPERATION_STATES },
        ...(operationCompleted
          ? {
              intent: "subscription",
              intent_kind: "payment",
              provider_intent_id: operation.provider_intent_id,
              price_version_id: operation.price_version_id,
            }
          : {}),
        OR: [{ provider_subscription_id: null }, { provider_subscription_id: remoteId }],
      },
      data: {
        provider_subscription_id: remoteId,
        ...(operationCompleted || scheduled
          ? {
              state: "complete",
              completed_at: now,
              last_error_code: null,
              lease_token: null,
              lease_until: null,
            }
          : canonicalTerminal(remote)
            ? {
                ...unresolvedTerminalCheckoutUpdate(operation, now),
                lease_token: null,
                lease_until: null,
              }
            : {}),
      },
    });
  }
  return {
    remote,
    local: { ...local, status: state.status, current_period_end: state.currentPeriodEnd },
    operationCompleted,
    entitlementActive,
    historicalCaptureCompleted,
    scheduled,
  };
};

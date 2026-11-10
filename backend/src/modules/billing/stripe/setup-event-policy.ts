import type { billing_customer, billing_operation } from "@/external/generated/prisma/client";
import type { StripeIdentity, StripeSetup } from "../payment-gateway/stripe-types";
import { TERMINAL_OPERATION_STATES } from "./recovery-policy";

export type SetupEventCandidate = {
  operation: Pick<
    billing_operation,
    | "id"
    | "user_id"
    | "customer_id"
    | "subscription_id"
    | "gateway"
    | "mode"
    | "account_id"
    | "kind"
    | "intent"
    | "state"
    | "intent_kind"
    | "provider_intent_id"
    | "provider_subscription_id"
  > &
    Partial<Pick<billing_operation, "provider_setup_intent_id">>;
  customer: Pick<
    billing_customer,
    "id" | "user_id" | "gateway" | "mode" | "account_id" | "external_customer_id"
  > | null;
};

/** Absence of metadata is never evidence that a provider-generated setup is irrelevant. */
export const classifyStripeSetupEvent = (input: {
  setup: StripeSetup;
  resourceId: string;
  subscriptionHint: string | null;
  identity: StripeIdentity;
  candidates: SetupEventCandidate[];
}) => {
  const { setup, identity, candidates, subscriptionHint } = input;
  const conflict = { action: "conflict" } as const;
  const unresolved = { action: "unresolved" } as const;
  if (
    setup.setupIntentId !== input.resourceId ||
    setup.mode !== identity.mode ||
    setup.accountId !== identity.accountId ||
    candidates.length > 1 ||
    (subscriptionHint && setup.subscriptionId && subscriptionHint !== setup.subscriptionId)
  )
    return conflict;
  if (!candidates.length) return unresolved;
  const { operation, customer } = candidates[0];
  const standaloneCheckout =
    operation.kind === "checkout" &&
    setup.attemptId === operation.id &&
    setup.localSubscriptionId === operation.subscription_id &&
    setup.subscriptionId === null;
  const pinnedId = standaloneCheckout
    ? operation.provider_setup_intent_id
    : operation.provider_intent_id;
  if (
    operation.gateway !== "stripe" ||
    operation.mode !== identity.mode ||
    operation.account_id !== identity.accountId ||
    !(
      operation.kind === "payment_method" ||
      standaloneCheckout ||
      (operation.kind === "checkout" && operation.intent === "courtesy_renewal")
    ) ||
    (!standaloneCheckout && operation.intent_kind !== null && operation.intent_kind !== "setup") ||
    (pinnedId != null && pinnedId !== setup.setupIntentId) ||
    (setup.attemptId !== null && setup.attemptId !== operation.id) ||
    (setup.localSubscriptionId && setup.localSubscriptionId !== operation.subscription_id) ||
    (setup.subscriptionId &&
      operation.provider_subscription_id &&
      setup.subscriptionId !== operation.provider_subscription_id) ||
    (subscriptionHint &&
      operation.provider_subscription_id &&
      subscriptionHint !== operation.provider_subscription_id)
  )
    return conflict;
  if (!customer || !operation.customer_id || !operation.subscription_id) return unresolved;
  if (
    customer.id !== operation.customer_id ||
    customer.user_id !== operation.user_id ||
    customer.gateway !== "stripe" ||
    customer.mode !== identity.mode ||
    customer.account_id !== identity.accountId ||
    (customer.external_customer_id !== null && customer.external_customer_id !== setup.customerId)
  )
    return conflict;
  if (
    !customer.external_customer_id ||
    (!standaloneCheckout && !operation.provider_subscription_id)
  )
    return unresolved;
  const pinned = pinnedId === setup.setupIntentId;
  if (!pinned && setup.attemptId !== operation.id) return unresolved;
  if (TERMINAL_OPERATION_STATES.includes(operation.state)) {
    // A metadata pointer alone cannot attach a new event to an already finished operation.
    return pinned ? ({ action: "terminal", operation } as const) : unresolved;
  }
  return { action: "process", operation } as const;
};

export const unresolvedStripeSetupEvent = (attempts: number, conflict = false) => ({
  state: conflict || attempts >= 10 ? ("review_required" as const) : ("pending" as const),
  last_error_code: conflict ? "setup_operation_conflict" : "setup_operation_unresolved",
});

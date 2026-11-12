import type {
  billing_customer,
  billing_operation,
  professional_subscription,
} from "@/external/generated/prisma/client";
import type {
  StripeAuxiliarySetupProof,
  StripeAuxiliarySetupScope,
} from "../payment-gateway/stripe-auxiliary-setup";
import { stripeCreditCardRequestHash } from "../payment-gateway/stripe-idempotency";
import { localReference, stripeId } from "../payment-gateway/stripe-projection";
import type { StripeIdentity, StripeSetup } from "../payment-gateway/stripe-types";

export const AUXILIARY_SETUP_CANDIDATE_LIMIT = 20;
export type AuxiliarySetupEvent = {
  type: string;
  resource_id: string;
  provider_subscription_id: string | null;
  request_idempotency_key_hash: string | null;
};
export type AuxiliarySetupCandidate = {
  operation: Pick<
    billing_operation,
    | "id"
    | "user_id"
    | "psychologist_id"
    | "subscription_id"
    | "customer_id"
    | "gateway"
    | "mode"
    | "account_id"
    | "kind"
    | "intent"
    | "state"
    | "provider_subscription_id"
    | "provider_setup_intent_id"
    | "provider_payment_method_id"
  >;
  customer: Pick<
    billing_customer,
    "id" | "user_id" | "gateway" | "mode" | "account_id" | "external_customer_id"
  >;
  subscription: Pick<
    professional_subscription,
    | "id"
    | "psychologist_id"
    | "gateway"
    | "gateway_mode"
    | "gateway_account_id"
    | "gateway_subscription_id"
    | "collection_policy"
  > | null;
  profile: { id: string; user_id: string } | null;
};

export const canInspectAuxiliaryStripeSetup = (
  event: AuxiliarySetupEvent,
  setup: StripeSetup,
  identity: StripeIdentity,
) =>
  event.type === "setup_intent.succeeded" &&
  setup.status === "succeeded" &&
  typeof event.request_idempotency_key_hash === "string" &&
  event.request_idempotency_key_hash.length === 64 &&
  /^[a-f0-9]{64}$/.test(event.request_idempotency_key_hash) &&
  setup.setupIntentId === event.resource_id &&
  setup.accountId === identity.accountId &&
  setup.mode === identity.mode &&
  setup.attemptId === null &&
  setup.localSubscriptionId === null &&
  setup.subscriptionId === null &&
  Boolean(stripeId(setup.customerId, "cus")) &&
  Boolean(stripeId(setup.paymentMethodId, "pm"));

/** Signed request hash and historical local pins, not absence of metadata, establish the origin. */
export function classifyAuxiliaryStripeSetup(
  event: AuxiliarySetupEvent,
  setup: StripeSetup,
  identity: StripeIdentity,
  candidates: AuxiliarySetupCandidate[],
) {
  const unresolved = { action: "unresolved" } as const;
  const conflict = { action: "conflict" } as const;
  if (!canInspectAuxiliaryStripeSetup(event, setup, identity)) return unresolved;
  if (candidates.length > AUXILIARY_SETUP_CANDIDATE_LIMIT) return conflict;
  const matching = candidates.filter(
    ({ operation: op, customer, subscription: sub, profile }) =>
      op.gateway === "stripe" &&
      op.mode === identity.mode &&
      op.account_id === identity.accountId &&
      op.kind === "checkout" &&
      op.state === "complete" &&
      ["subscription", "courtesy_renewal"].includes(op.intent ?? "") &&
      localReference(op.id) &&
      localReference(op.user_id) &&
      localReference(op.subscription_id) &&
      op.customer_id === customer.id &&
      op.user_id === customer.user_id &&
      customer.gateway === "stripe" &&
      customer.mode === identity.mode &&
      customer.account_id === identity.accountId &&
      customer.external_customer_id === setup.customerId &&
      op.provider_payment_method_id === setup.paymentMethodId &&
      stripeId(op.provider_setup_intent_id, "seti") &&
      op.provider_setup_intent_id !== event.resource_id &&
      stripeId(op.provider_subscription_id, "sub") &&
      sub &&
      sub.id === op.subscription_id &&
      sub.psychologist_id === op.psychologist_id &&
      sub.gateway === "stripe" &&
      sub.gateway_mode === identity.mode &&
      sub.gateway_account_id === identity.accountId &&
      sub.gateway_subscription_id === op.provider_subscription_id &&
      ["manual_credit_v1", "manual_credit_cancel_requested_v1"].includes(
        sub.collection_policy ?? "",
      ) &&
      profile?.id === op.psychologist_id &&
      profile.user_id === op.user_id &&
      (!event.provider_subscription_id ||
        event.provider_subscription_id === op.provider_subscription_id) &&
      stripeCreditCardRequestHash(
        identity,
        op.provider_subscription_id!,
        op.provider_payment_method_id!,
      ) === event.request_idempotency_key_hash,
  );
  if (matching.length > 1) return conflict;
  if (!matching.length) return unresolved;
  const op = matching[0].operation;
  const scope: StripeAuxiliarySetupScope = {
    setupIntentId: event.resource_id,
    customerId: setup.customerId,
    paymentMethodId: setup.paymentMethodId!,
    subscriptionId: op.provider_subscription_id!,
    localSubscriptionId: op.subscription_id!,
    attemptId: op.id,
  };
  return { action: "verify", scope, candidate: matching[0] } as const;
}

export function matchesAuxiliarySetupProof(
  proof: StripeAuxiliarySetupProof,
  scope: StripeAuxiliarySetupScope,
  identity: StripeIdentity,
) {
  return (
    proof.accountId === identity.accountId &&
    proof.mode === identity.mode &&
    proof.metadataAbsent === true &&
    proof.status === "succeeded" &&
    (Object.keys(scope) as Array<keyof StripeAuxiliarySetupScope>).every(
      (key) => proof[key] === scope[key],
    )
  );
}

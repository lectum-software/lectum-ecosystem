import type { StripeAuxiliarySetupProof } from "../payment-gateway/stripe-auxiliary-setup";
import { stripeCreditCardRequestHash } from "../payment-gateway/stripe-idempotency";
import type { StripeSetup } from "../payment-gateway/stripe-types";
import type { AuxiliarySetupCandidate, AuxiliarySetupEvent } from "./setup-auxiliary-event-policy";

// Disposable policy/PG references, not provider settlement evidence.
export const auxiliaryIdentity = { accountId: "acct_auxiliary", mode: "test" as const };
export const auxiliarySetup: StripeSetup = {
  ...auxiliaryIdentity,
  setupIntentId: "seti_auxiliary",
  customerId: "cus_auxiliary",
  paymentMethodId: "pm_auxiliary",
  status: "succeeded",
  attemptId: null,
  localSubscriptionId: null,
  subscriptionId: null,
};
export const auxiliaryScope = {
  setupIntentId: auxiliarySetup.setupIntentId,
  customerId: auxiliarySetup.customerId,
  paymentMethodId: auxiliarySetup.paymentMethodId!,
  subscriptionId: "sub_auxiliary",
  localSubscriptionId: "local-auxiliary",
  attemptId: "operation-auxiliary",
};
export const auxiliaryProof: StripeAuxiliarySetupProof = {
  ...auxiliaryIdentity,
  ...auxiliaryScope,
  metadataAbsent: true,
  status: "succeeded",
};
export const auxiliaryEvent: AuxiliarySetupEvent = {
  type: "setup_intent.succeeded",
  resource_id: auxiliarySetup.setupIntentId,
  provider_subscription_id: null,
  request_idempotency_key_hash: stripeCreditCardRequestHash(
    auxiliaryIdentity,
    auxiliaryScope.subscriptionId,
    auxiliaryScope.paymentMethodId,
  ),
};
export const auxiliaryCandidate: AuxiliarySetupCandidate = {
  operation: {
    id: auxiliaryScope.attemptId,
    user_id: "user-auxiliary",
    psychologist_id: "profile-auxiliary",
    subscription_id: auxiliaryScope.localSubscriptionId,
    customer_id: "customer-auxiliary",
    gateway: "stripe",
    mode: "test",
    account_id: auxiliaryIdentity.accountId,
    kind: "checkout",
    intent: "subscription",
    state: "complete",
    provider_subscription_id: auxiliaryScope.subscriptionId,
    provider_setup_intent_id: "seti_original",
    provider_payment_method_id: auxiliaryScope.paymentMethodId,
  },
  customer: {
    id: "customer-auxiliary",
    user_id: "user-auxiliary",
    gateway: "stripe",
    mode: "test",
    account_id: auxiliaryIdentity.accountId,
    external_customer_id: auxiliarySetup.customerId,
  },
  subscription: {
    id: auxiliaryScope.localSubscriptionId,
    psychologist_id: "profile-auxiliary",
    gateway: "stripe",
    gateway_mode: "test",
    gateway_account_id: auxiliaryIdentity.accountId,
    gateway_subscription_id: auxiliaryScope.subscriptionId,
    collection_policy: "manual_credit_v1",
  },
  profile: { id: "profile-auxiliary", user_id: "user-auxiliary" },
};

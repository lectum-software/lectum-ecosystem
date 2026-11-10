import type { billing_operation } from "@/external/generated/prisma/client";
import { getStripeGateway } from "../payment-gateway";
import { StripeBillingError } from "./policy";
import { mayReplayStripeCreate, requestFingerprint } from "./recovery-policy";
import type { StripeBillingRepository } from "./repository";

export const recoverStripeCardSetup = async (
  operation: billing_operation & { lease_token: string },
  repository: StripeBillingRepository,
  options: { allowReplay: boolean; knownSetupId?: string },
) => {
  const gateway = getStripeGateway();
  const customer = operation.customer_id
    ? await repository.customer(operation.customer_id, gateway.identity)
    : null;
  if (
    !customer?.external_customer_id ||
    customer.user_id !== operation.user_id ||
    !operation.provider_subscription_id ||
    !operation.subscription_id
  )
    throw new StripeBillingError("billing_operation_conflict");
  const input = {
    attemptId: operation.id,
    customerId: customer.external_customer_id,
    subscriptionId: operation.provider_subscription_id,
  };
  let setup =
    operation.provider_intent_id || options.knownSetupId
      ? await gateway.retrieveSetup(operation.provider_intent_id ?? options.knownSetupId!)
      : await gateway.findCardSetupForOperation(input);
  if (!setup) {
    const fingerprint = requestFingerprint("card-setup", [
      operation.id,
      operation.subscription_id,
      operation.mode,
      operation.account_id,
      customer.external_customer_id,
      operation.provider_subscription_id,
    ]);
    if (
      !options.allowReplay ||
      !mayReplayStripeCreate({
        state: operation.state,
        createdAt: operation.created_at,
        attempts: operation.attempts,
        storedFingerprint: operation.request_fingerprint,
        expectedFingerprint: fingerprint,
      })
    )
      throw new StripeBillingError("billing_operation_review_required");
    if (!(await repository.checkpointRequest(operation, operation.lease_token, fingerprint)).count)
      throw new StripeBillingError("billing_operation_pending");
    const created = await gateway.createCardSetup(input);
    if (
      !(
        await repository.pinOperationReferences(operation, operation.lease_token, {
          intentId: created.setupIntentId,
          intentKind: "setup",
        })
      ).count
    )
      throw new StripeBillingError("billing_operation_pending");
    setup = await gateway.retrieveSetup(created.setupIntentId);
  }
  if (
    setup.customerId !== customer.external_customer_id ||
    setup.mode !== operation.mode ||
    setup.accountId !== operation.account_id ||
    setup.attemptId !== operation.id ||
    setup.subscriptionId !== operation.provider_subscription_id ||
    setup.localSubscriptionId !== operation.subscription_id
  )
    throw new StripeBillingError("billing_operation_conflict");
  if (
    !(
      await repository.pinOperationReferences(operation, operation.lease_token, {
        intentId: setup.setupIntentId,
        intentKind: "setup",
      })
    ).count
  )
    throw new StripeBillingError("billing_operation_pending");
  return { setup, customerId: customer.external_customer_id };
};

import type { billing_operation } from "@/external/generated/prisma/client";
import { getStripeGateway } from "../payment-gateway";
import { assertStripePrice } from "./config-service";
import { obtainStripeCustomer } from "./customer-service";
import { StripeBillingError } from "./policy";
import { mayReplayStripeCreate, requestFingerprint } from "./recovery-policy";
import type { StripeBillingRepository } from "./repository";

export const recoverStripeCheckout = async (
  operation: billing_operation & { lease_token: string },
  repository: StripeBillingRepository,
  allowReplay: boolean,
) => {
  const gateway = getStripeGateway();
  if (!operation.subscription_id || !operation.price_version_id)
    throw new StripeBillingError("billing_operation_conflict");
  const email = await repository.userEmail(operation.user_id);
  const price = await repository.price(operation.price_version_id, gateway.identity);
  if (!price || !operation.customer_id) throw new StripeBillingError("billing_operation_conflict");
  // The immutable local customer row identifies its remote customer once recovered. Its binding cannot change.
  const fingerprint = requestFingerprint("subscription", [
    operation.id,
    operation.subscription_id,
    operation.mode,
    operation.account_id,
    operation.customer_id,
    price.external_price_id,
    email.trim(),
    operation.scheduled_start_at?.toISOString() ?? null,
  ]);
  const canReplay =
    allowReplay &&
    mayReplayStripeCreate({
      state: operation.state,
      createdAt: operation.created_at,
      attempts: operation.attempts,
      storedFingerprint: operation.request_fingerprint,
      expectedFingerprint: fingerprint,
    });
  // Checkpoint before the customer call too, so a lost customer response does not lose the original consent inputs.
  if (
    !operation.provider_subscription_id &&
    canReplay &&
    !(await repository.checkpointRequest(operation, operation.lease_token, fingerprint)).count
  )
    throw new StripeBillingError("billing_operation_pending");
  const customerId = await obtainStripeCustomer(operation, email, repository, canReplay);
  if (operation.provider_subscription_id)
    return { subscriptionId: operation.provider_subscription_id, customerId };
  const input = {
    attemptId: operation.id,
    subscriptionId: operation.subscription_id,
    customerId,
    priceId: price.external_price_id,
    payerEmail: email,
    startDate: operation.scheduled_start_at,
  };
  let result = await gateway.findSubscriptionForOperation(input);
  if (!result) {
    if (!canReplay) throw new StripeBillingError("billing_operation_review_required");
    if (!(await repository.checkpointRequest(operation, operation.lease_token, fingerprint)).count)
      throw new StripeBillingError("billing_operation_pending");
    await assertStripePrice(price, gateway.identity);
    result = await gateway.createEmbeddedSubscription(input);
  }
  if (!(await repository.bindSubscription(operation, result.subscriptionId)).count)
    throw new StripeBillingError("billing_operation_conflict");
  const pinned = await repository.pinOperationReferences(operation, operation.lease_token, {
    subscriptionId: result.subscriptionId,
    intentId: result.intentId,
    intentKind: result.intentKind,
  });
  if (!pinned.count) throw new StripeBillingError("billing_operation_pending");
  return { subscriptionId: result.subscriptionId, customerId };
};

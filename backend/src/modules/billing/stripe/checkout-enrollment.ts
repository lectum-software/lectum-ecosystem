import type { billing_operation } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getStripeGateway } from "../payment-gateway";
import { assertStripePrice } from "./config-service";
import { obtainStripeCustomer } from "./customer-service";
import { StripeBillingError } from "./policy";
import { mayReplayStripeCreate, requestFingerprint } from "./recovery-policy";
import type { StripeBillingRepository } from "./repository";

/** Setup and the charge have different immutable references and different idempotency keys. */
export const recoverCreditEnrollment = async (
  operation: billing_operation & { lease_token: string },
  repository: StripeBillingRepository,
  allowReplay: boolean,
) => {
  const gateway = getStripeGateway();
  const local = operation.subscription_id
    ? await prisma.professional_subscription.findFirst({
        where: {
          id: operation.subscription_id,
          psychologist_id: operation.psychologist_id,
          gateway: "stripe",
          gateway_mode: operation.mode,
          gateway_account_id: operation.account_id,
          collection_policy: "manual_credit_v1",
          deleted: false,
          status: { not: "cancelada" },
        },
      })
    : null;
  if (!local || !operation.price_version_id || !operation.customer_id)
    throw new StripeBillingError("billing_operation_review_required");
  const price = await repository.price(operation.price_version_id, gateway.identity);
  if (!price) throw new StripeBillingError("billing_operation_conflict");
  const email = await repository.userEmail(operation.user_id);
  const fingerprint = requestFingerprint("credit-enrollment-v1", [
    operation.id,
    local.id,
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
  if (
    canReplay &&
    !(await repository.checkpointRequest(operation, operation.lease_token, fingerprint)).count
  )
    throw new StripeBillingError("billing_operation_pending");
  const customerId = await obtainStripeCustomer(operation, email, repository, canReplay);
  const input = { attemptId: operation.id, localSubscriptionId: local.id, customerId };
  let setup = operation.provider_setup_intent_id
    ? await gateway.retrieveSetup(operation.provider_setup_intent_id)
    : await gateway.findCheckoutSetup(input);
  if (!setup) {
    if (!canReplay) throw new StripeBillingError("billing_operation_review_required");
    const created = await gateway.createCheckoutSetup(input);
    setup = await gateway.retrieveSetup(created.setupIntentId);
  }
  if (
    setup.attemptId !== operation.id ||
    setup.localSubscriptionId !== local.id ||
    setup.subscriptionId !== null ||
    setup.customerId !== customerId ||
    setup.accountId !== operation.account_id ||
    setup.mode !== operation.mode
  )
    throw new StripeBillingError("billing_operation_conflict");
  if (
    !(await repository.pinCheckoutSetup(operation, operation.lease_token, setup.setupIntentId))
      .count
  )
    throw new StripeBillingError("billing_operation_pending");
  return {
    setup,
    local,
    price,
    customerId,
    fingerprint,
    canReplay,
    setupInput: { ...input, setupIntentId: setup.setupIntentId },
    subscriptionInput: {
      attemptId: operation.id,
      subscriptionId: local.id,
      customerId,
      priceId: price.external_price_id,
      payerEmail: email,
      startDate: operation.scheduled_start_at,
    },
  };
};

export const recoverCreditSubscription = async (
  operation: billing_operation & { lease_token: string },
  repository: StripeBillingRepository,
  enrollment: Awaited<ReturnType<typeof recoverCreditEnrollment>>,
) => {
  const gateway = getStripeGateway();
  if (operation.provider_subscription_id && operation.provider_payment_method_id) {
    const existing = await gateway.getStripeSubscription(operation.provider_subscription_id);
    if (existing.defaultPaymentMethodId) {
      const scope = {
        subscriptionId: existing.subscriptionId,
        localSubscriptionId: enrollment.local.id,
        customerId: enrollment.customerId,
      };
      await gateway.ensureCreditCollectionHold(scope);
      // A subsequently approved replacement card is authoritative; old setup funding is historical.
      const display = await gateway.assignCreditSubscriptionCard({
        ...scope,
        paymentMethodId: existing.defaultPaymentMethodId,
      });
      return {
        remote: await gateway.getStripeSubscription(existing.subscriptionId),
        scope,
        display,
      };
    }
  }
  const display = await gateway.readCheckoutSetupCredit(enrollment.setupInput);
  if (
    !(await repository.pinCheckoutMethod(operation, operation.lease_token, display.paymentMethodId))
      .count
  )
    throw new StripeBillingError("billing_operation_conflict");
  let remote = operation.provider_subscription_id
    ? await gateway.getStripeSubscription(operation.provider_subscription_id)
    : await gateway.findCreditSubscription(enrollment.subscriptionInput);
  if (!remote) {
    if (!enrollment.canReplay) throw new StripeBillingError("billing_operation_review_required");
    await assertStripePrice(enrollment.price, gateway.identity);
    remote = await gateway.createCreditSubscription(enrollment.subscriptionInput);
  }
  if (!(await repository.bindSubscription(operation, remote.subscriptionId)).count)
    throw new StripeBillingError("billing_operation_conflict");
  if (
    !(
      await repository.pinOperationReferences(operation, operation.lease_token, {
        subscriptionId: remote.subscriptionId,
      })
    ).count
  )
    throw new StripeBillingError("billing_operation_pending");
  const scope = {
    subscriptionId: remote.subscriptionId,
    localSubscriptionId: enrollment.local.id,
    customerId: enrollment.customerId,
  };
  await gateway.ensureCreditCollectionHold(scope);
  // Never overwrite a later guarded card update with the enrollment's original card.
  const held = await gateway.getStripeSubscription(remote.subscriptionId);
  if (!held.defaultPaymentMethodId)
    await gateway.assignCreditSubscriptionCard({
      ...scope,
      paymentMethodId: display.paymentMethodId,
    });
  return { remote: await gateway.getStripeSubscription(remote.subscriptionId), scope, display };
};

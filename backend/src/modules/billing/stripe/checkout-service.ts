import { getNewSubscriptionGatewayName, getStripeGateway } from "../payment-gateway";
import { unresolvedTerminalCheckoutUpdate } from "./checkout-completion";
import { recoverStripeCheckout } from "./checkout-recovery";
import { currentOperationResponse } from "./operation-response";
import {
  type CheckoutIntent,
  canonicalTerminal,
  preserveStripeCardPolicyRejection,
  StripeBillingError,
  stripeCardPolicyPublicError,
  stripeOperationReference,
  validDate,
} from "./policy";
import { TERMINAL_OPERATION_STATES } from "./recovery-policy";
import { StripeBillingRepository } from "./repository";
import { syncStripeSubscription } from "./sync";

export const beginStripeCheckout = async (input: {
  userId: string;
  email: string;
  requestKey: string;
  quoteRevision: string;
  intent: CheckoutIntent;
}) => {
  if (getNewSubscriptionGatewayName() !== "stripe")
    throw new StripeBillingError("billing_checkout_disabled", 503);
  const gateway = getStripeGateway();
  await gateway.verifyCheckoutReadiness();
  const repository = new StripeBillingRepository();
  const operation = await repository.reserveCheckout({ ...input, identity: gateway.identity });
  return confirmStripeCheckout(input.userId, operation.id);
};

export const confirmStripeCheckout = async (
  userId: string,
  operationId: string,
  options: { allowReplay?: boolean; allowSetupAssignment?: boolean } = {},
) => {
  const gateway = getStripeGateway();
  const repository = new StripeBillingRepository();
  let operation = await repository.operation(operationId, userId, gateway.identity);
  if (operation?.kind !== "checkout")
    throw new StripeBillingError("billing_operation_not_found", 404);
  if (TERMINAL_OPERATION_STATES.includes(operation.state))
    return currentOperationResponse(operation, repository);
  const claim = await repository.claimOperation(operation);
  if (!claim) return currentOperationResponse(operation, repository);
  try {
    // Resume the originally authorized request. Only an identical durable key/body inside the safe retention window can be replayed.
    const reference = await recoverStripeCheckout(claim, repository, options.allowReplay !== false);
    operation = (await repository.operation(operationId, userId, gateway.identity))!;
    if (!operation || TERMINAL_OPERATION_STATES.includes(operation.state))
      return currentOperationResponse(claim, repository);
    let synchronized = await syncStripeSubscription(
      reference.subscriptionId,
      operation.subscription_id ?? undefined,
    );
    if (synchronized.operationCompleted) {
      await repository.finishOperation(operation.id, claim.lease_token, {
        state: "complete",
        completed_at: new Date(),
        last_error_code: null,
      });
      return currentOperationResponse(operation, repository);
    }
    if (canonicalTerminal(synchronized.remote)) {
      const unresolved = unresolvedTerminalCheckoutUpdate(operation);
      if (unresolved) await repository.finishOperation(operation.id, claim.lease_token, unresolved);
      return currentOperationResponse(operation, repository);
    }
    if (
      operation.intent === "courtesy_renewal" &&
      synchronized.remote.gatewayStatus === "trialing" &&
      (operation.intent_kind !== "setup" || !operation.provider_intent_id)
    ) {
      // No native intent is not permission to silently reuse a previously saved card.
      throw new StripeBillingError("billing_operation_review_required");
    }
    if (
      options.allowSetupAssignment !== false &&
      operation.intent === "courtesy_renewal" &&
      operation.intent_kind === "setup" &&
      operation.provider_intent_id &&
      synchronized.remote.gatewayStatus === "trialing"
    ) {
      const setup = await gateway.retrieveSetup(operation.provider_intent_id);
      if (setup.status === "succeeded") {
        if (
          synchronized.local.status === "cancelada" ||
          synchronized.remote.cancelAtPeriodEnd ||
          !validDate(operation.scheduled_start_at) ||
          !validDate(synchronized.remote.trialEnd) ||
          Math.floor(operation.scheduled_start_at.getTime() / 1_000) !==
            Math.floor(synchronized.remote.trialEnd.getTime() / 1_000)
        ) {
          throw new StripeBillingError("billing_operation_conflict");
        }
        // The setup ID was durably pinned when the subscription was created/recovered. It never comes from the caller.
        await gateway.applySubscriptionSetup({
          attemptId: operation.id,
          localSubscriptionId: operation.subscription_id!,
          setupIntentId: operation.provider_intent_id,
          customerId: reference.customerId,
          subscriptionId: reference.subscriptionId,
        });
        synchronized = await syncStripeSubscription(
          reference.subscriptionId,
          operation.subscription_id!,
          { verifiedCreditSetupId: operation.provider_intent_id },
        );
      }
    }
    if (
      synchronized.operationCompleted ||
      (operation.intent === "courtesy_renewal" && synchronized.scheduled)
    ) {
      await repository.finishOperation(operation.id, claim.lease_token, {
        state: "complete",
        completed_at: new Date(),
        last_error_code: null,
      });
      return currentOperationResponse(operation, repository);
    }
    const embedded = await gateway.retrieveEmbeddedSubscription(reference.subscriptionId);
    if (
      !(
        await repository.pinOperationReferences(operation, claim.lease_token, {
          intentId: embedded.intentId,
          intentKind: embedded.intentKind,
        })
      ).count
    )
      return currentOperationResponse(operation, repository);
    const errorCode = preserveStripeCardPolicyRejection(claim.last_error_code, null);
    await repository.finishOperation(operation.id, claim.lease_token, {
      state: errorCode
        ? "review_required"
        : embedded.clientSecret
          ? "requires_confirmation"
          : "processing",
      last_error_code: errorCode,
    });
    return currentOperationResponse(
      operation,
      repository,
      embedded.clientSecret && embedded.intentKind !== "none"
        ? { type: embedded.intentKind, client_secret: embedded.clientSecret }
        : null,
    );
  } catch (failure) {
    const cardPolicyError = stripeCardPolicyPublicError(failure);
    await repository.finishOperation(claim.id, claim.lease_token, {
      state: "review_required",
      last_error_code: preserveStripeCardPolicyRejection(
        claim.last_error_code,
        cardPolicyError ? "card_credit_required" : "checkout_resume_unresolved",
      ),
    });
    const response = await currentOperationResponse(claim, repository);
    if (response.operation.state === "review_required") {
      if (cardPolicyError) throw cardPolicyError;
      console.warn("[BILLING_STRIPE] Operação aguardando conciliação.", {
        operation_ref: stripeOperationReference(claim.id),
        kind: "checkout",
      });
    }
    return response;
  }
};

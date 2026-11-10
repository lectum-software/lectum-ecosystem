import { getNewSubscriptionGatewayName, getStripeGateway } from "../payment-gateway";
import { unresolvedTerminalCheckoutUpdate } from "./checkout-completion";
import { recoverCreditEnrollment, recoverCreditSubscription } from "./checkout-enrollment";
import { collectStripeInvoice } from "./collection-service";
import { currentOperationResponse } from "./operation-response";
import {
  type CheckoutIntent,
  canonicalTerminal,
  StripeBillingError,
  stripeCardPolicyPublicError,
  stripeOperationReference,
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
  if (
    getNewSubscriptionGatewayName() !== "stripe" ||
    process.env.BILLING_STRIPE_COLLECTION_ENABLED !== "true"
  )
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
  options: { allowReplay?: boolean; allowSetupAssignment?: boolean; allowPayment?: boolean } = {},
) => {
  const gateway = getStripeGateway();
  const repository = new StripeBillingRepository();
  const operation = await repository.operation(operationId, userId, gateway.identity);
  if (
    operation?.kind === "collection" &&
    operation.subscription_id &&
    operation.provider_invoice_id
  ) {
    const result = await collectStripeInvoice({
      userId,
      localSubscriptionId: operation.subscription_id,
      invoiceId: operation.provider_invoice_id,
      parentOperationId: operation.parent_operation_id ?? undefined,
      allowConfirmation: options.allowPayment === true && options.allowSetupAssignment !== false,
    });
    if (operation.provider_subscription_id)
      await syncStripeSubscription(operation.provider_subscription_id, operation.subscription_id);
    return currentOperationResponse(
      operation,
      repository,
      result.actionSecret ? { type: "action", client_secret: result.actionSecret } : null,
    );
  }
  if (operation?.kind !== "checkout")
    throw new StripeBillingError("billing_operation_not_found", 404);
  if (TERMINAL_OPERATION_STATES.includes(operation.state))
    return currentOperationResponse(operation, repository);
  const claim = await repository.claimOperation(operation);
  if (!claim) return currentOperationResponse(operation, repository);
  try {
    // Read-only periodic reconciliation must never create or reconfirm a financial attempt.
    if (
      options.allowSetupAssignment === false ||
      process.env.BILLING_STRIPE_COLLECTION_ENABLED !== "true"
    ) {
      if (operation.provider_subscription_id)
        await syncStripeSubscription(
          operation.provider_subscription_id,
          operation.subscription_id ?? undefined,
        );
      await repository.finishOperation(claim.id, claim.lease_token, {});
      return currentOperationResponse(operation, repository);
    }
    const enrollment = await recoverCreditEnrollment(
      claim,
      repository,
      options.allowReplay !== false,
    );
    if (enrollment.setup.status === "canceled") {
      await repository.finishOperation(claim.id, claim.lease_token, {
        state: "failed",
        completed_at: new Date(),
      });
      return currentOperationResponse(operation, repository);
    }
    if (enrollment.setup.status !== "succeeded") {
      await repository.finishOperation(claim.id, claim.lease_token, {
        state: enrollment.setup.clientSecret ? "requires_confirmation" : "processing",
        last_error_code: null,
      });
      return currentOperationResponse(
        operation,
        repository,
        enrollment.setup.clientSecret
          ? { type: "setup", client_secret: enrollment.setup.clientSecret }
          : null,
      );
    }
    const { remote } = await recoverCreditSubscription(claim, repository, enrollment);
    if (canonicalTerminal(remote)) {
      const unresolved = unresolvedTerminalCheckoutUpdate(operation);
      if (unresolved) await repository.finishOperation(claim.id, claim.lease_token, unresolved);
      return currentOperationResponse(operation, repository);
    }
    if (operation.intent === "courtesy_renewal") {
      if (
        !(
          await repository.pinOperationReferences(claim, claim.lease_token, {
            intentId: enrollment.setup.setupIntentId,
            intentKind: "setup",
          })
        ).count
      )
        throw new StripeBillingError("billing_operation_pending");
      const synchronized = await syncStripeSubscription(
        remote.subscriptionId,
        operation.subscription_id!,
        {
          verifiedCreditSetupId: enrollment.setup.setupIntentId,
        },
      );
      if (!synchronized.scheduled) throw new StripeBillingError("billing_operation_pending");
      await repository.finishOperation(claim.id, claim.lease_token, {
        state: "complete",
        completed_at: new Date(),
        last_error_code: null,
      });
      return currentOperationResponse(operation, repository);
    }
    if (!remote.latestInvoiceId) throw new StripeBillingError("billing_operation_conflict");
    await repository.pinOperationReferences(claim, claim.lease_token, { intentKind: "payment" });
    const collected = await collectStripeInvoice({
      userId,
      localSubscriptionId: operation.subscription_id!,
      invoiceId: remote.latestInvoiceId,
      parentOperationId: operation.id,
      allowConfirmation: options.allowPayment === true,
    });
    if (
      collected.intentId &&
      !(
        await repository.pinOperationReferences(claim, claim.lease_token, {
          intentId: collected.intentId,
          intentKind: "payment",
        })
      ).count
    )
      throw new StripeBillingError("billing_operation_pending");
    await syncStripeSubscription(remote.subscriptionId, operation.subscription_id!);
    await repository.finishOperation(claim.id, claim.lease_token, {
      state: collected.state,
      last_error_code:
        (await repository.operation(collected.operationId, userId, gateway.identity))
          ?.last_error_code ?? null,
      ...(collected.state === "complete" ? { completed_at: new Date() } : {}),
    });
    return currentOperationResponse(
      operation,
      repository,
      collected.actionSecret ? { type: "action", client_secret: collected.actionSecret } : null,
    );
  } catch (failure) {
    const cardPolicyError = stripeCardPolicyPublicError(failure);
    const latest = await repository.operation(operation.id, userId, gateway.identity);
    // No remote subscription/financial attempt exists yet: a denied setup is safely terminal.
    const safeCardRejection = Boolean(
      cardPolicyError && !latest?.provider_subscription_id && !latest?.provider_intent_id,
    );
    await repository.finishOperation(claim.id, claim.lease_token, {
      state: safeCardRejection ? "failed" : "review_required",
      last_error_code: cardPolicyError ? "card_credit_required" : "checkout_resume_unresolved",
      ...(safeCardRejection ? { completed_at: new Date() } : {}),
    });
    if (cardPolicyError && !safeCardRejection) throw cardPolicyError;
    if (!cardPolicyError)
      console.warn("[BILLING_STRIPE] Operação aguardando conciliação.", {
        operation_ref: stripeOperationReference(claim.id),
        kind: "checkout",
      });
    return currentOperationResponse(operation, repository);
  }
};

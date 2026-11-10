import prisma from "@/infra/database/prisma";
import { getStripeGateway } from "../payment-gateway";
import {
  cardProjectionWhere,
  persistStripeCardProjection,
  refreshStripeCardProjection,
} from "./card-projection";
import { recoverStripeCardSetup } from "./card-recovery";
import { currentOperationResponse } from "./operation-response";
import {
  preserveStripeCardPolicyRejection,
  StripeBillingError,
  stripeCardPolicyPublicError,
} from "./policy";
import { TERMINAL_OPERATION_STATES } from "./recovery-policy";
import { StripeBillingRepository } from "./repository";

export const beginStripeCardUpdate = async (userId: string, requestKey: string) => {
  const gateway = getStripeGateway();
  const repository = new StripeBillingRepository();
  const operation = await repository.reserveCard(userId, gateway.identity, requestKey);
  return confirmStripeCardUpdate(userId, operation.id);
};

export const confirmStripeCardUpdate = async (
  userId: string,
  operationId: string,
  options: { allowReplay?: boolean; allowAssignment?: boolean; knownSetupId?: string } = {},
) => {
  const gateway = getStripeGateway();
  const repository = new StripeBillingRepository();
  const operation = await repository.operation(operationId, userId, gateway.identity);
  if (operation?.kind !== "payment_method")
    throw new StripeBillingError("billing_operation_not_found", 404);
  if (TERMINAL_OPERATION_STATES.includes(operation.state))
    return currentOperationResponse(operation, repository);
  const claim = await repository.claimOperation(operation);
  if (!claim) return currentOperationResponse(operation, repository);
  try {
    const { setup, customerId } = await recoverStripeCardSetup(claim, repository, {
      allowReplay: options.allowReplay !== false,
      knownSetupId: options.knownSetupId,
    });
    if (setup.status === "canceled") {
      await repository.finishOperation(operation.id, claim.lease_token, {
        state: "failed",
        completed_at: new Date(),
        last_error_code: null,
      });
      return currentOperationResponse(operation, repository);
    }
    if (setup.status !== "succeeded") {
      await repository.finishOperation(operation.id, claim.lease_token, {
        state: setup.clientSecret ? "requires_confirmation" : "processing",
        last_error_code: null,
      });
      return currentOperationResponse(
        operation,
        repository,
        setup.clientSecret ? { type: "setup", client_secret: setup.clientSecret } : null,
      );
    }
    if (options.allowAssignment === false) {
      const errorCode = preserveStripeCardPolicyRejection(claim.last_error_code, null);
      await repository.finishOperation(operation.id, claim.lease_token, {
        state: errorCode ? "review_required" : "processing",
        last_error_code: errorCode,
      });
      return currentOperationResponse(operation, repository);
    }
    const previous = await prisma.payment_method.findFirst({
      where: cardProjectionWhere(userId, operation.provider_subscription_id!, gateway.identity),
      orderBy: { createdAt: "desc" },
    });
    // Changes only the default method of the exact previously authorized subscription, never creates/retries a charge.
    const display = await gateway.confirmCard({
      attemptId: operation.id,
      setupIntentId: setup.setupIntentId,
      customerId,
      subscriptionId: operation.provider_subscription_id!,
    });
    const projectionInput = {
      userId,
      psychologistId: operation.psychologist_id,
      localSubscriptionId: operation.subscription_id!,
      subscriptionId: operation.provider_subscription_id!,
      customerId,
    };
    const stored = await persistStripeCardProjection({
      ...projectionInput,
      identity: gateway.identity,
      display,
      previous,
    });
    if (!stored && !(await refreshStripeCardProjection(projectionInput)))
      throw new StripeBillingError("billing_operation_pending");
    await repository.finishOperation(operation.id, claim.lease_token, {
      state: "complete",
      completed_at: new Date(),
      last_error_code: null,
    });
    return currentOperationResponse(operation, repository);
  } catch (failure) {
    const cardPolicyError = stripeCardPolicyPublicError(failure);
    await repository.finishOperation(operation.id, claim.lease_token, {
      state: "review_required",
      last_error_code: preserveStripeCardPolicyRejection(
        claim.last_error_code,
        cardPolicyError ? "card_credit_required" : "setup_resume_unresolved",
      ),
    });
    const response = await currentOperationResponse(operation, repository);
    if (cardPolicyError && response.operation.state === "review_required") throw cardPolicyError;
    return response;
  }
};

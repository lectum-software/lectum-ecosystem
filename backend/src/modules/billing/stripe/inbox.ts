import { getInvoiceConfig } from "../invoices/config";
import { invoiceGatewayScopes } from "../invoices/gateway-scope";
import { InvoiceRepository } from "../invoices/repository";
import { getStripeGateway } from "../payment-gateway";
import { STRIPE_API_VERSION } from "../payment-gateway/stripe-config";
import { StripeGatewayError, stripeFailureObservation } from "../payment-gateway/stripe-error";
import { confirmStripeCardUpdate } from "./card-service";
import { confirmStripeCheckout } from "./checkout-service";
import {
  enqueueStripeFinancialReconciliation,
  financialLedgerAutomationEnabled,
} from "./financial-ledger/service";
import { StripeInboxRepository } from "./inbox-repository";
import { nextInboxAttempt, StripeBillingError, stripeOperationReference } from "./policy";
import { classifyStripeSetupEvent, unresolvedStripeSetupEvent } from "./setup-event-policy";
import { syncStripeSubscription } from "./sync";

export const acceptStripeWebhook = async (
  body: Buffer,
  signature: string | string[] | undefined,
) => {
  if (
    !Buffer.isBuffer(body) ||
    body.length > 256 * 1024 ||
    typeof signature !== "string" ||
    signature.length > 2048
  ) {
    throw new StripeBillingError("billing_webhook_invalid_signature", 400);
  }
  let event: Awaited<ReturnType<ReturnType<typeof getStripeGateway>["parseSignedWebhook"]>>;
  try {
    event = await getStripeGateway().parseSignedWebhook(body, signature);
  } catch (error) {
    if (
      error instanceof StripeGatewayError &&
      ["configuration_invalid", "provider_unavailable", "account_mismatch"].includes(error.kind)
    )
      throw error;
    throw new StripeBillingError("billing_webhook_invalid_signature", 400);
  }
  if (!event) return { processed: false };
  // Durability and scoped deduplication precede ACK. No provider payload enters the inbox.
  await new StripeInboxRepository().enqueue(event);
  return { processed: false, received: true };
};

export const processStripeInbox = async () => {
  const gateway = getStripeGateway();
  const repository = new StripeInboxRepository();
  for (let index = 0; index < 10; index += 1) {
    const job = await repository.claim(gateway.identity);
    if (!job) break;
    try {
      if (job.api_version !== STRIPE_API_VERSION)
        throw new StripeBillingError("billing_operation_conflict");
      if (job.type.startsWith("setup_intent.")) {
        const setup = await gateway.retrieveSetup(job.resource_id);
        const decision = classifyStripeSetupEvent({
          setup,
          resourceId: job.resource_id,
          subscriptionHint: job.provider_subscription_id,
          identity: gateway.identity,
          candidates: await repository.setupCandidates(
            job.resource_id,
            gateway.identity,
            setup.attemptId,
          ),
        });
        if (decision.action === "unresolved" || decision.action === "conflict") {
          const deferred = unresolvedStripeSetupEvent(job.attempts, decision.action === "conflict");
          await repository.finish(job.id, job.lease_token, {
            ...deferred,
            next_attempt_at: nextInboxAttempt(job.attempts),
          });
          console.warn("[BILLING_STRIPE] Evento aguardando correlação segura.", {
            event_ref: stripeOperationReference(job.id),
            review_required: deferred.state === "review_required",
            diagnostic: deferred.last_error_code,
          });
          continue;
        }
        if (decision.action === "process") {
          const { operation } = decision;
          const result =
            operation.kind === "checkout"
              ? await confirmStripeCheckout(operation.user_id, operation.id, { allowReplay: false })
              : await confirmStripeCardUpdate(operation.user_id, operation.id, {
                  allowReplay: false,
                  knownSetupId: job.resource_id,
                });
          if (["review_required", "processing"].includes(result.operation.state))
            throw new StripeBillingError("billing_operation_pending");
        }
        // Exact terminal bindings are ACKed without assignment or an unrelated entitlement sync.
        await repository.finish(job.id, job.lease_token, {
          state: "complete",
          processed_at: new Date(),
          last_error_code: null,
        });
        continue;
      }
      let subscriptionId = job.provider_subscription_id;
      if (!subscriptionId)
        subscriptionId = await gateway.resolveWebhookSubscription({
          eventId: job.external_id,
          type: job.type,
          resourceId: job.resource_id,
          created: job.gateway_created_at,
          subscriptionId: null,
          apiVersion: job.api_version,
          mode: gateway.identity.mode,
          accountId: gateway.identity.accountId,
        });
      if (subscriptionId) {
        // Queue financial reads before entitlement sync, including inactive/deleted historical owners.
        const financialQueued = await enqueueStripeFinancialReconciliation({
          identity: gateway.identity,
          providerSubscriptionId: subscriptionId,
          eventId: job.external_id,
        });
        await syncStripeSubscription(subscriptionId);
        // A canonical sync may just have recovered the missing local binding.
        if (!financialQueued && financialLedgerAutomationEnabled()) {
          const recovered = await enqueueStripeFinancialReconciliation({
            identity: gateway.identity,
            providerSubscriptionId: subscriptionId,
            eventId: job.external_id,
          });
          if (!recovered) throw new StripeBillingError("billing_operation_pending");
        }
        // Queue writes are independent from entitlement, but retry durably if fiscal enqueue fails.
        if (job.type.startsWith("invoice.") && /^in_[A-Za-z0-9]+$/.test(job.resource_id)) {
          const fiscal = getInvoiceConfig();
          if (
            fiscal &&
            invoiceGatewayScopes(fiscal.mode).some(
              (scope) =>
                scope.gateway === "stripe" &&
                scope.mode === gateway.identity.mode &&
                scope.accountId === gateway.identity.accountId,
            )
          ) {
            await new InvoiceRepository().enqueueStripe({
              invoiceId: job.resource_id,
              eventId: job.external_id,
              accountId: gateway.identity.accountId,
              mode: gateway.identity.mode,
            });
          }
        }
      }
      if (!subscriptionId) throw new StripeBillingError("billing_operation_conflict");
      await repository.finish(job.id, job.lease_token, {
        state: "complete",
        processed_at: new Date(),
        last_error_code: null,
      });
    } catch (failure) {
      await repository.finish(job.id, job.lease_token, {
        state: job.attempts >= 10 ? "review_required" : "pending",
        next_attempt_at: nextInboxAttempt(job.attempts),
        last_error_code: "reconciliation_unavailable",
      });
      console.warn("[BILLING_STRIPE] Conciliação aguardando nova leitura.", {
        event_ref: stripeOperationReference(job.id),
        review_required: job.attempts >= 10,
        stage: "inbox_reconciliation",
        ...stripeFailureObservation(failure),
      });
    }
  }
  for (const operation of await repository.recoverableOperations(gateway.identity)) {
    try {
      if (operation.kind === "checkout")
        await confirmStripeCheckout(operation.user_id, operation.id, {
          allowReplay: false,
          allowSetupAssignment: false,
        });
      if (operation.kind === "payment_method")
        await confirmStripeCardUpdate(operation.user_id, operation.id, {
          allowReplay: false,
          allowAssignment: false,
        });
      // Periodic recovery is GET-only at the provider; setup assignment needs a signed event or explicit owner request.
    } catch (failure) {
      console.warn("[BILLING_STRIPE] Operação aguarda revisão.", {
        operation_ref: stripeOperationReference(operation.id),
        stage: "operation_recovery",
        ...stripeFailureObservation(failure),
      });
    }
    await repository.deferOperation(operation.id, new Date(Date.now() + 15 * 60_000));
  }
};

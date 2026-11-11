import type { billing_operation } from "@/external/generated/prisma/client";
import { getStripeGateway } from "../payment-gateway";
import type { CreditIntentInput } from "../payment-gateway/stripe-credit-types";
import { StripeGatewayError, stripeFailureObservation } from "../payment-gateway/stripe-error";
import {
  collectionConfirmationDecision,
  collectionConfirmationFingerprint,
  collectionFailureDisposition,
} from "./collection-policy";
import { StripeCollectionRepository } from "./collection-repository";
import { StripeBillingError, stripeOperationReference } from "./policy";
import { mayReplayStripeCreate, requestFingerprint } from "./recovery-policy";

export type StripeCollectionResult = {
  operationId: string;
  intentId?: string;
  state: "processing" | "requires_confirmation" | "complete" | "review_required" | "failed";
  /** Only a manually confirmed PI requiring customer action; never persist or log. */
  actionSecret?: string;
};

export const stripeCollectionsEnabled = () =>
  process.env.BILLING_STRIPE_COLLECTION_ENABLED === "true";

const resultFor = (operation: billing_operation): StripeCollectionResult => ({
  operationId: operation.id,
  ...(operation.provider_intent_id ? { intentId: operation.provider_intent_id } : {}),
  state: ["requires_confirmation", "complete", "review_required", "failed"].includes(
    operation.state,
  )
    ? (operation.state as StripeCollectionResult["state"])
    : "processing",
});

const createFingerprint = (input: CreditIntentInput) =>
  requestFingerprint("credit-invoice-intent", [
    input.attemptId,
    input.localSubscriptionId,
    input.subscriptionId,
    input.customerId,
    input.invoiceId,
    input.priceId,
    input.amountCents,
  ]);

/** No caller-supplied PM, amount, price, customer or provider subscription is accepted. */
export const collectStripeInvoice = async (input: {
  userId?: string;
  localSubscriptionId: string;
  invoiceId: string;
  parentOperationId?: string;
  allowConfirmation: boolean;
}): Promise<StripeCollectionResult> => {
  if (!stripeCollectionsEnabled()) throw new StripeBillingError("billing_collection_disabled", 503);
  const gateway = getStripeGateway();
  const repository = new StripeCollectionRepository();
  const target = await repository.target(input.localSubscriptionId, gateway.identity, input.userId);
  const scope = { ...target.provider, invoiceId: input.invoiceId };
  let invoice = await gateway.getCreditCollectionInvoice(scope);
  if (!invoice.defaultPaymentMethodId)
    throw new StripeBillingError("billing_collection_payment_method_required");
  const operation = await repository.reserve({
    target,
    identity: gateway.identity,
    invoiceId: input.invoiceId,
    paymentMethodId: invoice.defaultPaymentMethodId,
    parentOperationId: input.parentOperationId,
    initialInvoice: invoice.billingReason === "subscription_create",
  });
  if (["complete", "failed"].includes(operation.state)) return resultFor(operation);
  if (!input.userId && ["review_required", "requires_confirmation"].includes(operation.state))
    return resultFor(operation);
  if (!input.userId && operation.next_attempt_at > new Date()) return resultFor(operation);
  const claim = await repository.claim(operation);
  if (!claim) return resultFor(operation);
  let current = claim;
  const refresh = async () => {
    const row = await repository.read(operation.id);
    if (
      !row ||
      row.lease_token !== claim.lease_token ||
      !row.lease_until ||
      row.lease_until <= new Date()
    )
      throw new StripeBillingError("billing_operation_pending");
    current = { ...row, lease_token: claim.lease_token, lease_until: row.lease_until };
  };
  const assertEligible = async () => {
    if (!stripeCollectionsEnabled())
      throw new StripeBillingError("billing_collection_disabled", 503);
    await repository.target(input.localSubscriptionId, gateway.identity, input.userId);
    if (!(await repository.renew(current, claim.lease_token)))
      throw new StripeBillingError("billing_operation_pending");
    await refresh();
  };
  const finish = async (
    state: StripeCollectionResult["state"],
    code: string | null = null,
    actionSecret?: string,
  ) => {
    await repository.finish(operation.id, claim.lease_token, {
      state,
      last_error_code: code,
      next_attempt_at: new Date(Date.now() + 15 * 60_000),
      ...(state === "complete" || state === "failed" ? { completed_at: new Date() } : {}),
    });
    const stored = await repository.read(operation.id);
    return {
      ...resultFor(stored ?? current),
      ...(stored?.state === "requires_confirmation" &&
      stored.provider_intent_id &&
      actionSecret?.startsWith(`${stored.provider_intent_id}_secret_`)
        ? { actionSecret }
        : {}),
    };
  };
  try {
    if (["void", "uncollectible"].includes(invoice.status)) return finish("failed");
    if (
      invoice.status !== "paid" &&
      (invoice.autoAdvance ||
        invoice.amountRemaining !== scope.amountCents ||
        invoice.amountPaid !== 0 ||
        !invoice.periodStart ||
        invoice.periodStart > new Date())
    )
      return finish("review_required", "invoice_not_collectible");
    if (invoice.status === "draft") {
      await assertEligible();
      invoice = await gateway.finalizeCreditCollectionInvoice(scope);
    }
    if (
      input.userId &&
      !current.provider_intent_id &&
      current.confirmation_sequence === 0 &&
      invoice.defaultPaymentMethodId &&
      invoice.defaultPaymentMethodId !== current.provider_payment_method_id
    ) {
      await assertEligible();
      if (
        !(
          await repository.selectUnconfirmedMethod(
            current,
            claim.lease_token,
            invoice.defaultPaymentMethodId,
          )
        ).count
      )
        throw new StripeBillingError("billing_operation_pending");
      await refresh();
    }
    const intentInput: CreditIntentInput = {
      ...scope,
      attemptId: operation.id,
      paymentMethodId: current.provider_payment_method_id!,
    };
    let intent = current.provider_intent_id
      ? await gateway.readCreditInvoiceIntent({
          ...intentInput,
          intentId: current.provider_intent_id,
        })
      : await gateway.findCreditInvoiceIntent(intentInput);
    if (!intent) {
      if (invoice.status === "paid") return finish("review_required", "payment_reference_missing");
      const fingerprint = createFingerprint(intentInput);
      if (
        !mayReplayStripeCreate({
          state: current.state,
          createdAt: current.created_at,
          attempts: current.attempts,
          storedFingerprint: current.request_fingerprint,
          expectedFingerprint: fingerprint,
        })
      )
        return finish("review_required", "intent_create_unresolved");
      await assertEligible();
      if (!(await repository.checkpoint(current, claim.lease_token, fingerprint)).count)
        throw new StripeBillingError("billing_operation_pending");
      intent = await gateway.createCreditInvoiceIntent(intentInput);
    }
    if (!current.provider_intent_id) {
      if (!(await repository.pinIntent(operation.id, claim.lease_token, intent.intentId)).count)
        throw new StripeBillingError("billing_operation_pending");
      await refresh();
    }
    const reference = { ...intentInput, intentId: intent.intentId };
    if (intent.status === "canceled") return finish("failed");
    if (invoice.status === "paid") {
      const paid = await gateway.getFinancialInvoice(target.provider, input.invoiceId, new Date());
      if (
        intent.status !== "succeeded" ||
        paid.kind !== "receipt" ||
        paid.receipt.paymentIntentId !== intent.intentId
      )
        return finish("review_required", "invoice_payment_conflict");
      return finish("complete");
    }
    if (intent.status === "requires_action")
      return finish("requires_confirmation", null, intent.clientSecret);
    if (intent.status === "succeeded" || intent.status === "processing")
      return finish("processing");
    // An attached existing PI is idempotent. Never attach an alternative PI after an ambiguous attempt.
    await assertEligible();
    await gateway.attachCreditInvoiceIntent(reference);
    invoice = await gateway.getCreditCollectionInvoice(scope);
    if (!invoice.defaultPaymentMethodId)
      return finish("requires_confirmation", "payment_method_required");
    const methodChanged = invoice.defaultPaymentMethodId !== current.provider_payment_method_id;
    if (methodChanged && !input.userId && current.last_error_code !== "confirmation_pending")
      return finish("requires_confirmation", "payment_method_changed");
    const replacement =
      Boolean(input.userId) &&
      ["requires_payment_method", "requires_confirmation"].includes(intent.status) &&
      current.last_error_code !== "confirmation_pending" &&
      methodChanged;
    const paymentMethodId = replacement
      ? invoice.defaultPaymentMethodId!
      : current.provider_payment_method_id!;
    const previousFingerprint = collectionConfirmationFingerprint({
      operationId: operation.id,
      intentId: intent.intentId,
      invoiceId: input.invoiceId,
      paymentMethodId,
      sequence: current.confirmation_sequence,
      offSession: current.intent === "off_session",
    });
    const decision = collectionConfirmationDecision({
      intentStatus: intent.status,
      sequence: current.confirmation_sequence,
      pending: current.last_error_code === "confirmation_pending",
      fingerprintMatches: current.confirmation_fingerprint === previousFingerprint,
      operationCreatedAt: current.created_at,
      allowConfirmation: input.allowConfirmation,
      ownerPresent: Boolean(input.userId),
      paymentMethodChanged: replacement,
      authenticationRequired: intent.authenticationRequired,
      initialInvoice: invoice.billingReason === "subscription_create",
      initialOwnerConfirmation: current.intent === "on_session",
    });
    if (decision === "review") return finish("review_required", "confirmation_unresolved");
    if (decision === "wait")
      return finish(
        "requires_confirmation",
        current.last_error_code === "confirmation_pending"
          ? "confirmation_pending"
          : intent.status === "requires_payment_method" && current.confirmation_sequence > 0
            ? intent.authenticationRequired
              ? "authentication_required"
              : "payment_method_required"
            : null,
      );
    const sequence = current.confirmation_sequence + (decision === "confirm" ? 1 : 0);
    const offSession = decision === "replay" ? current.intent === "off_session" : !input.userId;
    const fingerprint = collectionConfirmationFingerprint({
      operationId: operation.id,
      intentId: intent.intentId,
      invoiceId: input.invoiceId,
      paymentMethodId,
      sequence,
      offSession,
    });
    await assertEligible();
    if (
      !(
        await repository.checkpointConfirmation({
          operation: current,
          token: claim.lease_token,
          paymentMethodId,
          sequence,
          fingerprint,
          offSession,
        })
      ).count
    )
      throw new StripeBillingError("billing_operation_pending");
    intent = await gateway.confirmCreditInvoiceIntent({
      ...reference,
      paymentMethodId,
      sequence,
      offSession,
    });
    if (intent.status === "requires_action")
      return finish("requires_confirmation", null, intent.clientSecret);
    if (intent.status === "requires_payment_method" && !intent.paymentFailureObserved)
      return finish("processing", "confirmation_pending");
    if (intent.status === "requires_payment_method")
      return finish(
        "requires_confirmation",
        intent.authenticationRequired ? "authentication_required" : "payment_method_required",
      );
    if (intent.status === "canceled") return finish("failed");
    if (intent.status === "succeeded") {
      const paid = await gateway.getFinancialInvoice(target.provider, input.invoiceId, new Date());
      if (paid.kind === "receipt" && paid.receipt.paymentIntentId === intent.intentId)
        return finish("complete");
    }
    return finish("processing");
  } catch (error) {
    const latest = await repository.read(operation.id);
    const pending = latest?.last_error_code === "confirmation_pending";
    if (pending && latest?.provider_intent_id && latest.provider_payment_method_id) {
      try {
        // A decline can arrive as an SDK error. Read its canonical state; do not replay a
        // definitively refused card, even with an idempotent key, on the background schedule.
        const observed = await gateway.readCreditInvoiceIntent({
          ...scope,
          attemptId: operation.id,
          paymentMethodId: latest.provider_payment_method_id,
          intentId: latest.provider_intent_id,
        });
        if (observed.status === "requires_payment_method" && observed.paymentFailureObserved)
          return finish(
            "requires_confirmation",
            observed.authenticationRequired ? "authentication_required" : "payment_method_required",
          );
        if (observed.status === "requires_action")
          return finish("requires_confirmation", null, observed.clientSecret);
        if (observed.status === "canceled") return finish("failed");
        if (observed.status === "succeeded") {
          const paid = await gateway.getFinancialInvoice(
            target.provider,
            input.invoiceId,
            new Date(),
          );
          if (paid.kind === "receipt" && paid.receipt.paymentIntentId === observed.intentId)
            return finish("complete");
          return finish("processing");
        }
      } catch {
        // An ambiguous response retains the exact pending fingerprint for bounded replay.
      }
    }
    const failure = collectionFailureDisposition({
      kind: error instanceof StripeGatewayError ? error.kind : null,
      httpStatus: error instanceof StripeGatewayError ? error.details.status : undefined,
      diagnostic: error instanceof StripeGatewayError ? error.details.diagnostic : undefined,
      pending,
      attempts: latest?.attempts ?? current.attempts,
    });
    console.warn("[BILLING_STRIPE] Cobrança aguardando conciliação segura.", {
      operation_ref: stripeOperationReference(operation.id),
      stage: "collection",
      diagnostic: failure.code,
      retry_scheduled: failure.state === "processing",
      ...stripeFailureObservation(error),
    });
    return finish(failure.state, failure.code);
  }
};

let scanAfterId: string | undefined;

/** Bounded discovery plus a durable operation queue; never retries a declined card automatically. */
export const processStripeCollections = async (options: { subscriptionIds?: string[] } = {}) => {
  if (!stripeCollectionsEnabled()) return;
  const ids = options.subscriptionIds;
  if (
    ids &&
    (!ids.length ||
      ids.length > 10 ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !/^[A-Za-z0-9_-]{1,128}$/.test(id)))
  )
    throw new StripeBillingError("billing_operation_conflict");
  const gateway = getStripeGateway();
  const repository = new StripeCollectionRepository();
  for (const operation of await repository.due(gateway.identity, ids)) {
    if (!operation.subscription_id || !operation.provider_invoice_id) continue;
    try {
      await collectStripeInvoice({
        localSubscriptionId: operation.subscription_id,
        invoiceId: operation.provider_invoice_id,
        allowConfirmation: true,
      });
    } catch (error) {
      // Eligibility/configuration errors never grant permission to perform a financial operation.
      const claim = await repository.claim(operation);
      if (claim) {
        const failure = collectionFailureDisposition({
          kind: error instanceof StripeGatewayError ? error.kind : null,
          httpStatus: error instanceof StripeGatewayError ? error.details.status : undefined,
          diagnostic: error instanceof StripeGatewayError ? error.details.diagnostic : undefined,
          pending: operation.last_error_code === "confirmation_pending",
          attempts: claim.attempts,
        });
        await repository.finish(operation.id, claim.lease_token, {
          state: failure.state,
          last_error_code: failure.code,
          next_attempt_at: new Date(Date.now() + 15 * 60_000),
        });
        console.warn("[BILLING_STRIPE] Cobrança aguardando conciliação segura.", {
          operation_ref: stripeOperationReference(operation.id),
          stage: "collection_preflight",
          diagnostic: failure.code,
          retry_scheduled: failure.state === "processing",
          ...stripeFailureObservation(error),
        });
      }
    }
  }
  const contracts = await repository.contracts(
    gateway.identity,
    ids ? undefined : scanAfterId,
    ids,
  );
  if (!ids) scanAfterId = contracts.length === 10 ? contracts.at(-1)?.id : undefined;
  for (const contract of contracts) {
    try {
      const target = await repository.target(contract.id, gateway.identity);
      const page = await gateway.listFinancialInvoices(target.provider, {
        cutoff: new Date(),
        limit: 5,
      });
      for (const invoiceId of page.invoiceIds) {
        const observed = await gateway.getFinancialInvoice(target.provider, invoiceId, new Date());
        if (observed.kind === "receipt" || observed.reason === "zero") continue;
        const invoice = await gateway.getCreditCollectionInvoice({ ...target.provider, invoiceId });
        if (!["draft", "open"].includes(invoice.status) || invoice.amountRemaining === 0) continue;
        await collectStripeInvoice({
          localSubscriptionId: contract.id,
          invoiceId,
          allowConfirmation: true,
        });
      }
    } catch (error) {
      console.warn("[BILLING_STRIPE] Agenda de cobrança aguardando conciliação.", {
        subscription_ref: stripeOperationReference(contract.id),
        stage: "collection_discovery",
        ...stripeFailureObservation(error),
      });
    }
  }
};

import type Stripe from "stripe";
import { readStripeCard } from "./stripe-card";
import { getCreditCollectionInvoice } from "./stripe-credit-invoice";
import {
  type CreditCollectionIntent,
  type CreditIntentInput,
  type CreditIntentReference,
  STRIPE_CREDIT_COLLECTION_POLICY,
} from "./stripe-credit-types";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  requireLocalReference,
  requireStripeClientSecret,
  requireStripeId,
  stripeId,
} from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";

export const projectCreditIntent = (
  intent: Stripe.PaymentIntent,
  identity: StripeIdentity,
  input: CreditIntentInput,
): CreditCollectionIntent => {
  assertStripeMode(intent.livemode, identity);
  if (
    intent.confirmation_method !== "manual" ||
    intent.capture_method !== "automatic" ||
    stripeId(intent.customer, "cus") !== requireStripeId(input.customerId, "cus") ||
    intent.currency !== "brl" ||
    intent.amount !== input.amountCents ||
    !Number.isSafeInteger(input.amountCents) ||
    input.amountCents <= 0 ||
    intent.metadata.lectum_attempt_id !== requireLocalReference(input.attemptId) ||
    intent.metadata.lectum_subscription_id !== requireLocalReference(input.localSubscriptionId) ||
    intent.metadata.lectum_gateway_subscription_id !==
      requireStripeId(input.subscriptionId, "sub") ||
    intent.metadata.lectum_invoice_id !== requireStripeId(input.invoiceId, "in") ||
    intent.metadata.lectum_price_id !== requireStripeId(input.priceId, "price") ||
    intent.metadata.lectum_collection_policy !== STRIPE_CREDIT_COLLECTION_POLICY ||
    intent.allowed_payment_method_types?.length !== 1 ||
    intent.allowed_payment_method_types[0] !== "card" ||
    ![
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
      "succeeded",
      "canceled",
    ].includes(intent.status)
  )
    throw new StripeGatewayError("resource_mismatch");
  return {
    intentId: requireStripeId(intent.id, "pi"),
    status: intent.status,
    confirmationMethod: "manual",
    authenticationRequired: [
      "authentication_required",
      "payment_intent_authentication_failure",
    ].includes(intent.last_payment_error?.code ?? ""),
    paymentFailureObserved:
      !!intent.last_payment_error &&
      stripeId(intent.last_payment_error.payment_method, "pm") === input.paymentMethodId,
    paymentMethodId: stripeId(intent.payment_method, "pm"),
    amountCents: intent.amount,
    customerId: input.customerId,
    invoiceId: input.invoiceId,
    attemptId: input.attemptId,
  };
};

const readIntent = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentReference,
) => {
  const expected = requireStripeId(input.intentId, "pi");
  const intent = await client.paymentIntents.retrieve(expected);
  if (intent.id !== expected) throw new StripeGatewayError("resource_mismatch");
  return { intent, projected: projectCreditIntent(intent, identity, input) };
};

const readCredit = (client: Stripe, identity: StripeIdentity, input: CreditIntentInput) =>
  readStripeCard(client, identity, input.paymentMethodId, input.customerId, {
    requireCredit: true,
  });

const assertOpenInvoice = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentInput,
) => {
  const invoice = await getCreditCollectionInvoice(client, identity, input);
  if (
    invoice.status !== "open" ||
    invoice.amountPaid !== 0 ||
    invoice.amountRemaining !== input.amountCents
  )
    throw new StripeGatewayError("payment_not_eligible");
  return invoice;
};

/** Reading a settled intent never reclassifies a historical card. Secrets require a fresh credit gate. */
export const readCreditInvoiceIntent = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentReference,
) => {
  const { intent, projected } = await readIntent(client, identity, input);
  if (intent.status !== "requires_action") return projected;
  await assertOpenInvoice(client, identity, input);
  if (projected.paymentMethodId !== input.paymentMethodId)
    throw new StripeGatewayError("resource_mismatch");
  await readCredit(client, identity, input);
  return { ...projected, clientSecret: requireStripeClientSecret(intent.client_secret, intent.id) };
};

export const createCreditInvoiceIntent = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentInput,
  idempotencyKey: string,
) => {
  await assertOpenInvoice(client, identity, input);
  await readCredit(client, identity, input);
  const intent = await client.paymentIntents.create(
    {
      customer: requireStripeId(input.customerId, "cus"),
      amount: input.amountCents,
      currency: "brl",
      allowed_payment_method_types: ["card"],
      confirmation_method: "manual",
      capture_method: "automatic",
      confirm: false,
      metadata: {
        lectum_attempt_id: requireLocalReference(input.attemptId),
        lectum_subscription_id: requireLocalReference(input.localSubscriptionId),
        lectum_gateway_subscription_id: requireStripeId(input.subscriptionId, "sub"),
        lectum_invoice_id: requireStripeId(input.invoiceId, "in"),
        lectum_price_id: requireStripeId(input.priceId, "price"),
        lectum_collection_policy: STRIPE_CREDIT_COLLECTION_POLICY,
      },
    },
    { idempotencyKey },
  );
  return projectCreditIntent(intent, identity, input);
};

/** Customer-scoped list is read-after-write; never fall back to a new key after uncertain creation. */
export const findCreditInvoiceIntent = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentInput,
) => {
  const list = await client.paymentIntents.list({
    customer: requireStripeId(input.customerId, "cus"),
    limit: 100,
  });
  if (list.has_more) throw new StripeGatewayError("resource_mismatch");
  const matches = list.data.filter(
    (intent) => intent.metadata.lectum_attempt_id === requireLocalReference(input.attemptId),
  );
  if (matches.length > 1) throw new StripeGatewayError("resource_mismatch");
  return matches[0]
    ? readCreditInvoiceIntent(client, identity, { ...input, intentId: matches[0].id })
    : null;
};

const findAllocation = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentReference,
) => {
  const list = await client.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: requireStripeId(input.intentId, "pi") },
    limit: 2,
  });
  if (list.has_more || list.data.length > 1) throw new StripeGatewayError("resource_mismatch");
  const allocation = list.data[0];
  if (allocation) {
    assertStripeMode(allocation.livemode, identity);
    if (
      stripeId(allocation.invoice, "in") !== input.invoiceId ||
      stripeId(allocation.payment.payment_intent, "pi") !== input.intentId ||
      allocation.amount_requested !== input.amountCents ||
      allocation.currency !== "brl"
    )
      throw new StripeGatewayError("resource_mismatch");
  }
  return allocation;
};

export const attachCreditInvoiceIntent = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentReference,
  idempotencyKey: string,
) => {
  const invoice = await getCreditCollectionInvoice(client, identity, input);
  const { projected } = await readIntent(client, identity, input);
  const allocation = await findAllocation(client, identity, input);
  // A response-loss or SCA resume must not attempt a second attachment.
  if (allocation) {
    if (!["open", "paid"].includes(invoice.status))
      throw new StripeGatewayError("payment_not_eligible");
    return projected;
  }
  if (
    invoice.status !== "open" ||
    invoice.amountPaid !== 0 ||
    invoice.amountRemaining !== input.amountCents
  )
    throw new StripeGatewayError("payment_not_eligible");
  if (!["requires_confirmation", "requires_payment_method"].includes(projected.status))
    throw new StripeGatewayError("operation_unsupported");
  await client.invoices.attachPayment(
    input.invoiceId,
    { payment_intent: input.intentId },
    { idempotencyKey },
  );
  if (!(await findAllocation(client, identity, input)))
    throw new StripeGatewayError("contract_invalid");
  return projected;
};

export const confirmCreditInvoiceIntent = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentReference & { offSession?: boolean },
  idempotencyKey: string,
) => {
  if (input.offSession !== undefined && typeof input.offSession !== "boolean")
    throw new StripeGatewayError("resource_invalid");
  await assertOpenInvoice(client, identity, input);
  const { projected } = await readIntent(client, identity, input);
  if (!["requires_confirmation", "requires_payment_method"].includes(projected.status))
    throw new StripeGatewayError("operation_unsupported");
  const allocation = await findAllocation(client, identity, input);
  if (allocation?.status !== "open") throw new StripeGatewayError("payment_not_eligible");
  await readCredit(client, identity, input);
  // The fixed amount/invoice are scoped above; a new method is accepted only from durable server state.
  await client.paymentIntents.confirm(
    input.intentId,
    {
      payment_method: input.paymentMethodId,
      ...(input.offSession ? { off_session: true } : { off_session: false, use_stripe_sdk: true }),
    },
    { idempotencyKey },
  );
  return readCreditInvoiceIntent(client, identity, input);
};

export const cancelCreditInvoiceIntent = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditIntentReference,
  idempotencyKey: string,
) => {
  const { projected } = await readIntent(client, identity, input);
  if (["succeeded", "canceled"].includes(projected.status)) return projected;
  if (
    !["requires_confirmation", "requires_payment_method", "requires_action"].includes(
      projected.status,
    )
  )
    throw new StripeGatewayError("operation_unsupported");
  const canceled = await client.paymentIntents.cancel(
    input.intentId,
    { cancellation_reason: "abandoned" },
    { idempotencyKey },
  );
  return projectCreditIntent(canceled, identity, input);
};

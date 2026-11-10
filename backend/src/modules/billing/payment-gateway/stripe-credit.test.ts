import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { projectCreditIntent } from "./stripe-credit-intent";
import { projectCreditCollectionInvoice } from "./stripe-credit-invoice";
import { assertCreditCheckoutSetup, assertCreditSubscription } from "./stripe-credit-setup";
import { STRIPE_CREDIT_COLLECTION_POLICY } from "./stripe-credit-types";
import { StripeGatewayError } from "./stripe-error";

// Pure hostile-contract fixtures, not substitutes for sandbox charge/SCA evidence.
const identity = { accountId: "acct_unit", mode: "test" as const };
const input = {
  subscriptionId: "sub_unit",
  localSubscriptionId: "local-unit",
  customerId: "cus_unit",
  invoiceId: "in_unit",
  priceId: "price_unit",
  amountCents: 2990,
  attemptId: "attempt-unit",
  paymentMethodId: "pm_unit",
};
const metadata = {
  lectum_attempt_id: input.attemptId,
  lectum_subscription_id: input.localSubscriptionId,
  lectum_gateway_subscription_id: input.subscriptionId,
  lectum_invoice_id: input.invoiceId,
  lectum_price_id: input.priceId,
  lectum_collection_policy: STRIPE_CREDIT_COLLECTION_POLICY,
};
const subscription = (change = {}) =>
  ({
    id: input.subscriptionId,
    customer: input.customerId,
    livemode: false,
    created: 1790000000,
    status: "active",
    cancel_at: null,
    cancel_at_period_end: false,
    collection_method: "charge_automatically",
    pause_collection: { behavior: "keep_as_draft", resumes_at: null },
    default_payment_method: input.paymentMethodId,
    metadata,
    items: {
      has_more: false,
      data: [
        {
          quantity: 1,
          price: {
            id: input.priceId,
            product: "prod_unit",
            livemode: false,
            active: true,
            type: "recurring",
            currency: "brl",
            unit_amount: 2990,
            recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
            billing_scheme: "per_unit",
            transform_quantity: null,
          },
        },
      ],
    },
    ...change,
  }) as unknown as Stripe.Subscription;
const invoice = (change = {}) =>
  ({
    id: input.invoiceId,
    customer: input.customerId,
    livemode: false,
    status: "open",
    auto_advance: false,
    collection_method: "charge_automatically",
    billing_reason: "subscription_create",
    currency: "brl",
    amount_due: 2990,
    amount_remaining: 2990,
    amount_paid: 0,
    total: 2990,
    starting_balance: 0,
    pre_payment_credit_notes_amount: 0,
    post_payment_credit_notes_amount: 0,
    amount_paid_off_stripe: 0,
    default_payment_method: "pm_snapshot",
    parent: { subscription_details: { subscription: input.subscriptionId, metadata } },
    lines: {
      has_more: false,
      data: [
        {
          amount: 2990,
          currency: "brl",
          quantity: 1,
          parent: {
            subscription_item_details: { subscription: input.subscriptionId, proration: false },
          },
          pricing: { price_details: { price: input.priceId } },
          period: { start: 1790000000, end: 1792592000 },
        },
      ],
    },
    ...change,
  }) as unknown as Stripe.Invoice;
const intent = (change = {}) =>
  ({
    id: "pi_unit",
    customer: input.customerId,
    livemode: false,
    confirmation_method: "manual",
    capture_method: "automatic",
    status: "requires_confirmation",
    amount: 2990,
    currency: "brl",
    payment_method: input.paymentMethodId,
    allowed_payment_method_types: ["card"],
    metadata,
    client_secret: "pi_unit_secret_sensitive",
    ...change,
  }) as unknown as Stripe.PaymentIntent;

const reject = (action: () => unknown) => assert.throws(action, StripeGatewayError);

test("manual credit policy requires an indefinite hold, correct scope and no cancellation", () => {
  assert.doesNotThrow(() => assertCreditSubscription(subscription(), identity, input));
  for (const change of [
    { livemode: true },
    { customer: "cus_other" },
    { id: "sub_other" },
    { status: "canceled" },
    { status: "incomplete_expired" },
    { status: "unpaid" },
    { cancel_at_period_end: true },
    { cancel_at: 1800000000 },
    { collection_method: "send_invoice" },
    { pause_collection: null },
    { pause_collection: { behavior: "void", resumes_at: null } },
    { pause_collection: { behavior: "keep_as_draft", resumes_at: 1800000000 } },
    { metadata: { ...metadata, lectum_collection_policy: "automatic" } },
  ])
    reject(() => assertCreditSubscription(subscription(change), identity, input));
  assert.doesNotThrow(() =>
    assertCreditSubscription(subscription({ pause_collection: null }), identity, input, false),
  );
});

test("collection invoice projection pins price, interval, scope and full amount without enabling automation", () => {
  const result = projectCreditCollectionInvoice(invoice(), subscription(), identity, input);
  assert.equal(result.amountRemaining, 2990);
  assert.equal(result.defaultPaymentMethodId, input.paymentMethodId);
  assert.equal(result.autoAdvance, false);
  assert.equal("clientSecret" in result, false);
  for (const change of [
    { id: "in_other" },
    { customer: "cus_other" },
    { livemode: true },
    { currency: "usd" },
    { amount_due: 3000 },
    { total: 3000 },
    { auto_advance: true },
    { starting_balance: -100 },
    { amount_paid: 100 },
    { amount_remaining: 2890 },
    { amount_paid_off_stripe: 2990 },
    { pre_payment_credit_notes_amount: 10 },
    { post_payment_credit_notes_amount: 10 },
    { billing_reason: "manual" },
    { collection_method: "send_invoice" },
    { parent: { subscription_details: { subscription: "sub_other", metadata } } },
    { parent: { subscription_details: { subscription: input.subscriptionId, metadata: {} } } },
    { lines: { ...invoice().lines, has_more: true } },
  ])
    reject(() => projectCreditCollectionInvoice(invoice(change), subscription(), identity, input));
  reject(() =>
    projectCreditCollectionInvoice(invoice(), subscription(), identity, {
      ...input,
      priceId: "price_other",
    }),
  );
});

test("manual intent canonical projection rejects auto confirmation and never discloses a secret", () => {
  for (const status of [
    "requires_confirmation",
    "requires_action",
    "requires_payment_method",
    "processing",
    "succeeded",
    "canceled",
  ]) {
    const result = projectCreditIntent(intent({ status }), identity, input);
    assert.equal(result.status, status);
    assert.equal(result.confirmationMethod, "manual");
    assert.equal("clientSecret" in result, false);
    assert.equal("client_secret" in result, false);
  }
  for (const change of [
    { livemode: true },
    { customer: "cus_other" },
    { amount: 2991 },
    { currency: "usd" },
    { confirmation_method: "automatic" },
    { capture_method: "manual" },
    { status: "requires_capture" },
    { allowed_payment_method_types: null },
    { allowed_payment_method_types: ["card", "link"] },
    { metadata: { ...metadata, lectum_attempt_id: "other" } },
    { metadata: { ...metadata, lectum_invoice_id: "in_other" } },
    { metadata: { ...metadata, lectum_gateway_subscription_id: "sub_other" } },
    { metadata: { ...metadata, lectum_subscription_id: "other" } },
    { metadata: { ...metadata, lectum_collection_policy: "automatic" } },
    { metadata: { ...metadata, lectum_price_id: "price_other" } },
  ])
    reject(() => projectCreditIntent(intent(change), identity, input));
  // A declined intent can be recovered after its method is cleared; only confirmation may choose a new credit PM.
  assert.equal(
    projectCreditIntent(
      intent({ status: "requires_payment_method", payment_method: null }),
      identity,
      input,
    ).paymentMethodId,
    null,
  );
});

test("checkout setup must be independent, scoped and off-session rather than a subscription pending setup", () => {
  const base = {
    id: "seti_unit",
    customer: input.customerId,
    livemode: false,
    status: "succeeded",
    usage: "off_session",
    payment_method: input.paymentMethodId,
    metadata: {
      lectum_attempt_id: input.attemptId,
      lectum_subscription_id: input.localSubscriptionId,
      lectum_collection_policy: STRIPE_CREDIT_COLLECTION_POLICY,
      lectum_intent_kind: "checkout_setup",
    },
  } as unknown as Stripe.SetupIntent;
  const projected = assertCreditCheckoutSetup(base, identity, input);
  assert.equal(projected.subscriptionId, null);
  for (const change of [
    { customer: "cus_other" },
    { livemode: true },
    { usage: "on_session" },
    { metadata: null },
    { metadata: { ...base.metadata, lectum_gateway_subscription_id: input.subscriptionId } },
    { metadata: { ...base.metadata, lectum_attempt_id: "other" } },
    { metadata: { ...base.metadata, lectum_intent_kind: "payment_method" } },
  ])
    reject(() =>
      assertCreditCheckoutSetup({ ...base, ...change } as Stripe.SetupIntent, identity, input),
    );
});

test("financial SCA recovery uses only the provider authentication-required enum", () => {
  assert.equal(
    projectCreditIntent(
      intent({
        last_payment_error: {
          code: "payment_intent_authentication_failure",
          type: "invalid_request_error",
        },
      }),
      identity,
      input,
    ).authenticationRequired,
    true,
  );
  assert.equal(
    projectCreditIntent(
      intent({ last_payment_error: { code: "authentication_required" } }),
      identity,
      input,
    ).authenticationRequired,
    true,
  );
  for (const last_payment_error of [
    null,
    { code: "card_declined" },
    { code: "insufficient_funds" },
    { message: "authentication_required" },
  ])
    assert.equal(
      projectCreditIntent(intent({ last_payment_error }), identity, input).authenticationRequired,
      false,
    );
});

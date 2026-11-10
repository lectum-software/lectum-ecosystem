import type { BillingSubscriptionStatus } from "./PaymentGateway";

export type StripeMode = "test" | "live";
export type StripeIdentity = { accountId: string; mode: StripeMode };

export type StripePlan = StripeIdentity & {
  priceId: string;
  productId: string;
  active: boolean;
  amountCents: number;
  currency: "BRL";
  interval: "month";
  intervalCount: 1;
};

export type StripeCanonicalSubscription = StripeIdentity & {
  subscriptionId: string;
  customerId: string;
  localSubscriptionId: string | null;
  attemptId: string | null;
  priceId: string;
  amountCents: number;
  currency: "BRL";
  interval: "month";
  status: BillingSubscriptionStatus;
  gatewayStatus: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  defaultPaymentMethodId: string | null;
  latestInvoiceId: string | null;
  latestInvoicePaid: boolean;
  latestInvoiceAmountPaid: number;
  latestInvoicePaidAt: Date | null;
  /** Independent InvoicePayment transition; absent evidence must not grant paid access. */
  latestInvoicePaymentPaidAt?: Date | null;
  latestInvoicePeriodStart: Date | null;
  latestInvoicePeriodEnd: Date | null;
  latestInvoicePaymentVerified: boolean;
  latestInvoicePaymentIntentId?: string | null;
  latestInvoiceRefundedCents: number;
  latestInvoiceDisputed: boolean;
};

export type StripeEmbeddedInput = {
  attemptId: string;
  /** Local Lectum subscription ID, not a Stripe sub_ ID. */
  subscriptionId: string;
  customerId: string;
  priceId: string;
  payerEmail: string;
  startDate?: Date | string | null;
};

export type StripeEmbeddedResult = {
  subscriptionId: string;
  intentKind: "payment" | "setup" | "none";
  clientSecret?: string;
  intentId?: string;
  status: BillingSubscriptionStatus;
  gatewayStatus: string;
  currentPeriodEnd: Date | null;
};

export type StripeCardSetupInput = {
  attemptId: string;
  customerId: string;
  /** Persisted Stripe subscription ID. */
  subscriptionId: string;
};

export type StripeSetup = StripeIdentity & {
  setupIntentId: string;
  customerId: string;
  attemptId: string | null;
  subscriptionId: string | null;
  localSubscriptionId: string | null;
  status: string;
  paymentMethodId: string | null;
  /** Transient confirmation only. Never persist or log. Absent in terminal states. */
  clientSecret?: string;
};

export type StripeCardDisplay = {
  paymentMethodId: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};

export type StripeWebhookReference = StripeIdentity & {
  eventId: string;
  type: string;
  apiVersion: string;
  created: Date;
  resourceId: string;
  subscriptionId: string | null;
};

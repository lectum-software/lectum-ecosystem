import type Stripe from "stripe";

export const STRIPE_CREDIT_COLLECTION_POLICY = "manual_credit_v1";

export type CreditCheckoutSetupInput = {
  attemptId: string;
  localSubscriptionId: string;
  customerId: string;
};
export type CreditSubscriptionScope = {
  subscriptionId: string;
  localSubscriptionId: string;
  customerId: string;
};
export type CreditCollectionScope = CreditSubscriptionScope & {
  invoiceId: string;
  priceId: string;
  amountCents: number;
};
export type CreditIntentInput = CreditCollectionScope & {
  attemptId: string;
  paymentMethodId: string;
};
export type CreditIntentReference = CreditIntentInput & { intentId: string };
export type CreditCollectionInvoice = {
  invoiceId: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  autoAdvance: boolean;
  amountRemaining: number;
  amountPaid: number;
  currency: "brl";
  billingReason: string | null;
  periodStart: Date;
  periodEnd: Date;
  defaultPaymentMethodId: string | null;
};
export type CreditCollectionIntent = {
  intentId: string;
  status: Stripe.PaymentIntent.Status;
  confirmationMethod: "manual";
  authenticationRequired: boolean;
  paymentMethodId: string | null;
  amountCents: number;
  customerId: string;
  invoiceId: string;
  attemptId: string;
  /** Only a scoped MANUAL intent in requires_action can disclose a financial secret. */
  clientSecret?: string;
};

import type { StripeIdentity } from "./stripe-types";

export type StripeFinancialTarget = {
  subscriptionId: string;
  localSubscriptionId: string;
  customerId: string;
  priceId: string;
  amountCents: number;
};
export type StripeFinancialContract = StripeIdentity & StripeFinancialTarget & { createdAt: Date };
export type StripeFinancialPage = {
  invoiceIds: string[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type StripeFinancialReceipt = StripeIdentity &
  StripeFinancialTarget & {
    invoiceId: string;
    invoicePaymentId: string;
    paymentIntentId: string;
    chargeId: string;
    currency: "BRL";
    paidAt: Date;
    invoicePaidAt: Date;
    periodStart: Date;
    periodEnd: Date;
    refundedCents: number;
    currentState: "paid" | "partially_refunded" | "refunded" | "disputed";
    disputeStatus: "none" | "observed";
  };
export type StripeFinancialInvoice =
  | { kind: "receipt"; receipt: StripeFinancialReceipt }
  | { kind: "excluded"; reason: "unpaid" | "zero" | "paid_after_cutoff" };

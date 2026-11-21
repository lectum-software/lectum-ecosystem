import type { GatewayInvoicePayment } from "@/modules/billing/payment-gateway/PaymentGateway";

export type FirstPaidSubscriptionEvidence = {
  // Trusted server evidence only, never populated from a browser or raw webhook body.
  webhookSignatureVerified: boolean;
  eventType: string;
  payment: GatewayInvoicePayment;
  localSubscription: {
    id: string;
    gatewaySubscriptionId: string;
    gateway: string;
    complimentary: boolean;
    free: boolean;
  };
  // Cover the professional's entire history, including cancelled subscriptions.
  // An empty local ledger at rollout is NOT proof of a first payment.
  firstEverPaidPaymentId: string | null;
  completeHistoryVerified: boolean;
  alreadyRecorded: boolean;
};

export function firstPaidSubscriptionCandidate(input: FirstPaidSubscriptionEvidence) {
  const { payment, localSubscription: subscription } = input;
  if (
    !input.webhookSignatureVerified ||
    !input.completeHistoryVerified ||
    input.alreadyRecorded ||
    input.eventType !== "invoice.paid" ||
    subscription.gateway !== "stripe" ||
    subscription.complimentary ||
    subscription.free ||
    !subscription.id ||
    !subscription.gatewaySubscriptionId ||
    !payment.paymentId ||
    payment.subscriptionId !== subscription.gatewaySubscriptionId ||
    payment.externalReference !== subscription.id ||
    payment.paymentId !== input.firstEverPaidPaymentId ||
    payment.status !== "paid" ||
    !payment.liveMode ||
    payment.currency !== "BRL" ||
    !Number.isSafeInteger(payment.amountCents) ||
    payment.amountCents <= 0 ||
    payment.refundedCents !== 0 ||
    !payment.paidAt ||
    !Number.isFinite(payment.paidAt.getTime())
  )
    return null;

  // Internal candidate, not permission to transmit. Never use a plan's list price.
  return {
    eventName: "Subscribe" as const,
    paidAt: payment.paidAt,
    amountCents: payment.amountCents,
    currency: "BRL" as const,
  };
}

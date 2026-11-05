import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";

export function mergeInvoicePaymentHistory(
  invoices: BillingPaymentHistoryItem[],
  legacy: BillingPaymentHistoryItem[],
): BillingPaymentHistoryItem[] {
  const payments = new Map<string, BillingPaymentHistoryItem>();
  for (const item of invoices) {
    payments.set(JSON.stringify([item.gateway, item.invoice?.mode, item.payment_id]), item);
  }
  const remaining = legacy.filter((item) => {
    // Test invoices must never replace live payment history.
    const live = [...payments.values()].filter(
      (row) => row.invoice?.mode === "live" && row.gateway === item.gateway,
    );
    if (item.payment_id) return !live.some((row) => row.payment_id === item.payment_id);
    if (!item.summary_charged_quantity || !item.subscription_id) return true;
    const subscriptionPayments = live.filter((row) => row.subscription_id === item.subscription_id);
    // A subscription summary is a fallback, not another charge. Replace it only
    // when the ledger covers all installments or its latest confirmed payment.
    return !(
      subscriptionPayments.length >= item.summary_charged_quantity ||
      (item.occurred_at &&
        subscriptionPayments.some((row) => row.occurred_at && row.occurred_at >= item.occurred_at!))
    );
  });
  return [...payments.values(), ...remaining]
    .sort((a, b) => (b.occurred_at?.getTime() ?? 0) - (a.occurred_at?.getTime() ?? 0))
    .slice(0, 100);
}

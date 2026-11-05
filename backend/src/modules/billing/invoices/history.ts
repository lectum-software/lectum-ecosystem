import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import { getInvoiceConfig } from "./config";
import { mergeInvoicePaymentHistory } from "./history-merge";
import { InvoiceRepository } from "./repository";

export async function withInvoiceHistory(
  userId: string,
  legacy: BillingPaymentHistoryItem[],
): Promise<BillingPaymentHistoryItem[]> {
  let config: ReturnType<typeof getInvoiceConfig>;
  try {
    config = getInvoiceConfig();
  } catch {
    return legacy;
  }
  if (!config) return legacy;
  const invoices = await new InvoiceRepository().listForUser(userId, config.companyId, config.mode);
  const rows: BillingPaymentHistoryItem[] = invoices.map((invoice) => ({
    id: `invoice:${invoice.id}`,
    title: config.mode === "test" ? "Pagamento de teste" : "Pagamento confirmado",
    description:
      config.mode === "test" ? "Pagamento de teste, sem valor fiscal" : "Cobrança confirmada.",
    amount_cents: invoice.amount_cents,
    status: "pago",
    status_label: config.mode === "test" ? "Teste" : "Sucesso",
    occurred_at: invoice.paid_at,
    gateway: invoice.gateway,
    external_id: invoice.payment_id,
    payment_id: invoice.payment_id,
    subscription_id: invoice.subscription_id,
    invoice: {
      id: invoice.id,
      status: invoice.status,
      number: invoice.number,
      mode: config.mode,
      downloadable: invoice.status === "authorized" && Boolean(invoice.document_id),
    },
  }));
  return mergeInvoicePaymentHistory(rows, legacy);
}

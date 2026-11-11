import type { billing_financial_receipt } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { professional_subscription } from "@/interfaces/objects";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import { invoiceGatewayScopes } from "../invoices/gateway-scope";
import { subscriptionGatewayName } from "../subscription-provider";
import { storedFinancialReceiptHash } from "./financial-ledger/policy";

const PAGE_SIZE = 50;
const HISTORY_LIMIT = 100;

const historyItem = (
  row: billing_financial_receipt,
  subscription: professional_subscription,
): BillingPaymentHistoryItem | null => {
  if (
    row.psychologist_id !== subscription.psychologist_id ||
    row.provider_subscription_id !== subscription.gateway_subscription_id ||
    row.price_version_id !== subscription.price_version_id ||
    row.currency !== "BRL" ||
    !Number.isSafeInteger(row.amount_paid_cents) ||
    row.amount_paid_cents <= 0 ||
    row.paid_at > new Date() ||
    row.invoice_paid_at > new Date() ||
    row.period_end <= row.period_start ||
    !["paid", "partially_refunded", "refunded", "disputed"].includes(row.current_state) ||
    storedFinancialReceiptHash(row) !== row.immutable_hash
  )
    return null;
  const adjusted = row.current_state !== "paid";
  const label = {
    paid: row.mode === "test" ? "Teste" : "Sucesso",
    partially_refunded: "Estorno parcial",
    refunded: "Estornado",
    disputed: "Em análise",
  }[row.current_state]!;
  return {
    id: `receipt:${row.id}`,
    title: row.mode === "test" ? "Pagamento de teste" : "Assinatura mensal",
    description: adjusted ? label : "Cobrança confirmada.",
    amount_cents: row.amount_paid_cents,
    status: adjusted ? "processado" : "pago",
    status_label: label,
    occurred_at: row.paid_at,
    gateway: "stripe",
    mode: row.mode as "test" | "live",
    external_id: row.invoice_id,
    payment_id: row.invoice_id,
    subscription_id: row.subscription_id,
  };
};

/** Read-only history, not proof of current entitlement. Canceled contracts retain receipts. */
export async function ownedStripePaymentHistory(
  psychologistId: string,
  subscriptions: professional_subscription[],
): Promise<BillingPaymentHistoryItem[]> {
  const mode = process.env.STRIPE_ENV === "live" ? "live" : "test";
  const scope = invoiceGatewayScopes(mode).find((item) => item.gateway === "stripe");
  if (!scope) return [];
  const contracts = new Map(
    subscriptions
      .filter(
        (item) =>
          item.id &&
          item.psychologist_id === psychologistId &&
          subscriptionGatewayName(item) === "stripe" &&
          item.gateway_mode === scope.mode &&
          item.gateway_account_id === scope.accountId,
      )
      .map((item) => [item.id!, item]),
  );
  if (!contracts.size) return [];
  const history: BillingPaymentHistoryItem[] = [];
  const invoices = new Set<string>();
  let cursor: string | undefined;
  // Bounded keyset scan skips invalid/cross-linked rows without losing the next page.
  for (let page = 0; page < 10 && history.length < HISTORY_LIMIT; page++) {
    const rows = await prisma.billing_financial_receipt.findMany({
      where: {
        gateway: "stripe",
        mode: scope.mode,
        account_id: scope.accountId,
        psychologist_id: psychologistId,
        subscription_id: { in: [...contracts.keys()] },
      },
      orderBy: [{ paid_at: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const row of rows) {
      const item = historyItem(row, contracts.get(row.subscription_id)!);
      if (!item || invoices.has(row.invoice_id)) continue;
      invoices.add(row.invoice_id);
      history.push(item);
      if (history.length === HISTORY_LIMIT) break;
    }
    if (rows.length < PAGE_SIZE) break;
    cursor = rows.at(-1)!.id;
  }
  return history;
}

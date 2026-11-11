"use client";

import { CheckCircle2, ReceiptText } from "lucide-react";
import type {
  BillingFiscalRequirements,
  BillingPaymentHistoryItem,
} from "@/api/generator/types/billing";
import { cn } from "@/lib/utils";
import { shouldExplainStripeInvoice } from "@/utils/billing-management";
import { formatPaymentDate, formatPrice } from "./billing-format";
import { FiscalRequirementsMessage } from "./fiscal-requirements-message";
import { InvoiceAction } from "./invoice-action";

export const PaymentHistoryCard = ({
  items,
  canReviewAddress = false,
  fiscalRequirements,
}: {
  items: BillingPaymentHistoryItem[];
  canReviewAddress?: boolean;
  fiscalRequirements?: BillingFiscalRequirements;
}) => (
  <article className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <ReceiptText className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-base font-extrabold text-foreground">Histórico de pagamentos</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Cobranças confirmadas.</p>
      </div>
    </div>

    {items.length > 0 ? (
      <ol className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <li className="flex items-center gap-3 py-4 first:pt-0 last:pb-0" key={item.id}>
            <span
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                item.status === "pago"
                  ? "bg-success/10 text-success"
                  : "bg-surface-muted text-muted",
              )}
            >
              {item.status === "pago" ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ReceiptText className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-extrabold text-foreground">
                {item.title || "Assinatura mensal"}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">
                {formatPaymentDate(item.occurred_at)}
              </p>
              {item.status_label && item.status_label !== "Sucesso" ? (
                <p className="mt-1 text-xs font-semibold text-muted">{item.status_label}</p>
              ) : null}
              {shouldExplainStripeInvoice(item) ? (
                <FiscalRequirementsMessage
                  requirements={fiscalRequirements}
                  testMode={item.mode === "test"}
                  canReviewAddress={canReviewAddress}
                />
              ) : null}
              {item.invoice &&
              !(item.invoice.status === "authorized" && item.invoice.downloadable) ? (
                <InvoiceAction invoice={item.invoice} />
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              {item.amount_cents ? (
                <p className="text-sm font-extrabold text-foreground">
                  {formatPrice(item.amount_cents)}
                </p>
              ) : null}
              {item.invoice?.status === "authorized" && item.invoice.downloadable ? (
                <InvoiceAction invoice={item.invoice} />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    ) : (
      <div className="mt-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4">
        <p className="text-sm font-extrabold text-foreground">Nenhum pagamento registrado ainda</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Quando cobranças forem confirmadas, elas aparecerão aqui.
        </p>
      </div>
    )}
  </article>
);

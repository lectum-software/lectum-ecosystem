import Link from "next/link";
import type { FinancialHistoryItem } from "@/api/req/finance/history";
import { cn } from "@/lib/utils";
import { FinancialInvoiceAction } from "./invoice-action";
import {
  financialStatusClass,
  financialStatusLabel,
  formatHistoryDate,
  formatHistoryMoney,
} from "./presentation";

const PaymentStatus = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold",
      financialStatusClass(status),
    )}
  >
    {financialStatusLabel(status)}
  </span>
);

const PaymentSource = ({ item }: { item: FinancialHistoryItem }) => (
  <p className="text-xs leading-5 text-muted">
    {item.gateway === "stripe"
      ? "Stripe"
      : item.gateway === "mercadopago"
        ? "Mercado Pago"
        : "Gateway não informado"}
    {" · "}
    {item.mode === "test"
      ? "Teste · sem cobrança real"
      : item.mode === "live"
        ? "Produção"
        : "Ambiente não comprovado no legado"}
  </p>
);

const PsychologistLink = ({ item }: { item: FinancialHistoryItem }) => (
  <Link
    className="break-words text-sm font-semibold text-primary underline-offset-4 hover:underline"
    href={`/psicologos/${encodeURIComponent(item.user_id)}?tab=plano`}
  >
    {item.display_name || "Ver perfil do psicólogo"}
  </Link>
);

export const FinancialHistoryTable = ({
  items,
  showPsychologist = false,
}: {
  items: FinancialHistoryItem[];
  showPsychologist?: boolean;
}) => (
  <>
    <div className="grid min-w-0 gap-3 p-4 lg:hidden">
      {items.map((item) => (
        <article
          className="min-w-0 space-y-3 rounded-2xl border border-border bg-surface p-4"
          key={item.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{formatHistoryDate(item.occurred_at)} · BRT</p>
            <PaymentStatus status={item.financial_status} />
          </div>
          {showPsychologist ? <PsychologistLink item={item} /> : null}
          <p className="break-words text-sm font-semibold text-foreground">{item.description}</p>
          <PaymentSource item={item} />
          <p className="text-lg font-bold text-foreground">
            {formatHistoryMoney(item.amount_cents, item.currency)}
          </p>
          <div className="border-t border-border pt-3">
            <h3 className="mb-1 text-xs font-semibold text-foreground">Nota fiscal</h3>
            <FinancialInvoiceAction invoice={item.invoice} userId={item.user_id} />
          </div>
        </article>
      ))}
    </div>
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[880px] text-left text-sm">
        <caption className="sr-only">
          Histórico financeiro local e situação da nota fiscal de cada registro
        </caption>
        <thead className="bg-surface-muted text-xs text-muted">
          <tr>
            <th className="px-5 py-4" scope="col">
              Data · BRT
            </th>
            {showPsychologist ? (
              <th className="px-5 py-4" scope="col">
                Psicólogo
              </th>
            ) : null}
            <th className="px-5 py-4" scope="col">
              Descrição
            </th>
            <th className="px-5 py-4" scope="col">
              Valor registrado
            </th>
            <th className="px-5 py-4" scope="col">
              Situação financeira
            </th>
            <th className="px-5 py-4" scope="col">
              Nota fiscal
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr className="align-top" key={item.id}>
              <td className="whitespace-nowrap px-5 py-5 text-xs text-muted">
                {formatHistoryDate(item.occurred_at)}
              </td>
              {showPsychologist ? (
                <td className="max-w-56 px-5 py-5">
                  <PsychologistLink item={item} />
                </td>
              ) : null}
              <td className="min-w-44 max-w-72 space-y-1 px-5 py-5">
                <p className="break-words font-semibold text-foreground">{item.description}</p>
                <PaymentSource item={item} />
              </td>
              <td className="whitespace-nowrap px-5 py-5 font-bold text-foreground">
                {formatHistoryMoney(item.amount_cents, item.currency)}
              </td>
              <td className="px-5 py-5">
                <PaymentStatus status={item.financial_status} />
              </td>
              <td className="min-w-48 max-w-64 px-5 py-5">
                <FinancialInvoiceAction invoice={item.invoice} userId={item.user_id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

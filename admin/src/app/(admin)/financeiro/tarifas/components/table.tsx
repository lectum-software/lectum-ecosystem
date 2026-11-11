import { Loader2, RefreshCw } from "lucide-react";
import { Fragment } from "react";
import type { AdminFeeItem } from "@/api/req/finance/fees";
import {
  financialStatusClass,
  financialStatusLabel,
} from "@/components/finance-history/presentation";
import {
  balanceStatusLabel,
  feeCaptureValues,
  feeDiagnosticLabel,
  feeObserveLabel,
  feeStateLabel,
  formatFeeDate,
  formatFeeMoney,
} from "../modules/fee-policy";
import { FeeTransactions } from "./transactions";

const Coverage = ({ item }: { item: AdminFeeItem }) => (
  <div className="min-w-0 space-y-2">
    <p className="text-sm font-semibold text-foreground">{feeStateLabel(item.coverage.state)}</p>
    <p className="text-xs leading-5 text-muted">
      Estornos: {item.coverage.refunds_scanned ? "etapa consultada" : "etapa não concluída"}
      <br />
      Disputas: {item.coverage.disputes_scanned ? "etapa consultada" : "etapa não concluída"}
    </p>
    {item.coverage.last_error_code ? (
      <p className="text-xs leading-5 text-warning">
        {feeDiagnosticLabel(item.coverage.last_error_code)}
      </p>
    ) : null}
    <p className="text-xs leading-5 text-muted">
      Objetos de estorno/disputa criados até:{" "}
      {item.coverage.cutoff_at ? formatFeeDate(item.coverage.cutoff_at) : "Não informado"}
      {item.coverage.cutoff_at ? " · BRT" : ""}
    </p>
    <p className="text-xs leading-5 text-muted">Movimentos e disponibilidade têm datas próprias.</p>
    <p className="text-xs leading-5 text-muted">
      Última consulta: {formatFeeDate(item.coverage.last_observed_at)}
      {item.coverage.last_observed_at ? " · BRT" : ""}
    </p>
  </div>
);
const Observe = ({
  item,
  busy,
  activeReceipt,
  onObserve,
}: {
  item: AdminFeeItem;
  busy: boolean;
  activeReceipt?: string;
  onObserve: (item: AdminFeeItem) => void;
}) => (
  <div className="space-y-2">
    <button
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm font-bold text-primary disabled:opacity-50 sm:w-auto"
      disabled={busy || item.can_refresh !== true}
      onClick={() => onObserve(item)}
      type="button"
    >
      {busy && activeReceipt === item.receipt_id ? (
        <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <RefreshCw aria-hidden className="h-4 w-4 shrink-0" />
      )}
      {feeObserveLabel(item)}
    </button>
    <p className="text-xs leading-5 text-muted">
      {item.can_refresh
        ? "Uma etapa por clique. Apenas consulta; não efetua cobrança."
        : "A consulta externa deste recibo não está habilitada neste ambiente."}
    </p>
  </div>
);
const Receipt = ({ item }: { item: AdminFeeItem }) => (
  <div className="min-w-0 space-y-2">
    <p className="text-sm font-bold text-foreground">{formatFeeDate(item.paid_at)} · BRT</p>
    <p className="break-all text-xs text-muted">Recibo local: {item.receipt_id}</p>
    <p className="text-lg font-bold text-foreground">{formatFeeMoney(item.amount_paid_cents)}</p>
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${financialStatusClass(item.financial_status)}`}
    >
      {financialStatusLabel(item.financial_status)}
    </span>
  </div>
);
export const StripeFeeTable = ({
  items,
  busy,
  activeReceipt,
  onObserve,
}: {
  items: AdminFeeItem[];
  busy: boolean;
  activeReceipt?: string;
  onObserve: (item: AdminFeeItem) => void;
}) => {
  if (!items.length)
    return (
      <p className="p-5 text-sm leading-6 text-muted">
        Nenhum recibo Stripe elegível registrado localmente neste período. Isso não comprova
        ausência de pagamentos ou custos na conta Stripe.
      </p>
    );
  return (
    <>
      <div className="divide-y divide-border lg:hidden">
        {items.map((item) => {
          const capture = feeCaptureValues(item);
          return (
            <article className="min-w-0 space-y-4 p-4" key={item.receipt_id}>
              <Receipt item={item} />
              <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs leading-5 text-muted">Tarifa da captura observada</dt>
                  <dd className="mt-1 break-words text-xl font-bold text-foreground">
                    {formatFeeMoney(capture.fee)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs leading-5 text-muted">
                    Líquido da captura · antes dos ajustes
                  </dt>
                  <dd className="mt-1 break-words text-xl font-bold text-foreground">
                    {formatFeeMoney(capture.net)}
                  </dd>
                </div>
              </dl>
              {item.capture ? (
                <p className="text-xs leading-5 text-muted">
                  {balanceStatusLabel(item.capture.status)}
                  <br />
                  Captura observada em {formatFeeDate(item.capture.observed_at)} · BRT
                </p>
              ) : null}
              <Coverage item={item} />
              <Observe
                activeReceipt={activeReceipt}
                busy={busy}
                item={item}
                onObserve={onObserve}
              />
              <FeeTransactions transactions={item.transactions} />
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <caption className="sr-only">
            Tarifas observadas por recibo local, antes de estornos, disputas e despesas
          </caption>
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              {[
                "Recebimento registrado · BRT",
                "Tarifa da captura",
                "Líquido da captura · antes dos ajustes",
                "Cobertura observada",
                "Consulta manual",
              ].map((label) => (
                <th className="px-4 py-4" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const capture = feeCaptureValues(item);
              return (
                <Fragment key={item.receipt_id}>
                  <tr className="border-t border-border align-top">
                    <td className="min-w-52 max-w-64 px-4 py-4">
                      <Receipt item={item} />
                    </td>
                    <td className="min-w-40 max-w-52 px-4 py-4">
                      <p className="break-words text-lg font-bold text-foreground">
                        {formatFeeMoney(capture.fee)}
                      </p>
                      {item.capture ? (
                        <p className="mt-2 text-xs leading-5 text-muted">
                          Observada em {formatFeeDate(item.capture.observed_at)} · BRT
                        </p>
                      ) : null}
                    </td>
                    <td className="min-w-44 max-w-56 px-4 py-4">
                      <p className="break-words text-lg font-bold text-foreground">
                        {formatFeeMoney(capture.net)}
                      </p>
                      {item.capture ? (
                        <p className="mt-2 text-xs leading-5 text-muted">
                          {balanceStatusLabel(item.capture.status)}
                        </p>
                      ) : null}
                    </td>
                    <td className="min-w-56 max-w-72 px-4 py-4">
                      <Coverage item={item} />
                    </td>
                    <td className="min-w-52 max-w-64 px-4 py-4">
                      <Observe
                        activeReceipt={activeReceipt}
                        busy={busy}
                        item={item}
                        onObserve={onObserve}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 pb-4" colSpan={5}>
                      <FeeTransactions transactions={item.transactions} />
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

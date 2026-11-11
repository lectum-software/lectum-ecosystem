import { Pencil, XCircle } from "lucide-react";
import type { AdminExpense } from "@/api/req/finance/expenses";
import { formatMoney } from "../../modules/finance-support";
import { categoryLabel, formatExpenseDate } from "../modules/expense-policy";

const Status = ({ item }: { item: AdminExpense }) => (
  <span
    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${item.status === "voided" ? "bg-warning/10 text-warning" : "bg-primary-soft text-primary"}`}
  >
    {item.status === "voided"
      ? "Anulado"
      : item.paid_date
        ? "Marcado como pago"
        : "Pagamento não informado"}
  </span>
);
const Actions = ({
  item,
  busy,
  onCorrect,
  onVoid,
}: {
  item: AdminExpense;
  busy: boolean;
  onCorrect: (item: AdminExpense) => void;
  onVoid: (item: AdminExpense) => void;
}) =>
  item.status === "active" ? (
    <div className="flex flex-wrap gap-2">
      <button
        aria-label={`Corrigir lançamento de ${formatMoney(item.amount_cents)}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-primary disabled:opacity-50"
        disabled={busy}
        onClick={() => onCorrect(item)}
        type="button"
      >
        <Pencil aria-hidden className="h-4 w-4" />
        Corrigir
      </button>
      <button
        aria-label={`Anular lançamento de ${formatMoney(item.amount_cents)}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-danger disabled:opacity-50"
        disabled={busy}
        onClick={() => onVoid(item)}
        type="button"
      >
        <XCircle aria-hidden className="h-4 w-4" />
        Anular
      </button>
    </div>
  ) : (
    <p className="max-w-sm break-words text-xs leading-5 text-muted">
      {item.void_reason ?? "Lançamento anulado; histórico preservado."}
    </p>
  );
export const ExpenseTable = ({
  items,
  busy,
  onCorrect,
  onVoid,
}: {
  items: AdminExpense[];
  busy: boolean;
  onCorrect: (item: AdminExpense) => void;
  onVoid: (item: AdminExpense) => void;
}) => {
  if (!items.length)
    return (
      <p className="p-6 text-sm leading-6 text-muted">
        Nenhum lançamento manual encontrado nestes filtros. Isso não comprova ausência de custos da
        Lectum.
      </p>
    );
  return (
    <>
      <div className="divide-y divide-border lg:hidden">
        {items.map((item) => (
          <article className="min-w-0 space-y-3 p-4" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-xl text-foreground">{formatMoney(item.amount_cents)}</strong>
              <Status item={item} />
            </div>
            <p className="break-words text-sm font-semibold leading-6 text-foreground [overflow-wrap:anywhere]">
              {item.description}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted">Competência</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {formatExpenseDate(item.competence_date)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Pagamento informado</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {formatExpenseDate(item.paid_date)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Categoria</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {categoryLabel[item.category] ?? "Categoria indisponível"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Revisão</dt>
                <dd className="mt-1 font-semibold text-foreground">{item.revision}</dd>
              </div>
            </dl>
            {item.correction_reason ? (
              <p className="break-words text-xs leading-5 text-muted">
                Última correção: {item.correction_reason}
              </p>
            ) : null}
            <Actions busy={busy} item={item} onCorrect={onCorrect} onVoid={onVoid} />
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <caption className="sr-only">
            Despesas operacionais manuais nos filtros selecionados
          </caption>
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              {[
                "Competência",
                "Descrição e categoria",
                "Valor",
                "Pagamento informado",
                "Situação",
                "Ações",
              ].map((label) => (
                <th className="px-4 py-4" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap px-4 py-4 text-muted">
                  {formatExpenseDate(item.competence_date)}
                  <p className="mt-1 text-xs">Revisão {item.revision}</p>
                </td>
                <td className="max-w-[320px] px-4 py-4">
                  <p className="break-words font-semibold text-foreground [overflow-wrap:anywhere]">
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {categoryLabel[item.category] ?? "Categoria indisponível"}
                  </p>
                  {item.correction_reason ? (
                    <p className="mt-2 break-words text-xs leading-5 text-muted">
                      Última correção: {item.correction_reason}
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-bold text-foreground">
                  {formatMoney(item.amount_cents)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-muted">
                  {formatExpenseDate(item.paid_date)}
                </td>
                <td className="px-4 py-4">
                  <Status item={item} />
                </td>
                <td className="px-4 py-4">
                  <Actions busy={busy} item={item} onCorrect={onCorrect} onVoid={onVoid} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

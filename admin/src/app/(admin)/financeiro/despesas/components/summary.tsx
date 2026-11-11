import type { ExpenseList } from "@/api/req/finance/expenses";
import { formatMoney } from "../../modules/finance-support";

export const ExpenseSummary = ({ data }: { data: ExpenseList }) => {
  const { totals } = data;
  const cards = [
    { label: "Ativos registrados", value: totals.recorded_cents, count: totals.active_count },
    { label: "Marcados como pagos", value: totals.paid_cents, count: totals.paid_count },
    { label: "Pagamento não informado", value: totals.pending_cents, count: totals.pending_count },
    {
      label: "Anulados · fora do total ativo",
      value: totals.voided_cents,
      count: totals.voided_count,
    },
  ];
  return (
    <section className="min-w-0 space-y-4 rounded-card border border-border bg-surface p-5 md:p-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Lançamentos nos filtros selecionados</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Totais de todos os lançamentos encontrados pelos filtros, não apenas desta página. As
          datas filtram a competência, não a data do desembolso.
        </p>
      </div>
      <dl className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            className="min-w-0 rounded-2xl border border-border bg-surface-muted/50 p-4"
            key={card.label}
          >
            <dt className="text-xs font-semibold leading-5 text-muted">{card.label}</dt>
            <dd className="mt-2 break-words text-2xl font-bold text-foreground">
              {totals.available &&
              card.value !== null &&
              Number.isSafeInteger(card.value) &&
              card.value >= 0
                ? formatMoney(card.value)
                : "Indisponível"}
            </dd>
            <p className="mt-2 text-xs text-muted">
              {card.count} {card.count === 1 ? "lançamento" : "lançamentos"}
            </p>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-6 text-muted">{data.coverage.note}</p>
      <p className="text-xs font-semibold leading-5 text-muted">
        Custos completos, tarifas do gateway e lucro líquido não apurados. Pagamento informado
        manualmente não comprova conciliação bancária nem fluxo de caixa do período.
      </p>
    </section>
  );
};

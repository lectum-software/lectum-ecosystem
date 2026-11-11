import type { AdminStripeFees } from "@/api/req/finance/fees";
import { formatFeeMoney } from "../modules/fee-policy";

export const StripeFeeSummary = ({ data }: { data: AdminStripeFees }) => {
  const { summary } = data;
  const amount = (value: number | null) =>
    summary.available ? formatFeeMoney(value) : "Indisponível";
  const cards = [
    { label: "Bruto de todos os recibos elegíveis", value: summary.eligible_gross_cents },
    {
      label: "Bruto das capturas com tarifa observada",
      value: summary.observed_capture_gross_cents,
    },
    { label: "Tarifas dessas capturas · observadas", value: summary.observed_capture_fee_cents },
    {
      label: "Líquido dessas capturas · antes dos ajustes",
      value: summary.observed_capture_net_cents,
    },
  ];
  return (
    <section className="min-w-0 space-y-4 rounded-card border border-border bg-surface p-5 shadow-admin-soft md:p-6">
      <header>
        <h2 className="text-xl font-bold text-foreground">
          Cobertura dos recebimentos selecionados
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {summary.capture_verified_count} de {summary.receipt_count} recibos com captura verificada
          · {summary.capture_missing_count} sem captura comprovada. Totais do período filtrado, não
          apenas desta página.
        </p>
      </header>
      <dl className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            className="min-w-0 rounded-2xl border border-border bg-surface-muted/50 p-4"
            key={card.label}
          >
            <dt className="text-xs font-semibold leading-5 text-muted">{card.label}</dt>
            <dd className="mt-2 break-words text-2xl font-bold text-foreground">
              {amount(card.value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-6 text-muted">
        As tarifas e o líquido acima pertencem somente às capturas observadas. O bruto de todos os
        recibos pode incluir capturas ainda não observadas; não use essas bases diferentes como um
        resultado líquido completo.
      </p>
      <dl className="rounded-2xl border border-border p-4">
        <dt className="text-sm font-semibold text-muted">
          Tarifas dos ajustes observados · subtotal separado
        </dt>
        <dd className="mt-1 text-lg font-bold text-foreground">
          {amount(summary.observed_adjustment_fee_cents)}
        </dd>
        <p className="mt-2 text-xs leading-5 text-muted">
          {summary.transaction_count} movimentos registrados. Créditos de tarifa podem ser
          negativos. A tarifa original da captura permanece no histórico após estorno.
        </p>
      </dl>
      <p className="text-sm leading-6 text-muted">{data.coverage.note}</p>
      <p className="text-xs font-semibold leading-5 text-warning">
        Observação pontual limitada aos recibos locais, sem comprovar todos os custos da conta
        Stripe. Líquido de captura é anterior a estornos, disputas, despesas e tributos; não
        representa lucro, repasse nem saldo disponível para saque.
      </p>
    </section>
  );
};

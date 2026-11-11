import Link from "next/link";
import type { AdminFinanceDashboard } from "@/api/req/finance";
import { formatMoney } from "../modules/finance-support";
import {
  formatLocalFinancialObservation,
  hasLocalFinancialBasis,
} from "../modules/financial-basis";

export const FinancialBasisPanel = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => {
  const basis = dashboard.financial_basis;
  if (!hasLocalFinancialBasis(basis)) return null;
  const amountsAvailable = basis.available && dashboard.cards.revenue_total.available;

  return (
    <section className="min-w-0 space-y-4 rounded-card border border-border bg-surface p-5">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Base dos recebimentos</h2>
        <p className="text-xs leading-5 text-muted">
          Consulta local · {formatLocalFinancialObservation(basis.observed_at)} · BRT
        </p>
      </header>
      <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <dt className="text-sm text-muted">Bruto registrado no período · todos os gateways</dt>
          <dd className="break-words text-xl font-bold text-foreground">
            {amountsAvailable ? formatMoney(basis.gross_receipts_cents) : "Indisponível"}
          </dd>
        </div>
        <div className="min-w-0 space-y-1">
          <dt className="text-sm text-muted">Estornos observados · Stripe</dt>
          <dd className="break-words text-xl font-bold text-foreground">
            {amountsAvailable ? formatMoney(basis.refund_snapshot_cents) : "Indisponível"}
          </dd>
        </div>
      </dl>
      <p className="text-sm leading-6 text-muted">{basis.note}</p>
      <p className="text-xs font-semibold leading-5 text-muted">
        Tarifas e fluxo de caixa líquido não apurados. Esta consulta não verifica o saldo do gateway
        nem representa lucro ou valor disponível para saque.
      </p>
      <Link
        className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4"
        href="/financeiro/despesas"
      >
        Consultar despesas operacionais manuais, separadamente
      </Link>
    </section>
  );
};

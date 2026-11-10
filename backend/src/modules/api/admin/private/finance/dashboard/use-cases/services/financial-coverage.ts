import type { AdminFinanceDashboard } from "../../DTOs/IAdminFinanceDashboardDTO";

export const applyFinancialCoverage = (
  dashboard: Pick<
    AdminFinanceDashboard,
    | "cards"
    | "average_ltv"
    | "average_subscription_lifetime"
    | "mrr"
    | "series"
    | "coverage_notes"
    | "unavailable"
  >,
  coverage: {
    stripePaymentsCovered: boolean;
    contractValuesAvailable: boolean;
    scopeAvailable?: boolean;
  },
) => {
  const unavailable = new Set<string>();
  if (!coverage.stripePaymentsCovered) {
    const reason =
      "O histórico monetário Stripe ainda não está conciliado neste painel; totais e indicadores históricos ficam indisponíveis para evitar valores parciais.";
    for (const key of [
      "revenue_total",
      "active_subscriptions",
      "new_subscriptions",
      "new_subscriptions_revenue",
      "cancellations",
    ] as const) {
      const card = dashboard.cards[key];
      card.available = false;
      card.change_percent = null;
      card.rate_percent = null;
      card.trend = "unavailable";
      card.unavailable_reason = reason;
      unavailable.add(key);
    }
    dashboard.average_ltv.available = false;
    dashboard.average_ltv.unavailable_reason = reason;
    dashboard.average_subscription_lifetime.available = false;
    dashboard.average_subscription_lifetime.unavailable_reason = reason;
    // A contract's creation is the reservation, not proof of paid access at a historical date.
    dashboard.mrr.available = false;
    dashboard.unavailable.push({
      id: "stripe_financial_history",
      label: "Histórico financeiro Stripe",
      description: reason,
      source: "stripe_payment_ledger_pending",
    });
    dashboard.coverage_notes.unshift(reason);
    dashboard.coverage_notes.push(
      "Cobranças listadas são somente as evidências Mercado Pago disponíveis, não o total de recebimentos de todos os gateways. Contratos Stripe e seu valor contratado aparecem na relação de assinaturas.",
      "Sem os períodos pagos Stripe conciliados, a base ativa e o MRR ao final do período selecionado ficam indisponíveis; a data da reserva não é tratada como início do pagamento.",
    );
  }
  if (!coverage.contractValuesAvailable) {
    dashboard.mrr.available = false;
    dashboard.cards.new_subscriptions_revenue.available = false;
    dashboard.cards.new_subscriptions_revenue.unavailable_reason =
      "Há contrato sem snapshot monetário válido; não foi usado o preço atual do catálogo.";
    unavailable.add("new_subscriptions_revenue");
    dashboard.unavailable.push({
      id: "contracted_price",
      label: "Valor contratado",
      description:
        "Há contrato sem snapshot monetário válido; MRR e soma de contratos ficam indisponíveis.",
      source: "professional_subscription.contracted_amount_cents",
    });
  }
  if (coverage.scopeAvailable === false) {
    dashboard.cards.active_subscriptions.available = false;
    dashboard.cards.active_subscriptions.unavailable_reason =
      "Há contratos de outra conta ou modo; totais não são combinados.";
    dashboard.cards.active_subscriptions.change_percent = null;
    dashboard.cards.active_subscriptions.trend = "unavailable";
    unavailable.add("active_subscriptions");
  }
  dashboard.series.unavailable_metrics = [...unavailable];
};

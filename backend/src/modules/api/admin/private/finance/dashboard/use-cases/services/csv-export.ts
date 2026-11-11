import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { csvPublicProvenance, csvRow } from "@/utils/csv";
import type {
  AdminFinanceDashboard,
  AdminFinanceQuery,
  AdminFinanceSubscriptionItem,
} from "../../DTOs/IAdminFinanceDashboardDTO";

const financeSourceLabel = (source: unknown) => {
  if (typeof source === "string") {
    const normalized = source.trim().toLowerCase();
    if (normalized === "admin_grant") return "Cortesia administrativa";
    if (normalized === "free_signup") return "Cadastro gratuito";
    if (normalized === "mercadopago") return "Cobrança externa";
  }

  return csvPublicProvenance(source);
};

const subscriptionOriginLabel = (item: AdminFinanceSubscriptionItem) =>
  item.gateway ? "Cobrança externa" : financeSourceLabel(item.source) || "Plataforma";

export const buildCsv = (dashboard: AdminFinanceDashboard) => {
  const rows: string[] = [];

  rows.push(csvRow(["Lectum Admin Financeiro"]));
  rows.push(
    csvRow(["periodo", dashboard.period.from, dashboard.period.to, dashboard.period.label]),
  );
  rows.push("");
  rows.push(csvRow(["section", "id", "label", "date", "value", "source", "extra"]));

  for (const card of Object.values(dashboard.cards)) {
    rows.push(
      csvRow([
        "resumo_financeiro",
        card.id,
        card.label,
        "",
        card.available ? card.value : "indisponivel",
        financeSourceLabel(card.source),
        `unit=${card.unit};previous=${card.available && card.previous_available !== false ? card.previous_value : "indisponivel"};change_percent=${card.change_percent ?? "n/a"};rate_percent=${card.rate_percent ?? "n/a"};reason=${card.unavailable_reason ?? ""}`,
      ]),
    );
  }

  rows.push(
    csvRow([
      "resumo_financeiro",
      "mrr",
      "Receita recorrente mensal (MRR)",
      "",
      dashboard.mrr.available === false ? "indisponivel" : dashboard.mrr.value_cents,
      financeSourceLabel(dashboard.mrr.source),
      dashboard.mrr.description,
    ]),
  );
  rows.push(
    csvRow([
      "resumo_financeiro",
      "average_ltv",
      dashboard.financial_basis
        ? "Recebimento bruto medio registrado por psicologo"
        : "LTV medio dos psicologos",
      "",
      dashboard.average_ltv.available ? dashboard.average_ltv.value_cents : "indisponivel",
      financeSourceLabel(dashboard.average_ltv.source),
      `paid_psychologist_count=${dashboard.average_ltv.paid_psychologist_count};linked_confirmed_payments=${dashboard.average_ltv.linked_confirmed_payments};reason=${dashboard.average_ltv.unavailable_reason ?? ""};${dashboard.average_ltv.description}`,
    ]),
  );
  rows.push(
    csvRow([
      "resumo_financeiro",
      "average_subscription_lifetime",
      "Lifetime medio dos psicologos",
      "",
      dashboard.average_subscription_lifetime.available
        ? dashboard.average_subscription_lifetime.value_months
        : "indisponivel",
      financeSourceLabel(dashboard.average_subscription_lifetime.source),
      `value_days=${dashboard.average_subscription_lifetime.value_days};cancelled_subscription_count=${dashboard.average_subscription_lifetime.cancelled_subscription_count};reason=${dashboard.average_subscription_lifetime.unavailable_reason ?? ""};${dashboard.average_subscription_lifetime.description}`,
    ]),
  );

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "start_date",
      "end_date",
      "revenue_cents",
      "confirmed_payments",
      "new_subscriptions",
      "new_subscriptions_revenue_cents",
      "active_subscriptions",
      "cancellations",
    ]),
  );
  const unavailable = new Set(dashboard.series.unavailable_metrics ?? []);
  for (const point of dashboard.series.points) {
    rows.push(
      csvRow([
        "serie_agregada",
        point.start_date,
        point.end_date,
        unavailable.has("revenue_total") ? "indisponivel" : point.revenue_cents,
        unavailable.has("revenue_total") ? "indisponivel" : point.confirmed_payments,
        unavailable.has("new_subscriptions") ? "indisponivel" : point.new_subscriptions,
        unavailable.has("new_subscriptions_revenue")
          ? "indisponivel"
          : point.new_subscriptions_revenue_cents,
        unavailable.has("active_subscriptions") ? "indisponivel" : point.active_subscriptions,
        unavailable.has("cancellations") ? "indisponivel" : point.cancellations,
      ]),
    );
  }

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "occurred_at",
      "amount_cents",
      "status",
      "psychologist",
      "email",
      "plan",
      "reason",
    ]),
  );
  for (const item of dashboard.latest_charges.items) {
    rows.push(
      csvRow([
        "ultimas_cobrancas_realizadas",
        item.occurred_at,
        item.amount_available ? item.amount_cents : "indisponivel",
        item.status_label,
        item.subscription?.psychologist.name ?? "",
        item.subscription?.psychologist.email ?? "",
        item.subscription?.plan.name ?? "",
        item.unavailable_reason ?? "",
      ]),
    );
  }

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "cancelled_at",
      "created_at",
      "updated_at",
      "started_at",
      "current_period_end",
      "psychologist",
      "email",
      "plan",
      "interval",
      "price_cents",
      "status",
      "origem",
    ]),
  );
  for (const item of dashboard.subscription_relation.items) {
    rows.push(
      csvRow([
        "relacao_de_assinaturas",
        item.cancelled_at ?? "",
        item.created_at,
        item.updated_at,
        item.started_at_available === false ? "indisponivel" : item.started_at,
        item.current_period_end ?? "",
        item.psychologist.name,
        item.psychologist.email,
        item.plan.name,
        item.plan.interval,
        item.plan.price_cents ?? "indisponivel",
        item.status_label,
        subscriptionOriginLabel(item),
      ]),
    );
  }

  rows.push("");
  rows.push(csvRow(["section", "id", "label", "source", "description"]));
  for (const item of dashboard.unavailable) {
    rows.push(
      csvRow([
        "indisponivel",
        item.id,
        item.label,
        financeSourceLabel(item.source),
        item.description,
      ]),
    );
  }

  if (dashboard.financial_basis) {
    const basis = dashboard.financial_basis;
    rows.push("");
    rows.push(
      csvRow([
        "base_financeira",
        "recebimentos_brutos_registrados",
        basis.available ? basis.gross_receipts_cents : "indisponivel",
        "estornos_snapshot_stripe",
        basis.available ? basis.refund_snapshot_cents : "indisponivel",
        "consulta_local",
        basis.observed_at,
      ]),
    );
    rows.push(
      csvRow([
        "cobertura",
        basis.note,
        "tarifas",
        "indisponiveis",
        "fluxo_liquido",
        "indisponivel",
      ]),
    );
  }
  rows.push("");
  rows.push(csvRow(["observacoes"]));
  for (const note of dashboard.coverage_notes) rows.push(csvRow([note]));

  return rows.join("\r\n");
};

export const isFinanceExportComplete = (dashboard: AdminFinanceDashboard) =>
  dashboard.latest_charges.total <= dashboard.latest_charges.items.length &&
  dashboard.new_subscriptions.total <= dashboard.new_subscriptions.items.length &&
  dashboard.subscription_relation.total <= dashboard.subscription_relation.items.length;

export const exportAdminFinanceDashboardCsv = async (
  query: AdminFinanceQuery,
): Promise<Resolve> => {
  const { buildAdminFinanceDashboard, isAdminFinanceDashboard } = await import(
    "./dashboard-builder"
  );
  const resolve = await buildAdminFinanceDashboard(query, {
    subscriptionTake: 5000,
    tableTake: 5000,
  });
  if (!resolve.success || !isAdminFinanceDashboard(resolve.data)) return resolve;

  const dashboard = resolve.data;
  if (!isFinanceExportComplete(dashboard)) {
    return { status: 503, ...error("finance_history_filter_required", {}) };
  }

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      csv: buildCsv(dashboard),
      filename: `lectum-financeiro-${dashboard.period.from}_${dashboard.period.to}.csv`,
      mime: "text/csv; charset=utf-8",
    },
  };
};

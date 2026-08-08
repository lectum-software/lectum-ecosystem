import type { Resolve } from "@/helpers/return";
import { msg } from "@/helpers/translate";
import { csvRow } from "@/utils/csv";
import type {
  AdminFinanceDashboard,
  AdminFinanceQuery,
} from "../../DTOs/IAdminFinanceDashboardDTO";

import { buildAdminFinanceDashboard, isAdminFinanceDashboard } from "./dashboard-builder";

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
        card.source,
        `unit=${card.unit};previous=${card.previous_value};change_percent=${card.change_percent ?? "n/a"};rate_percent=${card.rate_percent ?? "n/a"};reason=${card.unavailable_reason ?? ""}`,
      ]),
    );
  }

  rows.push(
    csvRow([
      "resumo_financeiro",
      "mrr",
      "Receita recorrente mensal (MRR)",
      "",
      dashboard.mrr.value_cents,
      dashboard.mrr.source,
      dashboard.mrr.description,
    ]),
  );
  rows.push(
    csvRow([
      "resumo_financeiro",
      "average_ltv",
      "LTV medio dos psicologos",
      "",
      dashboard.average_ltv.available ? dashboard.average_ltv.value_cents : "indisponivel",
      dashboard.average_ltv.source,
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
      dashboard.average_subscription_lifetime.source,
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
  for (const point of dashboard.series.points) {
    rows.push(
      csvRow([
        "serie_agregada",
        point.start_date,
        point.end_date,
        point.revenue_cents,
        point.confirmed_payments,
        point.new_subscriptions,
        point.new_subscriptions_revenue_cents,
        point.active_subscriptions,
        point.cancellations,
      ]),
    );
  }

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "payment_event_id",
      "occurred_at",
      "external_id",
      "event_type",
      "amount_cents",
      "status",
      "subscription_id",
      "gateway_subscription_id",
      "psychologist",
      "email",
      "plan",
      "reference",
      "reason",
    ]),
  );
  for (const item of dashboard.latest_charges.items) {
    rows.push(
      csvRow([
        "ultimas_cobrancas_realizadas",
        item.event_id,
        item.occurred_at,
        item.external_id,
        item.event_type,
        item.amount_available ? item.amount_cents : "indisponivel",
        item.status_label,
        item.subscription?.id ?? "",
        item.subscription?.gateway_subscription_id ?? "",
        item.subscription?.psychologist.name ?? "",
        item.subscription?.psychologist.email ?? "",
        item.subscription?.plan.name ?? "",
        item.reference ?? "",
        item.unavailable_reason ?? "",
      ]),
    );
  }

  rows.push("");
  rows.push(
    csvRow([
      "section",
      "subscription_id",
      "cancelled_at",
      "created_at",
      "updated_at",
      "started_at",
      "current_period_end",
      "psychologist",
      "email",
      "crp",
      "plan",
      "plan_slug",
      "interval",
      "price_cents",
      "status",
      "source",
      "gateway",
      "gateway_subscription_id",
    ]),
  );
  for (const item of dashboard.subscription_relation.items) {
    rows.push(
      csvRow([
        "relacao_de_assinaturas",
        item.id,
        item.cancelled_at ?? "",
        item.created_at,
        item.updated_at,
        item.started_at,
        item.current_period_end ?? "",
        item.psychologist.name,
        item.psychologist.email,
        item.psychologist.crp ?? "",
        item.plan.name,
        item.plan.slug,
        item.plan.interval,
        item.plan.price_cents,
        item.status_label,
        item.source,
        item.gateway ?? "",
        item.gateway_subscription_id ?? "",
      ]),
    );
  }

  rows.push("");
  rows.push(csvRow(["section", "id", "label", "source", "description"]));
  for (const item of dashboard.unavailable) {
    rows.push(csvRow(["indisponivel", item.id, item.label, item.source, item.description]));
  }

  rows.push("");
  rows.push(csvRow(["observacoes"]));
  for (const note of dashboard.coverage_notes) rows.push(csvRow([note]));

  return rows.join("\r\n");
};

export const exportAdminFinanceDashboardCsv = async (
  query: AdminFinanceQuery,
): Promise<Resolve> => {
  const resolve = await buildAdminFinanceDashboard(query, {
    subscriptionTake: 5000,
    tableTake: 5000,
  });
  if (!resolve.success || !isAdminFinanceDashboard(resolve.data)) return resolve;

  const dashboard = resolve.data;
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

import assert from "node:assert/strict";
import test from "node:test";
import type {
  AdminFinanceDashboard,
  AdminFinanceSubscriptionItem,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import { buildCsv } from "./csv-export";

const subscription = {
  cancelled_at: null,
  created_at: "2026-08-01",
  current_period_end: "2026-09-01",
  gateway: "mercadopago",
  gateway_subscription_id: "gateway-secret",
  id: "subscription-secret",
  plan: {
    interval: "month",
    name: "Profissional",
    price_cents: 10000,
    slug: "professional-internal-slug",
  },
  psychologist: {
    crp: "00/00000",
    email: "finance@example.com",
    name: "Profissional",
  },
  source: "mercadopago",
  started_at: "2026-08-01",
  status_label: "Ativa",
  updated_at: "2026-08-01",
} as unknown as AdminFinanceSubscriptionItem;

test("CSV financeiro não exporta proveniência técnica nem IDs do gateway", () => {
  const dashboard = {
    average_ltv: {
      available: true,
      description: "",
      linked_confirmed_payments: 1,
      paid_psychologist_count: 1,
      source: "payment_event_linked_to_paid_psychologists",
      unavailable_reason: null,
      value_cents: 10000,
    },
    average_subscription_lifetime: {
      available: true,
      cancelled_subscription_count: 1,
      description: "",
      source: "cancelled_paid_subscriptions",
      unavailable_reason: null,
      value_days: 30,
      value_months: 1,
    },
    cards: {
      revenue_total: {
        available: true,
        change_percent: 0,
        id: "revenue_total",
        label: "Receita",
        previous_value: 0,
        rate_percent: null,
        source: "payment_event+professional_subscription",
        unit: "currency_cents",
        unavailable_reason: null,
        value: 10000,
      },
    },
    coverage_notes: [],
    latest_charges: {
      items: [
        {
          amount_available: true,
          amount_cents: 10000,
          event_id: "event-secret",
          event_type: "provider.created",
          external_id: "external-secret",
          occurred_at: "2026-08-01",
          reference: "reference-secret",
          status_label: "Confirmada",
          subscription,
          unavailable_reason: null,
        },
      ],
    },
    mrr: {
      description: "",
      source: "active_paid_subscriptions",
      value_cents: 10000,
    },
    period: { from: "2026-08-01", label: "Agosto", to: "2026-08-31" },
    series: { points: [] },
    subscription_relation: { items: [subscription] },
    unavailable: [
      {
        description: "Indisponível",
        id: "metric",
        label: "Métrica",
        source: "payment_event+professional_subscription",
      },
    ],
  } as unknown as AdminFinanceDashboard;

  const csv = buildCsv(dashboard);

  assert.match(csv, /Cobrança externa|Pagamentos|Plataforma/);
  assert.doesNotMatch(
    csv,
    /event-secret|external-secret|gateway-secret|reference-secret|subscription-secret|provider\.created|mercadopago|payment_event|professional_subscription/,
  );
});

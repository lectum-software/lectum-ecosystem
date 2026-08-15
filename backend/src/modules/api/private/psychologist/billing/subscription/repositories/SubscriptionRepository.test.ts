import { strict as assert } from "node:assert";
import { before, describe, it } from "node:test";
import type { payment_event, professional_subscription } from "@/interfaces/objects";
import type { GatewaySubscriptionPaymentSummary } from "@/modules/billing/payment-gateway";

let buildPaymentHistoryItemsForSubscription: typeof import("./SubscriptionRepository").buildPaymentHistoryItemsForSubscription;
let buildGatewaySummaryPaymentHistoryItem: typeof import("./SubscriptionRepository").buildGatewaySummaryPaymentHistoryItem;
let mergeGatewaySummaryPaymentHistory: typeof import("./SubscriptionRepository").mergeGatewaySummaryPaymentHistory;

before(async () => {
  process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
  process.env.JWT_SECRET_KEY ??= "lectum-test-secret-key-with-minimum-length";

  ({
    buildGatewaySummaryPaymentHistoryItem,
    buildPaymentHistoryItemsForSubscription,
    mergeGatewaySummaryPaymentHistory,
  } = await import("./SubscriptionRepository"));
});

const subscription = {
  gateway: "mercadopago",
  gateway_subscription_id: "preapproval-123",
  id: "subscription-local-123",
  plan: {
    name: "Plano Profissional",
    price_cents: 2990,
  },
} satisfies professional_subscription;

describe("buildPaymentHistoryItemsForSubscription", () => {
  it("ignora updates de assinatura, deduplica cobranças aprovadas do mesmo dia e usa o plano na descrição", () => {
    const events: payment_event[] = [
      {
        createdAt: new Date("2026-08-13T10:00:00.000Z"),
        external_id: "preapproval-update",
        gateway: "mercadopago",
        id: "evt-preapproval-update",
        payload: {
          action: "updated",
          data: { id: "preapproval-123" },
          type: "subscription_preapproval",
        },
        type: "subscription_preapproval",
      },
      {
        createdAt: new Date("2026-08-13T12:00:00.000Z"),
        external_id: "payment-newest",
        gateway: "mercadopago",
        id: "evt-payment-newest",
        payload: {
          data: { id: "136307197356" },
          preapproval_id: "preapproval-123",
          status: "approved",
          transaction_amount: 29.9,
          type: "payment",
        },
        type: "payment",
      },
      {
        createdAt: new Date("2026-08-13T11:00:00.000Z"),
        external_id: "payment-duplicated",
        gateway: "mercadopago",
        id: "evt-payment-duplicated",
        payload: {
          data: { id: "136307035180" },
          preapproval_id: "preapproval-123",
          status: "approved",
          transaction_amount: 29.9,
          type: "payment",
        },
        type: "payment",
      },
    ];

    const items = buildPaymentHistoryItemsForSubscription(events, subscription);

    assert.equal(items.length, 1);
    assert.equal(items[0].id, "evt-payment-newest");
    assert.equal(items[0].title, "Plano Profissional");
    assert.equal(items[0].amount_cents, 2990);
    assert.equal(items[0].status, "pago");
    assert.equal(items[0].status_label, "Sucesso");
  });

  it("não interpreta ids do Mercado Pago como valor monetário", () => {
    const items = buildPaymentHistoryItemsForSubscription(
      [
        {
          createdAt: new Date("2026-08-14T12:00:00.000Z"),
          external_id: "payment-with-provider-id",
          gateway: "mercadopago",
          id: "evt-payment-with-provider-id",
          payload: {
            data: { id: "136307197356" },
            preapproval_id: "preapproval-123",
            status: "approved",
            type: "payment",
          },
          type: "payment",
        },
      ],
      subscription,
    );

    assert.equal(items.length, 1);
    assert.equal(items[0].amount_cents, null);
  });

  it("ignora pagamentos pendentes, recusados e cancelados no historico do psicologo", () => {
    const items = buildPaymentHistoryItemsForSubscription(
      [
        {
          createdAt: new Date("2026-08-14T10:00:00.000Z"),
          external_id: "payment-pending",
          gateway: "mercadopago",
          id: "evt-payment-pending",
          payload: {
            preapproval_id: "preapproval-123",
            status: "pending",
            transaction_amount: 29.9,
            type: "payment",
          },
          type: "payment",
        },
        {
          createdAt: new Date("2026-08-14T11:00:00.000Z"),
          external_id: "payment-rejected",
          gateway: "mercadopago",
          id: "evt-payment-rejected",
          payload: {
            preapproval_id: "preapproval-123",
            status: "rejected",
            transaction_amount: 29.9,
            type: "payment",
          },
          type: "payment",
        },
        {
          createdAt: new Date("2026-08-14T12:00:00.000Z"),
          external_id: "payment-cancelled",
          gateway: "mercadopago",
          id: "evt-payment-cancelled",
          payload: {
            preapproval_id: "preapproval-123",
            status: "cancelled",
            transaction_amount: 29.9,
            type: "payment",
          },
          type: "payment",
        },
      ],
      subscription,
    );

    assert.equal(items.length, 0);
  });

  it("usa o resumo confirmado do gateway quando o webhook local de pagamento nao tem vinculo suficiente", () => {
    const summary = {
      charged_amount_cents: 2990,
      charged_quantity: 1,
      gateway_subscription_id: "preapproval-123",
      last_charged_amount_cents: 2990,
      last_charged_at: "2026-08-13T20:10:00.000Z",
      raw: null,
    } satisfies GatewaySubscriptionPaymentSummary;

    const item = buildGatewaySummaryPaymentHistoryItem(subscription, summary);
    const merged = mergeGatewaySummaryPaymentHistory([], item);

    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "gateway-summary:preapproval-123:latest-paid-installment");
    assert.equal(merged[0].amount_cents, 2990);
    assert.equal(merged[0].status, "pago");
    assert.equal(merged[0].status_label, "Sucesso");
    assert.equal(merged[0].occurred_at?.toISOString(), "2026-08-13T20:10:00.000Z");
  });

  it("deduplica o resumo do gateway com o evento local confirmado do mesmo dia", () => {
    const localItems = buildPaymentHistoryItemsForSubscription(
      [
        {
          createdAt: new Date("2026-08-13T12:00:00.000Z"),
          external_id: "payment-local",
          gateway: "mercadopago",
          id: "evt-payment-local",
          payload: {
            preapproval_id: "preapproval-123",
            status: "approved",
            transaction_amount: 29.9,
            type: "payment",
          },
          type: "payment",
        },
      ],
      subscription,
    );
    const gatewayItem = buildGatewaySummaryPaymentHistoryItem(subscription, {
      charged_amount_cents: 2990,
      charged_quantity: 1,
      gateway_subscription_id: "preapproval-123",
      last_charged_amount_cents: 2990,
      last_charged_at: "2026-08-13T20:10:00.000Z",
      raw: null,
    });

    const merged = mergeGatewaySummaryPaymentHistory(localItems, gatewayItem);

    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "gateway-summary:preapproval-123:latest-paid-installment");
  });
});

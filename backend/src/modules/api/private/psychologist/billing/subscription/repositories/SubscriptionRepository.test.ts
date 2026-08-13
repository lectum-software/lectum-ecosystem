import { strict as assert } from "node:assert";
import { before, describe, it } from "node:test";
import type { payment_event, professional_subscription } from "@/interfaces/objects";

let buildPaymentHistoryItemsForSubscription: typeof import("./SubscriptionRepository").buildPaymentHistoryItemsForSubscription;

before(async () => {
  process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
  process.env.JWT_SECRET_KEY ??= "lectum-test-secret-key-with-minimum-length";

  ({ buildPaymentHistoryItemsForSubscription } = await import("./SubscriptionRepository"));
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
});

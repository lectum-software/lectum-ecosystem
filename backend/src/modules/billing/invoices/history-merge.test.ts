import assert from "node:assert/strict";
import { test } from "node:test";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import {
  buildPaymentHistoryItemsForSubscription,
  mergeGatewaySummaryPaymentHistory,
} from "../payment-history";
import { mergeInvoicePaymentHistory } from "./history-merge";

const payment = (
  overrides: Partial<BillingPaymentHistoryItem> = {},
): BillingPaymentHistoryItem => ({
  id: "invoice:1",
  title: "Pagamento confirmado",
  description: "",
  amount_cents: 2990,
  status: "pago",
  status_label: "Sucesso",
  occurred_at: new Date("2026-11-05T00:53:00Z"),
  gateway: "mercadopago",
  external_id: "payment-1",
  payment_id: "payment-1",
  subscription_id: "sub-1",
  invoice: {
    id: "1",
    status: "awaiting_activation",
    number: null,
    mode: "live",
    downloadable: false,
  },
  ...overrides,
});
const summary = (overrides: Partial<BillingPaymentHistoryItem> = {}) =>
  payment({
    id: "gateway-summary:sub-1:latest-paid-installment",
    payment_id: undefined,
    external_id: "gateway-sub-1",
    invoice: undefined,
    summary_charged_quantity: 1,
    ...overrides,
  });

test("pilot payment replaces subscription summary and keeps invoice status", () => {
  const rows = mergeInvoicePaymentHistory([payment()], [summary()]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].invoice?.status, "awaiting_activation");
});
test("joins exact payment ID without relying on date or title", () => {
  const rows = mergeInvoicePaymentHistory(
    [payment()],
    [
      payment({
        id: "event:1",
        invoice: undefined,
        occurred_at: new Date("2026-11-06"),
      }),
    ],
  );
  assert.equal(rows.length, 1);
});
test("keeps distinct payments with identical date and amount", () => {
  assert.equal(
    mergeInvoicePaymentHistory(
      [
        payment(),
        payment({
          id: "invoice:2",
          payment_id: "payment-2",
        }),
      ],
      [summary({ summary_charged_quantity: 2 })],
    ).length,
    2,
  );
});
test("keeps newer uncovered summary and other subscriptions", () => {
  assert.equal(
    mergeInvoicePaymentHistory(
      [payment()],
      [
        summary({ occurred_at: new Date("2026-12-05"), summary_charged_quantity: 2 }),
        summary({ subscription_id: "other" }),
      ],
    ).length,
    3,
  );
});
test("latest ledger payment supersedes summary even with older history absent", () => {
  assert.equal(
    mergeInvoicePaymentHistory([payment()], [summary({ summary_charged_quantity: 5 })]).length,
    1,
  );
});
test("test invoice never replaces live history", () => {
  const invoice = payment();
  invoice.invoice!.mode = "test";
  assert.equal(mergeInvoicePaymentHistory([invoice], [summary()]).length, 2);
});
test("different gateway or unknown payment identity is not merged", () => {
  assert.equal(
    mergeInvoicePaymentHistory(
      [payment()],
      [
        payment({ gateway: "other", invoice: undefined }),
        payment({ payment_id: undefined, invoice: undefined }),
      ],
    ).length,
    3,
  );
});
test("known payment events replace a covered summary without hiding separate charges", () => {
  const local = [
    payment({ invoice: undefined }),
    payment({ payment_id: "payment-2", invoice: undefined }),
  ];
  assert.deepEqual(
    mergeGatewaySummaryPaymentHistory(local, summary({ summary_charged_quantity: 2 })),
    local,
  );
});

test("payment and authorized installment events share the actual payment identity", () => {
  const items = buildPaymentHistoryItemsForSubscription(
    [
      {
        id: "webhook-1",
        type: "payment",
        gateway: "mercadopago",
        createdAt: new Date("2026-11-05T01:00:00Z"),
        payload: {
          data: { id: "payment-1" },
          preapproval_id: "gateway-sub-1",
          status: "approved",
          transaction_amount: 29.9,
        },
      },
      {
        id: "webhook-2",
        type: "subscription_authorized_payment",
        gateway: "mercadopago",
        createdAt: new Date("2026-11-05T00:59:00Z"),
        payload: {
          id: "installment-1",
          preapproval_id: "gateway-sub-1",
          payment: { id: "payment-1", status: "approved" },
          transaction_amount: 29.9,
        },
      },
    ],
    { id: "sub-1", gateway_subscription_id: "gateway-sub-1" },
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].payment_id, "payment-1");
  assert.equal(mergeInvoicePaymentHistory([payment()], items).length, 1);
});

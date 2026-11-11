import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type {
  billing_financial_receipt,
  billing_invoice,
  payment_event,
} from "@/external/generated/prisma/client";
import { invoiceReference } from "@/modules/billing/invoices/contracts";
import { storedFinancialReceiptHash } from "@/modules/billing/stripe/financial-ledger/policy";
import { sanitizePublicResponseData } from "@/utils/public-response";
import type { HistoryContext, HistoryContract, HistoryRecords } from "../repositories/records";
import {
  projectAdminHistory,
  projectMercadoPagoEvent,
  projectStripeReceipt,
  validHistoryInvoice,
} from "./projection";

const now = new Date("2026-11-10T12:00:00.000Z");
const context: HistoryContext = {
  now,
  fiscal: { companyId: "company-local-policy", mode: "test" },
  scopes: [
    { gateway: "stripe", accountId: "acct_localpolicy", mode: "test" },
    { gateway: "mercadopago", accountId: null, mode: "test" },
  ],
};
const stripe: HistoryContract = {
  id: "subscription-stripe",
  gateway: "stripe",
  source: "stripe",
  gateway_mode: "test",
  gateway_account_id: "acct_localpolicy",
  gateway_subscription_id: "sub_localpolicy",
  price_version_id: null,
  psychologist_id: "profile-local",
  psychologist: { user: { id: "user-local", name: "Local policy" } },
};
const mp: HistoryContract = {
  ...stripe,
  id: "subscription-mp",
  gateway: "mercadopago",
  source: "mercadopago",
  gateway_mode: null,
  gateway_account_id: null,
  gateway_subscription_id: "mp-local",
};
function receipt(overrides: Partial<billing_financial_receipt> = {}): billing_financial_receipt {
  const row: billing_financial_receipt = {
    id: "receipt-local",
    gateway: "stripe",
    mode: "test",
    account_id: "acct_localpolicy",
    subscription_id: stripe.id,
    psychologist_id: stripe.psychologist_id,
    provider_subscription_id: stripe.gateway_subscription_id!,
    invoice_id: "in_localpolicy",
    invoice_payment_id: "inpay_localpolicy",
    payment_intent_id: "pi_localpolicy",
    charge_id: "ch_localpolicy",
    price_id: "price_localpolicy",
    price_version_id: null,
    currency: "BRL",
    amount_paid_cents: 2990,
    paid_at: new Date(now.getTime() - 1000),
    invoice_paid_at: new Date(now.getTime() - 1000),
    period_start: new Date(now.getTime() - 2000),
    period_end: new Date(now.getTime() + 86_400_000),
    immutable_hash: "",
    current_state: "paid",
    refunded_cents: 0,
    dispute_status: "none",
    observed_at: now,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
  row.immutable_hash = storedFinancialReceiptHash(row);
  return row;
}
function event(overrides: Partial<payment_event> = {}): payment_event {
  return {
    id: "event-local",
    internal_id: 1,
    deleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    gateway: "mercadopago",
    external_id: "event-provider-local",
    type: "payment",
    payload: {
      external_reference: mp.id,
      payment: {
        id: "123",
        status: "approved",
        transaction_amount: 29.9,
        currency_id: "BRL",
        live_mode: false,
      },
    },
    ...overrides,
  };
}
function invoice(overrides: Partial<billing_invoice> = {}): billing_invoice {
  const reference = invoiceReference(
    context.fiscal!.companyId,
    "in_localpolicy",
    "test",
    "acct_localpolicy",
  );
  return {
    id: "invoice-local",
    created_at: now,
    updated_at: now,
    gateway: "stripe",
    account_id: "acct_localpolicy",
    mode: "test",
    payment_id: "in_localpolicy",
    subscription_id: stripe.id,
    user_id: "user-local",
    company_id: context.fiscal!.companyId,
    amount_cents: 2990,
    currency: "BRL",
    paid_at: new Date(now.getTime() - 1000),
    reference,
    request_snapshot: {
      company_id: context.fiscal!.companyId,
      reference,
      taker: {
        document: "529.982.247-25",
        name: "Local policy test",
        email: "local-policy@example.invalid",
      },
      items: [{ description: "Local fiscal policy test", unit_amount: 2990 }],
    },
    document_id: "document-local",
    status: "authorized",
    number: "123",
    attempts: 1,
    next_attempt_at: now,
    lease_token: null,
    lease_until: null,
    last_error_code: null,
    ...overrides,
  };
}
const rows = (overrides: Partial<HistoryRecords> = {}): HistoryRecords => ({
  ambiguousReferences: [],
  contracts: [stripe, mp],
  receipts: [],
  events: [],
  invoices: [],
  ...overrides,
});

test("Stripe projection verifies receipt integrity and scope without catalog prices", () => {
  assert.equal(projectStripeReceipt(receipt(), stripe, context)?.item.amount_cents, 2990);
  for (const invalid of [
    receipt({ psychologist_id: "another" }),
    receipt({ account_id: "acct_another" }),
    receipt({ mode: "live" }),
    receipt({ provider_subscription_id: "sub_another" }),
    receipt({ price_version_id: "another" }),
    receipt({ amount_paid_cents: -1 }),
    receipt({ refunded_cents: 5000 }),
    receipt({ paid_at: new Date(now.getTime() + 1) }),
    { ...receipt(), immutable_hash: "tampered" },
  ])
    assert.equal(projectStripeReceipt(invalid, stripe, context), null);
});

test("pagination retains more than100 receipts, two payments per invoice/day and all local contracts", () => {
  const receipts = Array.from({ length: 123 }, (_, i) =>
    receipt({ id: `receipt-${i.toString().padStart(3, "0")}`, invoice_payment_id: `inpay_${i}` }),
  );
  const all = new Set<string>();
  for (let page = 1; page <= 7; page++) {
    const result = projectAdminHistory(rows({ receipts }), { page, limit: 20 }, context);
    assert.equal(result.pagination.total, 123);
    assert.equal(result.pagination.total_pages, 7);
    for (const item of result.items) all.add(item.id);
  }
  assert.equal(all.size, 123);
  assert.equal(
    projectAdminHistory(rows({ receipts }), { page: 8, limit: 20 }, context).items.length,
    0,
  );
});

test("fiscal status never overrides refund/dispute and associates every payment of the same invoice", () => {
  const result = projectAdminHistory(
    rows({
      receipts: [
        receipt({ current_state: "refunded", refunded_cents: 2990 }),
        receipt({
          id: "receipt-other",
          invoice_payment_id: "inpay_other",
          current_state: "disputed",
        }),
      ],
      invoices: [invoice()],
    }),
    {},
    context,
  );
  assert.equal(result.pagination.total, 2);
  assert.deepEqual(
    new Set(result.items.map((item) => item.financial_status)),
    new Set(["refunded", "disputed"]),
  );
  assert.ok(
    result.items.every((item) => item.invoice?.id === "invoice-local" && item.invoice.downloadable),
  );
  assert.ok(result.items.every((item) => item.amount_cents === 2990));
});

test("a refunded receipt keeps one financial row when its existing fiscal document is cancelled", () => {
  // Pure presentation contract: no refund, cancellation or provider authorization is performed.
  const result = projectAdminHistory(
    rows({
      receipts: [receipt({ current_state: "refunded", refunded_cents: 2990 })],
      invoices: [invoice({ status: "cancelled" })],
    }),
    {},
    context,
  );
  assert.equal(result.pagination.total, 1);
  const [item] = result.items;
  assert.equal(item.financial_status, "refunded");
  assert.equal(item.status_label, "Estornado");
  assert.equal(item.amount_cents, 2990);
  assert.equal(item.source, "stripe_receipt");
  assert.equal(item.invoice?.id, "invoice-local");
  assert.equal(item.invoice?.status, "cancelled");
  assert.equal(item.invoice?.downloadable, false);
});

test("fiscal-only, simulated, rejected and invalid snapshots cannot fabricate financial payment", () => {
  for (const status of [
    "authorized",
    "simulated",
    "rejected",
    "authorization_unverified",
    "awaiting_activation",
    "awaiting_configuration",
    "manual_review",
    "cancel_requested",
    "cancelled",
  ]) {
    const result = projectAdminHistory(rows({ invoices: [invoice({ status })] }), {}, context);
    assert.equal(result.items[0].financial_status, "processed");
    assert.equal(result.items[0].invoice?.status, status);
    assert.equal(result.items[0].invoice?.downloadable, status === "authorized");
  }
  assert.equal(
    projectAdminHistory(rows({ invoices: [invoice({ number: "SIM-9" })] }), {}, context).items[0]
      .invoice?.downloadable,
    false,
  );
  for (const invalid of [
    invoice({ user_id: "another" }),
    invoice({ account_id: "acct_another" }),
    invoice({ mode: "live" }),
    invoice({ amount_cents: 100 }),
    invoice({ request_snapshot: {} }),
  ]) {
    assert.equal(validHistoryInvoice(invalid, stripe, context), false);
    assert.equal(
      projectAdminHistory(rows({ invoices: [invalid] }), {}, context).pagination.total,
      0,
    );
  }
});

test("MP uses explicit ownership, payment identity and latest status; never merges by day", () => {
  const first = event({ id: "old", createdAt: new Date(now.getTime() - 1000) });
  const latest = event({
    id: "new",
    payload: {
      external_reference: mp.id,
      payment: { id: "123", status: "refunded", transaction_amount: "29.90", live_mode: false },
    },
  });
  const separate = event({
    id: "separate",
    payload: {
      external_reference: mp.id,
      payment: { id: "456", status: "approved", transaction_amount: 29.9, live_mode: false },
    },
  });
  const result = projectAdminHistory(rows({ events: [first, latest, separate] }), {}, context);
  assert.equal(result.pagination.total, 2);
  assert.deepEqual(
    new Set(result.items.map((item) => item.financial_status)),
    new Set(["paid", "refunded"]),
  );
  assert.equal(
    projectAdminHistory(
      rows({ events: [first, latest, separate] }),
      { status: "refunded" },
      context,
    ).pagination.total,
    1,
  );
  assert.equal(
    projectMercadoPagoEvent(
      event({ payload: { description: mp.id, status: "approved" } }),
      mp,
      context,
    ),
    null,
  );
  assert.equal(
    projectMercadoPagoEvent(
      event({ payload: { external_reference: mp.id, preapproval_id: "foreign" } }),
      mp,
      context,
    ),
    null,
  );
  assert.equal(
    projectMercadoPagoEvent(
      event({ payload: { external_reference: mp.id, live_mode: true } }),
      mp,
      context,
    ),
    null,
  );
  assert.equal(
    projectMercadoPagoEvent(
      event({ payload: { external_reference: mp.id, status: "approved" } }),
      mp,
      context,
    )?.item.mode,
    null,
  );
});

test("MP processed installment with nested rejected payment is never paid; missing amount stays null", () => {
  const projected = projectMercadoPagoEvent(
    event({
      type: "subscription_authorized_payment",
      payload: {
        external_reference: mp.id,
        status: "processed",
        payment: { id: "123", status: "rejected" },
      },
    }),
    mp,
    context,
  )!;
  assert.equal(projected.item.financial_status, "failed");
  assert.equal(projected.item.amount_cents, null);
});

test("wire projection is allowlisted and preserves local sources without sensitive provider payload", () => {
  const result = projectAdminHistory(
    rows({ receipts: [receipt()], invoices: [invoice()] }),
    {},
    context,
  );
  const wire = sanitizePublicResponseData(result);
  assert.deepEqual(wire, result);
  const text = JSON.stringify(wire);
  for (const forbidden of [
    "acct_",
    "inpay_",
    "in_localpolicy",
    "pi_",
    "ch_",
    "@example.invalid",
    "529.",
    "request_snapshot",
    "payment_intent",
    "provider_subscription",
  ])
    assert.ok(!text.includes(forbidden), forbidden);
  assert.equal(result.coverage.complete, false);
  const repository = readFileSync(
    "src/modules/api/admin/private/finance/history/repositories/AdminFinanceHistoryRepository.ts",
    "utf8",
  );
  assert.match(repository, /SET TRANSACTION READ ONLY/);
  assert.match(repository, /RepeatableRead/);
  assert.doesNotMatch(
    repository,
    /getPaymentGateway|SendNfAdapter|StripeGateway|fetch\(|\.create\(|\.update\(/,
  );
});

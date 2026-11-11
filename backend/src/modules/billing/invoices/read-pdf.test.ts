import assert from "node:assert/strict";
import { test } from "node:test";
import type { InvoiceConfig } from "./config";
import { type InvoiceDocument, invoiceReference } from "./contracts";
import { assertInvoicePdfDocument, type InvoicePdfRecord, invoicePdfSnapshot } from "./read-pdf";

// Pure contract fixtures only. These tests do not prove SendNF delivery or authorization.
const config = { mode: "test", companyId: "unit-company" } as InvoiceConfig;
const reference = invoiceReference("unit-company", "unit-payment", "test", "acct_unit");
const invoice: InvoicePdfRecord = {
  id: "local-unit-invoice",
  company_id: "unit-company",
  mode: "test",
  currency: "BRL",
  amount_cents: 2990,
  reference,
  gateway: "stripe",
  account_id: "acct_unit",
  payment_id: "unit-payment",
  document_id: "unit-document",
  status: "authorized",
  number: "3",
  request_snapshot: {
    company_id: "unit-company",
    reference,
    taker: { document: "529.982.247-25", name: "Teste Unitario", email: "test@example.invalid" },
    items: [{ description: "Assinatura de teste unitario", unit_amount: 2990 }],
  },
};
const document: InvoiceDocument = {
  id: "unit-document",
  object: "nfse",
  mode: "test",
  company_id: "unit-company",
  reference,
  total: 2990,
  status: "authorized",
  nfse_number: "3",
  simulation: false,
  access_key: "1".repeat(50),
  urls: { public_query: "https://example.invalid/nfse" },
};

test("PDF boundary binds persisted fiscal snapshot before any remote read", () => {
  assert.equal(invoicePdfSnapshot(invoice, config).items[0].unit_amount, 2990);
  for (const change of [
    { company_id: "other-company" },
    { mode: "live" },
    { reference: "other-reference" },
    { account_id: "acct_other" },
    { payment_id: "other-payment" },
    { amount_cents: 0 },
    { amount_cents: 2991 },
    { currency: "USD" },
    { request_snapshot: {} },
    { document_id: null },
    { status: "simulated" },
    { status: "rejected" },
    { status: "cancelled" },
  ])
    assert.throws(() => invoicePdfSnapshot({ ...invoice, ...change }, config));
});

test("PDF boundary rechecks document id, scope, snapshot and government authorization", () => {
  assert.doesNotThrow(() => assertInvoicePdfDocument(document, invoice, config));
  for (const change of [
    { id: "different-document" },
    { company_id: "different-company" },
    { mode: "live" as const },
    { reference: "different-reference" },
    { total: 1 },
    { status: "cancelled" as const },
    { status: "rejected" as const },
    { simulation: true },
    { simulation: undefined },
    { access_key: "SIM-3" },
    { nfse_number: "SIM-3" },
    { access_key: null },
    { urls: null },
    { urls: { public_query: "http://example.invalid/nfse" } },
  ])
    assert.throws(() => assertInvoicePdfDocument({ ...document, ...change }, invoice, config));
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { getInvoiceConfig, InvoiceError } from "./config";
import { invoiceReference } from "./contracts";
import { invoiceGatewayScopes, invoiceScopeMatches } from "./gateway-scope";

const fiscal = {
  SENDNF_TEST_ENABLED: "true",
  SENDNF_API_KEY: "nt_test_unit_only",
  SENDNF_COMPANY_ID: "unit",
  SENDNF_PAYMENTS_FROM: "2026-11-01T00:00:00Z",
  SENDNF_SERVICE_DESCRIPTION: "Assinatura da plataforma de teste",
};
const local = {
  NODE_ENV: "test",
  BASE: "http://127.0.0.1:3121",
  DATABASE_URL: "postgresql://127.0.0.1/lectum_test",
  STRIPE_ENV: "test",
  STRIPE_ACCOUNT_ID: "acct_unit",
};

test("Stripe fiscal test is independent from MP, remains off by default, and accepts genuine homolog scope", () => {
  assert.equal(getInvoiceConfig(local), null);
  assert.equal(getInvoiceConfig({ ...fiscal, ...local })?.issueEnabled, false);
  const homolog = {
    ...fiscal,
    ...local,
    NODE_ENV: "production",
    BASE: "https://homolog-api.lectum.com.br",
    DATABASE_URL: "postgresql://db.internal/lectum_homolog",
  };
  assert.equal(getInvoiceConfig(homolog)?.mode, "test");
  for (const change of [
    { STRIPE_ENV: "live" },
    { STRIPE_ACCOUNT_ID: "" },
    { BASE: "https://api.lectum.com.br" },
    { DATABASE_URL: "postgresql://db.internal/lectum_production" },
  ]) {
    assert.throws(() => getInvoiceConfig({ ...homolog, ...change }), InvoiceError);
  }
});

test("Stripe live fiscal gate requires production runtime; it never follows new-checkout provider alone", () => {
  const live = {
    ...local,
    NODE_ENV: "production",
    BASE: "https://api.lectum.com.br",
    DATABASE_URL: "postgresql://db.internal/lectum_production",
    STRIPE_ENV: "live",
  };
  assert.deepEqual(invoiceGatewayScopes("live", live), [
    { gateway: "stripe", mode: "live", accountId: "acct_unit" },
  ]);
  assert.deepEqual(invoiceGatewayScopes("test", live), []);
  assert.deepEqual(invoiceGatewayScopes("live", { ...live, NODE_ENV: "test" }), []);
  assert.deepEqual(
    invoiceGatewayScopes("test", { ...local, STRIPE_ENV: "", BILLING_CHECKOUT_GATEWAY: "stripe" }),
    [],
  );
});

test("fiscal jobs and receipts are isolated by provider/account/mode with legacy MP null mode only", () => {
  const scopes = invoiceGatewayScopes("test", { ...local, MERCADO_PAGO_ENV: "sandbox" });
  assert.equal(
    invoiceScopeMatches(scopes, { gateway: "mercadopago", account_id: null, mode: null }, true),
    true,
  );
  assert.equal(
    invoiceScopeMatches(scopes, { gateway: "stripe", account_id: "acct_unit", mode: null }, true),
    false,
  );
  assert.equal(
    invoiceScopeMatches(scopes, { gateway: "stripe", account_id: "acct_other", mode: "test" }),
    false,
  );
  assert.equal(
    invoiceScopeMatches(scopes, { gateway: "stripe", account_id: "acct_unit", mode: "live" }),
    false,
  );
  assert.equal(
    invoiceScopeMatches(scopes, { gateway: "stripe", account_id: "acct_unit", mode: "test" }),
    true,
  );
});

test("MP fiscal idempotency reference is byte-for-byte unchanged; Stripe includes account and canonical invoice", () => {
  const legacy = `lectum-test-${createHash("sha256").update("company:mercadopago:123").digest("hex").slice(0, 48)}`;
  assert.equal(invoiceReference("company", "123", "test"), legacy);
  const stripe = invoiceReference("company", "in_unit", "test", "acct_unit");
  for (const other of [
    invoiceReference("company", "in_unit", "test"),
    invoiceReference("company", "in_unit", "live", "acct_unit"),
    invoiceReference("company", "in_unit", "test", "acct_other"),
  ])
    assert.notEqual(stripe, other);
});

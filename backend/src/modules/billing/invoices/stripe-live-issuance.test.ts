import assert from "node:assert/strict";
import { test } from "node:test";
import { canIssuePayment, getInvoiceConfig } from "./config";

// Pure configuration/policy fixtures only: never contacts a fiscal or payment provider.
const live = {
  NODE_ENV: "production",
  BASE: "https://api.lectum.com.br",
  DATABASE_URL: "postgresql://unit.invalid/lectum",
  MERCADO_PAGO_ENV: "production",
  SENDNF_LIVE_ENABLED: "true",
  SENDNF_LIVE_ISSUANCE_ENABLED: "true",
  SENDNF_LIVE_AUTO_ENABLED: "true",
  SENDNF_FISCAL_SETTINGS_CONFIRMED: "true",
  SENDNF_API_KEY: "nt_live_unit_only",
  SENDNF_COMPANY_ID: "company-unit",
  SENDNF_SERVICE_DESCRIPTION: "Descricao fiscal de teste unitario",
  SENDNF_SERVICE_CODE: "010501",
  SENDNF_ISS_RATE: "201",
  SENDNF_PAYMENTS_FROM: "2026-01-01T00:00:00Z",
};
const configured = (change: NodeJS.ProcessEnv = {}) => getInvoiceConfig({ ...live, ...change })!;

test("existing MP auto activation never implicitly authorizes new Stripe live invoices", () => {
  for (const change of [
    {},
    { SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "false" },
    { SENDNF_STRIPE_LIVE_AUTO_ENABLED: "true" },
    { SENDNF_STRIPE_LIVE_PAYMENT_ID: "in_selected" },
  ]) {
    const config = configured(change);
    assert.equal(config.issueEnabled, true);
    assert.equal(config.autoEnabled, true);
    assert.equal(canIssuePayment(config, "123", "mercadopago"), true);
    assert.equal(canIssuePayment(config, "in_selected", "stripe"), false);
    assert.equal(canIssuePayment(config, "in_other", "stripe"), false);
  }
});

test("Stripe has an independent pilot while MP auto continues unchanged", () => {
  const config = configured({
    SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "true",
    SENDNF_STRIPE_LIVE_AUTO_ENABLED: "false",
    SENDNF_STRIPE_LIVE_PAYMENT_ID: "in_selected",
  });
  assert.equal(canIssuePayment(config, "in_selected", "stripe"), true);
  assert.equal(canIssuePayment(config, "in_other", "stripe"), false);
  assert.equal(canIssuePayment(config, "123", "mercadopago"), true);
  assert.equal(canIssuePayment(config, "456", "mercadopago"), true);
});

test("MP pilot neither authorizes nor restricts the independent Stripe policy", () => {
  const config = configured({
    SENDNF_LIVE_AUTO_ENABLED: "false",
    SENDNF_LIVE_PAYMENT_ID: "123",
    SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "true",
    SENDNF_STRIPE_LIVE_PAYMENT_ID: "in_selected",
  });
  assert.equal(canIssuePayment(config, "123", "mercadopago"), true);
  assert.equal(canIssuePayment(config, "456", "mercadopago"), false);
  assert.equal(canIssuePayment(config, "in_selected", "stripe"), true);
  assert.equal(canIssuePayment(config, "in_other", "stripe"), false);
  const auto = configured({
    SENDNF_LIVE_AUTO_ENABLED: "false",
    SENDNF_LIVE_PAYMENT_ID: "123",
    SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "true",
    SENDNF_STRIPE_LIVE_AUTO_ENABLED: "true",
  });
  assert.equal(canIssuePayment(auto, "in_other", "stripe"), true);
  assert.equal(canIssuePayment(auto, "456", "mercadopago"), false);
  for (const payment of ["123", "in_", "in_invalid/value"])
    assert.equal(canIssuePayment(auto, payment, "stripe"), false);
});

test("valid scoped Stripe pilot does not require an unrelated MP pilot", () => {
  for (const MERCADO_PAGO_ENV of ["production", ""]) {
    const config = configured({
      MERCADO_PAGO_ENV,
      STRIPE_ENV: "live",
      STRIPE_ACCOUNT_ID: "acct_unit",
      SENDNF_LIVE_AUTO_ENABLED: "false",
      SENDNF_LIVE_PAYMENT_ID: "",
      SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "true",
      SENDNF_STRIPE_LIVE_PAYMENT_ID: "in_selected",
    });
    assert.equal(canIssuePayment(config, "in_selected", "stripe"), true);
    assert.equal(canIssuePayment(config, "in_other", "stripe"), false);
    assert.equal(canIssuePayment(config, "123", "mercadopago"), false);
  }
  for (const change of [
    {},
    { STRIPE_ENV: "live", STRIPE_ACCOUNT_ID: "invalid" },
    { STRIPE_ENV: "test", STRIPE_ACCOUNT_ID: "acct_unit" },
  ])
    assert.throws(() =>
      configured({
        SENDNF_LIVE_AUTO_ENABLED: "false",
        SENDNF_LIVE_PAYMENT_ID: "",
        SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "true",
        SENDNF_STRIPE_LIVE_PAYMENT_ID: "in_selected",
        ...change,
      }),
    );
});

test("pausing or misconfiguring a scoped Stripe pilot keeps configuration readable", () => {
  for (const change of [
    { SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "false" },
    { SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "invalid" },
    { SENDNF_STRIPE_LIVE_PAYMENT_ID: "" },
    { SENDNF_STRIPE_LIVE_PAYMENT_ID: "invalid" },
  ]) {
    const config = configured({
      STRIPE_ENV: "live",
      STRIPE_ACCOUNT_ID: "acct_unit",
      SENDNF_LIVE_AUTO_ENABLED: "false",
      SENDNF_LIVE_PAYMENT_ID: "",
      SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "true",
      SENDNF_STRIPE_LIVE_PAYMENT_ID: "in_selected",
      ...change,
    });
    assert.equal(config.mode, "live");
    assert.equal(canIssuePayment(config, "in_selected", "stripe"), false);
    assert.equal(canIssuePayment(config, "123", "mercadopago"), false);
  }
});

test("global fiscal confirmation and issuance remain mandatory for either gateway", () => {
  for (const change of [
    { SENDNF_FISCAL_SETTINGS_CONFIRMED: "false" },
    { SENDNF_LIVE_ISSUANCE_ENABLED: "false" },
  ]) {
    const config = configured({
      SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "true",
      SENDNF_STRIPE_LIVE_AUTO_ENABLED: "true",
      ...change,
    });
    assert.equal(canIssuePayment(config, "in_selected", "stripe"), false);
    assert.equal(canIssuePayment(config, "123", "mercadopago"), false);
  }
  assert.equal(canIssuePayment(configured(), "123", "unknown"), false);
});

test("invalid or incomplete Stripe opt-in fails closed without breaking MP configuration", () => {
  for (const change of [
    { SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "TRUE" },
    { SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "1" },
    { SENDNF_STRIPE_LIVE_AUTO_ENABLED: "invalid" },
    { SENDNF_STRIPE_LIVE_AUTO_ENABLED: "" },
    { SENDNF_STRIPE_LIVE_AUTO_ENABLED: "false" },
    { SENDNF_STRIPE_LIVE_PAYMENT_ID: "123", SENDNF_STRIPE_LIVE_AUTO_ENABLED: "true" },
    { SENDNF_STRIPE_LIVE_PAYMENT_ID: "in_bad/path", SENDNF_STRIPE_LIVE_AUTO_ENABLED: "true" },
  ]) {
    const config = configured({ SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "true", ...change });
    assert.equal(canIssuePayment(config, "in_selected", "stripe"), false);
    assert.equal(canIssuePayment(config, "123", "mercadopago"), true);
  }
});

test("test-mode global policy is unchanged by absent or invalid Stripe live settings", () => {
  const config = getInvoiceConfig({
    ...live,
    NODE_ENV: "test",
    BASE: "http://127.0.0.1:3121",
    DATABASE_URL: "postgresql://127.0.0.1/lectum_test",
    MERCADO_PAGO_ENV: "sandbox",
    SENDNF_LIVE_ENABLED: "false",
    SENDNF_TEST_ENABLED: "true",
    SENDNF_TEST_ISSUANCE_ENABLED: "true",
    SENDNF_API_KEY: "nt_test_unit_only",
    SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED: "invalid",
  })!;
  assert.equal(config.mode, "test");
  assert.equal(canIssuePayment(config, "in_selected", "stripe"), true);
  assert.equal(canIssuePayment(config, "123", "mercadopago"), true);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInvoicePayment, resolveAuthorizedPayment } from "../payment-gateway/invoice-payment";
import {
  canIssuePayment,
  getInvoiceConfig,
  InvoiceError,
  invoiceErrorCode,
  retryDate,
} from "./config";
import {
  assertDocumentMatches,
  documentSchema,
  invoiceReference,
  invoiceRequestSchema,
} from "./contracts";
import { SendNfAdapter } from "./SendNfAdapter";
import { assertEligiblePayment } from "./worker";

const settings = {
  SENDNF_TEST_ENABLED: "true",
  SENDNF_API_KEY: "nt_test_unit_test_only",
  SENDNF_COMPANY_ID: "unit-company",
  SENDNF_PAYMENTS_FROM: "2026-01-01T00:00:00Z",
  SENDNF_SERVICE_DESCRIPTION: "Assinatura de teste da plataforma",
  MERCADO_PAGO_ENV: "sandbox",
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://127.0.0.1:55432/lectum_test",
};
const request = {
  company_id: "unit-company",
  reference: "unit-payment",
  taker: { document: "529.982.247-25", name: "Teste Unitario", email: "test@example.invalid" },
  items: [{ description: "Assinatura de teste", unit_amount: 2990 }],
};
const authorized = {
  id: 123,
  preapproval_id: "subscription-unit",
  external_reference: "local-unit",
  payment: { id: 456 },
};
const payment = {
  id: 456,
  transaction_amount: 29.9,
  transaction_amount_refunded: 0,
  currency_id: "BRL",
  status: "approved",
  live_mode: false,
  date_approved: "2026-01-02T12:00:00Z",
};

test("SendNF remains disabled by default and refuses live credentials/runtime", () => {
  assert.equal(getInvoiceConfig({}), null);
  const config = getInvoiceConfig(settings)!;
  assert.equal(config.issueEnabled, false);
  for (const change of [
    { SENDNF_API_KEY: "nt_live_forbidden" },
    { MERCADO_PAGO_ENV: "production" },
    { NODE_ENV: "production" },
    { DATABASE_URL: "postgresql://example.invalid:55432/lectum_test" },
    { DATABASE_URL: "postgresql://127.0.0.1:55432/lectum_homolog" },
    { DATABASE_URL: "postgresql://127.0.0.1:55432/lectum_production_test" },
    { SENDNF_PAYMENTS_FROM: "" },
    { SENDNF_COMPANY_ID: "../other" },
  ]) {
    assert.throws(() => getInvoiceConfig({ ...settings, ...change }), InvoiceError);
  }
  assert.equal(
    getInvoiceConfig({ ...settings, SENDNF_TEST_ISSUANCE_ENABLED: "true" })?.issueEnabled,
    false,
  );
  assert.equal(
    getInvoiceConfig({
      ...settings,
      SENDNF_TEST_ISSUANCE_ENABLED: "true",
      SENDNF_FISCAL_SETTINGS_CONFIRMED: "true",
    })?.issueEnabled,
    true,
  );
  assert.throws(() => new SendNfAdapter("nt_live_forbidden", "unit-company"));
});

test("fiscal input requires CPF, recipient email and positive integer cents", () => {
  assert.ok(invoiceRequestSchema.safeParse(request).success);
  assert.ok(
    invoiceRequestSchema.safeParse({
      ...request,
      taker: { ...request.taker, document: "52998224725" },
    }).success,
  );
  for (const document of ["", null, "000.000.000-00", "invalid"]) {
    assert.equal(
      invoiceRequestSchema.safeParse({ ...request, taker: { ...request.taker, document } }).success,
      false,
    );
  }
  for (const unit_amount of [0, -1, 29.9])
    assert.equal(
      invoiceRequestSchema.safeParse({ ...request, items: [{ ...request.items[0], unit_amount }] })
        .success,
      false,
    );
});

test("reference is stable and isolated by company and payment", () => {
  assert.equal(invoiceReference("a", "1"), invoiceReference("a", "1"));
  assert.notEqual(invoiceReference("a", "1"), invoiceReference("a", "2"));
  assert.notEqual(invoiceReference("a", "1"), invoiceReference("b", "1"));
});

test("SendNF reconciliation rejects wrong reference, total and company", () => {
  const document = documentSchema.parse({
    id: "document-unit",
    object: "nfse",
    mode: "test",
    status: "authorized",
    reference: request.reference,
    total: 2990,
  });
  assertDocumentMatches(document, request);
  for (const change of [{ reference: "other" }, { total: 2991 }, { company_id: "other" }])
    assert.throws(() => assertDocumentMatches({ ...document, ...change }, request));
  assert.throws(() => assertDocumentMatches({ ...document, mode: "live" }, request));
  assert.throws(() => assertDocumentMatches({ ...document, mode: "live" }, request, "live"));
  assertDocumentMatches(
    { ...document, mode: "live", company_id: request.company_id },
    request,
    "live",
  );
});

const liveSettings = {
  ...settings,
  SENDNF_TEST_ENABLED: "false",
  SENDNF_LIVE_ENABLED: "true",
  SENDNF_API_KEY: "nt_live_unit_test_only",
  SENDNF_SERVICE_CODE: "010501",
  SENDNF_ISS_RATE: "201",
  NODE_ENV: "production",
  MERCADO_PAGO_ENV: "production",
  BASE: "https://api.lectum.com.br",
  DATABASE_URL: "postgresql://production-db.invalid:5432/lectum",
};

test("live config is explicit, isolated and issuance stays off by default", () => {
  const config = getInvoiceConfig(liveSettings)!;
  assert.equal(config.mode, "live");
  assert.equal(config.issueEnabled, false);
  assert.equal(config.autoEnabled, false);
  assert.equal(config.issRate, 201);
  for (const change of [
    { SENDNF_TEST_ENABLED: "true" },
    { SENDNF_API_KEY: "nt_test_unit_test_only" },
    { NODE_ENV: "homolog" },
    { NODE_ENV: "development" },
    { MERCADO_PAGO_ENV: "sandbox" },
    { BASE: "https://api.lectum.com.br.example.invalid" },
    { BASE: "http://localhost:3011" },
    { DATABASE_URL: "postgresql://127.0.0.1:55432/lectum" },
    { DATABASE_URL: "postgresql://production-db.invalid/lectum_homolog" },
    { SENDNF_SERVICE_CODE: "" },
    { SENDNF_ISS_RATE: "2.01" },
    { SENDNF_ISS_RATE: "501" },
    { SENDNF_PAYMENTS_FROM: "2026-10-26" },
    { SENDNF_PAYMENTS_FROM: "2026-10-26T10:00:00" },
  ])
    assert.throws(() => getInvoiceConfig({ ...liveSettings, ...change }), InvoiceError);
});

test("live pilot authorizes only one payment and requires independent fiscal confirmation", () => {
  const pilot = {
    ...liveSettings,
    SENDNF_LIVE_ISSUANCE_ENABLED: "true",
    SENDNF_LIVE_PAYMENT_ID: "456",
  };
  assert.equal(canIssuePayment(getInvoiceConfig(pilot)!, "456", "mercadopago"), false);
  const config = getInvoiceConfig({ ...pilot, SENDNF_FISCAL_SETTINGS_CONFIRMED: "true" })!;
  assert.equal(canIssuePayment(config, "456", "mercadopago"), true);
  assert.equal(canIssuePayment(config, "457", "mercadopago"), false);
  assert.throws(() =>
    getInvoiceConfig({
      ...pilot,
      SENDNF_FISCAL_SETTINGS_CONFIRMED: "true",
      SENDNF_LIVE_PAYMENT_ID: "",
    }),
  );
  assert.equal(canIssuePayment({ ...config, autoEnabled: true }, "457", "mercadopago"), true);
  assert.notEqual(invoiceReference("a", "456", "live"), invoiceReference("a", "456", "test"));
});

test("live eligibility accepts only confirmed real payments after cutoff", () => {
  const parsed = parseInvoicePayment(
    resolveAuthorizedPayment(authorized, "subscription_authorized_payment", "123"),
    payment,
  );
  const config = getInvoiceConfig(liveSettings)!;
  assert.throws(() => assertEligiblePayment(parsed, config));
  const real = { ...parsed, liveMode: true };
  assertEligiblePayment(real, config);
  for (const change of [
    { refundedCents: 1 },
    { status: "pending" },
    { paidAt: new Date("2025-01-01") },
    { paidAt: new Date("2999-01-01") },
    { paidAt: new Date(Number.NaN) },
  ])
    assert.throws(() => assertEligiblePayment({ ...real, ...change }, config));
});

test("live adapter refuses emission from local runtime before any HTTP call", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  await assert.rejects(
    new SendNfAdapter("nt_live_unit_test_only", "unit-company", "live").create(request, "010501"),
    (error: unknown) => error instanceof InvoiceError && error.code === "live_runtime_required",
  );
});

test("MP requires an exact individual payment relation; summaries are never enough", () => {
  assert.deepEqual(resolveAuthorizedPayment({ results: [authorized] }, "payment", "456"), {
    ...authorized,
    id: "123",
    payment: { id: "456" },
  });
  assert.throws(() =>
    resolveAuthorizedPayment({ results: [authorized, authorized] }, "payment", "456"),
  );
  assert.throws(() => resolveAuthorizedPayment({ results: [authorized] }, "payment", "999"));
  assert.throws(() =>
    resolveAuthorizedPayment({ summarized: { charged_amount: 29.9 } }, "payment", "456"),
  );
  assert.throws(() =>
    parseInvoicePayment(
      resolveAuthorizedPayment(authorized, "subscription_authorized_payment", "123"),
      { ...payment, id: 999 },
    ),
  );
});

test("invoice eligibility excludes live, refund, pending, historical and wrong currency payments", () => {
  const parsed = parseInvoicePayment(
    resolveAuthorizedPayment(authorized, "subscription_authorized_payment", "123"),
    payment,
  );
  assert.equal(parsed.amountCents, 2990);
  assertEligiblePayment(parsed, getInvoiceConfig(settings)!);
  for (const change of [
    { liveMode: true },
    { refundedCents: 100 },
    { status: "pending" },
    { paidAt: null },
    { paidAt: new Date(Number.NaN) },
    { currency: "USD" },
    { paidAt: new Date("2025-01-01") },
  ]) {
    assert.throws(() =>
      assertEligiblePayment({ ...parsed, ...change }, getInvoiceConfig(settings)!),
    );
  }
});

test("fiscal cutoff uses the receipt transition and independently rejects invalid or future invoice facts", () => {
  const parsed = parseInvoicePayment(
    resolveAuthorizedPayment(authorized, "subscription_authorized_payment", "123"),
    payment,
  );
  const paidAt = new Date("2026-01-02T12:00:00Z");
  const config = { mode: "test" as const, paymentsFrom: new Date("2026-01-02T11:00:00Z") };
  for (const invoicePaidAt of [
    new Date("2026-01-02T10:00:00Z"),
    new Date("2026-01-02T13:00:00Z"),
  ]) {
    const input = { ...parsed, paidAt, invoicePaidAt };
    const before = { ...input };
    assertEligiblePayment(input, config);
    assert.deepEqual(input, before);
    assert.throws(() =>
      assertEligiblePayment(input, {
        ...config,
        paymentsFrom: new Date("2026-01-02T12:00:01Z"),
      }),
    );
  }
  for (const invoicePaidAt of [null, new Date(Number.NaN), new Date("2999-01-01")])
    assert.throws(() => assertEligiblePayment({ ...parsed, paidAt, invoicePaidAt }, config));
  assertEligiblePayment(
    { ...parsed, paidAt, invoicePaidAt: paidAt },
    { ...config, paymentsFrom: paidAt },
  );
  assertEligiblePayment(parsed, config); // MP has only its own date_approved, unchanged.
});

test("errors do not leak provider payload and backoff is bounded", () => {
  assert.equal(invoiceErrorCode(new Error("private payload")), "operation_unavailable");
  assert.equal(retryDate(999, 0).getTime(), 3_600_000);
  assert.equal(new InvoiceError("company_not_ready").message, "BILLING_INVOICE_OPERATION_FAILED");
});

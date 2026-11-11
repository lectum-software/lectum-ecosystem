import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { StripeGatewayError, stripeFailure } from "../payment-gateway/stripe-error";
import {
  assertStripeInvoicePaymentPending,
  StripeInvoicePaymentError,
} from "../payment-gateway/stripe-invoice";
import { InvoiceError } from "./config";
import { documentSchema, invoiceRequestSchema } from "./contracts";
import {
  invoiceFailure,
  invoiceJobFailure,
  invoiceOperationReference,
  invoiceVerificationFailuresAfterPayment,
  logInvoiceOutcome,
  safeInvoiceDiagnostic,
} from "./diagnostics";
import { parseFiscalRecoveryArguments, validateFiscalRecoveryArguments } from "./recovery-policy";
import { SendNfAdapter } from "./SendNfAdapter";
import { invoiceQueueSelection } from "./worker";

// Contract tests only; not a substitute for real SendNF test delivery or government authorization.
const request = {
  company_id: "unit-company",
  reference: "unit-reference",
  taker: { document: "529.982.247-25", name: "Teste Unitario", email: "test@example.invalid" },
  items: [{ description: "Assinatura de teste unitario", unit_amount: 2990 }],
};

test("test creation always requires never and keeps stable reference/idempotency", async (t) => {
  const calls: RequestInit[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(new URL(url).pathname, "/v1/nfse");
    calls.push(init);
    return new Response(
      JSON.stringify({
        id: "unit-document",
        object: "nfse",
        mode: "test",
        reference: request.reference,
        total: 2990,
        status: "rejected",
        simulation: false,
        simulation_policy: "never",
        access_key: null,
        failure_code: "cnc_missing_in_test",
      }),
    );
  });
  const adapter = new SendNfAdapter("nt_test_unit_only", request.company_id);
  const document = await adapter.create(request);
  assert.equal(document.failure_code, "cnc_missing_in_test");
  assert.equal(document.simulation, false);
  assert.equal(document.simulation_policy, "never");
  assert.equal(document.id, "unit-document");
  assert.equal(JSON.parse(String(calls[0].body)).simulation, "never");
  assert.equal(new Headers(calls[0].headers).get("Idempotency-Key"), request.reference);
  assert.equal(invoiceRequestSchema.parse({ ...request, simulation: "never" }).simulation, "never");
  assert.equal(invoiceRequestSchema.safeParse({ ...request, simulation: "allow" }).success, false);
});

test("failure metadata is allowlisted and malformed values never discard document identity", () => {
  const raw = {
    id: "unit-document",
    object: "nfse",
    mode: "test",
    reference: "unit",
    total: 2990,
    status: "rejected",
    simulation: false,
  };
  for (const code of [
    "cnc_missing_in_test",
    "municipality_missing_in_test",
    "registry_missing_in_test",
    "government_test_rejected",
  ])
    assert.equal(documentSchema.parse({ ...raw, failure_code: code }).failure_code, code);
  const parsed = documentSchema.parse({
    ...raw,
    failure_code: "private@example.invalid",
    simulation_policy: "unknown",
  });
  assert.equal(parsed.id, raw.id);
  assert.equal(parsed.failure_code, null);
  assert.equal(parsed.simulation_policy, undefined);
});

test("zero and terminal invoices stop fiscal jobs; pending invoices have a bounded retry", () => {
  for (const [status, disposition] of [
    ["paid", "zero_invoice"],
    ["void", "void_invoice"],
    ["uncollectible", "uncollectible_invoice"],
    ["draft", "awaiting_payment"],
    ["open", "awaiting_payment"],
  ]) {
    let error: unknown;
    try {
      assertStripeInvoicePaymentPending({ status, amount_paid: 0 } as Stripe.Invoice);
    } catch (caught) {
      error = caught;
    }
    assert.ok(error instanceof StripeInvoicePaymentError);
    assert.equal(error.kind, "payment_not_eligible");
    assert.equal(invoiceFailure(error, "stripe", 1).terminal, disposition !== "awaiting_payment");
    assert.equal(invoiceFailure(error, "stripe", 10).terminal, true);
    assert.equal(invoiceFailure(error, "stripe", 1).code, disposition);
  }
  assert.doesNotThrow(() =>
    assertStripeInvoicePaymentPending({ status: "paid", amount_paid: 2990 } as Stripe.Invoice),
  );
  assert.equal(
    invoiceFailure(new StripeGatewayError("provider_unavailable"), "stripe", 9).terminal,
    false,
  );
  assert.equal(
    invoiceFailure(new StripeGatewayError("provider_unavailable"), "stripe", 10).terminal,
    true,
  );
  assert.equal(
    invoiceFailure(new InvoiceError("billing_address_incomplete", true), "stripe", 100).terminal,
    false,
  );
  assert.equal(
    invoiceFailure(new InvoiceError("recipient_incomplete", true), "stripe", 100).terminal,
    false,
  );
  assert.equal(
    invoiceFailure(new InvoiceError("sendnf_unavailable", true), "mercadopago", 100).terminal,
    false,
  );
});

test("recipient waits never consume the consecutive fiscal verification budget", () => {
  let failures = 0;
  for (let attempt = 1; attempt <= 25; attempt++) {
    const waiting = invoiceJobFailure(
      new InvoiceError("recipient_incomplete", true),
      "stripe",
      failures,
      true,
    );
    assert.equal(waiting.terminal, false);
    assert.equal(waiting.verificationFailures, 0);
    failures = waiting.verificationFailures;
  }
  for (const failure of [
    stripeFailure({ code: "ETIMEDOUT" }),
    stripeFailure({ type: "StripeConnectionError" }),
    stripeFailure({ statusCode: 429 }),
    stripeFailure({ statusCode: 503 }),
    new StripeGatewayError("provider_unavailable"),
    new Error("unclassified persistence failure"),
    new StripeInvoicePaymentError("awaiting_payment"),
  ]) {
    assert.equal(invoiceJobFailure(failure, "stripe", 0, false).terminal, false);
    assert.equal(invoiceJobFailure(failure, "stripe", 8, false).terminal, false);
    assert.equal(invoiceJobFailure(failure, "stripe", 9, false).terminal, true);
    assert.equal(invoiceJobFailure(failure, "stripe", 100, false).verificationFailures, 10);
  }
  for (const code of ["recipient_incomplete", "billing_address_incomplete"]) {
    const failure = new InvoiceError(code, true);
    assert.equal(invoiceJobFailure(failure, "stripe", 9, true).verificationFailures, 0);
    assert.equal(invoiceJobFailure(failure, "stripe", 9, false).verificationFailures, 10);
  }
  // A later local persistence failure is not a successful data wait and must stay bounded.
  assert.equal(invoiceJobFailure(new Error("unknown"), "stripe", 9, true).terminal, true);
  for (const failure of [
    stripeFailure({ statusCode: 401 }),
    stripeFailure({ statusCode: 403 }),
    new StripeGatewayError("resource_mismatch"),
    new StripeGatewayError("contract_invalid"),
    new StripeGatewayError("payment_not_eligible"),
    new StripeInvoicePaymentError("zero_invoice"),
    new StripeInvoicePaymentError("void_invoice"),
    new StripeInvoicePaymentError("uncollectible_invoice"),
  ])
    assert.equal(invoiceJobFailure(failure, "stripe", 0, false).terminal, true);
});

test("a canonical newly paid invoice resets only the exhausted awaiting-payment stage", () => {
  const timeout = stripeFailure({ code: "ETIMEDOUT" });
  // An event or failed first GET is not paid evidence and cannot reset the stored budget.
  assert.equal(invoiceJobFailure(timeout, "stripe", 10, false).terminal, true);
  const newBudget = invoiceVerificationFailuresAfterPayment(10, "awaiting_payment");
  assert.equal(newBudget, 0);
  assert.equal(invoiceJobFailure(timeout, "stripe", newBudget, false).terminal, false);
  assert.equal(
    invoiceJobFailure(new StripeGatewayError("resource_mismatch"), "stripe", newBudget, false)
      .terminal,
    true,
  );
  for (const previousCode of [null, "provider_unavailable", "operation_unavailable"])
    assert.equal(invoiceVerificationFailuresAfterPayment(10, previousCode), 10);
});

test("fiscal outcome never exposes identifiers or arbitrary diagnostic values", (t) => {
  const captured: unknown[] = [];
  t.mock.method(console, "info", (...args: unknown[]) => captured.push(args));
  logInvoiceOutcome({
    id: "in_privateidentifier",
    stage: "document",
    outcome: "retry",
    code: "secret@example.invalid",
    attempts: 3,
  });
  const output = JSON.stringify(captured);
  assert.equal(output.includes("in_privateidentifier"), false);
  assert.equal(output.includes("secret@example.invalid"), false);
  assert.equal(output.includes(invoiceOperationReference("in_privateidentifier")), true);
  assert.equal(safeInvoiceDiagnostic("sendnf_http_503"), "sendnf_http_503");
  assert.equal(safeInvoiceDiagnostic("sendnf_http_503 private"), "operation_unavailable");
});

test("recovery requires explicit inventory, operator, mode and apply confirmation", () => {
  const args = [
    "--invoice-id",
    "in_unit",
    "--account",
    "acct_unit",
    "--mode",
    "test",
    "--actor-admin-id",
    "admin-unit",
    "--expected-job-attempts",
    "absent",
    "--expected-invoice-attempts",
    "10",
    "--reason",
    "missing_fiscal_job",
  ];
  const parsed = parseFiscalRecoveryArguments(args)!;
  assert.equal(parsed.apply, false);
  assert.equal(parsed.expectedJobAttempts, null);
  assert.equal(parsed.expectedInvoiceAttempts, 10);
  assert.throws(() => parseFiscalRecoveryArguments([...args, "--apply"]));
  assert.throws(() => parseFiscalRecoveryArguments([...args, "--apply", "--confirm", "live"]));
  assert.throws(() => parseFiscalRecoveryArguments([...args, "--mode", "test"]));
  assert.equal(
    parseFiscalRecoveryArguments([...args, "--apply", "--confirm", "test"])?.apply,
    true,
  );
  for (const patch of [
    { invoiceId: "in_../private" },
    { expectedJobAttempts: -1 },
    { actorAdminId: "" },
    { reason: "free form" },
    { apply: true },
  ])
    assert.throws(() => validateFiscalRecoveryArguments({ ...parsed, ...patch } as typeof parsed));
});

test("selected fiscal queue is bounded and omitted sides never become a global batch", () => {
  assert.deepEqual(invoiceQueueSelection(), { jobIds: undefined, invoiceIds: undefined });
  assert.deepEqual(invoiceQueueSelection({}), { jobIds: [], invoiceIds: [] });
  assert.deepEqual(invoiceQueueSelection({ jobIds: ["local-job"] }), {
    jobIds: ["local-job"],
    invoiceIds: [],
  });
  for (const jobIds of [
    ["bad/id"],
    ["same", "same"],
    Array.from({ length: 6 }, (_, i) => `id-${i}`),
  ])
    assert.throws(() => invoiceQueueSelection({ jobIds }));
  assert.equal(
    invoiceFailure(new StripeGatewayError("provider_unavailable"), "stripe", 100, false).terminal,
    false,
  );
});

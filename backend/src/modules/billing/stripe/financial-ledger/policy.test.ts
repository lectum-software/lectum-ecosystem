import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStripeLedgerArguments } from "@/operations/billing/stripe-ledger-arguments";
import { StripeGatewayError } from "../../payment-gateway/stripe-error";
import type { StripeFinancialReceipt } from "../../payment-gateway/stripe-financial-types";
import { financialFailureCode, financialReceiptHash, validateFinancialOptions } from "./policy";

const base = ["--subscription-id", "local-contract", "--account", "acct_unit", "--mode", "test"];
test("financial CLI requires explicit scope, defaults dry-run and cannot apply without matching confirmation", () => {
  assert.equal(parseStripeLedgerArguments(base)?.apply, false);
  assert.equal(parseStripeLedgerArguments([...base, "--apply", "--confirm", "test"])?.apply, true);
  for (const extra of [
    ["--apply"],
    ["--apply", "--confirm", "live"],
    ["--refresh"],
    ["--max-pages", "6"],
    ["--mode", "test"],
    ["--unknown"],
  ])
    assert.throws(() => parseStripeLedgerArguments([...base, ...extra]));
  assert.throws(() =>
    validateFinancialOptions({
      subscriptionId: "x",
      accountId: "acct_unit",
      mode: "test",
      apply: true,
    }),
  );
  assert.equal(parseStripeLedgerArguments(["--help"]), null);
});

test("immutable financial hash excludes changing refund/dispute observations, but includes scope, amount, receipt and period", () => {
  const receipt: StripeFinancialReceipt = {
    accountId: "acct_unit",
    mode: "test",
    subscriptionId: "sub_unit",
    localSubscriptionId: "local",
    customerId: "cus_unit",
    priceId: "price_unit",
    amountCents: 2990,
    invoiceId: "in_unit",
    invoicePaymentId: "inpay_unit",
    paymentIntentId: "pi_unit",
    chargeId: "ch_unit",
    currency: "BRL",
    paidAt: new Date("2026-10-01"),
    invoicePaidAt: new Date("2026-10-01"),
    periodStart: new Date("2026-10-01"),
    periodEnd: new Date("2026-11-01"),
    refundedCents: 0,
    currentState: "paid",
    disputeStatus: "none",
  };
  const local = { subscriptionId: "local", psychologistId: "profile", priceVersionId: "version" };
  const hash = financialReceiptHash(receipt, local);
  assert.equal(
    financialReceiptHash(
      { ...receipt, refundedCents: 2990, currentState: "refunded", disputeStatus: "observed" },
      local,
    ),
    hash,
  );
  for (const change of [
    { amountCents: 3000 },
    { accountId: "acct_other" },
    { invoicePaymentId: "inpay_other" },
    { paidAt: new Date("2026-10-02") },
    { invoicePaidAt: new Date("2026-09-30") },
    { periodEnd: new Date("2026-12-01") },
  ])
    assert.notEqual(financialReceiptHash({ ...receipt, ...change }, local), hash);
  assert.notEqual(financialReceiptHash(receipt, { ...local, priceVersionId: "other" }), hash);
});

test("read failures only expose a closed diagnostic and permission failures never count as zero receipts", () => {
  assert.equal(
    financialFailureCode(new StripeGatewayError("provider_unavailable", 403)),
    "read_access_denied",
  );
  assert.equal(
    financialFailureCode(new StripeGatewayError("payment_not_eligible")),
    "unsupported_invoice",
  );
  assert.equal(financialFailureCode(new Error("secret-provider-message")), "provider_unavailable");
});

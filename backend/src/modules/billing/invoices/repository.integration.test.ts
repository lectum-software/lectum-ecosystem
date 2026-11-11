import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const enabled = process.env.LECTUM_STRIPE_DB_TESTS === "true";

test("real isolated PostgreSQL scopes fiscal deduplication, claim and immutable receipt to Stripe account/mode", {
  skip: !enabled,
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { InvoiceRepository } = await import("./repository");
  const { invoiceReference } = await import("./contracts");
  const suffix = randomUUID().replaceAll("-", "");
  const accountId = `acct_${suffix}`;
  const otherAccountId = `acct_other${suffix}`;
  const invoiceId = `in_${suffix}`;
  const eventId = `evt_${suffix}`;
  const company = `fiscal-qa-${suffix}`;
  const repository = new InvoiceRepository();
  try {
    const input = { invoiceId, eventId, accountId, mode: "test" as const };
    await Promise.all([repository.enqueueStripe(input), repository.enqueueStripe(input)]);
    await repository.enqueueStripe({ ...input, accountId: otherAccountId });
    await repository.enqueueStripe({ ...input, mode: "live" });
    assert.equal(
      await prisma.billing_invoice_job.count({
        where: { account_id: { in: [accountId, otherAccountId] } },
      }),
      3,
    );
    const scope = { gateway: "stripe" as const, accountId, mode: "test" as const };
    assert.equal(await repository.claimJob([scope], new Date(), []), null);
    assert.equal(await repository.claimJob([scope], new Date(), ["unrelated-job"]), null);
    const scopedJob = await prisma.billing_invoice_job.findFirstOrThrow({
      where: { gateway: "stripe", account_id: accountId, mode: "test" },
    });
    const [a, b] = await Promise.all([
      repository.claimJob([scope], new Date(), [scopedJob.id]),
      repository.claimJob([scope]),
    ]);
    assert.equal([a, b].filter(Boolean).length, 1);
    const claimed = (a ?? b)!;
    assert.equal(claimed.account_id, accountId);
    assert.equal(claimed.mode, "test");
    assert.equal(claimed.provider_resource_id, invoiceId);
    assert.notEqual(claimed.resource_id, invoiceId);
    await repository.finishJob(
      claimed.id,
      claimed.lease_token,
      { completed_at: new Date(), last_error_code: null },
      eventId,
    );
    assert.equal(await repository.claimJob([scope]), null);
    const receipt = {
      gateway: "stripe",
      account_id: accountId,
      payment_id: invoiceId,
      mode: "test",
      user_id: `user-${suffix}`,
      subscription_id: `subscription-${suffix}`,
      company_id: company,
      amount_cents: 2990,
      currency: "BRL",
      paid_at: new Date(),
      reference: invoiceReference(company, invoiceId, "test", accountId),
      request_snapshot: { test_fixture: true },
    };
    const saved = await repository.record(receipt);
    assert.equal((await repository.record(receipt)).id, saved.id);
    await assert.rejects(repository.record({ ...receipt, account_id: otherAccountId }));
    assert.equal(
      await repository.claimInvoice(company, [{ ...scope, accountId: otherAccountId }]),
      null,
    );
    assert.equal(await repository.claimInvoice(company, [scope], new Date(), "test", []), null);
    assert.equal(
      await repository.claimInvoice(company, [scope], new Date(), "test", ["unrelated-invoice"]),
      null,
    );
    const owned = await repository.claimInvoice(company, [scope], new Date(), "test", [saved.id]);
    assert.equal(owned?.id, saved.id);
  } finally {
    await prisma.billing_invoice.deleteMany({ where: { company_id: company } });
    await prisma.billing_invoice_job.deleteMany({
      where: { account_id: { in: [accountId, otherAccountId] } },
    });
    await prisma.$disconnect();
  }
});

test("real PostgreSQL defers only new Stripe live issuance and preserves MP and issued documents", {
  skip: !enabled,
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { InvoiceRepository } = await import("./repository");
  const { invoiceReference } = await import("./contracts");
  const { getInvoiceConfig } = await import("./config");
  const { deferInvoiceIssuance } = await import("./worker");
  const suffix = randomUUID().replaceAll("-", "");
  const accountId = `acct_${suffix}`;
  const company = `fiscal-policy-${suffix}`;
  const repository = new InvoiceRepository();
  // The live-mode rows are isolated database policy fixtures, not remote invoices.
  // No process env is changed and this test never instantiates or calls a provider.
  const config = getInvoiceConfig({
    NODE_ENV: "production",
    BASE: "https://api.lectum.com.br",
    DATABASE_URL: "postgresql://unit.invalid/lectum",
    MERCADO_PAGO_ENV: "production",
    SENDNF_LIVE_ENABLED: "true",
    SENDNF_LIVE_ISSUANCE_ENABLED: "true",
    SENDNF_LIVE_AUTO_ENABLED: "true",
    SENDNF_FISCAL_SETTINGS_CONFIRMED: "true",
    SENDNF_API_KEY: "nt_live_unit_only",
    SENDNF_COMPANY_ID: company,
    SENDNF_SERVICE_DESCRIPTION: "Descricao fiscal de teste unitario",
    SENDNF_SERVICE_CODE: "010501",
    SENDNF_ISS_RATE: "201",
    SENDNF_PAYMENTS_FROM: "2026-01-01T00:00:00Z",
  })!;
  const scope = { gateway: "stripe" as const, accountId, mode: "live" as const };
  const receipt = {
    gateway: "stripe",
    account_id: accountId,
    payment_id: `in_${suffix}`,
    mode: "live",
    user_id: `user-${suffix}`,
    subscription_id: `subscription-${suffix}`,
    company_id: company,
    amount_cents: 2990,
    currency: "BRL",
    paid_at: new Date(),
    reference: invoiceReference(company, `in_${suffix}`, "live", accountId),
    request_snapshot: { isolated_policy_fixture: true },
  };
  try {
    const saved = await repository.record(receipt);
    const claimed = await repository.claimInvoice(company, [scope], new Date(), "live");
    assert.equal(claimed?.id, saved.id);
    assert.equal(await deferInvoiceIssuance(config, repository, claimed!), true);
    const deferred = await prisma.billing_invoice.findUniqueOrThrow({ where: { id: saved.id } });
    assert.equal(deferred.status, "awaiting_activation");
    assert.equal(deferred.document_id, null);
    assert.equal(deferred.lease_token, null);
    assert.equal(deferred.lease_until, null);
    assert.ok(deferred.next_attempt_at.getTime() > Date.now());
    assert.deepEqual(deferred.request_snapshot, receipt.request_snapshot);
    assert.equal(deferred.reference, receipt.reference);
    assert.equal((await repository.findOwned(saved.id, receipt.user_id))?.id, saved.id);

    const mp = await repository.record({
      ...receipt,
      gateway: "mercadopago",
      account_id: null,
      payment_id: `mp-${suffix}`,
      reference: invoiceReference(company, `mp-${suffix}`, "live"),
    });
    const mpClaim = await repository.claimInvoice(
      company,
      [{ gateway: "mercadopago", accountId: null, mode: "live" }],
      new Date(),
      "live",
    );
    assert.equal(mpClaim?.id, mp.id);
    const beforeMp = await prisma.billing_invoice.findUniqueOrThrow({ where: { id: mp.id } });
    assert.equal(await deferInvoiceIssuance(config, repository, mpClaim!), false);
    assert.deepEqual(
      await prisma.billing_invoice.findUniqueOrThrow({ where: { id: mp.id } }),
      beforeMp,
    );

    const issued = await repository.record({
      ...receipt,
      payment_id: `in_old${suffix}`,
      reference: invoiceReference(company, `in_old${suffix}`, "live", accountId),
      document_id: `local-policy-document-${suffix}`,
      status: "authorized",
    });
    const existing = await repository.claimInvoice(company, [scope], new Date(), "live");
    assert.equal(existing?.id, issued.id);
    const beforeExisting = await prisma.billing_invoice.findUniqueOrThrow({
      where: { id: issued.id },
    });
    assert.equal(await deferInvoiceIssuance(config, repository, existing!), false);
    assert.deepEqual(
      await prisma.billing_invoice.findUniqueOrThrow({ where: { id: issued.id } }),
      beforeExisting,
    );
    assert.equal(await prisma.billing_invoice.count({ where: { company_id: company } }), 3);
  } finally {
    await prisma.billing_invoice.deleteMany({ where: { company_id: company } });
    await prisma.$disconnect();
  }
});

test("real PostgreSQL preserves the paid fiscal job after 25 recipient waits and bounds only consecutive verification failures", {
  skip: !enabled,
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { InvoiceRepository } = await import("./repository");
  const { invoiceJobFailure } = await import("./diagnostics");
  const { InvoiceError, retryDate } = await import("./config");
  const { stripeFailure } = await import("../payment-gateway/stripe-error");
  const suffix = randomUUID().replaceAll("-", "");
  const accountId = `acct_${suffix}`;
  const input = {
    invoiceId: `in_${suffix}`,
    eventId: `evt_${suffix}`,
    accountId,
    mode: "test" as const,
  };
  const scope = { gateway: "stripe" as const, accountId, mode: "test" as const };
  const repository = new InvoiceRepository();
  let now = new Date(Date.now() + 1000);
  let jobId: string | undefined;
  try {
    await repository.enqueueStripe(input);
    const created = await prisma.billing_invoice_job.findFirstOrThrow({
      where: { account_id: accountId },
    });
    jobId = created.id;
    assert.equal(created.verification_failures, 0); // Expand migration's default for old writers.
    const step = async (error: unknown, paymentVerified: boolean) => {
      const job = await repository.claimJob([scope], now, [created.id]);
      assert.equal(job?.id, created.id);
      assert.ok(job);
      const failure = invoiceJobFailure(
        error,
        job.gateway,
        job.verification_failures,
        paymentVerified,
      );
      const next = retryDate(job.attempts, now.getTime());
      if (job.attempts === 26) {
        for (const [token, eventId] of [
          ["wrong-lease", job.event_id],
          [job.lease_token, "wrong-event"],
        ]) {
          await repository.finishJob(
            job.id,
            token,
            { last_error_code: "provider_unavailable", verification_failures: 9 },
            eventId,
          );
          const unchanged: typeof created = await prisma.billing_invoice_job.findUniqueOrThrow({
            where: { id: job.id },
          });
          assert.equal(unchanged.verification_failures, 0);
          assert.equal(unchanged.lease_token, job.lease_token);
          assert.equal(unchanged.completed_at, null);
        }
      }
      // Exercise the same persistence boundary as processJob; never execute a provider/worker.
      await repository.finishJob(
        job.id,
        job.lease_token,
        {
          ...(failure.terminal ? { completed_at: now } : { next_attempt_at: next }),
          last_error_code: failure.code,
          verification_failures: failure.verificationFailures,
        },
        job.event_id,
      );
      now = new Date(next.getTime() + 1);
      const stored = await prisma.billing_invoice_job.findUniqueOrThrow({
        where: { id: created.id },
      });
      assert.equal(stored.attempts, job.attempts);
      assert.equal(stored.lease_token, null);
      assert.equal(stored.lease_until, null);
      return stored;
    };
    for (let attempt = 1; attempt <= 25; attempt++) {
      const stored = await step(new InvoiceError("recipient_incomplete", true), true);
      assert.equal(stored.attempts, attempt);
      assert.equal(stored.verification_failures, 0);
      assert.equal(stored.completed_at, null);
    }
    for (const [index, failure] of [
      stripeFailure({ code: "ETIMEDOUT" }),
      stripeFailure({ statusCode: 503 }),
      stripeFailure({ statusCode: 429 }),
    ].entries()) {
      const stored = await step(failure, false);
      assert.equal(stored.attempts, 26 + index);
      assert.equal(stored.verification_failures, index + 1);
      assert.equal(stored.completed_at, null);
    }
    const recovered = await step(new InvoiceError("recipient_incomplete", true), true);
    assert.equal(recovered.attempts, 29);
    assert.equal(recovered.verification_failures, 0);
    for (let failureCount = 1; failureCount <= 10; failureCount++) {
      const stored = await step(stripeFailure({ code: "ETIMEDOUT" }), false);
      assert.equal(stored.attempts, 29 + failureCount);
      assert.equal(stored.verification_failures, failureCount);
      assert.equal(Boolean(stored.completed_at), failureCount === 10);
    }
    assert.equal(await repository.claimJob([scope], now, [created.id]), null);
    assert.equal(await prisma.billing_invoice_job.count({ where: { account_id: accountId } }), 1);
    assert.equal(await prisma.billing_invoice.count({ where: { account_id: accountId } }), 0);
    assert.equal(await prisma.billing_operation.count({ where: { account_id: accountId } }), 0);
    assert.equal(
      await prisma.billing_financial_receipt.count({ where: { account_id: accountId } }),
      0,
    );
  } finally {
    if (jobId) await prisma.billing_invoice_job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  }
});

test("real PostgreSQL does not reset verification budget on an event but persists a proven payment-stage transition under lease", {
  skip: !enabled,
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { InvoiceRepository } = await import("./repository");
  const { invoiceJobFailure, invoiceVerificationFailuresAfterPayment } = await import(
    "./diagnostics"
  );
  const { StripeInvoicePaymentError } = await import("../payment-gateway/stripe-invoice");
  const { stripeFailure } = await import("../payment-gateway/stripe-error");
  const suffix = randomUUID().replaceAll("-", "");
  const input = {
    invoiceId: `in_${suffix}`,
    eventId: `evt_${suffix}`,
    accountId: `acct_${suffix}`,
    mode: "test" as const,
  };
  const repository = new InvoiceRepository();
  const scope = { gateway: "stripe" as const, accountId: input.accountId, mode: "test" as const };
  let now = new Date(Date.now() + 1000);
  try {
    await repository.enqueueStripe(input);
    for (let count = 1; count <= 10; count++) {
      const job = await repository.claimJob([scope], now);
      assert.ok(job);
      const failure = invoiceJobFailure(
        new StripeInvoicePaymentError("awaiting_payment"),
        "stripe",
        job.verification_failures,
        false,
      );
      await repository.finishJob(
        job.id,
        job.lease_token,
        {
          ...(failure.terminal ? { completed_at: now } : { next_attempt_at: now }),
          last_error_code: failure.code,
          verification_failures: failure.verificationFailures,
        },
        job.event_id,
      );
      now = new Date(now.getTime() + 1);
    }
    assert.equal(await repository.claimJob([scope], now), null);
    await repository.enqueueStripe({ ...input, eventId: `evt_new${suffix}` });
    const reopened = await repository.claimJob([scope], now);
    assert.ok(reopened);
    assert.equal(reopened.attempts, 11);
    assert.equal(reopened.verification_failures, 10);
    assert.equal(reopened.last_error_code, "awaiting_payment");
    const failure = stripeFailure({ statusCode: 503 });
    assert.equal(invoiceJobFailure(failure, "stripe", 10, false).terminal, true);
    // The worker calls this only AFTER canonical eligibility; this is its persistence boundary,
    // not a fabricated remote payment and never an execution of the fiscal worker/provider.
    const verifiedBudget = invoiceVerificationFailuresAfterPayment(
      reopened.verification_failures,
      reopened.last_error_code,
    );
    const pending = invoiceJobFailure(failure, "stripe", verifiedBudget, false);
    assert.equal(pending.terminal, false);
    assert.equal(
      (await prisma.billing_invoice_job.findUniqueOrThrow({ where: { id: reopened.id } }))
        .verification_failures,
      10,
    );
    await repository.finishJob(
      reopened.id,
      reopened.lease_token,
      {
        next_attempt_at: now,
        last_error_code: pending.code,
        verification_failures: pending.verificationFailures,
      },
      reopened.event_id,
    );
    const resumed = await repository.claimJob([scope], now);
    assert.equal(resumed?.id, reopened.id);
    assert.equal(resumed?.verification_failures, 1);
    assert.equal(resumed?.completed_at, null);
    assert.equal(await prisma.billing_invoice.count({ where: { account_id: input.accountId } }), 0);
    assert.equal(
      await prisma.billing_operation.count({ where: { account_id: input.accountId } }),
      0,
    );
  } finally {
    await prisma.billing_invoice_job.deleteMany({ where: { account_id: input.accountId } });
    await prisma.$disconnect();
  }
});

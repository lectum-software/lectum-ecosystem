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

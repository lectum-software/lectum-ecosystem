import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { assertDisposableLocalDatabaseTarget } from "@/utils/local-database-safety";
import type { FiscalRecoveryArguments } from "./recovery-policy";

test("real PostgreSQL fiscal recovery audits once, preserves issued document and reopens a completed zero job on later payment event", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  assertDisposableLocalDatabaseTarget();
  assert.equal(new URL(process.env.DATABASE_URL ?? "").pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { applyVerifiedFiscalRecovery } = await import("./recovery");
  const { InvoiceRepository } = await import("./repository");
  const { invoiceReference } = await import("./contracts");
  const suffix = randomUUID().replaceAll("-", "");
  const tag = `fiscal-recovery-${suffix}`;
  const accountId = `acct_${suffix}`;
  const invoiceId = `in_${suffix}`;
  const companyId = `company-${suffix}`;
  let userId: string | undefined;
  let profileId: string | undefined;
  let planId: string | undefined;
  let adminId: string | undefined;
  try {
    const admin = await prisma.admin.create({
      data: { name: "Operador QA", email: `${tag}@example.invalid`, active: true, confirmed: true },
    });
    adminId = admin.id;
    const user = await prisma.user.create({
      data: { name: tag, email: `user-${tag}@example.invalid`, role: "psicologo", active: true },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    const plan = await prisma.subscription_plan.create({
      data: { slug: tag, name: tag, price_cents: 2990 },
    });
    planId = plan.id;
    const subscription = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        gateway: "stripe",
        source: "stripe",
        gateway_mode: "test",
        gateway_account_id: accountId,
        gateway_subscription_id: `sub_${suffix}`,
        contracted_amount_cents: 2990,
        contracted_currency: "BRL",
        status: "ativa",
      },
    });
    // Persistence-boundary fixture only: no remote payment or fiscal acceptance is inferred.
    const proof = {
      subscriptionId: subscription.id,
      subscriptionUpdatedAt: subscription.updatedAt,
      userId: user.id,
      companyId,
      amountCents: 2990,
    };
    const dry: FiscalRecoveryArguments = {
      invoiceId,
      accountId,
      mode: "test",
      actorAdminId: admin.id,
      expectedJobAttempts: null,
      expectedInvoiceAttempts: null,
      reason: "missing_fiscal_job",
      apply: false,
    };
    assert.equal((await applyVerifiedFiscalRecovery(dry, proof)).applied, false);
    assert.equal(await prisma.billing_invoice_job.count({ where: { account_id: accountId } }), 0);
    assert.equal(await prisma.admin_activity_log.count({ where: { admin_id: admin.id } }), 0);
    for (const patch of [
      { actorAdminId: "missing-admin" },
      { expectedJobAttempts: 0 },
      { accountId: "acct_other" },
      { mode: "live" as const },
    ])
      await assert.rejects(applyVerifiedFiscalRecovery({ ...dry, ...patch }, proof));
    const apply = { ...dry, apply: true, confirm: "test" as const };
    const outcomes = await Promise.allSettled([
      applyVerifiedFiscalRecovery(apply, proof),
      applyVerifiedFiscalRecovery(apply, proof),
    ]);
    assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(await prisma.admin_activity_log.count({ where: { admin_id: admin.id } }), 1);
    const repository = new InvoiceRepository();
    const scope = { gateway: "stripe" as const, accountId, mode: "test" as const };
    const job = await repository.claimJob([scope]);
    assert.ok(job);
    await repository.finishJob(
      job.id,
      job.lease_token,
      { completed_at: new Date(), last_error_code: "zero_invoice" },
      job.event_id,
    );
    assert.equal(await repository.claimJob([scope]), null);
    await repository.enqueueStripe({
      invoiceId,
      accountId,
      mode: "test",
      eventId: `evt_${suffix}`,
    });
    const reopened = await repository.claimJob([scope]);
    assert.equal(reopened?.id, job.id);
    assert.equal(reopened?.attempts, job.attempts + 1);
    await repository.finishJob(
      reopened!.id,
      reopened!.lease_token,
      { completed_at: new Date(), last_error_code: null },
      reopened!.event_id,
    );
    const snapshot = {
      company_id: companyId,
      reference: invoiceReference(companyId, invoiceId, "test", accountId),
      fixture: "immutable-contract-boundary",
    };
    const invoice = await prisma.billing_invoice.create({
      data: {
        gateway: "stripe",
        mode: "test",
        account_id: accountId,
        payment_id: invoiceId,
        subscription_id: subscription.id,
        user_id: user.id,
        company_id: companyId,
        amount_cents: 2990,
        paid_at: new Date(),
        reference: snapshot.reference,
        request_snapshot: snapshot,
        status: "rejected",
        document_id: `document-${suffix}`,
        attempts: 4,
        last_error_code: "cnc_missing_in_test",
      },
    });
    const recovery = {
      ...apply,
      expectedJobAttempts: reopened!.attempts,
      expectedInvoiceAttempts: 4,
      reason: "provider_recovered" as const,
    };
    await prisma.billing_invoice_job.update({
      where: { id: job.id },
      data: { verification_failures: 10 },
    });
    await prisma.admin.update({ where: { id: admin.id }, data: { need_reset: true } });
    await assert.rejects(applyVerifiedFiscalRecovery(recovery, proof));
    await prisma.admin.update({ where: { id: admin.id }, data: { need_reset: false } });
    await prisma.billing_invoice.update({
      where: { id: invoice.id },
      data: { lease_token: "held", lease_until: new Date(Date.now() + 60_000) },
    });
    await assert.rejects(applyVerifiedFiscalRecovery(recovery, proof));
    await prisma.billing_invoice.update({
      where: { id: invoice.id },
      data: { lease_token: null, lease_until: null },
    });
    assert.equal((await applyVerifiedFiscalRecovery(recovery, proof)).document_preserved, true);
    assert.equal(
      (await prisma.billing_invoice_job.findUniqueOrThrow({ where: { id: job.id } }))
        .verification_failures,
      0,
    );
    const after = await prisma.billing_invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    assert.equal(after.document_id, invoice.document_id);
    assert.equal(after.reference, invoice.reference);
    assert.deepEqual(after.request_snapshot, invoice.request_snapshot);
    assert.equal(after.attempts, invoice.attempts);
    assert.equal(after.status, "processing");
    await assert.rejects(applyVerifiedFiscalRecovery(recovery, proof));
    assert.equal(await prisma.admin_activity_log.count({ where: { admin_id: admin.id } }), 2);
    assert.equal(await prisma.billing_invoice.count({ where: { account_id: accountId } }), 1);
  } finally {
    await prisma.billing_invoice.deleteMany({ where: { account_id: accountId } });
    await prisma.billing_invoice_job.deleteMany({ where: { account_id: accountId } });
    if (adminId) {
      await prisma.admin_activity_log.deleteMany({ where: { admin_id: adminId } });
      await prisma.admin.delete({ where: { id: adminId } });
    }
    if (profileId) {
      await prisma.professional_subscription.deleteMany({ where: { psychologist_id: profileId } });
      await prisma.psychologist_profile.delete({ where: { id: profileId } });
    }
    if (planId) await prisma.subscription_plan.delete({ where: { id: planId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { StripeBalanceFact } from "../../payment-gateway/stripe-balance-types";

test("isolated PG fee repository fixtures preserve core facts, enforce leases/hash/dedup and update canonical availability both directions", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  assert.equal(process.env.STRIPE_SECRET_KEY, "");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { StripeFeeObservationRepository } = await import("./repository");
  const { FeeObservationError } = await import("./policy");
  const { storedFinancialReceiptHash } = await import("../financial-ledger/policy");
  const { readAdminFinanceStripeLedger } = await import(
    "@/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceStripeLedgerRepository"
  );
  const { projectFinanceStripeLedger } = await import(
    "@/modules/api/admin/private/finance/dashboard/use-cases/services/stripe-ledger-projection"
  );
  const { projectStripeFees } = await import(
    "@/modules/api/admin/private/finance/fees/use-cases/projection"
  );
  const tag = randomUUID().replaceAll("-", "");
  const account = `acct_feepg${tag}`;
  const prior = process.env.STRIPE_ACCOUNT_ID;
  process.env.STRIPE_ACCOUNT_ID = account;
  let actorId: string | undefined,
    userId: string | undefined,
    profileId: string | undefined,
    planId: string | undefined,
    versionId: string | undefined,
    subscriptionId: string | undefined,
    ownedReceiptId: string | undefined;
  try {
    const now = new Date(),
      paid = new Date(now.getTime() - 10000),
      end = new Date(now.getTime() + 86400000);
    const actor = await prisma.admin.create({
      data: {
        name: `Local fee repository ${tag}`,
        email: `fee-pg-${tag}@example.invalid`,
        confirmed: true,
      },
    });
    actorId = actor.id;
    const user = await prisma.user.create({
      data: {
        name: `Local fee fixture ${tag}`,
        email: `fee-user-${tag}@example.invalid`,
        role: "psicologo",
      },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    const plan = await prisma.subscription_plan.create({
      data: {
        slug: `fee-pg-${tag}`,
        name: "Disposable fee repository fixture",
        price_cents: 9990,
        active: true,
        interval: "month",
      },
    });
    planId = plan.id;
    const version = await prisma.billing_price_version.create({
      data: {
        plan_id: plan.id,
        gateway: "stripe",
        mode: "test",
        account_id: account,
        external_product_id: `prod_${tag}`,
        external_price_id: `price_${tag}`,
        amount_cents: 2990,
        currency: "BRL",
        interval: "month",
      },
    });
    versionId = version.id;
    await prisma.billing_customer.create({
      data: {
        user_id: user.id,
        gateway: "stripe",
        mode: "test",
        account_id: account,
        external_customer_id: `cus_${tag}`,
      },
    });
    const subscription = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        price_version_id: version.id,
        gateway: "stripe",
        source: "stripe",
        gateway_mode: "test",
        gateway_account_id: account,
        gateway_subscription_id: `sub_${tag}`,
        status: "cancelada",
        contracted_amount_cents: 2990,
        contracted_currency: "BRL",
        contracted_interval: "month",
        contracted_interval_count: 1,
      },
    });
    subscriptionId = subscription.id;
    // Disposable repository fixture only, not evidence of a remote payment or settlement.
    const receipt = await prisma.billing_financial_receipt.create({
      data: {
        id: `fee-pg-${tag}`,
        gateway: "stripe",
        mode: "test",
        account_id: account,
        subscription_id: subscription.id,
        psychologist_id: profile.id,
        provider_subscription_id: `sub_${tag}`,
        invoice_id: `in_${tag}`,
        invoice_payment_id: `inpay_${tag}`,
        payment_intent_id: `pi_${tag}`,
        charge_id: `ch_${tag}`,
        price_id: `price_${tag}`,
        price_version_id: version.id,
        currency: "BRL",
        amount_paid_cents: 2990,
        paid_at: paid,
        invoice_paid_at: paid,
        period_start: paid,
        period_end: end,
        immutable_hash: "pending",
        current_state: "refunded",
        refunded_cents: 2990,
        observed_at: now,
      },
    });
    ownedReceiptId = receipt.id;
    await prisma.billing_financial_receipt.update({
      where: { id: receipt.id },
      data: { immutable_hash: storedFinancialReceiptHash(receipt) },
    });
    assert.equal(
      await prisma.billing_stripe_balance_fact.count({ where: { receipt_id: receipt.id } }),
      0,
    );
    assert.equal(
      await prisma.billing_stripe_fee_observation.count({ where: { receipt_id: receipt.id } }),
      0,
      "never overwrite a pre-existing checkpoint",
    );
    const coreBefore = await prisma.billing_financial_receipt.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    const target = {
      accountId: account,
      mode: "test" as const,
      receiptId: receipt.id,
      receiptHash: coreBefore.immutable_hash,
      chargeId: receipt.charge_id,
      paymentIntentId: receipt.payment_intent_id,
      customerId: `cus_${tag}`,
      amountCents: 2990,
    };
    const fact: StripeBalanceFact = {
      providerTransactionId: `txn_${tag}`,
      kind: "capture" as const,
      sourceId: target.chargeId,
      chargeId: target.chargeId,
      currency: "BRL" as const,
      amountCents: 2990n,
      feeCents: 158n,
      netCents: 2832n,
      providerCreatedAt: paid,
      status: "available" as const,
      availableOn: paid,
    };
    const page = (facts: StripeBalanceFact[] = []) => ({
      facts,
      nextCursor: null,
      hasMore: false,
      gap: false,
      requests: 2,
    });
    const repository = new StripeFeeObservationRepository();
    const claims = await Promise.all([
      repository.claim(target, actor.id),
      repository.claim(target, actor.id),
    ]);
    assert.equal(claims.filter((row) => row.claim).length, 1);
    const first = claims.find((row) => row.claim)!.claim!;
    const captured = await repository.commit(first, target, actor.id, page([fact]));
    assert.equal(captured.stage, "refunds");
    assert.equal(captured.capture_verified, true);
    await assert.rejects(
      repository.commit(first, target, actor.id, page([fact])),
      (cause: unknown) =>
        cause instanceof FeeObservationError && cause.code === "lease_unavailable",
    );
    const refunds = (await repository.claim(target, actor.id)).claim!;
    await repository.commit(refunds, target, actor.id, page());
    const dispute = (await repository.claim(target, actor.id)).claim!;
    const denied = await repository.fail(dispute, actor.id, "read_access_denied");
    assert.equal(denied.state, "partial");
    assert.equal(denied.refunds_scanned, true);
    assert.equal(denied.disputes_scanned, false);
    const ledger = projectFinanceStripeLedger(
      await readAdminFinanceStripeLedger([subscription.id]),
    );
    assert.equal(ledger.invalid, false);
    const view = projectStripeFees(
      {
        now: new Date(),
        mode: "test",
        receipts: ledger.valid,
        facts: await prisma.billing_stripe_balance_fact.findMany({
          where: { receipt_id: receipt.id },
        }),
        observations: [denied],
      },
      { page: 1, limit: 20 },
    );
    assert.equal(view.items[0].capture?.fee_cents, 158);
    assert.equal(view.items[0].coverage.state, "partial");
    assert.equal(view.items[0].coverage.last_error_code, "read_access_denied");
    const resume = (await repository.claim(target, actor.id)).claim!;
    const done = await repository.commit(resume, target, actor.id, page());
    assert.equal(done.state, "observed");
    const restarted = (await repository.claim(target, actor.id)).claim!;
    assert.equal(restarted.stage, "capture");
    await repository.commit(
      restarted,
      target,
      actor.id,
      page([{ ...fact, status: "pending", availableOn: end }]),
    );
    const stored = await prisma.billing_stripe_balance_fact.findFirstOrThrow({
      where: { receipt_id: receipt.id },
    });
    assert.equal(stored.status, "pending");
    assert.equal(stored.available_on.toISOString(), end.toISOString());
    assert.equal(
      await prisma.billing_stripe_balance_fact.count({ where: { receipt_id: receipt.id } }),
      1,
    );
    for (let index = 0; index < 2; index++) {
      const next = (await repository.claim(target, actor.id)).claim!;
      await repository.commit(next, target, actor.id, page());
    }
    const conflictClaim = (await repository.claim(target, actor.id)).claim!;
    await assert.rejects(
      repository.commit(
        conflictClaim,
        target,
        actor.id,
        page([{ ...fact, feeCents: 159n, netCents: 2831n }]),
      ),
      (cause: unknown) => cause instanceof FeeObservationError && cause.code === "fact_conflict",
    );
    const conflict = await repository.fail(conflictClaim, actor.id, "fact_conflict");
    assert.equal(conflict.state, "conflict");
    assert.equal((await repository.claim(target, actor.id)).claim, null);
    assert.equal(
      (
        await prisma.billing_stripe_balance_fact.findFirstOrThrow({
          where: { receipt_id: receipt.id },
        })
      ).fee_cents,
      158n,
    );
    assert.deepEqual(
      await prisma.billing_financial_receipt.findUniqueOrThrow({ where: { id: receipt.id } }),
      coreBefore,
    );
    const audits = JSON.stringify(
      await prisma.admin_activity_log.findMany({
        where: { admin_id: actor.id, target_type: "billing_stripe_fee_observation" },
      }),
    );
    for (const external of [target.chargeId, target.customerId, fact.providerTransactionId])
      assert.equal(audits.includes(external), false);
  } finally {
    if (prior === undefined) delete process.env.STRIPE_ACCOUNT_ID;
    else process.env.STRIPE_ACCOUNT_ID = prior;
    if (ownedReceiptId) {
      const observations = await prisma.billing_stripe_fee_observation.findMany({
        where: { receipt_id: ownedReceiptId, account_id: account },
        select: { id: true },
      });
      if (actorId)
        await prisma.admin_activity_log.deleteMany({
          where: {
            admin_id: actorId,
            target_type: "billing_stripe_fee_observation",
            target_id: { in: observations.map((row) => row.id) },
          },
        });
      await prisma.billing_stripe_balance_fact.deleteMany({
        where: { receipt_id: ownedReceiptId, account_id: account },
      });
      await prisma.billing_stripe_fee_observation.deleteMany({
        where: { receipt_id: ownedReceiptId, account_id: account },
      });
      await prisma.billing_financial_receipt.delete({ where: { id: ownedReceiptId } });
    }
    if (subscriptionId) {
      await prisma.professional_subscription.delete({ where: { id: subscriptionId } });
      await prisma.professional_subscription_history.deleteMany({
        where: { subscription_id: subscriptionId },
      });
    }
    if (userId)
      await prisma.billing_customer.deleteMany({ where: { user_id: userId, account_id: account } });
    if (versionId) await prisma.billing_price_version.delete({ where: { id: versionId } });
    if (profileId) await prisma.psychologist_profile.delete({ where: { id: profileId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (planId) {
      await prisma.subscription_plan.delete({ where: { id: planId } });
      await prisma.subscription_plan_history.deleteMany({ where: { plan_id: planId } });
    }
    if (actorId) await prisma.admin.delete({ where: { id: actorId } });
    await prisma.$disconnect();
  }
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("isolated PostgreSQL finance snapshot reads versioned Stripe facts without changing rows, survives catalog archive and pagination ties", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { AdminFinanceDashboardRepository } = await import("./AdminFinanceDashboardRepository");
  const {
    readAdminFinanceStripeLedger,
    assertFinanceLedgerSize,
    FinanceLedgerFilterRequiredError,
  } = await import("./AdminFinanceStripeLedgerRepository");
  const { projectFinanceStripeLedger, stripeEntitlementsAt, stripeSubscriptionInsight } =
    await import("../use-cases/services/stripe-ledger-projection");
  const { mapSubscription } = await import("../use-cases/services/subscriptions");
  const { storedFinancialReceiptHash } = await import(
    "@/modules/billing/stripe/financial-ledger/policy"
  );
  const tag = randomUUID().replaceAll("-", "");
  const account = `acct_local${tag}`;
  const oldAccount = process.env.STRIPE_ACCOUNT_ID;
  process.env.STRIPE_ACCOUNT_ID = account;
  let userId: string | undefined;
  let profileId: string | undefined;
  let planId: string | undefined;
  const ids: string[] = [];
  let priceId: string | undefined;
  try {
    const now = new Date(),
      start = new Date(now.getTime() - 86_400_000),
      end = new Date(now.getTime() + 29 * 86_400_000);
    const user = await prisma.user.create({
      data: {
        name: `Local finance ${tag}`,
        email: `finance-${tag}@example.invalid`,
        role: "psicologo",
      },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    const plan = await prisma.subscription_plan.create({
      data: {
        slug: `local-${tag}`,
        name: `Local ${tag}`,
        price_cents: 9990,
        interval: "month",
        active: true,
      },
    });
    planId = plan.id;
    const price = await prisma.billing_price_version.create({
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
    priceId = price.id;
    for (let i = 0; i < 2; i++) {
      const row = await prisma.professional_subscription.create({
        data: {
          psychologist_id: profile.id,
          plan_id: plan.id,
          price_version_id: price.id,
          gateway: "stripe",
          source: "stripe",
          gateway_account_id: account,
          gateway_mode: "test",
          gateway_subscription_id: `sub_${tag}${i}`,
          status: i === 0 ? "ativa" : "cancelada",
          current_period_end: end,
          createdAt: start,
          updatedAt: start,
          contracted_amount_cents: 2990,
          contracted_currency: "BRL",
          contracted_interval: "month",
          contracted_interval_count: 1,
        },
      });
      ids.push(row.id);
    }
    const receipt = await prisma.billing_financial_receipt.create({
      data: {
        gateway: "stripe",
        mode: "test",
        account_id: account,
        subscription_id: ids[0],
        psychologist_id: profile.id,
        provider_subscription_id: `sub_${tag}0`,
        invoice_id: `in_${tag}`,
        invoice_payment_id: `inpay_${tag}`,
        payment_intent_id: `pi_${tag}`,
        charge_id: `ch_${tag}`,
        price_id: `price_${tag}`,
        price_version_id: price.id,
        currency: "BRL",
        amount_paid_cents: 2990,
        paid_at: now,
        invoice_paid_at: now,
        period_start: now,
        period_end: end,
        immutable_hash: "pending",
        current_state: "paid",
        observed_at: now,
      },
    });
    await prisma.billing_financial_receipt.update({
      where: { id: receipt.id },
      data: { immutable_hash: storedFinancialReceiptHash(receipt) },
    });
    const repository = new AdminFinanceDashboardRepository();
    const range = { start, end };
    const a = await repository.listPaidSubscriptionsForRelation(
      range,
      { take: 1 },
      { q: user.email },
    );
    const b = await repository.listPaidSubscriptionsForRelation(
      range,
      { take: 1, skip: 1 },
      { q: user.email },
    );
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
    assert.notEqual(a[0].id, b[0].id);
    assert.equal(a[0].id, [...ids].sort().reverse()[0]);
    const before = await prisma.billing_financial_receipt.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    const ledger = projectFinanceStripeLedger(await readAdminFinanceStripeLedger(ids));
    assert.equal(ledger.invalid, false);
    assert.equal(ledger.valid.length, 1);
    assert.equal(stripeEntitlementsAt(ledger, ledger.now).mrrCents, 2990);
    assert.equal(
      stripeSubscriptionInsight(mapSubscription(ledger.contracts[0]), ledger).payment_health
        .success_rate_percent,
      null,
    );
    const after = await prisma.billing_financial_receipt.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    assert.deepEqual(after, before);
    await prisma.subscription_plan.update({
      where: { id: plan.id },
      data: { active: false, deleted: true, price_cents: 49999 },
    });
    await prisma.professional_subscription.update({
      where: { id: ids[0] },
      data: { deleted: true },
    });
    const archived = projectFinanceStripeLedger(await readAdminFinanceStripeLedger(ids));
    assert.equal(archived.valid.length, 1);
    assert.equal(archived.valid[0].row.amount_paid_cents, 2990);
    assert.equal(stripeEntitlementsAt(archived, archived.now).mrrCents, 0);
    assert.throws(() => assertFinanceLedgerSize(10001), FinanceLedgerFilterRequiredError);
    assert.doesNotThrow(() => assertFinanceLedgerSize(10000));
  } finally {
    if (oldAccount === undefined) delete process.env.STRIPE_ACCOUNT_ID;
    else process.env.STRIPE_ACCOUNT_ID = oldAccount;
    if (ids.length) {
      await prisma.billing_financial_receipt.deleteMany({
        where: { subscription_id: { in: ids } },
      });
      await prisma.professional_subscription.deleteMany({ where: { id: { in: ids } } });
      await prisma.professional_subscription_history.deleteMany({
        where: { subscription_id: { in: ids } },
      });
    }
    if (priceId) await prisma.billing_price_version.delete({ where: { id: priceId } });
    if (profileId) await prisma.psychologist_profile.delete({ where: { id: profileId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (planId) {
      await prisma.subscription_plan.delete({ where: { id: planId } });
      await prisma.subscription_plan_history.deleteMany({ where: { plan_id: planId } });
    }
    await prisma.$disconnect();
  }
});

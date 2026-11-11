import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("owned history survives cancellation/free plan with keyset ordering and excludes cross-scope or invalid receipts", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { SubscriptionRepository } = await import(
    "@/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository"
  );
  const { storedFinancialReceiptHash } = await import("./financial-ledger/policy");
  const tag = randomUUID().replaceAll("-", "");
  const account = `acct_history${tag}`;
  const oldAccount = process.env.STRIPE_ACCOUNT_ID;
  const oldMode = process.env.STRIPE_ENV;
  process.env.STRIPE_ENV = "test";
  process.env.STRIPE_ACCOUNT_ID = account;
  const users: string[] = [];
  const profiles: string[] = [];
  const subscriptions: string[] = [];
  try {
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", deleted: false },
    });
    const free = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "gratuito", deleted: false },
    });
    for (const name of ["owner", "other"]) {
      const user = await prisma.user.create({
        data: {
          name: "Local history fixture",
          email: `${name}-${tag}@example.invalid`,
          role: "psicologo",
        },
      });
      users.push(user.id);
      const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
      profiles.push(profile.id);
      const contract = await prisma.professional_subscription.create({
        data: {
          psychologist_id: profile.id,
          plan_id: plan.id,
          source: "stripe",
          gateway: "stripe",
          gateway_mode: "test",
          gateway_account_id: account,
          gateway_subscription_id: `sub_history${name}${tag}`,
          status: "cancelada",
        },
      });
      subscriptions.push(contract.id);
      await prisma.professional_subscription.create({
        data: {
          psychologist_id: profile.id,
          plan_id: free.id,
          source: "free_signup",
          status: "ativa",
        },
      });
    }
    // Repository-only fixtures test access control/order, not payment execution or financial validation.
    const now = new Date();
    for (let i = 0; i < 65; i++) {
      const row = await prisma.billing_financial_receipt.create({
        data: {
          gateway: "stripe",
          mode: "test",
          account_id: account,
          subscription_id: subscriptions[0],
          psychologist_id: profiles[0],
          provider_subscription_id: `sub_historyowner${tag}`,
          invoice_id: `in_hist${tag}${i}`,
          invoice_payment_id: `inpay_hist${tag}${i}`,
          payment_intent_id: `pi_hist${tag}${i}`,
          charge_id: `ch_hist${tag}${i}`,
          price_id: `price_hist${tag}`,
          currency: "BRL",
          amount_paid_cents: 2990,
          paid_at: new Date(now.getTime() - (i + 1) * 1000),
          invoice_paid_at: new Date(now.getTime() - 1000),
          period_start: new Date(now.getTime() - 1000),
          period_end: new Date(now.getTime() + 1000),
          immutable_hash: "unverified",
          current_state: "paid",
          observed_at: now,
        },
      });
      await prisma.billing_financial_receipt.update({
        where: { id: row.id },
        data: { immutable_hash: storedFinancialReceiptHash(row) },
      });
    }
    const baseline = await prisma.billing_financial_receipt.findFirstOrThrow({
      where: { subscription_id: subscriptions[0] },
    });
    const { id: _id, created_at: _created, updated_at: _updated, ...base } = baseline;
    for (const [label, change] of Object.entries({
      other_owner: {
        psychologist_id: profiles[1],
        subscription_id: subscriptions[1],
        provider_subscription_id: `sub_historyother${tag}`,
      },
      wrong_owner: { psychologist_id: profiles[1] },
      wrong_account: { account_id: `${account}wrong` },
      wrong_mode: { mode: "live" },
      wrong_link: { provider_subscription_id: "sub_wrong" },
      tampered: { immutable_hash: "invalid" },
      future: { paid_at: new Date(now.getTime() + 60_000) },
    })) {
      const row = await prisma.billing_financial_receipt.create({
        data: {
          ...base,
          ...change,
          invoice_id: `in_hist${tag}${label}`,
          invoice_payment_id: `inpay_hist${tag}${label}`,
        },
      });
      if (label !== "tampered")
        await prisma.billing_financial_receipt.update({
          where: { id: row.id },
          data: { immutable_hash: storedFinancialReceiptHash(row) },
        });
    }
    const repo = new SubscriptionRepository();
    const rows = await repo.showOwnedPaymentHistory(profiles[0]);
    assert.equal(rows.length, 65);
    assert.equal(new Set(rows.map((item) => item.payment_id)).size, 65);
    assert.ok(
      rows.every(
        (item) =>
          item.subscription_id === subscriptions[0] &&
          item.mode === "test" &&
          item.status === "pago",
      ),
    );
    assert.ok(rows.every((item, i) => i === 0 || rows[i - 1].occurred_at! >= item.occurred_at!));
    assert.deepEqual(
      (await repo.showOwnedPaymentHistory(profiles[0])).map((row) => row.id),
      rows.map((row) => row.id),
    );
    assert.equal((await repo.showOwnedPaymentHistory(profiles[1])).length, 1);
    assert.deepEqual(await repo.showOwnedPaymentHistory(`absent${tag}`), []);
    assert.equal((await repo.showSubscription(profiles[0]))?.plan?.slug, "gratuito");
    assert.equal(await prisma.billing_operation.count({ where: { user_id: { in: users } } }), 0);
  } finally {
    if (oldAccount === undefined) delete process.env.STRIPE_ACCOUNT_ID;
    else process.env.STRIPE_ACCOUNT_ID = oldAccount;
    if (oldMode === undefined) delete process.env.STRIPE_ENV;
    else process.env.STRIPE_ENV = oldMode;
    await prisma.billing_financial_receipt.deleteMany({
      where: { account_id: { startsWith: account } },
    });
    await prisma.professional_subscription.deleteMany({
      where: { psychologist_id: { in: profiles } },
    });
    await prisma.psychologist_profile.deleteMany({ where: { id: { in: profiles } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});

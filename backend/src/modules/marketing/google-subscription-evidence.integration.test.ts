import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("Google subscription proof is owner-scoped, requires verified payment and rejects changed evidence", {
  skip: process.env.LECTUM_GOOGLE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55449");
  assert.equal(url.pathname, "/lectum_google_test");
  assert.notEqual(process.env.META_CAPI_ENABLED, "true");
  const { default: db } = await import("@/infra/database/prisma");
  const { financeReceipt } = await import(
    "@/modules/api/admin/private/finance/dashboard/use-cases/services/stripe-ledger-fixtures"
  );
  const { recordStripeSubscribe, SUBSCRIBE_RECORD_GATEWAY } = await import("./stripe-subscribe");
  const { googleSubscriptionEvidence } = await import("./google-subscription-evidence");
  const tag = randomUUID();
  const scope = { gateway: "stripe", mode: "live", account_id: `acct_${tag}` };
  const user = await db.user.create({
    data: { name: "Disposable Google test", email: `${tag}@example.invalid`, role: "psicologo" },
  });
  const profile = await db.psychologist_profile.create({ data: { user_id: user.id } });
  const plan = await db.subscription_plan.create({
    data: { slug: tag, name: tag, price_cents: 2990 },
  });
  const subscription = await db.professional_subscription.create({
    data: {
      psychologist_id: profile.id,
      plan_id: plan.id,
      source: "stripe",
      gateway: "stripe",
      gateway_mode: "live",
      gateway_account_id: scope.account_id,
      gateway_subscription_id: `sub_${tag}`,
      contracted_amount_cents: 2990,
    },
  });
  try {
    const paidAt = new Date(Date.now() - 1000);
    const receipt = financeReceipt({
      id: tag,
      ...scope,
      subscription_id: subscription.id,
      psychologist_id: profile.id,
      provider_subscription_id: `sub_${tag}`,
      invoice_id: `in_${tag}`,
      invoice_payment_id: `inpay_${tag}`,
      payment_intent_id: `pi_${tag}`,
      paid_at: paidAt,
      invoice_paid_at: paidAt,
    });
    await db.billing_financial_receipt.create({ data: receipt });
    const operation = await db.billing_operation.create({
      data: {
        ...scope,
        user_id: user.id,
        psychologist_id: profile.id,
        subscription_id: subscription.id,
        kind: "checkout",
        intent: "subscription",
        intent_kind: "payment",
        request_key: tag,
        provider_subscription_id: `sub_${tag}`,
        provider_intent_id: `pi_${tag}`,
      },
    });
    assert.equal(await googleSubscriptionEvidence(user.id, operation.id), null);
    await db.billing_financial_reconciliation.create({
      data: {
        ...scope,
        subscription_id: subscription.id,
        psychologist_id: profile.id,
        provider_subscription_id: `sub_${tag}`,
        state: "complete",
        requested_revision: 1,
        processed_revision: 1,
        receipts_complete: true,
        covered_from: new Date(paidAt.getTime() - 1000),
        covered_through: new Date(),
      },
    });
    const event = await db.billing_gateway_event.create({
      data: {
        ...scope,
        external_id: `evt_${tag}`,
        resource_id: receipt.invoice_id,
        type: "invoice.paid",
        state: "complete",
        gateway_created_at: paidAt,
      },
    });
    assert.equal(
      await recordStripeSubscribe(subscription.id, { mode: "live", accountId: scope.account_id }),
      "recorded",
    );
    const proof = await googleSubscriptionEvidence(user.id, operation.id);
    assert.ok(proof);
    assert.deepEqual(Object.keys(proof).sort(), ["event_id", "paid_at"]);
    assert.equal(proof.paid_at, paidAt.toISOString());
    assert.equal(await googleSubscriptionEvidence("another-user", operation.id), null);
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
    for (const change of [
      { refunded_cents: 1 },
      { dispute_status: "open" },
      { amount_paid_cents: 3000 },
    ]) {
      await db.billing_financial_receipt.update({ where: { id: receipt.id }, data: change });
      assert.equal(await googleSubscriptionEvidence(user.id, operation.id), null);
      await db.billing_financial_receipt.update({
        where: { id: receipt.id },
        data: { refunded_cents: 0, dispute_status: "none", amount_paid_cents: 2990 },
      });
    }
    await db.billing_gateway_event.update({ where: { id: event.id }, data: { state: "pending" } });
    assert.equal(await googleSubscriptionEvidence(user.id, operation.id), null);
    await db.billing_gateway_event.update({ where: { id: event.id }, data: { state: "complete" } });
    assert.deepEqual(await googleSubscriptionEvidence(user.id, operation.id), proof);
    await db.billing_operation.update({
      where: { id: operation.id },
      data: { provider_intent_id: "pi_other" },
    });
    assert.equal(await googleSubscriptionEvidence(user.id, operation.id), null);
  } finally {
    await db.payment_event.deleteMany({
      where: { gateway: SUBSCRIBE_RECORD_GATEWAY, external_id: profile.id },
    });
    await db.billing_gateway_event.deleteMany({ where: scope });
    await db.billing_operation.deleteMany({ where: scope });
    await db.billing_financial_receipt.deleteMany({ where: scope });
    await db.billing_financial_reconciliation.deleteMany({ where: scope });
    await db.professional_subscription.delete({ where: { id: subscription.id } });
    await db.psychologist_profile.delete({ where: { id: profile.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.subscription_plan.delete({ where: { id: plan.id } });
    await db.$disconnect();
  }
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { StripeFinancialReceipt } from "../../payment-gateway/stripe-financial-types";

test("real PostgreSQL financial ledger preserves immutable capture, exact original PI, coverage CAS and independent history", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { FinancialLedgerRepository } = await import("./repository");
  const { financialReceiptHash } = await import("./policy");
  const { StripeBillingRepository } = await import("../repository");
  const suffix = randomUUID().replaceAll("-", "");
  const tag = `ledger-qa-${suffix}`;
  const identity = { accountId: `acct_${suffix}`, mode: "test" as const };
  const providerId = `sub_${suffix}`;
  let userId: string | undefined;
  let profileId: string | undefined;
  let planId: string | undefined;
  let priceId: string | undefined;
  try {
    const user = await prisma.user.create({
      data: {
        name: tag,
        email: `${tag}@example.invalid`,
        role: "psicologo",
        active: false,
        deleted: true,
      },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({
      data: { user_id: user.id, deleted: true },
    });
    profileId = profile.id;
    const plan = await prisma.subscription_plan.create({
      data: { slug: tag, name: tag, price_cents: 9990 },
    });
    planId = plan.id;
    const price = await prisma.billing_price_version.create({
      data: {
        plan_id: plan.id,
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        external_price_id: `price_${suffix}`,
        external_product_id: `prod_${suffix}`,
        amount_cents: 2990,
        currency: "BRL",
        interval: "month",
        interval_count: 1,
      },
    });
    priceId = price.id;
    const customer = await prisma.billing_customer.create({
      data: {
        user_id: user.id,
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        external_customer_id: `cus_${suffix}`,
        state: "ready",
      },
    });
    const subscription = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        gateway: "stripe",
        source: "stripe",
        gateway_mode: identity.mode,
        gateway_account_id: identity.accountId,
        price_version_id: price.id,
        contracted_amount_cents: 2990,
        contracted_currency: "BRL",
        contracted_interval: "month",
        contracted_interval_count: 1,
        status: "inativa",
      },
    });
    const operation = await prisma.billing_operation.create({
      data: {
        user_id: user.id,
        psychologist_id: profile.id,
        subscription_id: subscription.id,
        customer_id: customer.id,
        price_version_id: price.id,
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        kind: "checkout",
        intent: "subscription",
        intent_kind: "payment",
        state: "processing",
        request_key: randomUUID(),
        provider_subscription_id: providerId,
        provider_intent_id: `pi_${suffix}`,
      },
    });
    const repository = new FinancialLedgerRepository();
    assert.equal(
      await repository.enqueueReference(providerId, identity, "evt_first"),
      false,
      "missing local binding must leave entitlement recovery possible",
    );
    assert.equal(
      await prisma.billing_financial_reconciliation.count({
        where: { account_id: identity.accountId },
      }),
      0,
    );
    assert.equal(
      (await new StripeBillingRepository().bindSubscription(operation, providerId)).count,
      1,
    );
    assert.equal(
      await repository.enqueueReference(providerId, identity, "evt_first"),
      true,
      "history queues despite deleted/inactive owner",
    );
    const target = await repository.target(subscription.id, identity);
    let row = await repository.request(target, identity);
    const sameEvent = await repository.request(target, identity, { eventId: "evt_first" });
    assert.equal(sameEvent.requested_revision, row.requested_revision);
    assert.equal(await repository.originalCheckoutReceipt(operation, providerId), null);
    const [a, b] = await Promise.all([repository.claim(row), repository.claim(row)]);
    assert.equal([a, b].filter(Boolean).length, 1);
    const claim = (a ?? b)!;
    const paidAt = new Date(Date.now() - 60 * 86_400_000);
    // Match the real retry gap without tying this opt-in test to a fixed wall-clock date.
    const invoicePaidAt = new Date(paidAt.getTime() - (1793703198 - 1793693713) * 1_000);
    const receipt: StripeFinancialReceipt = {
      ...identity,
      ...target.provider,
      invoiceId: `in_${suffix}`,
      invoicePaymentId: `inpay_${suffix}`,
      paymentIntentId: operation.provider_intent_id!,
      chargeId: `ch_${suffix}`,
      currency: "BRL",
      paidAt,
      invoicePaidAt,
      periodStart: paidAt,
      periodEnd: new Date(paidAt.getTime() + 30 * 86_400_000),
      refundedCents: 0,
      currentState: "paid",
      disputeStatus: "none",
    };
    const page = {
      receipts: [receipt],
      invoiceCount: 1,
      excludedCount: 0,
      nextCursor: "in_next",
      hasMore: true,
      coveredFrom: paidAt,
      observedAt: new Date(),
    };
    row = await repository.commitPage(claim, target, page);
    assert.equal(row.receipts_complete, false);
    assert.equal(row.periods_complete, false);
    assert.equal(row.adjustments_complete, false);
    assert.equal(row.cursor, "in_next");
    await assert.rejects(repository.commitPage(claim, target, page));
    const proof = await repository.originalCheckoutReceipt(operation, providerId);
    assert.equal(proof?.paymentIntentId, operation.provider_intent_id);
    assert.equal(proof?.amountCents, 2990, "catalog price is never substituted");
    assert.deepEqual(proof?.paidAt, paidAt);
    assert.deepEqual(proof?.invoicePaidAt, invoicePaidAt);
    assert.ok(invoicePaidAt < paidAt, "provider transitions have no ordering invariant");
    const originallyStored = await prisma.billing_financial_receipt.findFirstOrThrow({
      where: { account_id: identity.accountId },
    });
    assert.deepEqual(originallyStored.paid_at, paidAt);
    assert.deepEqual(originallyStored.invoice_paid_at, invoicePaidAt);
    for (const change of [
      { paidAt: new Date(Date.now() + 86_400_000) },
      { invoicePaidAt: new Date(Date.now() + 86_400_000) },
    ]) {
      const future = { ...receipt, ...change };
      await prisma.billing_financial_receipt.update({
        where: { id: originallyStored.id },
        data: {
          paid_at: future.paidAt,
          invoice_paid_at: future.invoicePaidAt,
          immutable_hash: financialReceiptHash(future, target),
        },
      });
      assert.equal(
        await repository.originalCheckoutReceipt(operation, providerId),
        null,
        "either future timestamp rejects original proof even with an internally matching hash",
      );
    }
    await prisma.billing_financial_receipt.update({
      where: { id: originallyStored.id },
      data: {
        paid_at: paidAt,
        invoice_paid_at: invoicePaidAt,
        immutable_hash: originallyStored.immutable_hash,
      },
    });
    assert.ok(await repository.originalCheckoutReceipt(operation, providerId));
    assert.equal(
      await repository.originalCheckoutReceipt(
        { ...operation, provider_intent_id: "pi_renewal" },
        providerId,
      ),
      null,
    );
    assert.equal(
      await repository.originalCheckoutReceipt({ ...operation, intent_kind: "setup" }, providerId),
      null,
    );

    const oldClaim = await repository.claim(row);
    assert.ok(oldClaim);
    row = await repository.request(target, identity, { eventId: "evt_newer" });
    assert.ok(row.requested_revision > oldClaim.requested_revision);
    await assert.rejects(
      repository.commitPage(oldClaim, target, { ...page, hasMore: false, nextCursor: null }),
    );
    await repository.fail(oldClaim, "stale_revision");
    row = (await repository.read(row.id))!;
    assert.equal(row.state, "pending");
    assert.equal(row.last_error_code, null);
    assert.equal(row.cursor, null);
    const nextClaim = await repository.claim(row);
    assert.ok(nextClaim);
    row = await repository.commitPage(nextClaim, target, {
      ...page,
      hasMore: false,
      nextCursor: null,
      observedAt: new Date(),
    });
    assert.equal(row.receipts_complete, true);
    assert.equal(row.periods_complete, true);
    assert.equal(row.adjustments_complete, false);
    assert.equal(row.processed_revision, row.requested_revision);
    assert.equal(
      await prisma.billing_financial_receipt.count({ where: { account_id: identity.accountId } }),
      1,
    );

    row = await repository.request(target, identity, { refresh: true });
    const conflicting = await repository.claim(row);
    assert.ok(conflicting);
    await assert.rejects(
      repository.commitPage(conflicting, target, {
        ...page,
        receipts: [{ ...receipt, periodEnd: new Date(receipt.periodEnd.getTime() + 1000) }],
      }),
    );
    await repository.fail(conflicting, "receipt_conflict");
    row = (await repository.read(row.id))!;
    assert.equal(row.state, "review_required");
    assert.equal(row.receipts_complete, false);
    assert.deepEqual(
      (
        await prisma.billing_financial_receipt.findFirstOrThrow({
          where: { account_id: identity.accountId },
        })
      ).period_end,
      receipt.periodEnd,
    );

    for (const change of [
      { paidAt: new Date(receipt.paidAt.getTime() + 1_000) },
      { invoicePaidAt: new Date(receipt.invoicePaidAt.getTime() + 1_000) },
    ]) {
      row = await repository.request(target, identity, { refresh: true });
      const changedTimestamp = await repository.claim(row);
      assert.ok(changedTimestamp);
      await assert.rejects(
        repository.commitPage(changedTimestamp, target, {
          ...page,
          receipts: [{ ...receipt, ...change }],
        }),
      );
      await repository.fail(changedTimestamp, "receipt_conflict");
      const unchanged = await prisma.billing_financial_receipt.findUniqueOrThrow({
        where: { id: originallyStored.id },
      });
      assert.deepEqual(unchanged.paid_at, paidAt);
      assert.deepEqual(unchanged.invoice_paid_at, invoicePaidAt);
      assert.equal(unchanged.immutable_hash, originallyStored.immutable_hash);
    }

    row = await repository.request(target, identity, { refresh: true });
    const refunded = await repository.claim(row);
    assert.ok(refunded);
    row = await repository.commitPage(refunded, target, {
      ...page,
      receipts: [{ ...receipt, refundedCents: 2990, currentState: "refunded" }],
      hasMore: false,
      nextCursor: null,
      observedAt: new Date(),
    });
    assert.ok(
      await repository.originalCheckoutReceipt(operation, providerId),
      "later refund never erases proof that original capture already happened",
    );
    const stored = await prisma.billing_financial_receipt.findFirstOrThrow({
      where: { account_id: identity.accountId },
    });
    assert.equal(stored.amount_paid_cents, 2990);
    assert.equal(stored.refunded_cents, 2990);
    assert.equal(
      await prisma.billing_financial_receipt.count({ where: { account_id: identity.accountId } }),
      1,
    );
    await prisma.billing_financial_receipt.update({
      where: { id: stored.id },
      data: { immutable_hash: "0".repeat(64) },
    });
    assert.equal(
      await repository.originalCheckoutReceipt(operation, providerId),
      null,
      "invalid immutable proof fails closed",
    );
    await prisma.billing_financial_receipt.update({
      where: { id: stored.id },
      data: { immutable_hash: stored.immutable_hash },
    });
    await prisma.billing_financial_receipt.update({
      where: { id: stored.id },
      data: { price_version_id: "different-version" },
    });
    assert.equal(await repository.originalCheckoutReceipt(operation, providerId), null);
    row = await repository.request(target, identity, { refresh: true });
    const changedVersion = await repository.claim(row);
    assert.ok(changedVersion);
    await assert.rejects(
      repository.commitPage(changedVersion, target, {
        ...page,
        receipts: [{ ...receipt, refundedCents: 2990, currentState: "refunded" }],
        hasMore: false,
        nextCursor: null,
        observedAt: new Date(),
      }),
    );
    await repository.fail(changedVersion, "receipt_conflict");
    assert.equal((await repository.read(row.id))?.receipts_complete, false);
    await prisma.billing_financial_receipt.update({
      where: { id: stored.id },
      data: { price_version_id: stored.price_version_id },
    });
    assert.equal(
      (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: subscription.id } }))
        .status,
      "inativa",
    );
    assert.equal(
      (await prisma.billing_operation.findUniqueOrThrow({ where: { id: operation.id } })).state,
      "processing",
      "ledger persistence alone never changes an operation or entitlement",
    );
  } finally {
    await prisma.billing_financial_receipt.deleteMany({
      where: { account_id: identity.accountId },
    });
    await prisma.billing_financial_reconciliation.deleteMany({
      where: { account_id: identity.accountId },
    });
    if (userId) {
      await prisma.billing_operation.deleteMany({ where: { user_id: userId } });
      await prisma.billing_customer.deleteMany({ where: { user_id: userId } });
    }
    if (profileId) {
      await prisma.professional_subscription.deleteMany({ where: { psychologist_id: profileId } });
      await prisma.professional_subscription_history.deleteMany({
        where: { psychologist_id: profileId },
      });
      await prisma.psychologist_profile.deleteMany({ where: { id: profileId } });
    }
    if (priceId) await prisma.billing_price_version.delete({ where: { id: priceId } });
    if (planId) {
      await prisma.subscription_plan.delete({ where: { id: planId } });
      await prisma.subscription_plan_history.deleteMany({ where: { plan_id: planId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
});

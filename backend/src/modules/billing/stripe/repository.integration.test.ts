import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const enabled = process.env.LECTUM_STRIPE_DB_TESTS === "true";

test("real isolated PostgreSQL serializes reservations, enforces leases and deduplicates scoped inbox", {
  skip: !enabled,
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { StripeBillingRepository } = await import("./repository");
  const { StripeInboxRepository } = await import("./inbox-repository");
  const { preserveStripeCardPolicyRejection } = await import("./policy");
  const prefix = `stripe-qa-${randomUUID()}`;
  const identity = { accountId: `acct_${randomUUID().replaceAll("-", "")}`, mode: "test" as const };
  let userId: string | undefined;
  let profileId: string | undefined;
  let planId: string | undefined;
  let createdPlan = false;
  let priceId: string | undefined;
  let offerId: string | undefined;
  try {
    const user = await prisma.user.create({
      data: { name: prefix, email: `${prefix}@example.invalid`, role: "psicologo", active: true },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: userId } });
    profileId = profile.id;
    let plan = await prisma.subscription_plan.findUnique({ where: { slug: "profissional" } });
    if (!plan) {
      plan = await prisma.subscription_plan.create({
        data: { name: prefix, slug: "profissional", price_cents: 2990, active: true },
      });
      createdPlan = true;
    }
    planId = plan.id;
    assert.equal(
      await prisma.billing_offer.count({
        where: { plan_id: planId, gateway: "stripe", mode: "test" },
      }),
      0,
      "test needs an isolated catalog; do not overwrite another offer",
    );
    const price = await prisma.billing_price_version.create({
      data: {
        plan_id: planId,
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        external_price_id: `price_${prefix}`,
        external_product_id: `prod_${prefix}`,
        amount_cents: 2990,
        currency: "BRL",
        interval: "month",
      },
    });
    priceId = price.id;
    const offer = await prisma.billing_offer.create({
      data: {
        plan_id: planId,
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        price_version_id: price.id,
        checkout_enabled: true,
      },
    });
    offerId = offer.id;
    const repository = new StripeBillingRepository();
    const input = {
      userId,
      identity,
      quoteRevision: `${offer.id}:${offer.revision}`,
      requestKey: randomUUID(),
      intent: "subscription" as const,
    };
    // Real catalog race: a new reservation must observe the operator pause after its plan lock releases.
    let releaseOperator!: () => void;
    let operatorLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      operatorLocked = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseOperator = resolve;
    });
    const operator = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM subscription_plans WHERE id = ${planId} FOR UPDATE`;
      operatorLocked();
      await release;
      await tx.billing_offer.update({
        where: { id: offer.id },
        data: { checkout_enabled: false, revision: { increment: 1 } },
      });
    });
    await locked;
    const blockedReservation = repository.reserveCheckout(input);
    let reservationSettled = false;
    const reservationResult = blockedReservation
      .then(
        () => ({ accepted: true, code: "" }),
        (error: unknown) => ({
          accepted: false,
          code: typeof error === "object" && error && "code" in error ? error.code : "unknown",
        }),
      )
      .finally(() => {
        reservationSettled = true;
      });
    try {
      await new Promise((resolve) => setTimeout(resolve, 75));
      assert.equal(
        reservationSettled,
        false,
        "reservation waits for the offer operator's plan lock",
      );
    } finally {
      releaseOperator();
    }
    await operator;
    assert.deepEqual(await reservationResult, {
      accepted: false,
      code: "billing_checkout_disabled",
    });
    assert.equal(await prisma.billing_operation.count({ where: { user_id: userId } }), 0);
    await prisma.billing_offer.update({
      where: { id: offer.id },
      data: { checkout_enabled: true, revision: offer.revision },
    });
    const [one, two] = await Promise.all([
      repository.reserveCheckout(input),
      repository.reserveCheckout({ ...input, requestKey: randomUUID() }),
    ]);
    assert.equal(one.id, two.id);
    assert.equal(
      await prisma.professional_subscription.count({ where: { psychologist_id: profileId } }),
      1,
    );
    assert.equal(await prisma.billing_operation.count({ where: { user_id: userId } }), 1);
    assert.equal(await repository.operation(one.id, "another-owner", identity), null);
    const [firstLease, secondLease] = await Promise.all([
      repository.claimOperation(one, true),
      repository.claimOperation(one, true),
    ]);
    assert.equal([firstLease, secondLease].filter(Boolean).length, 1);
    const claim = firstLease ?? secondLease;
    assert.ok(claim);
    assert.equal(
      (await repository.finishOperation(one.id, "wrong-lease", { state: "failed" })).count,
      0,
    );
    assert.equal(
      (
        await repository.finishOperation(one.id, claim.lease_token, {
          state: "review_required",
          last_error_code: "unit_unknown_outcome",
        })
      ).count,
      1,
    );
    const resumed = await repository.reserveCheckout({ ...input, requestKey: randomUUID() });
    assert.equal(resumed.id, one.id);
    assert.equal(resumed.state, "review_required");
    assert.equal(
      await repository.claimOperation(resumed, true),
      null,
      "unknown creation cannot issue another create",
    );
    const customer = await repository.customer(one.customer_id!, identity);
    assert.ok(customer);
    const [customerLeaseA, customerLeaseB] = await Promise.all([
      repository.claimCustomer(customer, "f".repeat(64)),
      repository.claimCustomer(customer, "f".repeat(64)),
    ]);
    assert.equal([customerLeaseA, customerLeaseB].filter(Boolean).length, 1);
    const customerLease = customerLeaseA ?? customerLeaseB;
    assert.ok(customerLease);
    await repository.finishCustomer(customer.id, customerLease.lease_token, null);
    assert.equal(await repository.claimCustomer(customer, "f".repeat(64)), null);
    const recoveredCustomer = await repository.customer(customer.id, identity);
    assert.ok(recoveredCustomer);
    const replayLease = await repository.claimCustomer(recoveredCustomer, "f".repeat(64));
    assert.ok(
      replayLease,
      "same immutable request can acquire a new lease after an ambiguous customer result",
    );
    assert.equal(await repository.claimCustomer(recoveredCustomer, "e".repeat(64)), null);
    await repository.recoverCustomer(recoveredCustomer, `cus_${prefix}`);
    assert.equal(
      (await repository.finishCustomer(customer.id, replayLease.lease_token, null)).count,
      0,
      "late failure must not downgrade recovered customer",
    );
    const operationLease = await repository.claimOperation(resumed);
    assert.ok(operationLease);
    assert.equal(
      (await repository.checkpointRequest(resumed, operationLease.lease_token, "a".repeat(64)))
        .count,
      0,
      "legacy ambiguous rows cannot gain a new request fingerprint retroactively",
    );
    assert.equal(
      (
        await repository.pinOperationReferences(resumed, operationLease.lease_token, {
          subscriptionId: "sub_original",
          intentId: "seti_original",
          intentKind: "setup",
        })
      ).count,
      1,
    );
    assert.equal(
      (
        await repository.pinOperationReferences(resumed, operationLease.lease_token, {
          intentId: "seti_other",
          intentKind: "setup",
        })
      ).count,
      0,
      "a pinned setup intent cannot change",
    );
    await prisma.billing_operation.update({
      where: { id: resumed.id },
      data: { state: "complete", completed_at: new Date() },
    });
    assert.equal(
      (
        await repository.finishOperation(resumed.id, operationLease.lease_token, {
          state: "review_required",
        })
      ).count,
      0,
      "late create/read failure cannot downgrade a completed operation",
    );
    assert.equal(
      (
        await repository.finishOperation(resumed.id, operationLease.lease_token, {
          state: "failed",
        })
      ).count,
      0,
      "terminal result is immutable",
    );
    const terminalOperation = await repository.operation(resumed.id, userId, identity);
    assert.ok(terminalOperation);
    assert.equal(await repository.claimOperation(terminalOperation), null);
    const crashOperation = await prisma.billing_operation.create({
      data: {
        user_id: userId,
        psychologist_id: profileId,
        customer_id: customer.id,
        subscription_id: one.subscription_id,
        gateway: "stripe",
        account_id: identity.accountId,
        mode: identity.mode,
        kind: "payment_method",
        request_key: randomUUID(),
      },
    });
    const beforeCrash = await repository.claimOperation(crashOperation);
    assert.ok(beforeCrash);
    assert.equal(
      (await repository.checkpointRequest(crashOperation, beforeCrash.lease_token, "c".repeat(64)))
        .count,
      1,
    );
    await prisma.billing_operation.update({
      where: { id: crashOperation.id },
      data: { lease_until: new Date(Date.now() - 1_000) },
    });
    const afterCrash = await repository.operation(crashOperation.id, userId, identity);
    assert.ok(afterCrash);
    const resumedLease = await repository.claimOperation(afterCrash);
    assert.ok(resumedLease);
    assert.notEqual(resumedLease.lease_token, beforeCrash.lease_token);
    assert.equal(
      (await repository.checkpointRequest(afterCrash, resumedLease.lease_token, "d".repeat(64)))
        .count,
      0,
      "changed body cannot replay a durable key",
    );
    assert.equal(
      (await repository.checkpointRequest(afterCrash, resumedLease.lease_token, "c".repeat(64)))
        .count,
      1,
    );
    assert.equal(
      (
        await repository.finishOperation(crashOperation.id, beforeCrash.lease_token, {
          state: "failed",
        })
      ).count,
      0,
    );
    assert.equal(
      (
        await repository.finishOperation(crashOperation.id, resumedLease.lease_token, {
          state: "review_required",
          last_error_code: "card_credit_required",
        })
      ).count,
      1,
    );
    assert.equal(
      (await repository.operation(crashOperation.id, userId, identity))?.request_fingerprint,
      "c".repeat(64),
    );
    for (const fallback of [
      null,
      "setup_resume_unresolved",
      "checkout_resume_unresolved",
    ] as const) {
      const rejected = await repository.operation(crashOperation.id, userId, identity);
      assert.ok(rejected);
      const rejectionLease = await repository.claimOperation(rejected);
      assert.ok(rejectionLease);
      const code = preserveStripeCardPolicyRejection(rejectionLease.last_error_code, fallback);
      await repository.finishOperation(rejected.id, rejectionLease.lease_token, {
        state: code ? "review_required" : "processing",
        last_error_code: code,
      });
      const retained = await repository.operation(rejected.id, userId, identity);
      assert.equal(retained?.state, "review_required");
      assert.equal(retained?.last_error_code, "card_credit_required");
      assert.equal(retained?.completed_at, null);
      assert.equal(retained?.request_key, rejected.request_key);
      assert.equal(retained?.provider_intent_id, rejected.provider_intent_id);
    }
    assert.equal(await prisma.billing_operation.count({ where: { user_id: userId } }), 2);
    const inbox = new StripeInboxRepository();
    const event = {
      ...identity,
      eventId: `evt_${prefix}`,
      type: "customer.subscription.updated",
      resourceId: `sub_${prefix}`,
      subscriptionId: `sub_${prefix}`,
      apiVersion: "2026-10-28.endive",
      created: new Date(),
    };
    const [eventA, eventB] = await Promise.all([inbox.enqueue(event), inbox.enqueue(event)]);
    assert.equal(eventA.id, eventB.id);
    const [eventLeaseA, eventLeaseB] = await Promise.all([
      inbox.claim(identity),
      inbox.claim(identity),
    ]);
    assert.equal([eventLeaseA, eventLeaseB].filter(Boolean).length, 1);
    const eventLease = eventLeaseA ?? eventLeaseB;
    assert.ok(eventLease);
    assert.equal((await inbox.finish(eventA.id, "wrong-lease", { state: "complete" })).count, 0);
    await inbox.finish(eventA.id, eventLease.lease_token, {
      state: "complete",
      processed_at: new Date(),
    });
    await inbox.enqueue(event);
    assert.equal(
      await inbox.claim(identity),
      null,
      "duplicate webhook does not replay completed work",
    );
    const isolated = await inbox.enqueue({ ...event, mode: "live" });
    assert.notEqual(isolated.id, eventA.id);
  } finally {
    // Only this run's dedicated rows are removed; no seed/reset/global cleanup.
    await prisma.billing_gateway_event.deleteMany({ where: { account_id: identity.accountId } });
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
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    if (offerId) await prisma.billing_offer.deleteMany({ where: { id: offerId } });
    if (priceId) await prisma.billing_price_version.deleteMany({ where: { id: priceId } });
    if (createdPlan && planId) {
      await prisma.subscription_plan.deleteMany({ where: { id: planId } });
      await prisma.subscription_plan_history.deleteMany({ where: { plan_id: planId } });
    }
    await prisma.$disconnect();
  }
});

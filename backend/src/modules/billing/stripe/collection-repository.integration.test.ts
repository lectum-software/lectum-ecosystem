import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("real isolated PostgreSQL fences collection by owner, invoice, lease and confirmation revision", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { StripeCollectionRepository } = await import("./collection-repository");
  const { collectionConfirmationFingerprint } = await import("./collection-policy");
  const { prepareStripeCreditCancellation, CREDIT_CANCELLATION_REQUESTED } = await import(
    "./collection-cancellation"
  );
  const suffix = randomUUID().replaceAll("-", "");
  const identity = { accountId: `acct_${suffix}`, mode: "test" as const };
  const tag = `collection-qa-${suffix}`;
  let userId: string | undefined;
  let planId: string | undefined;
  try {
    const user = await prisma.user.create({
      data: { name: tag, email: `${tag}@example.invalid`, active: true, role: "psicologo" },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    const plan = await prisma.subscription_plan.create({
      data: { name: tag, slug: tag, price_cents: 2990 },
    });
    planId = plan.id;
    const price = await prisma.billing_price_version.create({
      data: {
        plan_id: plan.id,
        gateway: "stripe",
        mode: "test",
        account_id: identity.accountId,
        external_product_id: `prod_${suffix}`,
        external_price_id: `price_${suffix}`,
        amount_cents: 2990,
        currency: "BRL",
        interval: "month",
      },
    });
    const customer = await prisma.billing_customer.create({
      data: {
        user_id: user.id,
        gateway: "stripe",
        mode: "test",
        account_id: identity.accountId,
        external_customer_id: `cus_${suffix}`,
        state: "ready",
      },
    });
    const local = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        source: "stripe",
        gateway: "stripe",
        gateway_mode: "test",
        gateway_account_id: identity.accountId,
        gateway_subscription_id: `sub_${suffix}`,
        collection_policy: "manual_credit_v1",
        price_version_id: price.id,
        contracted_amount_cents: 2990,
        contracted_currency: "BRL",
        contracted_interval: "month",
        contracted_interval_count: 1,
      },
    });
    const parent = await prisma.billing_operation.create({
      data: {
        user_id: user.id,
        psychologist_id: profile.id,
        subscription_id: local.id,
        customer_id: customer.id,
        price_version_id: price.id,
        gateway: "stripe",
        mode: "test",
        account_id: identity.accountId,
        kind: "checkout",
        intent: "subscription",
        state: "processing",
        request_key: randomUUID(),
        provider_subscription_id: local.gateway_subscription_id,
      },
    });
    const repository = new StripeCollectionRepository();
    const target = await repository.target(local.id, identity, user.id);
    await assert.rejects(repository.target(local.id, identity, "other-owner"));
    await assert.rejects(repository.target(local.id, { ...identity, accountId: "acct_other" }));
    const input = {
      target,
      identity,
      invoiceId: `in_${suffix}`,
      paymentMethodId: `pm_${suffix}`,
      parentOperationId: parent.id,
      initialInvoice: true,
    };
    const [first, same] = await Promise.all([repository.reserve(input), repository.reserve(input)]);
    assert.equal(first.id, same.id);
    assert.equal(
      await prisma.billing_operation.count({
        where: { kind: "collection", account_id: identity.accountId },
      }),
      1,
    );
    assert.equal(first.provider_payment_method_id, input.paymentMethodId);
    assert.deepEqual(
      (await repository.due(identity, [local.id])).map((row) => row.id),
      [first.id],
    );
    assert.equal((await repository.due(identity, ["other-contract"])).length, 0);
    assert.deepEqual(
      (await repository.contracts(identity, undefined, [local.id])).map((row) => row.id),
      [local.id],
    );
    assert.equal((await repository.contracts(identity, undefined, ["other-contract"])).length, 0);
    const claims = await Promise.all([repository.claim(first), repository.claim(same)]);
    assert.equal(claims.filter(Boolean).length, 1);
    const claim = claims.find(Boolean)!;
    await assert.rejects(prepareStripeCreditCancellation(local.id, identity), (error: unknown) =>
      Boolean(
        error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "billing_operation_pending",
      ),
    );
    assert.equal(
      (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: local.id } }))
        .collection_policy,
      "manual_credit_v1",
    );
    assert.equal(await repository.renew(claim, claim.lease_token), true);
    assert.equal(
      (
        await repository.selectUnconfirmedMethod(
          claim,
          claim.lease_token,
          `pm_replacement${suffix}`,
        )
      ).count,
      1,
    );
    assert.equal(
      (await repository.selectUnconfirmedMethod(claim, claim.lease_token, `pm_stale${suffix}`))
        .count,
      0,
      "stale PM selection cannot overwrite a newer canonical selection",
    );
    const selected = (await repository.read(claim.id))!;
    assert.equal(
      (await repository.selectUnconfirmedMethod(selected, claim.lease_token, input.paymentMethodId))
        .count,
      1,
    );
    assert.equal((await repository.checkpoint(claim, "wrong-lease", "request-proof")).count, 0);
    assert.equal((await repository.checkpoint(claim, claim.lease_token, "request-proof")).count, 1);
    assert.equal(
      (await repository.checkpoint(claim, claim.lease_token, "changed-request")).count,
      0,
    );
    const intentId = `pi_${suffix}`;
    assert.equal((await repository.pinIntent(claim.id, claim.lease_token, intentId)).count, 1);
    assert.equal((await repository.pinIntent(claim.id, claim.lease_token, "pi_changed")).count, 0);
    assert.equal(
      (
        await repository.selectUnconfirmedMethod(
          (await repository.read(claim.id))!,
          claim.lease_token,
          `pm_afterpin${suffix}`,
        )
      ).count,
      0,
      "once an intent exists, card changes require a fenced confirmation revision",
    );
    const pinnedParent = await prisma.billing_operation.findUniqueOrThrow({
      where: { id: parent.id },
    });
    assert.equal(pinnedParent.provider_intent_id, intentId);
    assert.equal(pinnedParent.intent_kind, "payment");
    const pinned = (await repository.read(claim.id))!;
    const fingerprint = collectionConfirmationFingerprint({
      operationId: claim.id,
      intentId,
      invoiceId: input.invoiceId,
      paymentMethodId: input.paymentMethodId,
      sequence: 1,
    });
    const confirmation = {
      operation: pinned,
      token: claim.lease_token,
      paymentMethodId: input.paymentMethodId,
      sequence: 1,
      fingerprint,
    };
    assert.equal((await repository.checkpointConfirmation(confirmation)).count, 1);
    assert.equal(
      (await repository.checkpointConfirmation(confirmation)).count,
      0,
      "stale confirmation state cannot start another attempt",
    );
    await repository.finish(claim.id, claim.lease_token, {
      state: "review_required",
      last_error_code: "payment_method_required",
    });
    assert.equal(
      (await repository.due(identity)).some((row) => row.id === claim.id),
      false,
      "decline is never background retried",
    );
    const other = await repository.reserve({
      ...input,
      invoiceId: `in_renewal${suffix}`,
      parentOperationId: undefined,
      initialInvoice: false,
    });
    assert.notEqual(other.id, first.id);
    assert.equal(other.parent_operation_id, null);
    await assert.rejects(
      prepareStripeCreditCancellation(local.id, { ...identity, accountId: "acct_other" }),
    );
    assert.equal(await prepareStripeCreditCancellation(local.id, identity), true);
    assert.equal(
      await prepareStripeCreditCancellation(local.id, identity),
      true,
      "retry never reopens collection",
    );
    assert.equal(
      (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: local.id } }))
        .collection_policy,
      CREDIT_CANCELLATION_REQUESTED,
    );
    assert.equal(
      await repository.claim(other),
      null,
      "new claims observe the cancellation fence under the same contract lock",
    );
    assert.equal(await repository.renew(claim, claim.lease_token), false);
    await assert.rejects(repository.target(local.id, identity));
    await prisma.professional_subscription.update({
      where: { id: local.id },
      data: { collection_policy: "manual_credit_v1" },
    });
    let releaseLock!: () => void;
    let notifyLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      notifyLocked = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const cancellation = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM professional_subscriptions WHERE id = ${local.id} FOR UPDATE`;
      notifyLocked();
      await release;
      await tx.professional_subscription.update({
        where: { id: local.id },
        data: { collection_policy: CREDIT_CANCELLATION_REQUESTED },
      });
    });
    await locked;
    let claimSettled = false;
    const waitingClaim = repository.claim(other).finally(() => {
      claimSettled = true;
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      assert.equal(claimSettled, false, "collection claim waits for the cancellation row lock");
    } finally {
      releaseLock();
    }
    await cancellation;
    assert.equal(await waitingClaim, null);
    await prisma.professional_subscription.update({
      where: { id: local.id },
      data: { collection_policy: "manual_credit_v1" },
    });
    await prisma.professional_subscription.update({
      where: { id: local.id },
      data: { status: "cancelada" },
    });
    await assert.rejects(repository.target(local.id, identity));
    await assert.rejects(repository.reserve({ ...input, invoiceId: `in_aftercancel${suffix}` }));
    await prisma.professional_subscription.update({
      where: { id: local.id },
      data: { status: "inativa" },
    });
    await prisma.user.update({ where: { id: user.id }, data: { active: false } });
    await assert.rejects(repository.target(local.id, identity));
  } finally {
    if (userId) {
      await prisma.billing_operation.deleteMany({
        where: { user_id: userId, account_id: identity.accountId },
      });
      await prisma.billing_customer.deleteMany({
        where: { user_id: userId, account_id: identity.accountId },
      });
      await prisma.user.delete({ where: { id: userId } });
    }
    if (planId) {
      await prisma.billing_price_version.deleteMany({
        where: { plan_id: planId, account_id: identity.accountId },
      });
      await prisma.subscription_plan.delete({ where: { id: planId } });
    }
    await prisma.$disconnect();
  }
});

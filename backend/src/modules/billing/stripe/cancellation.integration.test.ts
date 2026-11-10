import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("real PostgreSQL cancellation preserves paid access and persisted provider identity", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { SubscriptionRepository } = await import(
    "@/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository"
  );
  const tag = `cancel-qa-${randomUUID()}`;
  const userIds: string[] = [];
  const profileIds: string[] = [];
  try {
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", active: true, deleted: false },
    });
    const repository = new SubscriptionRepository();
    const paidEnd = new Date(Date.now() + 86_400_000);
    for (const gateway of ["mercadopago", "stripe"]) {
      const user = await prisma.user.create({
        data: {
          name: tag,
          email: `${gateway}-${tag}@example.invalid`,
          role: "psicologo",
          active: true,
        },
      });
      userIds.push(user.id);
      const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
      profileIds.push(profile.id);
      const contract = await prisma.professional_subscription.create({
        data: {
          psychologist_id: profile.id,
          plan_id: plan.id,
          gateway,
          source: gateway,
          gateway_subscription_id: `${gateway}-${tag}`,
          status: "ativa",
          current_period_end: paidEnd,
          ...(gateway === "stripe"
            ? {
                gateway_mode: "test",
                gateway_account_id: "acct_local_cancellation",
                contracted_amount_cents: 2990,
                contracted_currency: "BRL",
                contracted_interval: "month",
                contracted_interval_count: 1,
              }
            : {}),
        },
      });
      assert.equal((await repository.findCancelableSubscription(profile.id))?.id, contract.id);
      await assert.rejects(
        repository.cancelSubscription({
          subscriptionId: contract.id,
          gatewaySubscriptionId: "wrong-reference",
        }),
        /BILLING_SUBSCRIPTION_GATEWAY_UNAVAILABLE/,
      );
      assert.equal(
        (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: contract.id } }))
          .status,
        "ativa",
      );
      // The provider action is deliberately not part of this repository-only regression.
      const result = await repository.cancelSubscription({
        subscriptionId: contract.id,
        gatewaySubscriptionId: contract.gateway_subscription_id!,
      });
      assert.equal(result.cancelled.status, "cancelada");
      assert.deepEqual(result.cancelled.current_period_end, paidEnd);
      assert.equal(result.current.id, contract.id, "already paid access survives cancellation");
      assert.equal(result.cancelled.gateway, gateway);
      assert.equal(result.cancelled.gateway_subscription_id, contract.gateway_subscription_id);
      assert.equal(await repository.findCancelableSubscription(profile.id), null);
      const shown = await repository.showSubscription(profile.id);
      assert.equal(shown?.id, contract.id);
      assert.equal(shown?.plan?.price_cents, gateway === "stripe" ? 2990 : plan.price_cents);
      const repeated = await repository.cancelSubscription({
        subscriptionId: contract.id,
        gatewaySubscriptionId: contract.gateway_subscription_id!,
      });
      assert.deepEqual(repeated.cancelled.current_period_end, paidEnd);
      assert.equal(await prisma.billing_operation.count({ where: { user_id: user.id } }), 0);
      assert.equal(
        await prisma.professional_subscription.count({ where: { psychologist_id: profile.id } }),
        1,
      );
    }
  } finally {
    for (const id of profileIds) {
      await prisma.professional_subscription.deleteMany({ where: { psychologist_id: id } });
      await prisma.professional_subscription_history.deleteMany({ where: { psychologist_id: id } });
      await prisma.psychologist_profile.deleteMany({ where: { id } });
    }
    for (const id of userIds) await prisma.user.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
});

test("real PostgreSQL user cancellation preserves the post-read paid period without reopening an administrative stop", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { SubscriptionRepository } = await import(
    "@/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository"
  );
  const repository = new SubscriptionRepository();
  const tag = randomUUID();
  let userId: string | undefined;
  let profileId: string | undefined;
  try {
    const user = await prisma.user.create({
      data: {
        name: "Local cancellation ordering fixture",
        email: `${tag}@example.invalid`,
        role: "psicologo",
      },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", active: true, deleted: false },
    });
    const subscription = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        status: "inativa",
        source: "stripe",
        gateway: "stripe",
        gateway_subscription_id: `sub_local${tag.replaceAll("-", "")}`,
        gateway_mode: "test",
        gateway_account_id: "acct_local_cancel_order",
      },
    });
    const paidEnd = new Date(Date.now() + 86_400_000);
    // Repository boundary only: the service must apply its verified post-provider projection before this call.
    // No provider response is simulated here, and this test does not claim a payment occurred.
    await prisma.professional_subscription.update({
      where: { id: subscription.id },
      data: { status: "cancelada", current_period_end: paidEnd },
    });
    const final = await repository.cancelSubscription({
      subscriptionId: subscription.id,
      gatewaySubscriptionId: subscription.gateway_subscription_id!,
    });
    assert.equal(final.cancelled.status, "cancelada");
    assert.deepEqual(final.cancelled.current_period_end, paidEnd);
    assert.equal(final.current.id, subscription.id);
    // If an administrative/account-deletion path clears access between sync and finalization, user finalization cannot restore it.
    await prisma.professional_subscription.update({
      where: { id: subscription.id },
      data: { status: "cancelada", current_period_end: null },
    });
    const stopped = await repository.cancelSubscription({
      subscriptionId: subscription.id,
      gatewaySubscriptionId: subscription.gateway_subscription_id!,
    });
    assert.equal(stopped.cancelled.status, "cancelada");
    assert.equal(stopped.cancelled.current_period_end, null);
    assert.equal(
      (await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: profile.id } }))
        .cfp_verified_at,
      null,
    );
  } finally {
    if (profileId) {
      await prisma.professional_subscription.deleteMany({ where: { psychologist_id: profileId } });
      await prisma.professional_subscription_history.deleteMany({
        where: { psychologist_id: profileId },
      });
      await prisma.psychologist_profile.deleteMany({ where: { id: profileId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});

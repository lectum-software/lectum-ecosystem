import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { hasScopedStripeCardMaintenance, stripeConfigPendingOperation } from "./config-policy";

test("real isolated PostgreSQL retains scoped card maintenance and pending operation without a sales catalog", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { StripeBillingRepository } = await import("./repository");
  const repository = new StripeBillingRepository();
  const tag = randomUUID().replaceAll("-", "");
  const identity = { accountId: `acct_localconfig${tag}`, mode: "test" as const };
  const scope = { gateway: "stripe", mode: "test", account_id: identity.accountId };
  let userId: string | undefined;
  let profileId: string | undefined;
  try {
    const user = await prisma.user.create({
      data: { name: "Local config fixture", email: `${tag}@example.invalid`, role: "psicologo" },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", active: true, deleted: false },
    });
    // Repository-only references, not fake API responses or payment evidence.
    const subscription = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        gateway: "stripe",
        source: "stripe",
        status: "inadimplente",
        gateway_mode: "test",
        gateway_account_id: identity.accountId,
        gateway_subscription_id: `sub_local${tag}`,
      },
    });
    const customer = await prisma.billing_customer.create({
      data: { user_id: user.id, ...scope, external_customer_id: `cus_local${tag}`, state: "ready" },
    });
    const operation = await repository.reserveCard(user.id, identity, randomUUID());
    assert.equal(operation.kind, "payment_method");
    assert.equal(operation.price_version_id, null);
    assert.equal(await repository.offer(identity), null);
    const contracts = await repository.subscriptions(profile.id);
    const pending = await repository.pending(user.id, identity);
    const storedCustomer = await repository.customerForUser(user.id, identity);
    assert.equal(storedCustomer?.id, customer.id);
    assert.equal(
      hasScopedStripeCardMaintenance({
        userId: user.id,
        profileId: profile.id,
        currentContractId: subscription.id,
        identity,
        contracts,
        customer: storedCustomer,
        pending,
      }),
      true,
    );
    assert.deepEqual(stripeConfigPendingOperation(pending), {
      id: operation.id,
      kind: "payment_method",
      state: "processing",
      confirmation_kind: null,
      payment_pending: false,
    });
    assert.equal(await repository.customerForUser("another-user", identity), null);
    assert.equal(await repository.customerForUser(user.id, { ...identity, mode: "live" }), null);
    assert.equal(
      await repository.customerForUser(user.id, { ...identity, accountId: "acct_another" }),
      null,
    );
    assert.equal(await prisma.billing_operation.count({ where: { user_id: user.id } }), 1);
    const preserved = await prisma.billing_operation.findUniqueOrThrow({
      where: { id: operation.id },
    });
    assert.equal(preserved.state, "reserved");
    assert.equal(preserved.subscription_id, subscription.id);
    assert.equal(preserved.customer_id, customer.id);
    assert.equal(
      (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: subscription.id } }))
        .status,
      "inadimplente",
    );
    assert.equal(
      (await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: profile.id } }))
        .cfp_verified_at,
      null,
    );
    assert.equal(await prisma.payment_method.count({ where: { user_id: user.id } }), 0);
  } finally {
    await prisma.billing_operation.deleteMany({ where: { account_id: identity.accountId } });
    await prisma.billing_customer.deleteMany({ where: { account_id: identity.accountId } });
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

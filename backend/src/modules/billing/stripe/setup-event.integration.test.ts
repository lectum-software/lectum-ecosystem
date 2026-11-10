import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { StripeSetup } from "../payment-gateway/stripe-types";
import { classifyStripeSetupEvent, unresolvedStripeSetupEvent } from "./setup-event-policy";

test("real isolated PostgreSQL preserves setup pin races, scope, ambiguity and bounded review", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { StripeInboxRepository } = await import("./inbox-repository");
  const { StripeBillingRepository } = await import("./repository");
  const tag = randomUUID().replaceAll("-", "");
  const identity = { accountId: `acct_local${tag}`, mode: "test" as const };
  const scope = { gateway: "stripe", mode: identity.mode, account_id: identity.accountId };
  let userId: string | undefined;
  let profileId: string | undefined;
  const repository = new StripeInboxRepository();
  try {
    const user = await prisma.user.create({
      data: {
        name: "Local setup correlation fixture",
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
        source: "stripe",
        gateway: "stripe",
        status: "inativa",
        gateway_mode: "test",
        gateway_account_id: identity.accountId,
      },
    });
    const customer = await prisma.billing_customer.create({ data: { user_id: user.id, ...scope } });
    const operation = await prisma.billing_operation.create({
      data: {
        user_id: user.id,
        psychologist_id: profile.id,
        subscription_id: subscription.id,
        customer_id: customer.id,
        ...scope,
        kind: "payment_method",
        request_key: randomUUID(),
        state: "creating",
        provider_subscription_id: `sub_local${tag}`,
      },
    });
    // Database-only resource references: no fake provider, HTTP request or claimed payment evidence.
    const setup: StripeSetup = {
      ...identity,
      setupIntentId: `seti_local${tag}`,
      customerId: `cus_local${tag}`,
      attemptId: operation.id,
      subscriptionId: operation.provider_subscription_id,
      localSubscriptionId: subscription.id,
      status: "succeeded",
      paymentMethodId: `pm_local${tag}`,
    };
    const classify = async (value = setup) =>
      classifyStripeSetupEvent({
        setup: value,
        resourceId: value.setupIntentId,
        subscriptionHint: null,
        identity,
        candidates: await repository.setupCandidates(
          value.setupIntentId,
          identity,
          value.attemptId,
        ),
      });
    assert.equal(
      (await classify()).action,
      "unresolved",
      "customer response can still be in flight",
    );
    assert.equal(
      (await new StripeBillingRepository().recoverCustomer(customer, setup.customerId)).count,
      1,
    );
    assert.equal(
      (await classify()).action,
      "process",
      "exact metadata can recover an unpinned setup",
    );
    assert.equal((await classify({ ...setup, attemptId: null })).action, "unresolved");
    await prisma.billing_operation.update({
      where: { id: operation.id },
      data: { provider_intent_id: setup.setupIntentId, intent_kind: "setup" },
    });
    assert.equal(
      (await classify({ ...setup, attemptId: null })).action,
      "process",
      "native setup requires the durable exact pin",
    );
    assert.equal((await classify({ ...setup, customerId: "cus_wrong" })).action, "conflict");

    const duplicate = await prisma.billing_operation.create({
      data: {
        user_id: user.id,
        psychologist_id: profile.id,
        subscription_id: subscription.id,
        customer_id: customer.id,
        ...scope,
        kind: "payment_method",
        request_key: randomUUID(),
        state: "complete",
        provider_subscription_id: operation.provider_subscription_id,
        provider_intent_id: setup.setupIntentId,
      },
    });
    assert.equal(
      (await classify()).action,
      "conflict",
      "two pins are never resolved using findFirst",
    );
    await prisma.billing_operation.update({ where: { id: duplicate.id }, data: { mode: "live" } });
    assert.equal((await classify()).action, "process", "another mode cannot become a candidate");
    await prisma.billing_operation.update({
      where: { id: operation.id },
      data: { state: "complete" },
    });
    assert.equal((await classify()).action, "terminal");

    const event = await prisma.billing_gateway_event.create({
      data: {
        ...scope,
        external_id: `evt_local${tag}`,
        type: "setup_intent.succeeded",
        resource_id: `seti_unmatched${tag}`,
        gateway_created_at: new Date(),
        attempts: 9,
      },
    });
    const claimed = await repository.claim(identity);
    assert.equal(claimed?.id, event.id);
    assert.equal(claimed?.attempts, 10);
    const reviewed = unresolvedStripeSetupEvent(claimed!.attempts);
    assert.equal((await repository.finish(event.id, "wrong-lease", reviewed)).count, 0);
    assert.equal((await repository.finish(event.id, claimed!.lease_token, reviewed)).count, 1);
    const final = await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: event.id } });
    assert.equal(final.state, "review_required");
    assert.equal(final.last_error_code, "setup_operation_unresolved");
    assert.equal(final.processed_at, null);
    assert.equal(final.lease_token, null);
    assert.equal(
      await repository.claim(identity),
      null,
      "review is not retried automatically forever",
    );
    assert.equal(
      (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: subscription.id } }))
        .status,
      "inativa",
    );
    assert.equal(await prisma.payment_method.count({ where: { user_id: user.id } }), 0);
    assert.equal(
      (await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: profile.id } }))
        .cfp_verified_at,
      null,
    );
  } finally {
    await prisma.billing_gateway_event.deleteMany({ where: { account_id: identity.accountId } });
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

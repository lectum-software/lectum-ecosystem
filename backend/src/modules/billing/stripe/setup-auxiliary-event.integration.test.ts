import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { STRIPE_API_VERSION } from "../payment-gateway/stripe-config";
import { stripeCreditCardRequestHash } from "../payment-gateway/stripe-idempotency";
import type { StripeSetup } from "../payment-gateway/stripe-types";

test("isolated PostgreSQL auxiliary closure changes only its leased inbox, with scope/ambiguity/race guards", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { StripeInboxRepository } = await import("./inbox-repository");
  const { readAuxiliaryStripeSetupCandidate: read, finishAuxiliaryStripeSetupEvent: finish } =
    await import("./setup-auxiliary-event");
  const tag = randomUUID().replaceAll("-", "");
  const identity = { accountId: `acct_aux${tag}`, mode: "test" as const };
  const scoped = { gateway: "stripe", mode: identity.mode, account_id: identity.accountId };
  const inbox = new StripeInboxRepository();
  let userId: string | undefined;
  let profileId: string | undefined;
  let planId: string | undefined;
  try {
    const user = await prisma.user.create({
      data: {
        name: "Auxiliary closure local fixture",
        email: `${tag}@example.invalid`,
        role: "psicologo",
      },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    const plan = await prisma.subscription_plan.create({
      data: {
        name: "Auxiliary local fixture",
        slug: `aux-${tag}`,
        active: false,
        price_cents: 2990,
      },
    });
    planId = plan.id;
    const subscription = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        source: "stripe",
        gateway: "stripe",
        status: "cancelada",
        gateway_mode: identity.mode,
        gateway_account_id: identity.accountId,
        gateway_subscription_id: `sub_aux${tag}`,
        collection_policy: "manual_credit_cancel_requested_v1",
      },
    });
    const customer = await prisma.billing_customer.create({
      data: { user_id: user.id, ...scoped, external_customer_id: `cus_aux${tag}` },
    });
    const operationData = {
      user_id: user.id,
      psychologist_id: profile.id,
      subscription_id: subscription.id,
      customer_id: customer.id,
      ...scoped,
      kind: "checkout",
      intent: "subscription",
      state: "complete",
      completed_at: new Date(),
      provider_subscription_id: subscription.gateway_subscription_id,
      provider_setup_intent_id: `seti_main${tag}`,
      provider_payment_method_id: `pm_aux${tag}`,
    };
    const operation = await prisma.billing_operation.create({
      data: { ...operationData, request_key: randomUUID() },
    });
    // These fixtures exercise persistence only, not an external SetupIntent/provider proof.
    const setup: StripeSetup = {
      ...identity,
      setupIntentId: `seti_aux${tag}`,
      customerId: customer.external_customer_id!,
      paymentMethodId: operation.provider_payment_method_id,
      status: "succeeded",
      attemptId: null,
      subscriptionId: null,
      localSubscriptionId: null,
    };
    const hash = stripeCreditCardRequestHash(
      identity,
      operation.provider_subscription_id!,
      setup.paymentMethodId!,
    );
    const scope = {
      setupIntentId: setup.setupIntentId,
      customerId: setup.customerId,
      paymentMethodId: setup.paymentMethodId!,
      subscriptionId: operation.provider_subscription_id!,
      localSubscriptionId: subscription.id,
      attemptId: operation.id,
    };
    const proof = {
      ...scope,
      ...identity,
      metadataAbsent: true as const,
      status: "succeeded" as const,
    };
    let eventSequence = 0;
    const createEvent = () =>
      prisma.billing_gateway_event.create({
        data: {
          ...scoped,
          external_id: `evt_aux${tag}${++eventSequence}`,
          type: "setup_intent.succeeded",
          api_version: STRIPE_API_VERSION,
          resource_id: setup.setupIntentId,
          gateway_created_at: new Date(),
          request_idempotency_key_hash: hash,
        },
      });
    const readBusiness = async () => ({
      user: await prisma.user.findUnique({ where: { id: user.id } }),
      profile: await prisma.psychologist_profile.findUnique({ where: { id: profile.id } }),
      subscription: await prisma.professional_subscription.findUnique({
        where: { id: subscription.id },
      }),
      customer: await prisma.billing_customer.findUnique({ where: { id: customer.id } }),
      operation: await prisma.billing_operation.findUnique({ where: { id: operation.id } }),
      methods: await prisma.payment_method.count({ where: { user_id: user.id } }),
      invoices: await prisma.billing_invoice.count({ where: { user_id: user.id } }),
      receipts: await prisma.billing_financial_receipt.count({
        where: { psychologist_id: profile.id },
      }),
    });
    const event = await createEvent();
    assert.equal(
      (await read(event, setup, identity)).action,
      "verify",
      "cancelled historical subscription stays eligible for inbox-only recognition",
    );
    assert.equal(
      (await read({ ...event, request_idempotency_key_hash: null }, setup, identity)).action,
      "unresolved",
    );
    assert.equal(
      (await read({ ...event, request_idempotency_key_hash: "a".repeat(64) }, setup, identity))
        .action,
      "unresolved",
    );
    assert.equal((await read(event, setup, { ...identity, mode: "live" })).action, "unresolved");
    const snapshot = await readBusiness();
    const claims = await Promise.all([inbox.claim(identity), inbox.claim(identity)]);
    const winners = claims.filter((job) => job !== null);
    assert.equal(winners.length, 1);
    const claimed = winners[0]!;
    assert.equal(claimed.id, event.id);
    assert.equal(
      await finish({ ...claimed, lease_token: "wrong" }, setup, identity, scope, proof),
      false,
    );
    assert.equal(
      await finish(claimed, setup, identity, scope, { ...proof, paymentMethodId: "pm_other" }),
      false,
    );
    const outcomes = await Promise.all([
      finish(claimed, setup, identity, scope, proof),
      finish(claimed, setup, identity, scope, proof),
    ]);
    assert.equal(outcomes.filter(Boolean).length, 1);
    const completed = await prisma.billing_gateway_event.findUniqueOrThrow({
      where: { id: event.id },
    });
    assert.equal(completed.state, "complete");
    assert.equal(completed.attempts, 1);
    assert.equal(completed.lease_token, null);
    assert.ok(completed.processed_at);
    assert.equal(completed.request_idempotency_key_hash, hash);
    assert.deepEqual(
      await readBusiness(),
      snapshot,
      "no card, contract, payment, benefit, fiscal or ownership mutation",
    );

    const duplicate = await prisma.billing_operation.create({
      data: { ...operationData, request_key: randomUUID() },
    });
    assert.equal((await read(event, setup, identity)).action, "conflict");
    await prisma.billing_operation.delete({ where: { id: duplicate.id } });
    const overflowIds = Array.from({ length: 20 }, () => randomUUID());
    await prisma.billing_operation.createMany({
      data: overflowIds.map((id) => ({ ...operationData, id, request_key: randomUUID() })),
    });
    assert.equal(
      (await read(event, setup, identity)).action,
      "conflict",
      "overflow never silently truncates to one candidate",
    );
    await prisma.billing_operation.deleteMany({ where: { id: { in: overflowIds }, ...scoped } });

    const raceEvent = await createEvent();
    const racing = await inbox.claim(identity);
    assert.equal(racing?.id, raceEvent.id);
    await prisma.billing_operation.update({
      where: { id: operation.id },
      data: { provider_payment_method_id: "pm_changed" },
    });
    assert.equal(
      await finish(racing!, setup, identity, scope, proof),
      false,
      "a changed local pin after canonical GET blocks completion",
    );
    await prisma.billing_operation.update({
      where: { id: operation.id },
      data: { provider_payment_method_id: setup.paymentMethodId },
    });
    await prisma.billing_gateway_event.update({
      where: { id: raceEvent.id },
      data: { lease_until: new Date(Date.now() + 100) },
    });
    let unlock!: () => void;
    let locked!: () => void;
    const held = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const release = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const blocker = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM billing_gateway_events WHERE id = ${raceEvent.id} FOR UPDATE`;
      locked();
      await release;
    });
    await held;
    const waiting = finish(racing!, setup, identity, scope, proof);
    await new Promise((resolve) => setTimeout(resolve, 200));
    unlock();
    await blocker;
    assert.equal(
      await waiting,
      false,
      "lease expiring while waiting for FOR UPDATE never ACKs with a pre-transaction timestamp",
    );
    const reclaimed = await inbox.claim(identity);
    assert.equal(reclaimed?.id, raceEvent.id);
    const principal = await prisma.billing_operation.create({
      data: {
        ...operationData,
        kind: "payment_method",
        request_key: randomUUID(),
        provider_intent_id: setup.setupIntentId,
        provider_setup_intent_id: null,
      },
    });
    assert.equal(
      await finish(reclaimed!, setup, identity, scope, proof),
      false,
      "concurrent principal setup binding wins over the auxiliary fallback",
    );
    await prisma.billing_operation.delete({ where: { id: principal.id } });
    assert.equal(await finish(reclaimed!, setup, identity, scope, proof), true);
  } finally {
    // All rows use this run's random account/profile; never touch canonical historical events.
    await prisma.billing_gateway_event.deleteMany({ where: scoped });
    await prisma.billing_operation.deleteMany({ where: scoped });
    await prisma.billing_customer.deleteMany({ where: scoped });
    if (profileId) {
      await prisma.professional_subscription.deleteMany({ where: { psychologist_id: profileId } });
      await prisma.psychologist_profile.deleteMany({ where: { id: profileId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    if (planId) await prisma.subscription_plan.deleteMany({ where: { id: planId } });
    await prisma.$disconnect();
  }
});

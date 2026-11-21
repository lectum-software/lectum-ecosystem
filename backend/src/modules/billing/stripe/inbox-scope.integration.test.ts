import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("scoped inbox claim never consumes unrelated events or crosses account/mode", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { StripeInboxRepository } = await import("./inbox-repository");
  const { STRIPE_API_VERSION } = await import("../payment-gateway/stripe-config");
  const repository = new StripeInboxRepository();
  const tag = randomUUID();
  const identity = { accountId: `acct_scope_${tag}`, mode: "test" as const };
  const now = new Date();
  const make = (suffix: string) =>
    repository.enqueue({
      ...identity,
      eventId: `evt_${tag}_${suffix}`,
      resourceId: `in_${tag}_${suffix}`,
      type: "invoice.paid",
      apiVersion: STRIPE_API_VERSION,
      subscriptionId: null,
      created: now,
    });
  try {
    const old = await make("old");
    const selected = await make("selected");
    const at = new Date(Date.now() + 1000);
    assert.equal(await repository.claim(identity, at, ""), null);
    assert.equal(await repository.claim(identity, at, "missing"), null);
    assert.equal(
      await repository.claim({ ...identity, accountId: "another" }, at, selected.id),
      null,
    );
    assert.equal(await repository.claim({ ...identity, mode: "live" }, at, selected.id), null);
    const claimed = await repository.claim(identity, at, selected.id);
    assert.equal(claimed?.id, selected.id);
    assert.equal(await repository.claim(identity, at, selected.id), null);
    assert.deepEqual(await db.billing_gateway_event.findUnique({ where: { id: old.id } }), old);
    assert.ok(claimed);
    await repository.finish(claimed.id, claimed.lease_token, { state: "complete" });
    assert.equal(await repository.claim(identity, at, selected.id), null);
    assert.deepEqual(await db.billing_gateway_event.findUnique({ where: { id: old.id } }), old);
    assert.equal((await repository.claim(identity, at))?.id, old.id);
  } finally {
    await db.billing_gateway_event.deleteMany({ where: { account_id: identity.accountId } });
    await db.$disconnect();
  }
});

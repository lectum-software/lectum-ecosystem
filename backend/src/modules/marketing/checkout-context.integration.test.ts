import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: checkout evidence is owner-bound, immutable, expiring and revocable", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { captureCheckoutContext, readCheckoutContext } = await import("./checkout-context");
  const { captureBrowserIdentifier } = await import("./browser-identifier-repository");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const tag = randomUUID();
  const user = await db.user.create({
    data: {
      name: "Disposable checkout context",
      email: `${tag}@example.invalid`,
      role: "psicologo",
      active: true,
    },
  });
  const profile = await db.psychologist_profile.create({ data: { user_id: user.id } });
  const policy = {
    enabled: true,
    sandboxAccountId: `acct_${tag}`,
    sourceUrl: "https://example.test/subscription",
  };
  const operation = await db.billing_operation.create({
    data: {
      user_id: user.id,
      psychologist_id: profile.id,
      gateway: "stripe",
      mode: "test",
      account_id: policy.sandboxAccountId,
      kind: "checkout",
      intent: "subscription",
      request_key: tag,
      state: "requires_confirmation",
    },
  });
  const input = {
    operationId: operation.id,
    revision: 1,
    documentVersion: MARKETING_CONSENT_POLICY.documentVersion!,
  };
  try {
    assert.equal(await captureCheckoutContext(user.id, undefined, undefined, {}), false);
    await db.marketing_consent.create({
      data: {
        user_id: user.id,
        revision: 1,
        document_version: input.documentVersion,
        granted_at: new Date(Date.now() - 1000),
        expires_at: new Date(Date.now() + 90 * 86400000),
      },
    });
    const browser = await captureBrowserIdentifier(
      user.id,
      1,
      input.documentVersion,
      undefined,
      new Date(),
      { enabled: true, host: "127.0.0.1" },
    );
    assert.ok("token" in browser && browser.token);
    const token = browser.token;
    const capture = (
      change = {},
      owner = user.id,
      time = new Date(),
      agent = "Local test browser",
    ) => captureCheckoutContext(owner, token, agent, { ...input, ...change }, policy, time);
    assert.equal(await capture({ sourceUrl: "https://unreviewed.test" }), false);
    assert.equal(await capture({ capturedAtMs: Date.now() }), false);
    assert.equal(await capture({}, "other-owner"), false);
    assert.equal(await capture({ revision: 2 }), false);
    assert.equal(await capture({}, user.id, new Date(), "bad\nagent"), false);
    assert.equal(
      await db.marketing_checkout_context.count({ where: { operation_id: operation.id } }),
      0,
    );
    assert.ok((await Promise.all(Array.from({ length: 4 }, () => capture()))).every(Boolean));
    const original = await db.marketing_checkout_context.findUniqueOrThrow({
      where: { operation_id: operation.id },
    });
    assert.equal(await capture({}, user.id, new Date(), "Different browser"), true);
    assert.deepEqual(
      await db.marketing_checkout_context.findUnique({ where: { operation_id: operation.id } }),
      original,
    );
    assert.equal(original.expires_at.getTime() - original.captured_at.getTime(), 86400000);
    const read = (time = new Date(), cookie = token) =>
      db.$transaction((tx) =>
        readCheckoutContext(tx, operation.id, user.id, cookie, 1, input.documentVersion, time),
      );
    assert.equal((await read())?.clientUserAgent, "Local test browser");
    assert.equal(await read(new Date(), "0".repeat(64)), null);
    assert.equal(await read(original.expires_at), null);
    assert.equal(await capture({}, user.id, original.expires_at), false);
    await db.billing_operation.update({ where: { id: operation.id }, data: { mode: "live" } });
    assert.equal(await capture(), false);
    const livePolicy = {
      ...policy,
      sandboxAccountId: null,
      liveReview: {
        accountId: policy.sandboxAccountId,
        documentVersion: input.documentVersion,
      },
    };
    const captureLive = (override = {}) =>
      captureCheckoutContext(user.id, token, "Local test browser", input, {
        ...livePolicy,
        ...override,
      });
    assert.equal(await captureLive({ enabled: false }), false);
    assert.equal(await captureLive({ sourceUrl: "not-a-url" }), false);
    assert.equal(await captureLive({ sourceUrl: "http://example.test/subscription" }), false);
    assert.equal(
      await captureLive({
        liveReview: { ...livePolicy.liveReview, accountId: "wrong" },
      }),
      false,
    );
    assert.equal(
      await captureLive({
        liveReview: { ...livePolicy.liveReview, documentVersion: "old-notice" },
      }),
      false,
    );
    assert.equal(await captureLive({ sandboxAccountId: policy.sandboxAccountId }), false);
    assert.equal(await captureLive({ sourceUrl: "https://other.test/checkout" }), false);
    await db.marketing_checkout_context.delete({ where: { operation_id: operation.id } });
    const { META_EVENT_POLICY } = await import("./meta-policy");
    const eventPolicy = META_EVENT_POLICY.professional_checkout;
    const priorStatus = eventPolicy.externalStatus;
    const config = {
      META_CAPI_ENABLED: "true",
      META_DATASET_ID: "123456789",
      META_GRAPH_API_VERSION: "v25.0",
      META_CAPI_ACCESS_TOKEN: "local-disposable-test",
    };
    const priorEnv = Object.fromEntries(Object.keys(config).map((key) => [key, process.env[key]]));
    await db.billing_operation.update({
      where: { id: operation.id },
      data: { provider_setup_intent_id: "seti_local" },
    });
    try {
      Object.assign(process.env, config);
      eventPolicy.externalStatus = "eligible";
      assert.equal(
        await captureLive({ liveReview: { ...livePolicy.liveReview, accountId: "wrong" } }),
        false,
      );
      assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
      assert.equal(await captureLive(), true);
      const job = await db.marketing_delivery_job.findFirstOrThrow({ where: { user_id: user.id } });
      assert.equal(job.source_ref, operation.id);
      assert.equal(job.state, "pending");
      assert.equal(job.attempts, 0);
      assert.ok(
        await db.marketing_checkout_context.findUnique({ where: { operation_id: operation.id } }),
      );
      await Promise.all([captureLive(), captureLive(), captureLive()]);
      assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 1);
      assert.equal(
        (await db.marketing_delivery_job.findUniqueOrThrow({ where: { id: job.id } })).event_id,
        job.event_id,
      );
    } finally {
      eventPolicy.externalStatus = priorStatus;
      for (const [key, value] of Object.entries(priorEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    assert.equal((await read())?.sourceUrl, livePolicy.sourceUrl);
    await db.billing_operation.update({
      where: { id: operation.id },
      data: { mode: "test", state: "complete" },
    });
    assert.equal(await capture(), false);
    await new MarketingConsentRepository().revoke(user.id);
    assert.equal(await read(), null);
    assert.equal(
      await db.marketing_checkout_context.count({ where: { operation_id: operation.id } }),
      0,
    );
  } finally {
    await db.billing_operation.delete({ where: { id: operation.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});

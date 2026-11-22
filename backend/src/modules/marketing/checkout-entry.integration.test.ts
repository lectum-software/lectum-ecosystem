import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: checkout arrival is consented, deduplicated and independent of billing", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { captureCheckoutEntry, CHECKOUT_ENTRY_WINDOW_MS } = await import("./checkout-entry");
  const { captureBrowserIdentifier } = await import("./browser-identifier-repository");
  const { resolveCheckoutDeliveryEvidence } = await import("./checkout-delivery");
  const { persistProfessionalEvent } = await import("./professional-events");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const tag = randomUUID();
  const documentVersion = MARKETING_CONSENT_POLICY.documentVersion!;
  const user = await db.user.create({
    data: {
      name: "Disposable checkout arrival",
      email: `${tag}@example.invalid`,
      role: "psicologo",
      active: true,
      createdAt: new Date(Date.now() - 30 * 86400000),
    },
  });
  const profile = await db.psychologist_profile.create({ data: { user_id: user.id } });
  const plan = await db.subscription_plan.create({
    data: { slug: `local-entry-${tag}`, name: "Disposable paid plan", price_cents: 2990 },
  });
  const policy = {
    enabled: true,
    accountId: "acct_localentry",
    documentVersion,
    sourceUrl: "https://www.lectum.com.br/app/professional/billing",
  };
  const config = {
    META_CAPI_ENABLED: "true",
    META_DATASET_ID: "123456789",
    META_GRAPH_API_VERSION: "v25.0",
    META_CAPI_ACCESS_TOKEN: "local-disposable-test",
  };
  const prior = Object.fromEntries(Object.keys(config).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, config);
    await db.marketing_consent.create({
      data: {
        user_id: user.id,
        revision: 1,
        document_version: documentVersion,
        granted_at: new Date(Date.now() - 1000),
        expires_at: new Date(Date.now() + 90 * 86400000),
      },
    });
    const browser = await captureBrowserIdentifier(
      user.id,
      1,
      documentVersion,
      undefined,
      new Date(),
      { enabled: true, host: "127.0.0.1" },
    );
    assert.ok("token" in browser && browser.token);
    const now = new Date();
    const input = { revision: 1, documentVersion };
    const capture = (change = {}, owner = user.id, time = now) =>
      captureCheckoutEntry(
        owner,
        browser.token,
        "Local browser",
        { ...input, ...change },
        policy,
        time,
      );
    assert.equal(await capture({ operationId: "untrusted" }), false);
    assert.equal(await capture({ revision: 2 }), false);
    assert.equal(await capture({}, "another-user"), false);
    assert.equal(
      await captureCheckoutEntry(user.id, undefined, "Local browser", input, policy),
      false,
    );
    assert.equal(
      await captureCheckoutEntry(user.id, browser.token, "Local browser", input, {
        ...policy,
        enabled: false,
      }),
      false,
    );
    const subscription = await db.professional_subscription.create({
      data: { psychologist_id: profile.id, plan_id: plan.id, status: "ativa", source: "stripe" },
    });
    assert.equal(await capture(), false);
    await db.professional_subscription.delete({ where: { id: subscription.id } });
    assert.ok((await Promise.all([capture(), capture(), capture()])).every(Boolean));
    assert.equal(await db.billing_operation.count({ where: { user_id: user.id } }), 0);
    let jobs = await db.marketing_delivery_job.findMany({ where: { user_id: user.id } });
    assert.equal(jobs.length, 1);
    const job = jobs[0];
    assert.equal(job.conversion, "professional_checkout");
    assert.equal(job.attempts, 0);
    assert.equal(job.occurred_at.getTime(), now.getTime());
    const deliveryPolicy = {
      accountId: policy.accountId,
      documentVersion,
      sourceUrls: [policy.sourceUrl],
    };
    assert.ok(
      await db.$transaction((tx) => resolveCheckoutDeliveryEvidence(tx, job, deliveryPolicy, now)),
    );
    assert.equal(
      await db.$transaction((tx) =>
        resolveCheckoutDeliveryEvidence(
          tx,
          { ...job, user_id: "another-user" },
          deliveryPolicy,
          now,
        ),
      ),
      null,
    );
    assert.equal(
      await capture({}, user.id, new Date(now.getTime() + CHECKOUT_ENTRY_WINDOW_MS - 1)),
      true,
    );
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 1);
    // Later upgrade/return is a new entry, regardless of the original registration date or path.
    const later = new Date(now.getTime() + CHECKOUT_ENTRY_WINDOW_MS + 1);
    assert.equal(await capture({}, user.id, later), true);
    jobs = await db.marketing_delivery_job.findMany({ where: { user_id: user.id } });
    assert.equal(jobs.length, 2);
    assert.equal(new Set(jobs.map((row) => row.event_id)).size, 2);
    const expiredCourtesy = await db.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        status: "ativa",
        source: "admin_grant",
        current_period_end: new Date(now.getTime() - 1000),
      },
    });
    assert.equal(await capture({}, user.id, later), true);
    await db.professional_subscription.update({
      where: { id: expiredCourtesy.id },
      data: { current_period_end: new Date(later.getTime() + 86400000) },
    });
    assert.equal(await capture({}, user.id, later), false);
    await db.professional_subscription.delete({ where: { id: expiredCourtesy.id } });
    const operation = await db.billing_operation.create({
      data: {
        user_id: user.id,
        psychologist_id: profile.id,
        gateway: "stripe",
        mode: "live",
        account_id: policy.accountId,
        kind: "checkout",
        intent: "subscription",
        request_key: tag,
        state: "requires_confirmation",
        provider_setup_intent_id: "seti_local",
        created_at: new Date(now.getTime() - 1),
      },
    });
    await db.marketing_checkout_context.create({
      data: {
        operation_id: operation.id,
        token_hash: (
          await db.marketing_checkout_entry.findFirstOrThrow({ where: { user_id: user.id } })
        ).token_hash,
        document_version: documentVersion,
        source_url: policy.sourceUrl,
        client_user_agent: "Local browser",
        captured_at: later,
        expires_at: new Date(later.getTime() + 86400000),
      },
    });
    assert.equal(
      (
        await db.$transaction((tx) =>
          persistProfessionalEvent(tx, "professional_checkout", operation.id, later),
        )
      ).status,
      "ineligible",
    );
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 2);
    await new MarketingConsentRepository().revoke(user.id);
    assert.equal(await capture(), false);
    assert.equal(
      await db.$transaction((tx) => resolveCheckoutDeliveryEvidence(tx, job, deliveryPolicy, now)),
      null,
    );
    assert.equal(await db.marketing_checkout_entry.count({ where: { user_id: user.id } }), 0);
  } finally {
    await db.billing_operation.deleteMany({ where: { user_id: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.subscription_plan.delete({ where: { id: plan.id } });
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await db.$disconnect();
  }
});

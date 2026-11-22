import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: professional Google consent queues once and revalidates revocation", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async (t) => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  t.mock.method(globalThis, "fetch", async () => {
    assert.fail("no external transmission");
  });
  const { default: db } = await import("@/infra/database/prisma");
  const { withSerializableTransaction } = await import("@/utils/prisma-transaction");
  const { prepareUserOAuthConsent, claimUserOAuthConsent } = await import("./user-oauth-consent");
  const { REGISTRATION_DELIVERY_POLICY, resolveRegistrationDeliveryEvidence } = await import(
    "./registration-delivery"
  );
  const { persistProfessionalEvent } = await import("./professional-events");
  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const granted = new Date(now.getTime() - 5000);
  const env = {
    META_CAPI_ENABLED: "true",
    META_DATASET_ID: "123456789",
    META_GRAPH_API_VERSION: "v25.0",
    META_CAPI_ACCESS_TOKEN: "local-test-only",
  };
  const prior = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  try {
    await db.marketing_guest_attribution.create({
      data: {
        token_hash: hash,
        document_version: REGISTRATION_DELIVERY_POLICY.documentVersion!,
        granted_at: granted,
        first_at: granted,
        last_at: granted,
        first_campaigns: {},
        last_campaigns: {},
        expires_at: new Date(now.getTime() + 86400000),
        browser_fbp: `fb.1.${granted.getTime()}.123456789`,
        browser_captured_at: granted,
      },
    });
    const ref = await prepareUserOAuthConsent(db, token, new Date(now.getTime() - 2000));
    assert.ok(ref);
    await db.user.create({
      data: {
        id,
        email: `${id}@example.invalid`,
        name: "Disposable professional",
        role: "psicologo",
        provider: "google",
        active: true,
        createdAt: new Date(now.getTime() - 1000),
      },
    });
    const claim = (input = ref) =>
      withSerializableTransaction((tx) => claimUserOAuthConsent(tx, id, input, now));
    assert.equal(await claim({ ...ref, expiresAt: now.getTime() }), false);
    await db.marketing_guest_attribution.update({
      where: { token_hash: hash },
      data: { revoked: true },
    });
    assert.equal(await claim(), false);
    await db.marketing_guest_attribution.update({
      where: { token_hash: hash },
      data: { revoked: false },
    });
    assert.equal(await claim(), true);
    assert.equal(await claim(), false);
    await withSerializableTransaction((tx) =>
      persistProfessionalEvent(tx, "professional_registration", id, now),
    );
    const jobs = await db.marketing_delivery_job.findMany({ where: { user_id: id } });
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].conversion, "professional_registration");
    const evidence = await resolveRegistrationDeliveryEvidence(db, jobs[0], undefined, now);
    assert.ok(evidence);
    assert.equal(evidence.consent.grantedAt, granted.getTime());
    assert.equal(evidence.candidate.conversion, "professional_registration");
    await db.marketing_guest_attribution.update({
      where: { token_hash: hash },
      data: { revoked: true },
    });
    assert.equal(await resolveRegistrationDeliveryEvidence(db, jobs[0], undefined, now), null);
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await db.marketing_delivery_job.deleteMany({ where: { user_id: id } });
    await db.user.deleteMany({ where: { id } });
    await db.marketing_guest_attribution.deleteMany({ where: { token_hash: hash } });
    await db.$disconnect();
  }
});

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: isolated registration automation rejects refusal/revocation and preserves identity", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async (t) => {
  const previousEnabled = process.env.META_CAPI_ENABLED;
  process.env.META_CAPI_ENABLED = "false";
  t.after(() => {
    if (previousEnabled === undefined) delete process.env.META_CAPI_ENABLED;
    else process.env.META_CAPI_ENABLED = previousEnabled;
  });
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { AttributionRepository, attributionTokenHash } = await import("./attribution-repository");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const { persistProfessionalEvent, professionalActionCommitted } = await import(
    "./professional-events"
  );
  const { resolveRegistrationDeliveryEvidence } = await import("./registration-delivery");
  const { withSerializableTransaction } = await import("@/utils/prisma-transaction");
  const now = new Date();
  const granted = new Date(now.getTime() - 120_000);
  const created = new Date(now.getTime() - 60_000);
  const policy = {
    ...MARKETING_CONSENT_POLICY,
    acquisitionEnabled: true,
    campaigns: { utm_campaign: ["synthetic_a"] },
  };
  const deliveryPolicy = {
    documentVersion: policy.documentVersion!,
    sourceUrl: "https://registration.example.test/auth/register/psychologist",
  };
  const token = randomBytes(32).toString("hex");
  const hash = attributionTokenHash(token);
  const consent = new MarketingConsentRepository(policy);
  const attribution = new AttributionRepository(policy);
  const user = await db.user.create({
    data: {
      name: "Disposable automation",
      email: `${randomUUID()}@example.invalid`,
      role: "psicologo",
      createdAt: created,
    },
  });
  const persist = () =>
    withSerializableTransaction((tx) =>
      persistProfessionalEvent(tx, "professional_registration", user.id, now),
    );
  try {
    assert.equal((await persist()).status, "ineligible");
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
    await attribution.captureGuest(
      {
        token,
        accepted: true,
        document_version: policy.documentVersion!,
        campaigns: { utm_campaign: "synthetic_a" },
      },
      granted,
    );
    await consent.grant(
      user.id,
      {
        accepted: true,
        document_version: policy.documentVersion!,
        expected_revision: 0,
        guest_token: token,
        authorize_transfer: true,
      },
      now,
    );
    await db.marketing_browser_identifier.create({
      data: {
        token_hash: hash,
        user_id: user.id,
        consent_revision: 1,
        fbp: `fb.1.${granted.getTime()}.123456789`,
        captured_at: granted,
        expires_at: new Date(now.getTime() + 86_400_000),
      },
    });
    await Promise.all(Array.from({ length: 4 }, persist));
    const jobs = await db.marketing_delivery_job.findMany({ where: { user_id: user.id } });
    assert.equal(jobs.length, 1);
    const job = jobs[0];
    const evidence = () =>
      db.$transaction((tx) => resolveRegistrationDeliveryEvidence(tx, job, deliveryPolicy, now));
    assert.ok(await evidence());
    // A repeated observation/login cannot move the registration timestamp or mint a second event.
    await persist();
    assert.equal(
      (await db.marketing_delivery_job.findUniqueOrThrow({ where: { id: job.id } })).event_id,
      job.event_id,
    );
    assert.equal(job.occurred_at.getTime(), created.getTime());
    await db.user.update({ where: { id: user.id }, data: { role: "paciente" } });
    assert.equal(await evidence(), null);
    assert.equal((await persist()).status, "ineligible");
    await db.user.update({ where: { id: user.id }, data: { role: "psicologo" } });
    assert.deepEqual(
      await professionalActionCommitted("professional_registration", () => user.id),
      { status: "disabled" },
    );
    await attribution.revokeGuest(token);
    assert.equal(await evidence(), null);
    await consent.revoke(user.id, now);
    assert.equal((await persist()).status, "ineligible");
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
    await consent.grant(
      user.id,
      { accepted: true, document_version: policy.documentVersion!, expected_revision: 2 },
      now,
    );
    assert.equal((await persist()).status, "ineligible");
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.marketing_guest_attribution.deleteMany({ where: { token_hash: hash } });
    await db.$disconnect();
  }
});

import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import type { Request, Response } from "express";
import { marketingRequestContext } from "./request-context";

test("PostgreSQL: email registration claims prior consent atomically and queues one minimal event", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async (t) => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const network = t.mock.method(globalThis, "fetch", async () =>
    assert.fail("no external transmission"),
  );
  const { default: db } = await import("@/infra/database/prisma");
  const { StoreRepository } = await import(
    "@/modules/api/public/user/store/repositories/StoreRepository"
  );
  const { USER_DELIVERY_POLICY } = await import("./user-events");
  const { resolveUserDeliveryEvidence } = await import("./user-delivery");
  const { AttributionRepository } = await import("./attribution-repository");
  const directToken = randomBytes(32).toString("hex");
  const browserToken = randomBytes(32).toString("hex");
  const browserHash = createHash("sha256").update(browserToken).digest("hex");
  const directHash = createHash("sha256").update(directToken).digest("hex");
  const originalVersion = USER_DELIVERY_POLICY.documentVersion;
  const originalUrls = USER_DELIVERY_POLICY.sourceUrls;
  const version = "synthetic-email-consent";
  const sourceUrl = "https://community.example.test/register";
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const grantedAt = new Date(Date.now() - 5000);
  const expiresAt = new Date(Date.now() + 600000);
  const emails = Array.from({ length: 5 }, () => `${randomUUID()}@example.invalid`);
  const users: string[] = [];
  const create = async (i: number, guestToken?: string) => {
    const store = () =>
      new StoreRepository().store({
        p: {},
        q: {},
        headers: { referer: sourceUrl },
        b: {
          name: "Disposable email test",
          email: emails[i],
          password: "unused-test-hash",
          password_confirm: "unused-test-hash",
          role: "paciente",
          adult_confirmed: true,
          birthdate: "1990-01-01",
          terms_accepted: true,
          marketing_guest_token: guestToken,
        },
      });
    const user = await new Promise<Awaited<ReturnType<typeof store>>>((resolve, reject) => {
      marketingRequestContext(
        {
          path: "/api/public/user",
          get: () => "Lectum-integration-test/1",
          app: { get: () => false },
          ip: "127.0.0.1",
        } as unknown as Request,
        {} as Response,
        () => {
          void store().then(resolve, reject);
        },
      );
    });
    assert.ok(user.id);
    users.push(user.id);
    return { ...user, id: user.id };
  };
  try {
    USER_DELIVERY_POLICY.documentVersion = version;
    USER_DELIVERY_POLICY.sourceUrls = { patient_registration: [sourceUrl] };
    await db.marketing_guest_attribution.create({
      data: {
        token_hash: tokenHash,
        document_version: version,
        granted_at: grantedAt,
        first_at: grantedAt,
        last_at: grantedAt,
        first_campaigns: {},
        last_campaigns: {},
        expires_at: expiresAt,
        browser_fbp: `fb.1.${grantedAt.getTime()}.123456789`,
        browser_captured_at: grantedAt,
      },
    });
    const owner = await create(0, token);
    const consent = await db.marketing_consent.findUniqueOrThrow({ where: { user_id: owner.id } });
    assert.equal(consent.granted_at?.getTime(), grantedAt.getTime());
    assert.equal(consent.expires_at?.getTime(), expiresAt.getTime());
    assert.equal(
      await db.marketing_consent_event.count({
        where: { user_id: owner.id, action: "email_guest_claim" },
      }),
      1,
    );
    const jobs = await db.marketing_delivery_job.findMany({ where: { user_id: owner.id } });
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].conversion, "patient_registration");
    assert.equal(jobs[0].source_url, sourceUrl);
    assert.equal(jobs[0].client_user_agent, "Lectum-integration-test/1");
    assert.equal(
      (await resolveUserDeliveryEvidence(db, jobs[0]))?.candidate.clientUserAgent,
      "Lectum-integration-test/1",
    );
    assert.ok(await resolveUserDeliveryEvidence(db, jobs[0]));
    const reused = await create(1, token);
    const absent = await create(2);
    for (const id of [reused.id, absent.id]) {
      assert.equal(await db.marketing_consent.count({ where: { user_id: id } }), 0);
      assert.equal(await db.marketing_delivery_job.count({ where: { user_id: id } }), 0);
    }
    const captured = await new AttributionRepository({
      acquisitionEnabled: true,
      documentVersion: version,
      maxAgeMs: 600000,
      campaigns: {},
    }).captureGuest(
      { token: directToken, accepted: true, document_version: version, campaigns: {} },
      grantedAt,
    );
    assert.equal(captured.enabled, true);
    const direct = await create(3, directToken);
    const directConsent = await db.marketing_consent.findUniqueOrThrow({
      where: { user_id: direct.id },
    });
    assert.equal(directConsent.granted_at?.getTime(), grantedAt.getTime());
    assert.equal(directConsent.revoked_at, null);
    const directGuest = await db.marketing_guest_attribution.findUniqueOrThrow({
      where: { token_hash: directHash },
    });
    assert.equal(directGuest.claimed, true);
    assert.equal(directGuest.browser_fbp, null);
    assert.deepEqual(directGuest.first_campaigns, {});
    const reviewed = new AttributionRepository(
      { acquisitionEnabled: true, documentVersion: version, maxAgeMs: 600000, campaigns: {} },
      { enabled: true, host: "127.0.0.1", anonymousDirectVisits: true },
    );
    await reviewed.captureGuest({
      token: browserToken,
      accepted: true,
      document_version: version,
      campaigns: {},
    });
    const capturedBrowser = await db.marketing_guest_attribution.findUniqueOrThrow({
      where: { token_hash: browserHash },
    });
    assert.ok(capturedBrowser.browser_fbp);
    assert.ok(capturedBrowser.browser_captured_at);
    assert.ok(capturedBrowser.browser_captured_at >= capturedBrowser.granted_at);
    const browserOwner = await create(4, browserToken);
    const browserJob = await db.marketing_delivery_job.findFirstOrThrow({
      where: { user_id: browserOwner.id },
    });
    const evidence = await resolveUserDeliveryEvidence(db, browserJob);
    assert.ok(evidence, "Direct registration must be eligible with consented browser evidence");
    const { buildConsentedMetaCapiPayload } = await import("./meta-capi");
    const payload = buildConsentedMetaCapiPayload(
      evidence,
      [sourceUrl],
      version,
      Date.now(),
      USER_DELIVERY_POLICY.sourceUrls,
    );
    assert.equal(payload?.data[0].event_name, "CompleteRegistration");
    assert.deepEqual(payload?.data[0].custom_data, { account_type: "user" });
    assert.equal(payload?.data[0].user_data.client_user_agent, "Lectum-integration-test/1");
    const { MarketingDeliveryJobs } = await import("./delivery-jobs");
    const queue = new MarketingDeliveryJobs();
    const claimed = await queue.claim(new Date(), { userId: browserOwner.id });
    assert.ok(claimed);
    await queue.settle(claimed, "blocked");
    const settled = await db.marketing_delivery_job.findUniqueOrThrow({
      where: { id: claimed.id },
    });
    assert.equal(settled.client_user_agent, null);
    assert.equal(settled.client_ip_address, null);
    assert.equal(network.mock.callCount(), 0);
  } finally {
    USER_DELIVERY_POLICY.documentVersion = originalVersion;
    USER_DELIVERY_POLICY.sourceUrls = originalUrls;
    await db.marketing_delivery_job.deleteMany({ where: { user_id: { in: users } } });
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.marketing_guest_attribution.deleteMany({
      where: { token_hash: { in: [tokenHash, directHash, browserHash] } },
    });
    await db.$disconnect();
  }
});

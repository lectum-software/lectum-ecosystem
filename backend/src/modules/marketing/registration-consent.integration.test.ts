import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

for (const directVisit of [false, true]) {
  test(`PostgreSQL: prior guest consent covers canonical registration (direct=${directVisit})`, {
    skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
  }, async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
    assert.equal(url.pathname, "/lectum_stripe_test");
    const { default: db } = await import("@/infra/database/prisma");
    const { withSerializableTransaction } = await import("@/utils/prisma-transaction");
    const { AttributionRepository, attributionTokenHash } = await import(
      "./attribution-repository"
    );
    const { MarketingConsentRepository } = await import("./consent-repository");
    const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
    const { persistProfessionalEvent } = await import("./professional-events");
    const { MarketingDeliveryJobs } = await import("./delivery-jobs");
    const { registrationConsentStart } = await import("./registration-consent");
    const now = new Date();
    const first = new Date(now.getTime() - 7 * 86_400_000);
    const created = new Date(now.getTime() - 60_000);
    const linked = new Date(now.getTime() - 30_000);
    const policy = {
      ...MARKETING_CONSENT_POLICY,
      acquisitionEnabled: true,
      campaigns: { utm_campaign: ["a", "b"] },
    };
    const repo = new AttributionRepository(policy, { enabled: false, host: null });
    const consent = new MarketingConsentRepository(policy);
    const token = randomBytes(32).toString("hex");
    const hash = attributionTokenHash(token);
    const user = await db.user.create({
      data: {
        name: "Disposable consent bridge",
        email: `${randomUUID()}@example.invalid`,
        role: "psicologo",
        createdAt: created,
      },
    });
    const resolve = () =>
      db.$transaction((tx) =>
        registrationConsentStart(tx, user.id, 1, policy.documentVersion!, created, now),
      );
    const persist = () =>
      withSerializableTransaction((tx) =>
        persistProfessionalEvent(tx, "professional_registration", user.id, now),
      );
    try {
      await repo.captureGuest(
        {
          token,
          accepted: true,
          document_version: policy.documentVersion!,
          campaigns: directVisit ? {} : { utm_campaign: "a" },
        },
        first,
      );
      await db.$disconnect();
      await repo.captureGuest(
        {
          token,
          accepted: true,
          document_version: policy.documentVersion!,
          campaigns: directVisit ? {} : { utm_campaign: "b" },
        },
        created,
      );
      assert.equal(await resolve(), null);
      await assert.rejects(
        consent.grant(
          user.id,
          {
            accepted: true,
            document_version: policy.documentVersion!,
            expected_revision: 0,
            guest_token: token,
          },
          linked,
        ),
      );
      assert.equal(await resolve(), null);
      await consent.grant(
        user.id,
        {
          accepted: true,
          document_version: policy.documentVersion!,
          expected_revision: 0,
          guest_token: token,
          authorize_transfer: true,
        },
        linked,
      );
      // The public hook remains blocked even after the authorized transfer.
      assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
      assert.equal((await resolve())?.getTime(), first.getTime());
      assert.equal(
        (
          await db.marketing_consent.findUniqueOrThrow({
            where: { user_id: user.id },
          })
        ).granted_at?.getTime(),
        linked.getTime(),
      );
      const attribution = await db.marketing_attribution.findUniqueOrThrow({
        where: { user_id: user.id },
      });
      assert.deepEqual(attribution.campaigns, directVisit ? {} : { utm_campaign: "a" });
      assert.deepEqual(attribution.last_campaigns, directVisit ? {} : { utm_campaign: "b" });
      for (const data of [
        { revoked: true },
        { claimed: false },
        { document_version: "old" },
        { granted_at: linked },
        { expires_at: created },
      ]) {
        const original = await db.marketing_guest_attribution.findUniqueOrThrow({
          where: { token_hash: hash },
        });
        await db.marketing_guest_attribution.update({ where: { token_hash: hash }, data });
        assert.equal(await resolve(), null);
        assert.equal((await persist()).status, "ineligible");
        await db.marketing_guest_attribution.update({
          where: { token_hash: hash },
          data: {
            revoked: original.revoked,
            claimed: original.claimed,
            document_version: original.document_version,
            granted_at: original.granted_at,
            expires_at: original.expires_at,
          },
        });
      }
      await Promise.all(Array.from({ length: 4 }, persist));
      const jobs = new MarketingDeliveryJobs();
      const rows = await db.marketing_delivery_job.findMany({ where: { user_id: user.id } });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].occurred_at.getTime(), created.getTime());
      assert.equal(rows[0].source_ref, user.id);
      const { resolveRegistrationDeliveryEvidence } = await import("./registration-delivery");
      const { buildConsentedMetaCapiPayload } = await import("./meta-capi");
      const deliveryPolicy = {
        documentVersion: policy.documentVersion!,
        sourceUrl: "https://registration.example.test/auth/register/psychologist",
      };
      const delivery = () =>
        db.$transaction((tx) =>
          resolveRegistrationDeliveryEvidence(tx, rows[0], deliveryPolicy, now),
        );
      assert.equal(await delivery(), null);
      await db.marketing_browser_identifier.create({
        data: {
          token_hash: hash,
          user_id: user.id,
          consent_revision: 1,
          fbp: `fb.1.${first.getTime()}.123456789`,
          captured_at: first,
          expires_at: new Date(now.getTime() + 86_400_000),
        },
      });
      assert.equal(
        await resolveRegistrationDeliveryEvidence(db, rows[0], {
          documentVersion: null,
          sourceUrl: null,
        }),
        null,
      );
      const evidence = await delivery();
      assert.ok(evidence);
      const payload = buildConsentedMetaCapiPayload(
        evidence,
        [deliveryPolicy.sourceUrl],
        deliveryPolicy.documentVersion,
        now.getTime(),
      );
      assert.equal(payload?.data[0].event_name, "CompleteRegistration");
      assert.deepEqual(payload?.data[0].custom_data, { account_type: "professional" });
      assert.deepEqual(Object.keys(payload!.data[0].user_data), ["fbp"]);
      assert.equal((await delivery())?.candidate.eventId, evidence.candidate.eventId);
      for (const change of [
        { conversion: "professional_subscription" },
        { occurred_at: now },
        { source_ref: randomUUID() },
        { consent_revision: 2 },
      ]) {
        assert.equal(
          await resolveRegistrationDeliveryEvidence(
            db,
            { ...rows[0], ...change },
            deliveryPolicy,
            now,
          ),
          null,
        );
      }
      await db.user.update({ where: { id: user.id }, data: { role: "paciente" } });
      assert.equal(await delivery(), null);
      await db.user.update({ where: { id: user.id }, data: { role: "psicologo" } });
      await db.marketing_browser_identifier.update({
        where: { token_hash: hash },
        data: { captured_at: linked },
      });
      assert.equal(await delivery(), null);
      await db.marketing_browser_identifier.update({
        where: { token_hash: hash },
        data: { captured_at: first },
      });
      assert.equal(
        await resolveRegistrationDeliveryEvidence(
          db,
          rows[0],
          { ...deliveryPolicy, documentVersion: "old" },
          now,
        ),
        null,
      );
      assert.equal(
        await resolveRegistrationDeliveryEvidence(
          db,
          rows[0],
          deliveryPolicy,
          new Date(now.getTime() + 8 * 86_400_000),
        ),
        null,
      );
      await assert.rejects(
        jobs.enqueue(
          {
            eventId: randomBytes(32).toString("hex"),
            conversion: "professional_checkout",
            sourceRef: user.id,
            userId: user.id,
            consentRevision: 1,
            occurredAt: created,
          },
          now,
        ),
        /consent_required/,
      );
      assert.equal((await jobs.claim(now, { userId: user.id }))?.id, rows[0].id);
      await jobs.settle(
        await db.marketing_delivery_job.findUniqueOrThrow({ where: { id: rows[0].id } }),
        "retry",
        now,
      );
      await repo.revokeGuest(token);
      assert.equal(await delivery(), null);
      assert.equal(await jobs.claim(new Date(now.getTime() + 120_000), { userId: user.id }), null);
      assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
      assert.equal(await resolve(), null);
      await consent.revoke(user.id, now);
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
}

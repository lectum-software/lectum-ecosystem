import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

for (const provider of ["google", "manual"] as const) {
  test(`PostgreSQL: user ${provider} claim revalidates, consumes once and propagates revocation`, {
    skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
  }, async (t) => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.port, "55443");
    assert.equal(url.pathname, "/lectum_stripe_test");
    const network = t.mock.method(globalThis, "fetch", async () => {
      assert.fail("no external transmission");
    });
    const { default: db } = await import("@/infra/database/prisma");
    const { withSerializableTransaction } = await import("@/utils/prisma-transaction");
    const { USER_DELIVERY_POLICY, persistUserEvent } = await import("./user-events");
    const { prepareUserOAuthConsent, claimUserOAuthConsent, claimUserEmailConsent } = await import(
      "./user-oauth-consent"
    );
    const { AttributionRepository } = await import("./attribution-repository");
    const { resolveUserDeliveryEvidence } = await import("./user-delivery");
    const { buildConsentedMetaCapiPayload } = await import("./meta-capi");
    const prior = USER_DELIVERY_POLICY.documentVersion;
    const priorUrls = USER_DELIVERY_POLICY.sourceUrls;
    const sourceUrl = "https://community.example.test/";
    const communityId = randomUUID();
    const postId = randomUUID();
    const actionId = randomUUID();
    const version = "synthetic-user-oauth-notice";
    const now = new Date();
    const prepareAt = new Date(now.getTime() - 2000);
    const granted = new Date(now.getTime() - 5000);
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const users = [randomUUID(), randomUUID()];
    try {
      assert.equal(await prepareUserOAuthConsent(db, token, prepareAt), null);
      USER_DELIVERY_POLICY.documentVersion = version;
      USER_DELIVERY_POLICY.sourceUrls = {
        patient_registration: [sourceUrl],
        patient_contact: [sourceUrl],
        patient_community_post: [sourceUrl],
      };
      await db.marketing_guest_attribution.create({
        data: {
          token_hash: tokenHash,
          document_version: version,
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
      const ref = await prepareUserOAuthConsent(db, token, prepareAt, sourceUrl);
      assert.ok(ref);
      for (const id of users)
        await db.user.create({
          data: {
            id,
            email: `${id}@example.invalid`,
            name: "Disposable OAuth test",
            role: "paciente",
            provider,
            active: true,
            createdAt: new Date(now.getTime() - 1000),
          },
        });
      const claim = (id: string, input = ref) =>
        withSerializableTransaction((tx) =>
          (provider === "google" ? claimUserOAuthConsent : claimUserEmailConsent)(
            tx,
            id,
            input,
            now,
          ),
        );
      await db.user.update({ where: { id: users[0] }, data: { role: "psicologo" } });
      assert.equal(await claim(users[0]), false);
      await db.user.update({ where: { id: users[0] }, data: { role: "paciente" } });
      assert.equal(await claim(users[0], { ...ref, expiresAt: now.getTime() }), false);
      await db.marketing_guest_attribution.update({
        where: { token_hash: tokenHash },
        data: { revoked: true },
      });
      assert.equal(await claim(users[0]), false);
      await db.marketing_guest_attribution.update({
        where: { token_hash: tokenHash },
        data: { revoked: false, document_version: "other" },
      });
      assert.equal(await claim(users[0]), false);
      await db.marketing_guest_attribution.update({
        where: { token_hash: tokenHash },
        data: { document_version: version },
      });
      await db.user.update({
        where: { id: users[0] },
        data: { provider: provider === "google" ? "manual" : "google" },
      });
      assert.equal(await claim(users[0]), false);
      await db.user.update({ where: { id: users[0] }, data: { provider } });
      const results = await Promise.all(users.map((id) => claim(id)));
      assert.equal(results.filter(Boolean).length, 1);
      const owner = users[results.findIndex(Boolean)];
      const consent = await db.marketing_consent.findUniqueOrThrow({ where: { user_id: owner } });
      assert.equal(consent.granted_at?.getTime(), granted.getTime());
      assert.equal(consent.revision, 1);
      const queued = await withSerializableTransaction((tx) =>
        persistUserEvent(tx, "patient_registration", owner, owner, now, sourceUrl),
      );
      assert.equal(queued.status, "queued");
      await db.community.create({
        data: { id: communityId, name: "Disposable test", slug: communityId },
      });
      await db.community_post.create({
        data: {
          id: postId,
          community_id: communityId,
          author_id: owner,
          title: "Not exported",
          content: "Not exported",
          anonymous: false,
          status: "publicado",
          createdAt: now,
        },
      });
      await db.important_action_event.create({
        data: {
          id: actionId,
          user_id: owner,
          visitor_id: randomUUID(),
          session_id: randomUUID(),
          action_type: "whatsapp_click",
          createdAt: now,
          occurred_at: now,
          path: "/not-exported",
          target_id: "not-exported",
        },
      });
      for (const [conversion, sourceRef, name] of [
        ["patient_registration", owner, "CompleteRegistration"],
        ["patient_contact", actionId, "Contact"],
        ["patient_community_post", postId, "forum_post"],
      ] as const) {
        await withSerializableTransaction((tx) =>
          persistUserEvent(tx, conversion, sourceRef, owner, now, sourceUrl),
        );
        const job = await db.marketing_delivery_job.findUniqueOrThrow({
          where: { conversion_source_ref: { conversion, source_ref: sourceRef } },
        });
        const evidence = await resolveUserDeliveryEvidence(db, job, now);
        assert.ok(evidence);
        const payload = buildConsentedMetaCapiPayload(
          evidence,
          [sourceUrl],
          version,
          now.getTime(),
          USER_DELIVERY_POLICY.sourceUrls,
        )!;
        assert.equal(payload.data[0].event_name, name);
        assert.equal(payload.data[0].event_source_url, sourceUrl);
        assert.deepEqual(Object.keys(payload.data[0].user_data), ["fbp"]);
        assert.equal(JSON.stringify(payload).includes("Not exported"), false);
        assert.equal(
          await resolveUserDeliveryEvidence(db, { ...job, source_url: null }, now),
          null,
        );
        assert.equal(
          await resolveUserDeliveryEvidence(
            db,
            { ...job, source_url: `${sourceUrl}?topic=private` },
            now,
          ),
          null,
        );
        assert.equal(
          await resolveUserDeliveryEvidence(db, { ...job, consent_revision: 2 }, now),
          null,
        );
        assert.equal(
          await resolveUserDeliveryEvidence(
            db,
            { ...job, user_id: users.find((id) => id !== owner)! },
            now,
          ),
          null,
        );
        await assert.rejects(
          withSerializableTransaction((tx) =>
            persistUserEvent(tx, conversion, sourceRef, owner, now),
          ),
          /identity_conflict/,
        );
      }
      await db.community_post.update({ where: { id: postId }, data: { anonymous: true } });
      const postJob = await db.marketing_delivery_job.findUniqueOrThrow({
        where: {
          conversion_source_ref: { conversion: "patient_community_post", source_ref: postId },
        },
      });
      const anonymousEvidence = await resolveUserDeliveryEvidence(db, postJob, now);
      assert.ok(anonymousEvidence);
      const anonymousPayload = buildConsentedMetaCapiPayload(
        anonymousEvidence,
        [sourceUrl],
        version,
        now.getTime(),
        USER_DELIVERY_POLICY.sourceUrls,
      );
      assert.ok(anonymousPayload);
      assert.equal(anonymousPayload.data[0].event_name, "forum_post");
      assert.equal(JSON.stringify(anonymousPayload).includes("Not exported"), false);
      assert.equal(
        await db.marketing_browser_identifier.count({
          where: { token_hash: tokenHash, user_id: owner },
        }),
        1,
      );
      assert.equal(await claim(owner), false);
      assert.equal(await prepareUserOAuthConsent(db, token), null);
      await new AttributionRepository().revokeGuest(token);
      const registrationJob = await db.marketing_delivery_job.findUniqueOrThrow({
        where: { conversion_source_ref: { conversion: "patient_registration", source_ref: owner } },
      });
      assert.equal(await resolveUserDeliveryEvidence(db, registrationJob, now), null);
      assert.equal(await resolveUserDeliveryEvidence(db, postJob, now), null);
      assert.ok(
        (await db.marketing_consent.findUniqueOrThrow({ where: { user_id: owner } })).revoked_at,
      );
      assert.equal(
        await db.marketing_browser_identifier.count({ where: { token_hash: tokenHash } }),
        0,
      );
      assert.equal(
        await db.marketing_consent_event.count({
          where: { user_id: owner, action: "guest_revocation" },
        }),
        1,
      );
      assert.equal(
        (
          await withSerializableTransaction((tx) =>
            persistUserEvent(tx, "patient_registration", owner, owner, now),
          )
        ).status,
        "ineligible",
      );
      assert.equal(network.mock.callCount(), 0);
    } finally {
      USER_DELIVERY_POLICY.documentVersion = prior;
      USER_DELIVERY_POLICY.sourceUrls = priorUrls;
      await db.marketing_delivery_job.deleteMany({ where: { user_id: { in: users } } });
      await db.important_action_event.deleteMany({ where: { id: actionId } });
      await db.community_post.deleteMany({ where: { id: postId } });
      await db.community.deleteMany({ where: { id: communityId } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.marketing_guest_attribution.deleteMany({ where: { token_hash: tokenHash } });
      await db.$disconnect();
    }
  });
}

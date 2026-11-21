import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: local user queue preserves canonical identity and consent boundaries", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async (t) => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const network = t.mock.method(globalThis, "fetch", async () => {
    assert.fail("local preparation must not transmit");
  });
  const { default: db } = await import("@/infra/database/prisma");
  const { withSerializableTransaction } = await import("@/utils/prisma-transaction");
  const { persistUserEvent, USER_DELIVERY_POLICY } = await import("./user-events");
  const { resolveDeliverySource } = await import("./delivery-source");
  const { MarketingDeliveryJobs } = await import("./delivery-jobs");
  const now = new Date();
  const occurredAt = new Date(now.getTime() - 60000);
  const userId = randomUUID();
  const communityId = randomUUID();
  const postId = randomUUID();
  const actionId = randomUUID();
  const version = "synthetic-local-user-review";
  const previous = USER_DELIVERY_POLICY.documentVersion;
  const persist = (
    conversion: "patient_registration" | "patient_contact" | "patient_community_post",
    ref: string,
  ) => withSerializableTransaction((tx) => persistUserEvent(tx, conversion, ref, userId, now));
  try {
    await db.user.create({
      data: {
        id: userId,
        email: `${userId}@example.invalid`,
        name: "Disposable user queue",
        role: "paciente",
        active: true,
        createdAt: occurredAt,
      },
    });
    await db.community.create({
      data: {
        id: communityId,
        name: "Disposable queue QA",
        slug: `queue-${communityId}`,
      },
    });
    await db.community_post.create({
      data: {
        id: postId,
        community_id: communityId,
        author_id: userId,
        title: "Disposable test",
        content: "Synthetic local fixture",
        anonymous: false,
        status: "publicado",
        createdAt: occurredAt,
      },
    });
    await db.important_action_event.create({
      data: {
        id: actionId,
        user_id: userId,
        visitor_id: randomUUID(),
        session_id: randomUUID(),
        action_type: "whatsapp_click",
        createdAt: occurredAt,
        occurred_at: new Date(now.getTime() - 10000000),
        path: "/not-for-export",
        target_id: "not-for-export",
      },
    });
    USER_DELIVERY_POLICY.documentVersion = null;
    assert.equal((await persist("patient_registration", userId)).status, "blocked");
    USER_DELIVERY_POLICY.documentVersion = version;
    assert.equal((await persist("patient_registration", userId)).status, "ineligible");
    // Synthetic historical consent tests storage semantics, not real OAuth consent capture.
    await db.marketing_consent.create({
      data: {
        user_id: userId,
        revision: 1,
        document_version: version,
        granted_at: new Date(occurredAt.getTime() - 1000),
        expires_at: new Date(now.getTime() + 86400000),
      },
    });
    for (const [conversion, ref] of [
      ["patient_registration", userId],
      ["patient_contact", actionId],
      ["patient_community_post", postId],
    ] as const) {
      const results = await Promise.all(Array.from({ length: 3 }, () => persist(conversion, ref)));
      assert.ok(results.every((result) => result.status === "queued"));
      const rows = await db.marketing_delivery_job.findMany({
        where: {
          user_id: userId,
          conversion,
        },
      });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].occurred_at.getTime(), occurredAt.getTime());
      const id = rows[0].event_id;
      assert.equal((await persist(conversion, ref)).status, "queued");
      assert.equal(
        (
          await db.marketing_delivery_job.findUniqueOrThrow({
            where: { id: rows[0].id },
          })
        ).event_id,
        id,
      );
      assert.deepEqual(await resolveDeliverySource(db, rows[0]), { occurredAt });
    }
    assert.equal((await persist("patient_registration", randomUUID())).status, "ineligible");
    await db.community_post.update({ where: { id: postId }, data: { anonymous: true } });
    assert.equal((await persist("patient_community_post", postId)).status, "ineligible");
    await db.community_post.update({
      where: { id: postId },
      data: { anonymous: false, status: "bloqueado" },
    });
    assert.equal((await persist("patient_community_post", postId)).status, "ineligible");
    await db.important_action_event.update({ where: { id: actionId }, data: { deleted: true } });
    assert.equal((await persist("patient_contact", actionId)).status, "ineligible");
    await assert.rejects(
      db.$transaction((tx) =>
        new MarketingDeliveryJobs().enqueueInTransaction(
          tx,
          {
            conversion: "patient_registration",
            sourceRef: userId,
            userId,
            eventId: "b".repeat(64),
            occurredAt: now,
            consentRevision: 1,
          },
          now,
        ),
      ),
      /marketing_delivery_source_invalid/,
    );
    await db.marketing_consent.update({ where: { user_id: userId }, data: { revoked_at: now } });
    assert.equal((await persist("patient_registration", userId)).status, "ineligible");
    await db.marketing_consent.update({
      where: { user_id: userId },
      data: {
        revoked_at: null,
        granted_at: now,
        revision: 2,
      },
    });
    assert.equal((await persist("patient_registration", userId)).status, "ineligible");
    assert.equal(network.mock.callCount(), 0);
  } finally {
    USER_DELIVERY_POLICY.documentVersion = previous;
    await db.marketing_delivery_job.deleteMany({ where: { user_id: userId } });
    await db.important_action_event.deleteMany({ where: { id: actionId } });
    await db.community_post.deleteMany({ where: { id: postId } });
    await db.community.deleteMany({ where: { id: communityId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
});

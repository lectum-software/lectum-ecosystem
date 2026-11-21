import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: canonical checkout reference, no late registration consent, rollback and replay", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { withSerializableTransaction } = await import("@/utils/prisma-transaction");
  const { persistProfessionalEvent, professionalActionCommitted } = await import(
    "./professional-events"
  );
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const tag = randomUUID();
  const now = new Date();
  const user = await db.user.create({
    data: {
      name: "Disposable events",
      email: `${tag}@example.invalid`,
      role: "psicologo",
      createdAt: new Date(now.getTime() - 60_000),
    },
  });
  const consent = new MarketingConsentRepository();
  try {
    await consent.grant(
      user.id,
      {
        accepted: true,
        document_version: MARKETING_CONSENT_POLICY.documentVersion!,
        expected_revision: 0,
      },
      new Date(now.getTime() - 30_000),
    );
    assert.equal(
      (
        await db.$transaction((tx) =>
          persistProfessionalEvent(tx, "professional_registration", user.id, now),
        )
      ).status,
      "ineligible",
    );
    const operation = await db.billing_operation.create({
      data: {
        user_id: user.id,
        psychologist_id: tag,
        gateway: "stripe",
        mode: "live",
        account_id: `acct_${tag}`,
        kind: "checkout",
        intent: "subscription",
        request_key: tag,
        state: "requires_confirmation",
        provider_setup_intent_id: `seti_${tag}`,
        created_at: new Date(now.getTime() - 10_000),
      },
    });
    assert.equal(
      (
        await professionalActionCommitted("professional_checkout", () => {
          throw new Error("blocked_identity");
        })
      ).status,
      "blocked",
    );
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
    await assert.rejects(
      db.$transaction(async (tx) => {
        assert.equal(
          (await persistProfessionalEvent(tx, "professional_checkout", operation.id, now)).status,
          "queued",
        );
        throw new Error("rollback_fixture");
      }),
      /rollback_fixture/,
    );
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
    await Promise.all(
      Array.from({ length: 4 }, () =>
        withSerializableTransaction((tx) =>
          persistProfessionalEvent(tx, "professional_checkout", operation.id, now),
        ),
      ),
    );
    const rows = await db.marketing_delivery_job.findMany({ where: { user_id: user.id } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].occurred_at.getTime(), operation.created_at.getTime());
    assert.equal(rows[0].source_ref, operation.id);
    assert.equal(rows[0].consent_revision, 1);
    const { recoverProfessionalPage, recoverProfessionalEvents } = await import(
      "./professional-recovery"
    );
    await db.marketing_delivery_job.deleteMany({ where: { user_id: user.id } });
    await recoverProfessionalEvents();
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
    // Lost post-commit callback: the canonical checkout reconstructs exactly one reference.
    let cursor: string | undefined;
    do {
      cursor = (
        await recoverProfessionalPage("professional_checkout", cursor, now, 1, operation.created_at)
      ).next;
    } while (cursor);
    const recovered = await db.marketing_delivery_job.findFirstOrThrow({
      where: { user_id: user.id },
    });
    await recoverProfessionalPage(
      "professional_checkout",
      undefined,
      now,
      50,
      operation.created_at,
    );
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 1);
    assert.equal(
      (await db.marketing_delivery_job.findFirstOrThrow({ where: { user_id: user.id } })).event_id,
      recovered.event_id,
    );
    const { resolveDeliverySource } = await import("./delivery-source");
    assert.equal(
      (await resolveDeliverySource(db, rows[0]))?.occurredAt.getTime(),
      operation.created_at.getTime(),
    );
    assert.equal(await resolveDeliverySource(db, { ...rows[0], user_id: tag }), null);
    assert.equal(await resolveDeliverySource(db, { ...rows[0], occurred_at: now }), null);
    const registration = {
      ...rows[0],
      conversion: "professional_registration",
      source_ref: user.id,
      occurred_at: user.createdAt,
    };
    assert.equal(
      (await resolveDeliverySource(db, registration))?.occurredAt.getTime(),
      user.createdAt.getTime(),
    );
    assert.equal(await resolveDeliverySource(db, { ...registration, source_ref: tag }), null);
    for (const change of [{ mode: "test" }, { state: "failed" }, { intent: "courtesy_renewal" }]) {
      await db.billing_operation.update({ where: { id: operation.id }, data: change });
      assert.equal(await resolveDeliverySource(db, rows[0]), null);
      assert.equal(
        (
          await db.$transaction((tx) =>
            persistProfessionalEvent(tx, "professional_checkout", operation.id, now),
          )
        ).status,
        "ineligible",
      );
      await db.billing_operation.update({
        where: { id: operation.id },
        data: { mode: "live", state: "requires_confirmation", intent: "subscription" },
      });
    }
    await consent.revoke(user.id, now);
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
    assert.equal(
      (
        await db.$transaction((tx) =>
          persistProfessionalEvent(tx, "professional_checkout", operation.id, now),
        )
      ).status,
      "ineligible",
    );
  } finally {
    await db.billing_operation.deleteMany({ where: { user_id: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});

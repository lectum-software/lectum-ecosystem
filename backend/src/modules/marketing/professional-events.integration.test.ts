import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: canonical checkout reference, no late registration consent, rollback and replay", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected_external_request");
  });
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
    assert.equal(
      (
        await db.$transaction((tx) =>
          persistProfessionalEvent(tx, "professional_checkout", operation.id, now),
        )
      ).status,
      "ineligible",
    );
    const { resolveCheckoutDeliveryEvidence, CHECKOUT_DELIVERY_POLICY } = await import(
      "./checkout-delivery"
    );
    const { captureCheckoutContext } = await import("./checkout-context");
    const { buildConsentedMetaCapiPayload } = await import("./meta-capi");
    const policy = {
      documentVersion: MARKETING_CONSENT_POLICY.documentVersion!,
      sourceUrls: ["https://example.test/checkout"],
      accountId: operation.account_id,
    };
    const token = randomBytes(32).toString("hex");
    const capturedAt = new Date(now.getTime() - 20_000);
    await db.marketing_browser_identifier.create({
      data: {
        token_hash: createHash("sha256").update(token).digest("hex"),
        user_id: user.id,
        consent_revision: 1,
        fbp: `fb.1.${capturedAt.getTime()}.123456`,
        captured_at: capturedAt,
        expires_at: new Date(now.getTime() + 86400000),
      },
    });
    assert.equal(
      await captureCheckoutContext(
        user.id,
        token,
        "Local test browser",
        { operationId: operation.id, revision: 1, documentVersion: policy.documentVersion },
        {
          enabled: true,
          sandboxAccountId: null,
          sourceUrl: policy.sourceUrls[0]!,
          liveReview: { accountId: policy.accountId, documentVersion: policy.documentVersion },
        },
        new Date(now.getTime() - 5_000),
      ),
      true,
    );
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
    assert.equal(await resolveCheckoutDeliveryEvidence(db, rows[0]), null);
    const evidence = await resolveCheckoutDeliveryEvidence(db, rows[0], policy, now);
    assert.ok(evidence);
    const { resolveDelivery } = await import("./delivery-scheduler");
    const originalPolicy = { ...CHECKOUT_DELIVERY_POLICY };
    try {
      Object.assign(CHECKOUT_DELIVERY_POLICY, policy);
      assert.equal((await resolveDelivery(rows[0]))?.candidate.conversion, "professional_checkout");
    } finally {
      Object.assign(CHECKOUT_DELIVERY_POLICY, originalPolicy);
    }

    const payload = buildConsentedMetaCapiPayload(
      evidence,
      policy.sourceUrls,
      policy.documentVersion,
      now.getTime(),
    );
    assert.ok(payload);
    assert.equal(payload.data[0].event_name, "InitiateCheckout");
    assert.equal(payload.data[0].event_id, rows[0].event_id);
    assert.equal(evidence.occurredAtMs, operation.created_at.getTime());
    assert.equal("custom_data" in payload.data[0], false);
    assert.deepEqual(Object.keys(payload.data[0].user_data), ["fbp"]);
    for (const override of [
      { accountId: "wrong" },
      { documentVersion: "old" },
      { sourceUrls: [] },
    ]) {
      assert.equal(
        await resolveCheckoutDeliveryEvidence(db, rows[0], { ...policy, ...override }, now),
        null,
      );
    }
    assert.equal(
      await resolveCheckoutDeliveryEvidence(db, { ...rows[0], user_id: tag }, policy, now),
      null,
    );
    assert.equal(
      await resolveCheckoutDeliveryEvidence(db, { ...rows[0], consent_revision: 2 }, policy, now),
      null,
    );
    assert.equal(
      await resolveCheckoutDeliveryEvidence(
        db,
        { ...rows[0], conversion: "professional_subscription" },
        policy,
        now,
      ),
      null,
    );
    assert.equal(
      await resolveCheckoutDeliveryEvidence(
        db,
        rows[0],
        policy,
        new Date(now.getTime() + 86400000),
      ),
      null,
    );
    const context = await db.marketing_checkout_context.findUniqueOrThrow({
      where: { operation_id: operation.id },
    });
    for (const captured_at of [
      new Date(operation.created_at.getTime() - 1),
      new Date(now.getTime() + 1),
    ]) {
      await db.marketing_checkout_context.update({
        where: { operation_id: operation.id },
        data: { captured_at },
      });
      assert.equal(await resolveCheckoutDeliveryEvidence(db, rows[0], policy, now), null);
    }
    await db.marketing_checkout_context.update({
      where: { operation_id: operation.id },
      data: { captured_at: context.captured_at },
    });
    await db.marketing_consent.update({ where: { user_id: user.id }, data: { revoked_at: now } });
    assert.equal(await resolveCheckoutDeliveryEvidence(db, rows[0], policy, now), null);
    await db.marketing_consent.update({ where: { user_id: user.id }, data: { revoked_at: null } });
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

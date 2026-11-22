import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";

test("PostgreSQL/HTTP: guest WhatsApp consent, deduplication, payload and revocation", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const database = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(database.hostname, "127.0.0.1");
  assert.equal(database.port, "55443");
  assert.equal(database.pathname, "/lectum_stripe_test");
  process.env.META_CAPI_ENABLED = "false";
  process.env.META_CLIENT_IP_VERIFIED = "false";
  const { default: db } = await import("@/infra/database/prisma");
  const { AttributionRepository, attributionTokenHash } = await import("./attribution-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const { marketingRequestContext } = await import("./request-context");
  const { default: actionRouter } = await import("../api/public/analytics/action");
  const { resolveUserDeliveryEvidence } = await import("./user-delivery");
  const { buildConsentedMetaCapiPayload } = await import("./meta-capi");
  const { USER_DELIVERY_POLICY } = await import("./user-events");
  const { MarketingDeliveryJobs, processNextMetaDelivery } = await import("./delivery-jobs");
  const repo = new AttributionRepository(MARKETING_CONSENT_POLICY, {
    enabled: true,
    host: "www.lectum.com.br",
    anonymousDirectVisits: true,
  });
  const tokens = Array.from({ length: 9 }, () => randomBytes(32).toString("hex"));
  const hashes = tokens.map(attributionTokenHash);
  const visitor = randomUUID();
  const session = randomUUID();
  const app = express();
  app.use(express.json());
  app.use(marketingRequestContext);
  app.use("/action", actionRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const send = async (token?: string, overrides = {}, referer = "https://www.lectum.com.br/") => {
    const body = {
      visitor_id: visitor,
      session_id: session,
      measurement_allowed: true,
      event_id: randomUUID(),
      action_type: "whatsapp_click",
      path: "/",
      page_kind: "community_post",
      target_id: "never-send-target",
      guest_token: token,
      ...overrides,
    };
    const response = await fetch(`http://127.0.0.1:${address.port}/action`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "GuestContactLocalTest/1",
        referer,
      },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200, await response.text());
    return body;
  };
  const jobs = () =>
    db.marketing_delivery_job.findMany({
      where: { guest_token_hash: { in: hashes } },
      orderBy: { created_at: "asc" },
    });
  try {
    for (const token of tokens)
      await repo.captureGuest({
        token,
        accepted: true,
        document_version: MARKETING_CONSENT_POLICY.documentVersion!,
        campaigns: {},
      });
    const body = await send(tokens[0]);
    const first = (await jobs())[0];
    assert.ok(first);
    assert.equal(first.user_id, null);
    assert.equal(first.consent_revision, null);
    assert.equal(first.client_ip_address, null);
    await send(tokens[0], body);
    await send(tokens[1], { ...body, guest_token: tokens[1] });
    assert.equal((await jobs()).length, 1, "Replays cannot duplicate or rebind the source");
    const evidence = await db.$transaction((tx) => resolveUserDeliveryEvidence(tx, first));
    assert.ok(evidence);
    const payload = buildConsentedMetaCapiPayload(
      evidence,
      [first.source_url!],
      USER_DELIVERY_POLICY.documentVersion,
      Date.now(),
      USER_DELIVERY_POLICY.sourceUrls,
    );
    assert.ok(payload);
    assert.equal(payload.data[0].event_name, "Contact");
    assert.equal(payload.data[0].event_source_url, "https://www.lectum.com.br/");
    assert.deepEqual(Object.keys(payload.data[0].user_data).sort(), ["client_user_agent", "fbp"]);
    assert.ok(!JSON.stringify(payload).includes("never-send-target"));
    assert.ok(!("custom_data" in payload.data[0]));
    assert.equal(
      (
        await processNextMetaDelivery(async () => {
          throw Error("Must not resolve while disabled");
        })
      ).status,
      "blocked",
    );
    await send(undefined);
    await send(tokens[1], { measurement_allowed: false });
    await send(tokens[1], {}, "https://www.lectum.com.br/sensitive-content");
    assert.equal((await jobs()).length, 1);
    const oldBody = await send(undefined);
    await send(tokens[1], { ...oldBody, guest_token: tokens[1] });
    assert.equal(
      (await jobs()).length,
      1,
      "Earlier internal click cannot acquire consent retroactively",
    );
    const mutations = [
      { revoked: true },
      { claimed: true },
      { expires_at: new Date(0) },
      { document_version: "old" },
      { browser_fbp: null, browser_captured_at: null },
      { granted_at: new Date(Date.now() + 60000) },
    ];
    for (let i = 0; i < mutations.length; i++) {
      await db.marketing_guest_attribution.update({
        where: { token_hash: hashes[i + 2] },
        data: mutations[i],
      });
      await send(tokens[i + 2]);
    }
    assert.equal((await jobs()).length, 1, "Invalid consent never queues");
    for (const mutation of [{ revoked: true }, { claimed: true }, { document_version: "old" }]) {
      await db.marketing_guest_attribution.update({
        where: { token_hash: hashes[0] },
        data: mutation,
      });
      assert.equal(await db.$transaction((tx) => resolveUserDeliveryEvidence(tx, first)), null);
      await db.marketing_guest_attribution.update({
        where: { token_hash: hashes[0] },
        data: {
          revoked: false,
          claimed: false,
          document_version: MARKETING_CONSENT_POLICY.documentVersion!,
        },
      });
    }
    await db.important_action_event.update({
      where: { id: first.source_ref },
      data: { deleted: true },
    });
    assert.equal(await db.$transaction((tx) => resolveUserDeliveryEvidence(tx, first)), null);
    await db.important_action_event.update({
      where: { id: first.source_ref },
      data: { deleted: false },
    });
    await new MarketingDeliveryJobs().expireAndPurge();
    assert.equal((await jobs()).length, 1, "Valid guest job survives user-only purge");
    await repo.revokeGuest(tokens[0]);
    assert.equal((await jobs()).length, 0, "Revocation immediately removes pending guest data");
    await send(tokens[8], { action_type: "psychologist_video_whatsapp_click" });
    assert.equal((await jobs()).length, 1);
    await db.marketing_guest_attribution.delete({ where: { token_hash: hashes[8] } });
    assert.equal((await jobs()).length, 0, "Retention deletion cascades");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await db.marketing_guest_attribution.deleteMany({ where: { token_hash: { in: hashes } } });
    await db.important_action_event.deleteMany({ where: { visitor_id: visitor } });
    await db.visitor_session.deleteMany({ where: { visitor_id: visitor } });
    await db.$disconnect();
  }
});

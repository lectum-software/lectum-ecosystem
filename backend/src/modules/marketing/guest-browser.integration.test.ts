import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";

test("PostgreSQL: anonymous browser evidence survives seven days and transfers only with authorization", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { AttributionRepository, attributionTokenHash } = await import("./attribution-repository");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { readBrowserIdentifier } = await import("./browser-identifier-repository");
  const { createAttributionRouter } = await import("../api/public/marketing/attribution");
  const day = 86400000;
  const now = new Date();
  const later = new Date(now.getTime() + 7 * day);
  const policy = {
    acquisitionEnabled: true,
    documentVersion: "guest-browser-test",
    maxAgeMs: 90 * day,
    campaigns: { utm_campaign: ["approved_professional", "other_campaign"] },
  };
  const browserPolicy = {
    enabled: true,
    host: "127.0.0.1",
    anonymousCampaigns: ["approved_professional"],
    anonymousDirectVisits: true,
  };
  const repo = new AttributionRepository(policy, browserPolicy);
  const app = express();
  app.use(express.json());
  app.use(
    "/attribution",
    createAttributionRouter(policy, () => now, browserPolicy),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const endpoint = `http://127.0.0.1:${address.port}/attribution`;
  const tokens = Array.from({ length: 5 }, () => randomBytes(32).toString("hex"));
  const input = (token: string, campaign = "approved_professional") => ({
    token,
    accepted: true as const,
    document_version: policy.documentVersion,
    campaigns: { utm_campaign: campaign },
  });
  const user = await db.user.create({
    data: {
      name: "Disposable guest browser",
      email: `${randomUUID()}@example.invalid`,
      role: "psicologo",
      active: true,
    },
  });
  const guest = (token: string) =>
    db.marketing_guest_attribution.findUniqueOrThrow({
      where: { token_hash: attributionTokenHash(token) },
    });
  try {
    await new AttributionRepository(policy, { enabled: false, host: null }).captureGuest(
      input(tokens[1]),
      now,
    );
    assert.equal(
      (await guest(tokens[1])).browser_fbp,
      null,
      "Disabled browser collection creates no identifier",
    );
    await repo.captureGuest(input(tokens[2], "other_campaign"), now);
    assert.equal(
      (await guest(tokens[2])).browser_fbp,
      null,
      "Unreviewed anonymous context excluded",
    );
    await assert.rejects(repo.captureGuest({ ...input(tokens[0]), accepted: false as true }, now));
    const directInput = { ...input(tokens[3]), campaigns: {} };
    await assert.rejects(repo.captureGuest({ ...directInput, accepted: false as true }, now));
    await assert.rejects(repo.captureGuest({ ...directInput, document_version: "old" }, now));
    const directResponse = await fetch(`${endpoint}/capture`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(directInput),
    });
    assert.equal(directResponse.status, 200);
    assert.ok(
      directResponse.headers
        .get("set-cookie")
        ?.includes(`lectum_measurement_browser=${tokens[3]};`),
    );
    assert.ok((await guest(tokens[3])).browser_fbp);
    await repo.revokeGuest(tokens[3]);
    await assert.rejects(repo.captureGuest(directInput, later));
    await new AttributionRepository(policy, { enabled: false, host: null }).captureGuest(
      { ...input(tokens[4]), campaigns: {} },
      now,
    );
    await repo.captureGuest({ ...input(tokens[4]), campaigns: {} }, later);
    assert.equal(
      (await guest(tokens[4])).browser_fbp,
      null,
      "No retroactive identifier on old consent",
    );
    const response = await fetch(`${endpoint}/capture`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input(tokens[0])),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.ok(cookie.includes(`lectum_measurement_browser=${tokens[0]};`));
    for (const attribute of [
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      "Path=/api/private/marketing/consent",
    ])
      assert.ok(cookie.includes(attribute));
    const body = await response.text();
    assert.ok(!body.includes(tokens[0]) && !body.includes("browser_fbp"));
    const first = await guest(tokens[0]);
    assert.ok(first.browser_fbp && first.browser_captured_at);
    await db.$disconnect();
    await Promise.all(
      Array.from({ length: 3 }, () => repo.captureGuest(input(tokens[0], "other_campaign"), later)),
    );
    const returned = await guest(tokens[0]);
    assert.equal(returned.browser_fbp, first.browser_fbp);
    assert.equal(returned.expires_at.getTime(), first.expires_at.getTime());
    assert.deepEqual(returned.first_campaigns, input(tokens[0]).campaigns);
    assert.deepEqual(returned.last_campaigns, input(tokens[0], "other_campaign").campaigns);
    const consent = new MarketingConsentRepository(policy);
    const grant = {
      accepted: true as const,
      document_version: policy.documentVersion,
      expected_revision: 0,
      guest_token: tokens[0],
    };
    await assert.rejects(consent.grant(user.id, grant, later));
    await consent.grant(user.id, { ...grant, authorize_transfer: true }, later);
    const read = (time = later) =>
      db.$transaction((tx) =>
        readBrowserIdentifier(tx, user.id, tokens[0], 1, policy.documentVersion, time),
      );
    const transferred = await read();
    assert.equal(transferred?.fbp, first.browser_fbp);
    assert.equal(transferred?.expires_at.getTime(), first.expires_at.getTime());
    assert.equal(
      (await guest(tokens[0])).browser_fbp,
      null,
      "No duplicate raw identifier after claim",
    );
    assert.equal(
      (
        await db.marketing_consent.findUniqueOrThrow({ where: { user_id: user.id } })
      ).granted_at?.getTime(),
      later.getTime(),
      "Account grant is not backdated",
    );
    await consent.grant(
      user.id,
      { ...grant, expected_revision: 1, authorize_transfer: true },
      later,
    );
    assert.equal(await db.marketing_browser_identifier.count({ where: { user_id: user.id } }), 1);
    assert.equal(
      await read(first.expires_at),
      null,
      "Signup does not extend anonymous identifier retention",
    );
    const revoke = await fetch(`${endpoint}/revoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: tokens[0] }),
    });
    assert.equal(revoke.status, 200);
    assert.ok(revoke.headers.get("set-cookie")?.includes("Expires=Thu, 01 Jan 1970"));
    assert.equal(await read(), null);
    assert.equal(await db.marketing_browser_identifier.count({ where: { user_id: user.id } }), 0);
    await assert.rejects(repo.captureGuest(input(tokens[0]), later));
    await assert.rejects(repo.captureGuest(input(tokens[2]), new Date(now.getTime() + 30 * day)));
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await db.user.delete({ where: { id: user.id } });
    await db.marketing_guest_attribution.deleteMany({
      where: { token_hash: { in: tokens.map(attributionTokenHash) } },
    });
    await db.$disconnect();
  }
});

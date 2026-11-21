import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: official browser ID is consent-bound, reusable, expiring and revocable", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { captureBrowserIdentifier, readBrowserIdentifier } = await import(
    "./browser-identifier-repository"
  );
  const { MarketingConsentRepository } = await import("./consent-repository");
  const now = new Date();
  const user = await db.user.create({
    data: {
      name: "Disposable browser test",
      email: `${randomUUID()}@example.invalid`,
      role: "psicologo",
      active: true,
    },
  });
  const policy = { enabled: true, host: "127.0.0.1" };
  const documentVersion = "local-browser-test";
  try {
    assert.deepEqual(await captureBrowserIdentifier(user.id, 1, documentVersion, undefined), {
      enabled: false,
    });
    const refused = await captureBrowserIdentifier(
      user.id,
      1,
      documentVersion,
      undefined,
      now,
      policy,
    );
    assert.ok("clear" in refused);
    assert.equal(await db.marketing_browser_identifier.count({ where: { user_id: user.id } }), 0);
    await db.marketing_consent.create({
      data: {
        user_id: user.id,
        revision: 1,
        document_version: documentVersion,
        granted_at: new Date(now.getTime() - 1000),
        expires_at: new Date(now.getTime() + 90 * 86400000),
      },
    });
    const first = await captureBrowserIdentifier(
      user.id,
      1,
      documentVersion,
      undefined,
      new Date(),
      policy,
    );
    assert.ok("token" in first);
    assert.ok(first.token && first.expiresAt);
    const token = first.token;
    const expiry = first.expiresAt.getTime();
    const read = (owner = user.id, revision = 1, time = new Date()) =>
      db.$transaction((tx) =>
        readBrowserIdentifier(tx, owner, token, revision, documentVersion, time),
      );
    const row = await read();
    assert.ok(row && row.fbp.split(".").length === 5);
    assert.ok(row.token_hash !== first.token);
    const later = new Date(now.getTime() + 7 * 86400000);
    const repeated = await Promise.all(
      Array.from({ length: 4 }, () =>
        captureBrowserIdentifier(user.id, 1, documentVersion, first.token, later, policy),
      ),
    );
    assert.ok(
      repeated.every(
        (value) =>
          "token" in value && value.token === first.token && value.expiresAt?.getTime() === expiry,
      ),
    );
    assert.equal(await db.marketing_browser_identifier.count({ where: { user_id: user.id } }), 1);
    assert.equal(await read("other-user"), null);
    assert.equal(await read(user.id, 2), null);
    assert.equal(await read(user.id, 1, row.expires_at), null);
    const expired = await captureBrowserIdentifier(
      user.id,
      1,
      documentVersion,
      first.token,
      row.expires_at,
      policy,
    );
    assert.ok("clear" in expired);
    await new MarketingConsentRepository().revoke(user.id);
    assert.equal(await read(), null);
    assert.equal(await db.marketing_browser_identifier.count({ where: { user_id: user.id } }), 0);
    assert.ok(
      "clear" in
        (await captureBrowserIdentifier(
          user.id,
          1,
          documentVersion,
          first.token,
          new Date(),
          policy,
        )),
    );
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});

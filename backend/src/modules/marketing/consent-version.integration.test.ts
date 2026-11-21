import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: old internal consent cannot authorize the Meta notice", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const user = await db.user.create({
    data: {
      name: "Disposable notice version test",
      email: `${randomUUID()}@example.invalid`,
      role: "psicologo",
    },
  });
  try {
    const oldVersion = "lectum-campaigns-2026-11-17";
    await new MarketingConsentRepository({
      ...MARKETING_CONSENT_POLICY,
      documentVersion: oldVersion,
    }).grant(user.id, { accepted: true, document_version: oldVersion, expected_revision: 0 });
    const repo = new MarketingConsentRepository();
    const stale = await repo.status(user.id);
    assert.equal(stale.granted, false);
    assert.equal(stale.decided, false);
    await assert.rejects(
      repo.grant(user.id, {
        accepted: true,
        document_version: oldVersion,
        expected_revision: stale.revision,
      }),
      { code: "marketing_consent_invalid" },
    );
    const granted = await repo.grant(user.id, {
      accepted: true,
      document_version: MARKETING_CONSENT_POLICY.documentVersion!,
      expected_revision: stale.revision,
    });
    assert.equal(granted.granted, true);
    assert.equal(granted.external_transmission, false);
    assert.equal(granted.document_version, MARKETING_CONSENT_POLICY.documentVersion);
    await repo.revoke(user.id);
    assert.equal((await repo.status(user.id)).granted, false);
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { browserIdWithinConsent, isMetaBrowserId } from "./meta-browser-id";
import { buildMetaCapiPayload } from "./meta-capi";

test("Browser identifier supports official appendices without stripping or widening fields", () => {
  const now = 1794950000000;
  const base = `fb.1.${now}.12345`;
  const suffix = Buffer.from([1, 4, 2, 1, 3, 2]).toString("base64url");
  for (const value of [base, `${base}.BA`, `${base}.${suffix}`]) assert.ok(isMetaBrowserId(value));
  for (const bytes of [
    [2, 4, 2, 1, 3, 2],
    [1, 0, 2, 1, 3, 2],
    [1, 7, 2, 1, 3, 2],
    [1, 4, 4, 1, 3, 2],
  ])
    assert.equal(isMetaBrowserId(`${base}.${Buffer.from(bytes).toString("base64url")}`), false);
  for (const value of [
    `${base}.ZZ`,
    `${base}.${suffix}.extra`,
    `${base}.!!!!!!!!`,
    "",
    `${base}\n`,
  ])
    assert.equal(isMetaBrowserId(value), false);
  const fbp = `${base}.${suffix}`;
  const payload = buildMetaCapiPayload(
    {
      conversion: "professional_subscription",
      eventId: "a".repeat(64),
      occurredAt: now / 1000,
      sourceUrl: "https://example.test/checkout",
      fbp,
      amountCents: 2990,
    },
    ["https://example.test/checkout"],
    now / 1000,
  );
  assert.equal(payload?.data[0].user_data.fbp, fbp);
});

test("Browser identifier is bounded by consent and fixed expiry, including seven-day return", () => {
  const now = 1794950000000;
  const value = `fb.1.${now}.12345`;
  assert.ok(browserIdWithinConsent(value, now - 100, now, now + 7 * 86400000));
  assert.equal(browserIdWithinConsent(value, now + 1, now + 1, now + 2), false);
  assert.equal(browserIdWithinConsent(value, now - 1, now - 1, now), false);
  assert.equal(browserIdWithinConsent(value, now - 1, now, now - 1), false);
  assert.equal(browserIdWithinConsent(value, now - 1, now, now + 30 * 86400000), false);
});

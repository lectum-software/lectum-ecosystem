import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isUserAuthOnlyPrivateRoute,
  listPrivateRoutePolicyViolations,
} from "@/main/server/imports/route-policy";
import { grantValidator } from "./index";

test("consent API accepts explicit versioned decisions, not identities, URLs or click IDs", async () => {
  const schemas = await grantValidator(
    { schema: true, headers: {}, language: "pt", params: {}, query: {}, body: {} },
    {},
    () => {},
  );
  assert.ok(schemas);
  const input = { accepted: true, document_version: "test-v1", expected_revision: 0 };
  assert.equal((await schemas.body.safeParseAsync(input)).success, true);
  assert.equal(
    (await schemas.body.safeParseAsync({ ...input, campaigns: { utm_campaign: "campaign_001" } }))
      .success,
    true,
  );
  for (const invalid of [
    { ...input, accepted: false },
    { ...input, expected_revision: -1 },
    { ...input, user_id: "another-user" },
    { ...input, granted_at: "2026-01-01" },
    { ...input, campaigns: { fbclid: "click-id" } },
    { ...input, campaigns: { url: "https://example.invalid/" } },
    { ...input, campaigns: { utm_campaign: "clinical free text" } },
  ])
    assert.equal((await schemas.body.safeParseAsync(invalid)).success, false);
});

test("consent routes require authenticated user scope", () => {
  const path = "/api/private/marketing/consent";
  assert.equal(isUserAuthOnlyPrivateRoute(path), true);
  assert.equal(listPrivateRoutePolicyViolations([{ path }]).userAuthOnlyViolations.length, 1);
  assert.equal(
    listPrivateRoutePolicyViolations([{ path, authOnly: true }]).userAuthOnlyViolations.length,
    0,
  );
});

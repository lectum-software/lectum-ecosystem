import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCardUpdateIdempotencyKey } from "./idempotency";

test("card update retries share a key but different tokenizations never reuse it", () => {
  const first = { gatewaySubscriptionId: "subscription-1", cardToken: "local-card-token-a" };
  const key = buildCardUpdateIdempotencyKey(first);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(buildCardUpdateIdempotencyKey({ ...first }), key);
  assert.notEqual(
    buildCardUpdateIdempotencyKey({ ...first, cardToken: "local-card-token-b" }),
    key,
  );
  assert.notEqual(
    buildCardUpdateIdempotencyKey({ ...first, gatewaySubscriptionId: "subscription-2" }),
    key,
  );
  assert.equal(key.includes(first.cardToken), false);
});

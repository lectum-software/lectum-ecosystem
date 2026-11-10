import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mayReplayStripeCreate,
  requestFingerprint,
  STRIPE_REPLAY_WINDOW_MS,
} from "./recovery-policy";

const now = new Date("2026-11-09T22:00:00Z");
const fingerprint = requestFingerprint("subscription", [
  "operation",
  "customer",
  "price",
  "unit@example.invalid",
  "2026-12-01T00:00:00.000Z",
]);
const attempt = {
  state: "creating",
  createdAt: new Date(now.getTime() - 60_000),
  attempts: 2,
  storedFingerprint: fingerprint,
  expectedFingerprint: fingerprint,
};

test("retention-safe replay requires the same durable request and never extends the 23h clock", () => {
  assert.equal(mayReplayStripeCreate(attempt, now), true);
  assert.equal(
    mayReplayStripeCreate(
      { ...attempt, createdAt: new Date(now.getTime() - STRIPE_REPLAY_WINDOW_MS) },
      now,
    ),
    false,
  );
  assert.equal(
    mayReplayStripeCreate(
      { ...attempt, createdAt: new Date(now.getTime() - STRIPE_REPLAY_WINDOW_MS + 1) },
      now,
    ),
    true,
  );
  assert.equal(
    mayReplayStripeCreate({ ...attempt, createdAt: new Date(now.getTime() + 1) }, now),
    false,
  );
  assert.equal(mayReplayStripeCreate({ ...attempt, createdAt: new Date(NaN) }, now), false);
  assert.equal(mayReplayStripeCreate({ ...attempt, attempts: 6 }, now), false);
  assert.equal(mayReplayStripeCreate({ ...attempt, attempts: 5 }, now), true);
  assert.equal(
    mayReplayStripeCreate(
      {
        ...attempt,
        expectedFingerprint: requestFingerprint("subscription", [
          "operation",
          "customer",
          "price",
          "changed@example.invalid",
          "2026-12-01T00:00:00.000Z",
        ]),
      },
      now,
    ),
    false,
  );
});

test("legacy ambiguous or terminal rows cannot receive a new request proof or create", () => {
  for (const state of ["creating", "review_required", "processing", "complete", "failed"]) {
    assert.equal(mayReplayStripeCreate({ ...attempt, state, storedFingerprint: null }, now), false);
  }
  assert.equal(
    mayReplayStripeCreate({ ...attempt, state: "reserved", storedFingerprint: null }, now),
    true,
  );
  for (const state of ["complete", "failed"])
    assert.equal(mayReplayStripeCreate({ ...attempt, state }, now), false);
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(fingerprint.includes("example"), false);
});

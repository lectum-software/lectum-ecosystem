import assert from "node:assert/strict";
import { test } from "node:test";
import { governmentTestTransmission } from "./government-test-transmission";

// Pure contract tests, not evidence of government transmission or fiscal issuance.
test("government test transmission keeps only documented status and controlled reason codes", () => {
  for (const status of ["available", "simulated", "unknown"] as const)
    assert.deepEqual(governmentTestTransmission({ status }), {
      status,
      reasonCode: null,
      checkedAt: null,
    });
  for (const reason_code of [
    "cnc_missing_in_test",
    "municipality_missing_in_test",
    "registry_missing_in_test",
  ])
    assert.deepEqual(governmentTestTransmission({ status: "simulated", reason_code }), {
      status: "simulated",
      reasonCode: reason_code,
      checkedAt: null,
    });
});

test("missing and malformed new metadata remain unknown rather than available", () => {
  for (const raw of [
    undefined,
    null,
    false,
    1,
    "available",
    [],
    {},
    { status: null },
    { status: "new-provider-status" },
    { status: true },
  ])
    assert.deepEqual(governmentTestTransmission(raw), {
      status: "unknown",
      reasonCode: null,
      checkedAt: null,
    });
});

test("unknown or malformed reason codes are sanitized, never returned verbatim", () => {
  for (const reason_code of ["provider-private-value", 1, true, [], { secret: "private" }])
    assert.deepEqual(governmentTestTransmission({ status: "simulated", reason_code }), {
      status: "simulated",
      reasonCode: "other",
      checkedAt: null,
    });
  for (const reason_code of [undefined, null, ""])
    assert.deepEqual(governmentTestTransmission({ status: "unknown", reason_code }), {
      status: "unknown",
      reasonCode: null,
      checkedAt: null,
    });
});

test("raw reason, malformed timestamp and additional company or document data are never retained", () => {
  const result = governmentTestTransmission({
    status: "simulated",
    reason_code: "cnc_missing_in_test",
    reason: "private company details",
    checked_at: "untrusted timestamp",
    document: { id: "private-document", payload: "private payload" },
  });
  assert.deepEqual(result, {
    status: "simulated",
    reasonCode: "cnc_missing_in_test",
    checkedAt: null,
  });
  assert.equal(JSON.stringify(result).includes("private"), false);
});

test("checkedAt preserves a validated provider instant without claiming a fresh probe", () => {
  assert.equal(
    governmentTestTransmission({ status: "available", checked_at: "2026-10-20T11:32:05-03:00" })
      .checkedAt,
    "2026-10-20T14:32:05.000Z",
  );
  for (const checked_at of [
    undefined,
    null,
    123,
    "yesterday",
    "2026-10-20",
    "2026-02-30T12:00:00Z",
    "2026-10-20T12:00:00",
  ])
    assert.equal(governmentTestTransmission({ status: "available", checked_at }).checkedAt, null);
});

test("available combined with a known government block is conservatively unknown", () => {
  for (const reason_code of [
    "cnc_missing_in_test",
    "municipality_missing_in_test",
    "registry_missing_in_test",
  ])
    assert.deepEqual(governmentTestTransmission({ status: "available", reason_code }), {
      status: "unknown",
      reasonCode: reason_code,
      checkedAt: null,
    });
});

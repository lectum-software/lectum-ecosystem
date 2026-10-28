import assert from "node:assert/strict";
import { test } from "node:test";
import { deviceSessionIdSchema, normalizeDeviceSessionId } from "./device-session";

test("device session is optional and preserves only bounded ASCII header values", () => {
  assert.equal(deviceSessionIdSchema.optional().safeParse(undefined).success, true);
  assert.equal(normalizeDeviceSessionId(undefined), undefined);
  for (const value of ["a", "SDK_session-0123", "SDK.session-0123", `${"x".repeat(255)}.`]) {
    assert.equal(deviceSessionIdSchema.parse(value), value);
    assert.equal(normalizeDeviceSessionId(value), value);
  }
});

test("a 231-character dotted session remains opaque and byte-exact", () => {
  const session = `${"A".repeat(115)}.${"B".repeat(115)}`;
  assert.equal(session.length, 231);
  assert.equal(deviceSessionIdSchema.parse(session), session);
  assert.equal(normalizeDeviceSessionId(session), session);
});

test("device session rejects coercion, control characters, whitespace and unbounded input", () => {
  for (const value of [
    "",
    "x".repeat(257),
    "session\n",
    "session\r\nX-Foo: injected",
    " session",
    "session ",
    "session\t",
    "sessão",
    "session/other",
    "session+other",
    "session:other",
    "session=other",
    "session.other\u007f",
    "session.other\u0080",
    "session\u0000",
    123,
    null,
    {},
    ["session"],
  ]) {
    assert.equal(deviceSessionIdSchema.safeParse(value).success, false);
    assert.equal(normalizeDeviceSessionId(value), undefined);
  }
});

import assert from "node:assert/strict";
import { before, test } from "node:test";
import type * as Validator from "./content-videos";

let contentVideosValidator: typeof Validator.contentVideosValidator;
before(async () => {
  ({ contentVideosValidator } = await import("./content-videos"));
});

const querySchema = async () => {
  const schemas = await contentVideosValidator(
    { schema: true, headers: {}, language: "pt", params: {}, query: {}, body: {} },
    {},
    () => {},
  );
  assert.ok(schemas);
  return schemas.query;
};

test("validates and coerces bounded pagination with optional focus", async () => {
  const schema = await querySchema();
  assert.deepEqual(
    await schema.parseAsync({ page: "2", limit: "20", focusReplyId: "deep-reply" }),
    { page: 2, limit: 20, focusReplyId: "deep-reply" },
  );
  assert.deepEqual(await schema.parseAsync({}), {});
  const cursor = `${"a".repeat(32)}.20`;
  assert.deepEqual(await schema.parseAsync({ cursor }), { cursor });
});

test("rejects oversized, negative, fractional, or invalid pagination and focus", async () => {
  const schema = await querySchema();
  for (const value of [
    { limit: "31" },
    { limit: "0" },
    { page: "-1" },
    { page: "1.2" },
    { page: "Infinity" },
    { focusReplyId: "" },
    { focusReplyId: "a".repeat(121) },
    { cursor: "" },
    { cursor: "a".repeat(65) },
  ]) {
    assert.equal((await schema.safeParseAsync(value)).success, false, JSON.stringify(value));
  }
});

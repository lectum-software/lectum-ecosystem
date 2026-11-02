import assert from "node:assert/strict";
import { test } from "node:test";
import { retainedReplyAncestors } from "./content-policy";

const reply = (id: string, author_id: string, parent_reply_id: string | null, deleted = false) => ({
  id,
  author_id,
  parent_reply_id,
  deleted,
});
test("preserva apenas placeholders necessarios para respostas de outras pessoas", () => {
  const result = retainedReplyAncestors(
    [
      reply("a", "owner", null),
      reply("b", "owner", "a"),
      reply("c", "other", "b"),
      reply("d", "owner", null),
      reply("e", "other", "d", true),
      reply("f", "owner", null),
    ],
    "owner",
  );
  assert.deepEqual([...result].sort(), ["a", "b"]);
});
test("arvore sem terceiros nao preserva respostas do autor", () => {
  assert.equal(retainedReplyAncestors([reply("a", "owner", null)], "owner").size, 0);
});
test("referencias ausentes e ciclos nao causam loop", () => {
  const result = retainedReplyAncestors(
    [
      reply("a", "owner", "b"),
      reply("b", "owner", "a"),
      reply("c", "other", "a"),
      reply("d", "other", "missing"),
    ],
    "owner",
  );
  assert.deepEqual([...result].sort(), ["a", "b"]);
});

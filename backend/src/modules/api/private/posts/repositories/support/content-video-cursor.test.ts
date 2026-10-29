import assert from "node:assert/strict";
import test from "node:test";
import { ContentVideoCursorStore } from "./content-video-cursor";

const input = {
  postId: "post",
  focusReplyId: "reply",
  limit: 2,
  ids: ["reply", "post", "a", "b", "c"],
};
const scope = { postId: "post", focusReplyId: "reply", limit: 2 };

test("snapshot copies IDs, returns stable positions, and accepts exact retries", () => {
  const store = new ContentVideoCursorStore();
  const ids = [...input.ids];
  const { key } = store.create({ ...input, ids });
  ids.reverse();
  const result = store.resolve(`${key}.2`, scope);
  assert.deepEqual(result.snapshot.ids, input.ids);
  assert.equal(result.page, 2);
  assert.deepEqual(store.resolve(`${key}.2`, scope), result);
});

test("rejects mismatched discussion/focus/page size/page and malformed offsets", () => {
  const store = new ContentVideoCursorStore();
  const { key } = store.create(input);
  for (const changed of [
    { ...scope, postId: "other" },
    { ...scope, focusReplyId: "other" },
    { ...scope, limit: 3 },
    { ...scope, page: 3 },
  ]) {
    assert.throws(() => store.resolve(`${key}.2`, changed), /cursor invalid/);
  }
  for (const cursor of ["broken", `${key}.0`, `${key}.1`, `${key}.6`, `${key}.2.extra`]) {
    assert.throws(() => store.resolve(cursor, scope), /cursor invalid/);
  }
});

test("expiry, restart, eviction and capacity fail explicitly, never create a new order", () => {
  let now = 0;
  const store = new ContentVideoCursorStore(() => now, 100, 1, 10);
  const first = store.create(input);
  now = 100;
  assert.throws(() => store.resolve(`${first.key}.2`, scope), /cursor expired/);
  const second = store.create(input);
  store.create(input);
  assert.throws(() => store.resolve(`${second.key}.2`, scope), /cursor expired/);
  assert.throws(
    () => new ContentVideoCursorStore().resolve(`${second.key}.2`, scope),
    /cursor expired/,
  );
  assert.throws(
    () => store.create({ ...input, ids: Array.from({ length: 11 }, (_, i) => String(i)) }),
    /cursor capacity/,
  );
});

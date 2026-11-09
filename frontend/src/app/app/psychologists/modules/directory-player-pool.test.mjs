import assert from "node:assert/strict";
import test from "node:test";
import { preserveDirectoryExperiment, selectDirectoryPool } from "./directory-player-pool.ts";

test("filters preserve only supported experiment settings", () => {
  const filtered = preserveDirectoryExperiment(
    new URLSearchParams("search=Ana"),
    "?directoryPlayer=pooled&videoDiagnostics=1&unrelated=secret",
  );
  assert.equal(filtered.toString(), "search=Ana&directoryPlayer=pooled&videoDiagnostics=1");
  assert.equal(
    preserveDirectoryExperiment(
      new URLSearchParams(),
      "?directoryPlayer=other&videoDiagnostics=0",
    ).toString(),
    "",
  );
});

const entry = (index) => ({ key: `video:${index}`, index, src: `/video/${index}` });
const a = entry(0),
  b = entry(1),
  c = entry(2);

test("starts only the active source until playback begins", () => {
  assert.deepEqual(selectDirectoryPool([null, null], a, b, false), [a, null]);
  assert.deepEqual(selectDirectoryPool([a, null], a, b, true, a.key), [a, b]);
});
test("promotes the prepared player without replacing either source", () => {
  assert.deepEqual(selectDirectoryPool([a, b], b, c, false, a.key), [a, b]);
  assert.deepEqual(selectDirectoryPool([a, b], b, c, true, b.key), [c, b]);
});
test("cold skips preserve the previous foreground until the new video plays", () => {
  assert.deepEqual(selectDirectoryPool([a, b], c, null, false, a.key), [a, c]);
  assert.deepEqual(selectDirectoryPool([a, b], c, null, false, b.key), [c, b]);
});
test("backward navigation reuses a retained source", () => {
  assert.deepEqual(selectDirectoryPool([a, b], a, b, false, b.key), [a, b]);
});
test("empty results release both slots and duplicate next entries are excluded", () => {
  assert.deepEqual(selectDirectoryPool([a, b], null, null, true), [null, null]);
  assert.deepEqual(selectDirectoryPool([a, b], a, a, true, a.key), [a, null]);
});

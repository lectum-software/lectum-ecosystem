import assert from "node:assert/strict";
import { test } from "node:test";
import { automaticCaptionAction, automaticCaptionIds } from "./automation-policy";

test("automatic generation requires explicit bounded allowlist and independent opt-in", () => {
  assert.deepEqual(automaticCaptionIds({}), []);
  assert.deepEqual(automaticCaptionIds({ VIDEO_CAPTIONS_ASSET_IDS: "test-video" }), []);
  assert.deepEqual(
    automaticCaptionIds({ VIDEO_CAPTIONS_AUTO_ENABLED: "true", VIDEO_CAPTIONS_ASSET_IDS: "*" }),
    [],
  );
  assert.deepEqual(
    automaticCaptionIds({
      VIDEO_CAPTIONS_AUTO_ENABLED: "true",
      VIDEO_CAPTIONS_ASSET_IDS: "test-video,test-video",
    }),
    ["test-video"],
  );
  assert.deepEqual(
    automaticCaptionIds({
      VIDEO_CAPTIONS_AUTO_ENABLED: "true",
      VIDEO_CAPTIONS_ASSET_IDS: Array.from({ length: 11 }, (_, i) => `test-video-${i}`).join(","),
    }),
    [],
  );
});

test("only ready videos generate once; polling is bounded and terminal states remain intact", () => {
  const now = Date.now();
  const pending = { state: "inprogress", updated_at: new Date(now - 120_000) };
  assert.equal(automaticCaptionAction("processing", null, now), null);
  assert.equal(automaticCaptionAction("ready", null, now), "generate");
  assert.equal(automaticCaptionAction("ready", pending, now), "sync");
  for (const state of ["ready", "error"])
    assert.equal(automaticCaptionAction("ready", { ...pending, state }, now), null);
  assert.equal(
    automaticCaptionAction("ready", { ...pending, updated_at: new Date(now) }, now),
    null,
  );
  assert.equal(
    automaticCaptionAction("ready", { ...pending, updated_at: new Date(now - 86400001) }, now),
    null,
  );
});

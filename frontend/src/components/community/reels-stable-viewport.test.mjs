import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import "../../lib/video-sound-preference.test.mjs";

const { resolveReelsViewport } = await import("./use-reels-viewport.ts");
const full = { top: 0, left: 0, width: 390, height: 844 };
test("keyboard moves only composer, including Safari viewport panning and dismissal", () => {
  const initial = resolveReelsViewport(null, full, false);
  const opened = resolveReelsViewport(initial, { ...full, height: 460 }, true);
  assert.deepEqual(opened, { ...full, keyboardOffset: 384 });
  const panned = resolveReelsViewport(opened, { ...full, top: 50, height: 410 }, true);
  assert.deepEqual(panned, { ...full, top: 50, keyboardOffset: 434 });
  assert.equal(panned.top - 50, 0, "player remains at the visual viewport origin");
  assert.equal(panned.height - panned.keyboardOffset, 410, "composer stays above keyboard");
  assert.deepEqual(resolveReelsViewport(opened, { ...full, height: 460 }, false), opened);
  assert.deepEqual(resolveReelsViewport(opened, full, false), initial);
});
test("ordinary resize and orientation changes still resize the viewer", () => {
  const initial = resolveReelsViewport(null, full, false);
  assert.equal(resolveReelsViewport(initial, { ...full, height: 500 }, false).height, 500);
  assert.deepEqual(resolveReelsViewport(initial, { ...full, width: 844, height: 390 }, true), {
    ...full,
    width: 844,
    height: 390,
    keyboardOffset: 0,
  });
});

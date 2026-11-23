import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";

test("reels defaults to sound on explicit open and restores mute across visits", async (t) => {
  const storage = new Map();
  const previous = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  };
  t.after(() => {
    globalThis.window = previous;
  });
  const first = await import("./video-sound-preference.ts?visit=first");
  assert.equal(first.getVideoSoundEnabled(), false);
  first.prepareReelsSoundOnOpen();
  assert.equal(first.getVideoSoundEnabled(), true);
  first.setVideoSoundEnabledByUser(false);
  const next = await import("./video-sound-preference.ts?visit=next");
  next.prepareReelsSoundOnOpen();
  assert.equal(next.getVideoSoundEnabled(), false);
  next.setVideoSoundEnabledByUser(true);
  const restored = await import("./video-sound-preference.ts?visit=restored");
  assert.equal(restored.getVideoSoundEnabled(), true);
});

test("restricted storage keeps audio controls usable", async (t) => {
  const previous = globalThis.window;
  globalThis.window = {
    get localStorage() {
      throw new Error("restricted");
    },
  };
  t.after(() => {
    globalThis.window = previous;
  });
  const preference = await import("./video-sound-preference.ts?visit=restricted");
  preference.prepareReelsSoundOnOpen();
  assert.equal(preference.getVideoSoundEnabled(), true);
  preference.setVideoSoundEnabledByUser(false);
  preference.prepareReelsSoundOnOpen();
  assert.equal(preference.getVideoSoundEnabled(), false);
});

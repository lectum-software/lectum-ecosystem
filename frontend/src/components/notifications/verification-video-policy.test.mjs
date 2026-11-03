import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { VERIFICATION_VIDEO } from "./verification-video-policy.ts";

test("verification notice uses approved copy", () => {
  assert.equal(VERIFICATION_VIDEO.title, "Selo verificado: o que significa?");
  assert.equal(
    VERIFICATION_VIDEO.description,
    "Clique e descubra o que verificamos antes de conceder o selo ao profissional.",
  );
});

test("opening acknowledges the notice independently of playback", () => {
  const source = readFileSync(
    new URL("./verification-video-notification.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /setOpen\(true\);\s+markWatched\(\);/);
  assert.doesNotMatch(source, /checkWatched|onTimeUpdate/);
  assert.match(source, /onEnded: \(\) => setOpen\(false\)/);
});

test("progress-only layout shares reels animation and track styles", () => {
  const source = readFileSync(
    new URL("../ui/vertical-video-player-persistent-controls.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /useContentVideoProgress/);
  assert.match(source, /ref={progressFill}/);
  assert.match(source, /origin-left bg-media-foreground/);
});

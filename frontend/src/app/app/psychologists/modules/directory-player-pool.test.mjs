import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectFeedVideoSources } from "../../../../components/ui/persistent-feed-video-policy.ts";
import { preserveDirectoryExperiment } from "./directory-player-pool.ts";

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

test("directory and reels use the same provider and media lifecycle", () => {
  const directory = readFileSync(
    new URL("../view/components/directory-player-pool.tsx", import.meta.url),
    "utf8",
  );
  const reels = readFileSync(
    new URL("../../../../components/community/content-video-player.tsx", import.meta.url),
    "utf8",
  );
  for (const source of [directory, reels])
    assert.match(source, /@\/components\/ui\/persistent-feed-video-player/);
  assert.doesNotMatch(
    directory,
    /createPortal|useAttachVideoSource|appendChild|selectDirectoryPool/,
  );
  const shared = readFileSync(
    new URL("../../../../components/ui/persistent-feed-video-player.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    shared,
    /if \(destination && host\.parentNode !== destination\) destination\.appendChild\(host\)/,
  );
  assert.match(shared, /standby: !slot/);
  assert.match(shared, /active=\{Boolean\(slot\)\}/);
  assert.match(shared, /version=\{revision\}/);
  assert.match(shared, /owner\.current\?\.\(null\)/);
});

test("shared reels policy prepares only after active playback", () => {
  assert.deepEqual(selectFeedVideoSources(["", ""], "a", "b", false), ["a", ""]);
  assert.deepEqual(selectFeedVideoSources(["a", ""], "a", "b", true), ["a", "b"]);
});

test("shared policy promotes warm sources and reuses slots", () => {
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "b", "c", false), ["a", "b"]);
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "b", "c", true), ["c", "b"]);
  assert.deepEqual(selectFeedVideoSources(["c", "b"], "b", "c", true), ["c", "b"]);
});

test("shared policy handles cold skips, duplicate next and no selection", () => {
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "d", "e", false), ["d", "b"]);
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "a", "a", true), ["a", "b"]);
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "", undefined, false), ["a", "b"]);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectFeedVideoSources } from "../../../../components/ui/persistent-feed-video-policy.ts";
import {
  isDirectoryPlayerPoolEnabled,
  preserveDirectoryExperiment,
} from "./directory-player-pool.ts";

test("normal directory access uses the reels pool; only explicit individual opts out", () => {
  for (const search of ["", "?search=Ana", "?directoryPlayer=pooled", "?directoryPlayer=other"])
    assert.equal(isDirectoryPlayerPoolEnabled(search), true);
  assert.equal(isDirectoryPlayerPoolEnabled("?directoryPlayer=individual"), false);
  const hook = readFileSync(new URL("./directory-player-mode.ts", import.meta.url), "utf8");
  assert.match(hook, /const serverSnapshot = \(\) => true/);
  assert.match(hook, /isDirectoryPlayerPoolEnabled\(window.location.search\)/);
});

test("filter navigation preserves the explicit rollback mode", () => {
  const filtered = preserveDirectoryExperiment(
    new URLSearchParams("search=Ana"),
    "?directoryPlayer=individual&videoDiagnostics=1",
  );
  assert.equal(filtered.toString(), "search=Ana&directoryPlayer=individual&videoDiagnostics=1");
  assert.equal(isDirectoryPlayerPoolEnabled(filtered.toString()), false);
});

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

test("legacy directory playback does not reset or start pooled elements", () => {
  const analytics = readFileSync(
    new URL("../hooks/use-psychologists-video-analytics.ts", import.meta.url),
    "utf8",
  );
  const adapter = readFileSync(
    new URL("../view/components/directory-player-pool.tsx", import.meta.url),
    "utf8",
  );
  for (const source of [analytics, adapter])
    assert.match(source, /useDirectoryPlayerPoolEnabled\(\)/);
  assert.match(analytics, /for \(const video of pooledPlayback \? \[\] : videos\)/);
  assert.match(
    analytics,
    /if \(pooledPlayback\) return;[\s\S]*playVideoWithActiveDocument\(activeVideo\)/,
  );
  assert.match(adapter, /if \(!active \|\| !video\) return;/);
  assert.doesNotMatch(adapter, /else void play\(\)/);
  assert.doesNotMatch(adapter, /isVideoPaused/);
  assert.match(adapter, /!latest.current.setup.isFiltersOpen/);
  assert.match(adapter, /!latest.current.setup.isSearchModeActiveRef.current/);
});

test("shared reels policy prepares only after active playback", () => {
  assert.deepEqual(selectFeedVideoSources(["", ""], "a", "b", false), ["a", ""]);
  assert.deepEqual(selectFeedVideoSources(["a", ""], "a", "b", true), ["a", "b"]);
});

test("directory shares reels scroll selection and audio activation, not copied policies", () => {
  const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");
  const adapter = read("../view/components/directory-player-pool.tsx");
  const slide = read("../../../../components/community/content-video-slide.tsx");
  for (const source of [adapter, slide]) {
    assert.match(source, /useFeedVideoPlayback\(/);
    assert.doesNotMatch(source, /playVideoWithActiveDocument|blockedSoundRevision/);
  }
  assert.match(read("../view/components/feed.tsx"), /useFeedVideoScroll\(/);
  assert.match(
    read("../../../../components/community/use-content-video-scroll.ts"),
    /useFeedVideoScroll as useContentVideoScroll/,
  );
});

test("shared policy promotes warm sources and reuses slots", () => {
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "b", "c", false), ["a", "b"]);
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "b", "c", true), ["c", "b"]);
  assert.deepEqual(selectFeedVideoSources(["c", "b"], "b", "c", true), ["c", "b"]);
});

test("directory controls and navigation delegate to shared commands", () => {
  const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");
  const overlay = read("../view/components/directory-player-overlay.tsx");
  assert.match(overlay, /feedVideoCommandsRef.current\?\.play\(\)/);
  assert.match(overlay, /feedVideoCommandsRef.current\?\.pause\(\)/);
  assert.doesNotMatch(overlay, /playVideoWithActiveDocument|video\?\.pause\(\)/);
  const navigation = read("../hooks/use-psychologists-feed-navigation.ts");
  const search = read("../hooks/use-psychologists-navigation.ts");
  assert.match(
    search,
    /if \(pooledPlayback\) \{\s*void feedVideoCommandsRef.current\?\.play\(\);\s*return;/,
  );
  assert.match(
    navigation,
    /if \(pooledPlayback\) \{\s*void feedVideoCommandsRef.current\?\.play\(\);\s*return;/,
  );
  assert.match(
    navigation,
    /if \(pooledPlayback\) \{\s*feedVideoScrollRef.current\?\.scrollTo\(index\);\s*return;/,
  );
  const feed = read("../view/components/feed.tsx");
  assert.match(feed, /Math.abs\(index - model.setup.activePsychologistIndex\) > 1/);
  assert.match(feed, /const commands = \{ scrollTo \}/);
});

test("shared policy handles cold skips, duplicate next and no selection", () => {
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "d", "e", false), ["d", "b"]);
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "a", "a", true), ["a", "b"]);
  assert.deepEqual(selectFeedVideoSources(["a", "b"], "", undefined, false), ["a", "b"]);
});

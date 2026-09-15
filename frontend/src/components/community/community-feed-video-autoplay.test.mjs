import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { selectCommunityFeedAutoplayCandidate } from "./community-feed-video-autoplay.ts";

test("autoplay do feed escolhe o video visivel mais central", () => {
  assert.equal(
    selectCommunityFeedAutoplayCandidate([
      {
        distanceToViewportCenter: 180,
        id: "below",
        intersectionRatio: 0.7,
        isIntersecting: true,
        order: 2,
      },
      {
        distanceToViewportCenter: 28,
        id: "center",
        intersectionRatio: 0.68,
        isIntersecting: true,
        order: 1,
      },
    ]),
    "center",
  );
});

test("autoplay do feed ignora videos pausados manualmente ou pouco visiveis", () => {
  assert.equal(
    selectCommunityFeedAutoplayCandidate([
      {
        distanceToViewportCenter: 10,
        id: "paused",
        intersectionRatio: 0.95,
        isIntersecting: true,
        order: 1,
        pausedByUser: true,
      },
      {
        distanceToViewportCenter: 20,
        id: "partial",
        intersectionRatio: 0.42,
        isIntersecting: true,
        order: 2,
      },
    ]),
    null,
  );
});

test("feed de comunidades ativa autoplay mudo sem remover controles existentes", () => {
  const mediaSource = readFileSync(new URL("./community-media-frame.tsx", import.meta.url), "utf8");
  const playerSource = readFileSync(
    new URL("../ui/vertical-video-player.tsx", import.meta.url),
    "utf8",
  );
  const immersiveControlsSource = readFileSync(
    new URL("../ui/vertical-video-player-immersive-controls.ts", import.meta.url),
    "utf8",
  );
  const routeCardSource = readFileSync(
    new URL("../../app/app/community/[slug]/components/post-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(mediaSource, /enableFeedAutoplay\?: boolean/);
  assert.match(
    mediaSource,
    /mutedControlVisibility=\{feedAutoplayEnabled \? "when-hidden" : "default"\}/,
  );
  assert.match(mediaSource, /"data-lectum-feed-video-autoplay": "true"/);
  assert.match(immersiveControlsSource, /onSoundEnabledChange\?\.\(shouldEnableSound\)/);
  assert.match(playerSource, /mutedControlVisibility === "when-hidden"/);
  assert.match(routeCardSource, /<PostMedia\s+enableFeedAutoplay/);
  assert.match(routeCardSource, /<ProfessionalReplyPreview\s+enableFeedAutoplay/);
});

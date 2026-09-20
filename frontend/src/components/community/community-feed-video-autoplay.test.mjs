import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { selectCommunityFeedAutoplayCandidate } = await import("./community-feed-video-autoplay.ts");

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

test("comunidades ativam autoplay mudo sem remover controles existentes", () => {
  const autoplaySource = readFileSync(
    new URL("./community-feed-video-autoplay.ts", import.meta.url),
    "utf8",
  );
  const mediaSource = readFileSync(new URL("./community-media-frame.tsx", import.meta.url), "utf8");
  const modalMediaSuspensionSource = readFileSync(
    new URL("../../hooks/use-modal-media-suspension.ts", import.meta.url),
    "utf8",
  );
  const modalSource = readFileSync(new URL("../ui/modal.tsx", import.meta.url), "utf8");
  const playerSource = readFileSync(
    new URL("../ui/vertical-video-player.tsx", import.meta.url),
    "utf8",
  );
  const mutedOverlaySource = readFileSync(
    new URL("../ui/vertical-video-player-muted-overlay-control.tsx", import.meta.url),
    "utf8",
  );
  const immersiveControlsSource = readFileSync(
    new URL("../ui/vertical-video-player-immersive-controls.ts", import.meta.url),
    "utf8",
  );
  const videoPlaybackSource = readFileSync(
    new URL("../../lib/video-playback.ts", import.meta.url),
    "utf8",
  );
  const psychologistCardVideoSource = readFileSync(
    new URL("../psychologists/psychologist-card-video.tsx", import.meta.url),
    "utf8",
  );
  const routeCardSource = readFileSync(
    new URL("../../app/app/community/[slug]/components/post-card.tsx", import.meta.url),
    "utf8",
  );
  const postContentSource = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/[id]/components/post-content.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const replyCardSource = readFileSync(
    new URL("../../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );
  const createPostSource = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/new/views/create-community-post.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(mediaSource, /enableCommunityAutoplay\?: boolean/);
  assert.match(mediaSource, /enableFeedAutoplay\?: boolean/);
  assert.match(
    mediaSource,
    /mutedControlVisibility=\{communityAutoplayEnabled \? "when-hidden" : "default"\}/,
  );
  assert.match(mediaSource, /"data-lectum-community-video-autoplay": "true"/);
  assert.match(immersiveControlsSource, /onSoundEnabledChange\?\.\(shouldEnableSound\)/);
  assert.match(playerSource, /mutedControlVisibility === "when-hidden"/);
  assert.match(mutedOverlaySource, /data-lectum-muted-overlay-control="center"/);
  assert.match(mutedOverlaySource, /top-1\/2 left-1\/2/);
  assert.match(routeCardSource, /<PostMedia\s+enableFeedAutoplay/);
  assert.match(routeCardSource, /<ProfessionalReplyPreview\s+enableFeedAutoplay/);
  assert.match(postContentSource, /<CommunityMediaBlock[\s\S]*?enableCommunityAutoplay/);
  assert.match(replyCardSource, /enableCommunityAutoplay=\{enableCommunityAutoplay\}/);
  assert.match(modalMediaSuspensionSource, /lectum:modal-media-suspension-change/);
  assert.match(modalSource, /useModalMediaSuspension\(open\)/);
  assert.match(createPostSource, /useModalMediaSuspension\(asModalSlot\)/);
  assert.match(autoplaySource, /subscribeModalMediaSuspension/);
  assert.match(autoplaySource, /pauseAllAutoplayItems\(\)/);
  assert.match(autoplaySource, /isCommunityAutoplayContextActive/);
  assert.match(autoplaySource, /documentHasUserAttention\(\)/);
  assert.match(autoplaySource, /window\.addEventListener\("blur", pauseActiveWithoutAttention\)/);
  assert.match(
    autoplaySource,
    /window\.addEventListener\("pagehide", pauseActiveWithoutAttention\)/,
  );
  assert.match(
    autoplaySource,
    /document\.addEventListener\("freeze", pauseActiveWithoutAttention\)/,
  );
  assert.match(autoplaySource, /pauseAllVideosForInactiveDocument\(\)/);
  assert.doesNotMatch(autoplaySource, /localStorage/);
  assert.doesNotMatch(autoplaySource, /COMMUNITY_FEED_VIDEO_SOUND_STORAGE_KEY/);
  assert.match(autoplaySource, /soundEnabledByUser: false/);
  assert.match(autoplaySource, /wasVideoPauseRequestedByFocusGuard\(video\)/);
  assert.match(
    videoPlaybackSource,
    /VIDEO_PAUSED_BY_FOCUS_GUARD_ATTRIBUTE = "data-lectum-paused-by-focus-guard"/,
  );
  assert.match(videoPlaybackSource, /pauseAllVideosForInactiveDocument/);
  assert.match(videoPlaybackSource, /playVideoWithActiveDocument/);
  assert.match(videoPlaybackSource, /document\.addEventListener\("visibilitychange"/);
  assert.match(videoPlaybackSource, /window\.addEventListener\("pagehide"/);
  assert.match(videoPlaybackSource, /new IntersectionObserver/);
  assert.match(videoPlaybackSource, /shouldResumeAfterFocusRef\.current = true/);
  assert.match(psychologistCardVideoSource, /documentHasUserAttention\(\)/);
  assert.match(psychologistCardVideoSource, /soundUnlockedForCurrentVideoRef/);
  assert.match(psychologistCardVideoSource, /playVideoWithActiveDocument\(currentVideo\)/);
  assert.doesNotMatch(psychologistCardVideoSource, /globalSoundEnabled/);
});

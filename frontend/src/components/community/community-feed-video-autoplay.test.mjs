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
  assert.match(modalSource, /useModalMediaSuspension\(open, dialogRef\)/);
  assert.match(createPostSource, /useModalMediaSuspension\(asModalSlot, overlayRef\)/);
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
  assert.match(autoplaySource, /getVideoSoundEnabled/);
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
  assert.match(psychologistCardVideoSource, /subscribeVideoSoundPreference/);
  assert.match(psychologistCardVideoSource, /playVideoWithActiveDocument\(currentVideo\)/);
  assert.doesNotMatch(psychologistCardVideoSource, /globalSoundEnabled/);
});

test("publicacoes do perfil usam o mesmo autoplay e volume da comunidade para posts e respostas", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const publications = read("../../app/app/psychologist/[id]/components/publications.tsx");
  const card = read("./community-post-card.tsx");
  const media = read("./community-media-frame.tsx");

  assert.match(publications, /<CommunityPostCard[\s\S]*?profilePublicationMode\s*\/>/);
  assert.match(card, /profilePublicationMode = false/);
  assert.match(
    card,
    /primaryReply\?\.media_url \?\? singlePostMediaItem\?\.media_url \?\? post.media_url/,
  );
  assert.match(
    card,
    /<CommunityMediaBlock[\s\S]*?enableCommunityAutoplay=\{profilePublicationMode\}[\s\S]*?mediaUrl=\{displayMediaUrl\}/,
  );
  assert.match(media, /useCommunityVideoAutoplay\(communityAutoplayEnabled\)/);
  assert.match(media, /communityAutoplayEnabled \? handleCommunitySoundEnabledChange : undefined/);
  assert.match(media, /muted: !communitySoundEnabled/);
  assert.doesNotMatch(publications, /autoPlay|localStorage|\.play\(/);
  assert.doesNotMatch(card, /autoPlay|localStorage|\.play\(/);
});

test("apresentacao do perfil compartilha autoplay e audio sem perder analytics", () => {
  const source = readFileSync(
    new URL("../../app/app/psychologist/[id]/components/presentation-video.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useCommunityVideoAutoplay\(Boolean\(videoSrc\)\)/);
  assert.match(source, /handleVideoReady\(video\);\s*handleAutoplayVideoReady\(video\);/);
  assert.match(source, /onVideoElementReady=\{handlePlayerReady\}/);
  assert.match(source, /onSoundEnabledChange=\{onSoundEnabledChange\}/);
  assert.match(source, /muted: !soundEnabled/);
  assert.match(source, /"data-lectum-community-video-autoplay": "true"/);
  assert.match(source, /controlsVariant="persistent"/);
  assert.match(source, /mutedControlVisibility="when-hidden"/);
  assert.match(source, /persistentControlsLayout="media"/);
  assert.match(source, /fullscreenVariant="content"/);
  assert.match(source, /cleanupTrackingRef\.current\?\.\(\);/);
  assert.match(source, /trackVideoWatch\(body\)/);
  assert.match(source, /resetPreviewFrameBeforePlayback\(video\)/);
  assert.doesNotMatch(source, /autoPlay|localStorage|\.play\(/);
});

test("feed de psicologos separa volume explicito de tap e protege retomadas", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const base = "../../app/app/psychologists/";
  for (const file of ["feed-navigation", "navigation", "video-analytics"]) {
    const source = read(`${base}hooks/use-psychologists-${file}.ts`);
    assert.doesNotMatch(source, /(?:currentVideo|activeVideo)\.play\(/);
    assert.match(source, /playVideoWithActiveDocument/);
  }
  const gestures = read(`${base}hooks/use-psychologists-video-gestures.ts`);
  const areaTap = gestures
    .split("const runVideoAreaSingleTapAction")[1]
    .split("const handleVideoAreaTap")[0];
  assert.doesNotMatch(areaTap, /playCurrentVideoWithSound/);
  assert.match(areaTap, /playCurrentVideo\(\)/);
  assert.match(read(`${base}view/components/slide.tsx`), /autoPlay: false/);
  const preference = read("../../lib/video-sound-preference.ts");
  assert.match(preference, /let soundEnabled = false/);
  assert.match(preference, /lectum:video-sound:explicit:v1/);
  assert.match(preference, /localStorage.setItem/);
  const playback = read("../../lib/video-playback.ts");
  assert.match(
    playback,
    /await video.play\(\);\s*if \(!documentHasUserAttention\(\) \|\| isVideoBlockedByModal\(video\)\)/,
  );
  assert.match(playback, /video.addEventListener\("playing", enforce\)/);
  const attention = read("../analytics/attention.ts");
  assert.match(attention, /window.addEventListener\("blur", suspend\)/);
  assert.match(attention, /document.addEventListener\("freeze", suspend\)/);
  const stream = read("../../hooks/video-stream/index.ts");
  assert.match(stream, /autoStartLoad: false/);
  assert.match(stream, /player.stopLoad\(\)/);
});

test("comunidade nao reativa som depois do fallback mudo", async (t) => {
  const {
    registerCommunityFeedVideoAutoplay,
    setCommunityFeedVideoSoundEnabled,
    subscribeCommunityFeedVideoSoundPreference,
  } = await import("./community-feed-video-autoplay.ts");
  const { getVideoSoundEnabled } = await import("../../lib/video-sound-preference.ts");
  const storage = new Map([["lectum:video-sound:explicit:v1", "enabled"]]);
  const frames = new Map();
  let frameId = 0;
  let observer;
  const videos = new Set();
  class TestVideo extends EventTarget {
    muted = true;
    volume = 1;
    paused = true;
    ended = false;
    attempts = [];
    nextPlay = null;
    attributes = new Map();
    async play() {
      this.attempts.push(this.muted);
      const next = this.nextPlay;
      this.nextPlay = null;
      if (next) await next();
      this.paused = false;
      this.dispatchEvent(new Event("play"));
      this.dispatchEvent(new Event("playing"));
    }
    pause() {
      this.paused = true;
      this.dispatchEvent(new Event("pause"));
    }
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }
    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
    removeAttribute(name) {
      this.attributes.delete(name);
    }
  }
  const targetDocument = Object.assign(new EventTarget(), {
    visibilityState: "visible",
    hasFocus: () => true,
    documentElement: { getAttribute: () => null },
    querySelectorAll: () => [...videos],
  });
  const targetWindow = Object.assign(new EventTarget(), {
    innerHeight: 844,
    setTimeout,
    requestAnimationFrame: (callback) => {
      frames.set(++frameId, callback);
      return frameId;
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  });
  const browserGlobals = {
    window: targetWindow,
    document: targetDocument,
    HTMLVideoElement: TestVideo,
    IntersectionObserver: class {
      constructor(callback) {
        observer = callback;
      }
      observe() {}
      unobserve() {}
    },
  };
  const originalGlobals = new Map();
  for (const [name, value] of Object.entries(browserGlobals)) {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const cleanups = [];
  const addVideo = (id) => {
    const video = new TestVideo();
    videos.add(video);
    cleanups.push(registerCommunityFeedVideoAutoplay(id, video));
    return video;
  };
  const flush = async () => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback();
    await new Promise(setImmediate);
  };
  const show = async (selected) => {
    observer(
      [...videos].map((video) => ({
        target: video,
        boundingClientRect: { top: 100, height: 600 },
        intersectionRatio: video === selected ? 1 : 0,
        isIntersecting: video === selected,
      })),
    );
    await flush();
  };
  t.after(() => {
    for (const cleanup of cleanups.reverse()) cleanup();
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });

  const first = addVideo("blocked");
  const second = addVideo("next");
  const notifications = [];
  cleanups.push(
    subscribeCommunityFeedVideoSoundPreference((enabled) => notifications.push(enabled)),
  );
  first.nextPlay = () => Promise.reject(new DOMException("Autoplay denied", "NotAllowedError"));
  await show(first);
  assert.deepEqual(first.attempts, [false, true], "stored opt-in falls back to muted playback");
  assert.equal(first.paused, false);
  assert.equal(getVideoSoundEnabled(), false, "fallback must suspend sound for the document");
  assert.equal(notifications.at(-1), false, "mounted players receive effective mute state");
  assert.equal(
    storage.get("lectum:video-sound:explicit:v1"),
    "enabled",
    "keep saved explicit choice",
  );

  first.dispatchEvent(new Event("canplay"));
  await flush();
  assert.equal(first.muted, true, "canplay cannot restore the rejected sound preference");
  await show(second);
  assert.equal(second.muted, true, "scrolling to another video is not audio consent");
  const third = addVideo("late-mount");
  assert.equal(third.muted, true, "newly mounted videos inherit effective mute state");

  setCommunityFeedVideoSoundEnabled(true);
  assert.equal(getVideoSoundEnabled(), true);
  assert.equal(second.muted, false, "explicit volume action re-enables audio");
  await show(third);
  assert.equal(third.muted, false, "explicit opt-in still carries to the next video");

  const policyBlocked = addVideo("blocked-after-explicit-opt-in");
  policyBlocked.nextPlay = () =>
    Promise.reject(new DOMException("Autoplay denied", "NotAllowedError"));
  await show(policyBlocked);
  assert.equal(getVideoSoundEnabled(), true, "a per-video denial cannot undo explicit opt-in");
  assert.equal(notifications.at(-1), true, "other players keep the enabled sound preference");
  assert.equal(policyBlocked.muted, false, "do not silently switch the blocked video to mute");
  assert.equal(policyBlocked.paused, true, "a blocked video waits for manual playback");
  assert.deepEqual(policyBlocked.attempts, [false]);
  policyBlocked.dispatchEvent(new Event("canplay"));
  await show(policyBlocked);
  assert.deepEqual(policyBlocked.attempts, [false], "do not loop on a browser policy denial");
  await show(second);
  assert.equal(second.muted, false, "the next video still plays with sound");
  assert.equal(second.paused, false);
  const afterBlock = addVideo("mounted-after-policy-denial");
  await show(afterBlock);
  assert.equal(afterBlock.muted, false, "new players inherit the explicit choice, not the denial");
  afterBlock.muted = true;
  afterBlock.volume = 0;
  afterBlock.dispatchEvent(new Event("volumechange"));
  assert.equal(afterBlock.muted, false, "a stale muted snapshot cannot override opt-in");
  assert.equal(afterBlock.volume, 1);
  await show(policyBlocked);
  await policyBlocked.play();
  assert.equal(policyBlocked.paused, false, "manual play remains available after denial");
  assert.equal(policyBlocked.muted, false);

  const retryAfterChoice = addVideo("retry-after-new-volume-choice");
  retryAfterChoice.nextPlay = () =>
    Promise.reject(new DOMException("Autoplay denied", "NotAllowedError"));
  await show(retryAfterChoice);
  assert.deepEqual(retryAfterChoice.attempts, [false]);
  setCommunityFeedVideoSoundEnabled(false);
  setCommunityFeedVideoSoundEnabled(true);
  await show(retryAfterChoice);
  assert.deepEqual(retryAfterChoice.attempts, [false, false]);
  assert.equal(retryAfterChoice.paused, false, "a new explicit choice permits a new attempt");
  for (const event of ["playing", "loadedmetadata"]) {
    retryAfterChoice.muted = true;
    retryAfterChoice.dispatchEvent(new Event(event));
    assert.equal(retryAfterChoice.muted, false, `${event} cannot restore an old mute state`);
  }

  setCommunityFeedVideoSoundEnabled(false);
  assert.equal(third.muted, true);
  assert.equal(second.muted, true, "muting also reaches inactive registered videos");

  third.muted = false;
  third.dispatchEvent(new Event("volumechange"));
  assert.equal(third.muted, true, "an old snapshot must not override explicit mute");
  await third.play();
  assert.equal(third.muted, true);

  setCommunityFeedVideoSoundEnabled(true);
  const interrupted = addVideo("interrupted");
  interrupted.nextPlay = () => Promise.reject(new DOMException("Interrupted", "AbortError"));
  await show(interrupted);
  assert.equal(getVideoSoundEnabled(), true, "a source change is not an autoplay policy denial");
  assert.deepEqual(
    interrupted.attempts,
    [false],
    "do not retry unrelated failures as muted autoplay",
  );

  const outdated = addVideo("outdated");
  let rejectOutdated;
  outdated.nextPlay = () =>
    new Promise((_, reject) => {
      rejectOutdated = reject;
    });
  await show(outdated);
  await show(second);
  rejectOutdated(new DOMException("Late denial", "NotAllowedError"));
  await flush();
  assert.equal(getVideoSoundEnabled(), true, "an offscreen request cannot mute the current video");
  assert.deepEqual(outdated.attempts, [false], "an offscreen request cannot retry playback");

  const pending = addVideo("new-explicit-choice");
  let rejectPending;
  pending.nextPlay = () =>
    new Promise((_, reject) => {
      rejectPending = reject;
    });
  await show(pending);
  setCommunityFeedVideoSoundEnabled(false);
  setCommunityFeedVideoSoundEnabled(true);
  rejectPending(new DOMException("Late denial", "NotAllowedError"));
  await flush();
  assert.equal(
    getVideoSoundEnabled(),
    true,
    "a stale rejection cannot undo a newer explicit choice",
  );

  const detached = addVideo("unmounted");
  let rejectDetached;
  detached.nextPlay = () =>
    new Promise((_, reject) => {
      rejectDetached = reject;
    });
  await show(detached);
  cleanups.pop()();
  rejectDetached(new DOMException("Late denial", "NotAllowedError"));
  await flush();
  assert.equal(getVideoSoundEnabled(), true);
  assert.deepEqual(detached.attempts, [false], "unmounted videos cannot retry playback");
  setCommunityFeedVideoSoundEnabled(false);
  const muted = addVideo("explicitly-muted");
  await show(muted);
  muted.dispatchEvent(new Event("canplay"));
  await flush();
  assert.equal(muted.muted, true);
  assert.equal(storage.get("lectum:video-sound:explicit:v1"), "muted");
});

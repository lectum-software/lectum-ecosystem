import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const viewer = read("./content-video-viewer.tsx") + read("./content-video-slide.tsx");
const css = read("./content-video-viewer.module.css");

test("expanded content fills its viewport using the directory cover fit", () => {
  const directory = read("../../app/app/psychologists/view/components/slide.tsx");
  assert.match(directory, /fit="cover"/);
  assert.match(viewer, /fit="cover"/);
  assert.doesNotMatch(viewer, /fit="contain"/);
});

test("progress has a full-width custom track and an accessible invisible input", () => {
  assert.match(css, /\.progress \{[^}]*left: 0;[^}]*right: 0;[^}]*height: 28px;/s);
  assert.match(css, /\.progressTrack \{[^}]*height: 4px;/s);
  assert.match(css, /\.progress\[data-seeking\] \.progressTrack \{\s*height: 6px;/);
  assert.match(css, /\.progressInput \{[^}]*opacity: 0;[^}]*touch-action: none;/s);
  assert.match(viewer, /aria-label="Progresso do vídeo"\s+type="range"/);
  assert.match(viewer, /setPointerCapture\(event.pointerId\)/);
  assert.match(
    viewer,
    /onPointerMove=\{\(event\) => \{[\s\S]*?seekFromPointer\(event.currentTarget, event.clientX\)/,
  );
  assert.match(css, /\.progress:has\(\.progressInput:focus-visible\)/);
});

test("reading uses full-stage gradients instead of bounded opaque cards", () => {
  assert.match(css, /\.reading \{[^}]*background: transparent;/s);
  assert.match(css, /\.readingShade \{[^}]*inset: 0;/s);
  assert.match(css, /\.readingShade\[data-panel="parent"\]/);
  assert.match(css, /\.parent \{[^}]*animation: readingDown/s);
  assert.match(css, /\.expandedCaption \{[^}]*animation: readingUp/s);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("long text scrolls without scrollbars and loses its fade at the end", () => {
  assert.match(viewer, /scrollHeight - element.scrollTop - element.clientHeight > 4/);
  assert.match(viewer, /data-has-more=\{hasMore \|\| undefined\}/);
  assert.match(css, /\.scrollText\[data-has-more\] \{\s*mask-image:/);
  assert.match(css, /\.scrollText \{[^}]*scrollbar-width: none;/s);
  assert.match(css, /\.scrollText::-webkit-scrollbar \{\s*display: none;/);
});

test("caption collapse stays beside author and parent has a discussion destination", () => {
  assert.match(
    viewer,
    /className=\{styles.readingHeading\}>[\s\S]*?\{author\}[\s\S]*?styles.collapse[\s\S]*?<ReadingText>\{item.content\}/,
  );
  assert.match(viewer, /className=\{styles.discussionLink\} href=\{href\} onClick=\{onClose\}/);
  assert.match(viewer, /item.responding_to.id === item.post_id/);
  assert.match(viewer, /resumeAfterPanel.current = Boolean\(video && !video.paused\)/);
});

test("late media readiness cannot restart playback behind a reading panel", () => {
  assert.match(viewer, /panelRef.current = next;[\s\S]*?video\?\.pause\(\)/);
  assert.match(
    viewer,
    /!panelRef.current &&\s*!seekingRef.current &&\s*videoRef.current === video/,
  );
  assert.match(viewer, /await playVideoWithActiveDocument\(video\);\s*if \(!eligible\(\)\)/);
  assert.match(
    viewer,
    /onPlay: \(event\) => \{\s*if \(!activeRef.current \|\| panelRef.current \|\| seekingRef.current\)\s*event.currentTarget.pause\(\)/,
  );
  assert.match(
    viewer,
    /return \(\) => \{\s*activeRef.current = false;\s*videoRef.current\?\.pause\(\)/,
  );
});

test("focus recovers when a loading page becomes a video without changing index", () => {
  assert.match(viewer, /const focusPageKey = item \? contentVideoKey\(item\)/);
  assert.match(viewer, /focused === document.body/);
  assert.match(viewer, /\}, \[focusPageKey\]\)/);
});

const desktopCss = css.slice(css.indexOf("@media (min-width: 1024px)"));

test("sound follows the shared preference and explicit user changes update it", () => {
  const slide = read("./content-video-slide.tsx");
  assert.match(slide, /useState\(\(\) => !getVideoSoundEnabled\(\)\)/);
  assert.match(
    slide,
    /useEffect\(\s*\(\) =>\s*subscribeVideoSoundPreference\(\(enabled\) => \{\s*if \(videoRef.current\) videoRef.current.muted = !enabled;\s*setMuted\(!enabled\);\s*\}\),\s*\[\],\s*\)/,
  );
  assert.match(slide, /onSoundEnabledChange=\{setVideoSoundEnabledByUser\}/);
  assert.match(
    slide,
    /aria-label="Ativar som do vídeo"\s*onClick=\{\(\) => \{\s*setVideoSoundEnabledByUser\(true\);/,
  );
});

test("seeking is owned by the captured primary pointer until release or cancel", () => {
  const slide = read("./content-video-slide.tsx");
  assert.match(slide, /const seekPointer = useRef<number \| null>\(null\)/);
  assert.match(
    slide,
    /onPointerDown=\{\(event\) => \{[^}]*if \(!event.isPrimary \|\| event.button !== 0\) return;\s*seekPointer.current = event.pointerId;\s*event.currentTarget.setPointerCapture\(event.pointerId\);/s,
  );
  for (const handler of ["onPointerMove", "onPointerUp", "onPointerCancel"]) {
    const body = slide.split(`${handler}={(event) => {`)[1]?.split("}}")[0];
    assert.ok(body, `${handler} handler exists`);
    assert.match(
      body,
      /if \(seekPointer.current !== event.pointerId \|\| !seekingRef.current\) return;/,
    );
    if (handler !== "onPointerCancel") {
      assert.match(body, /seekFromPointer\(event.currentTarget, event.clientX\)/);
    }
    if (handler !== "onPointerMove") {
      assert.match(body, /seekingRef.current = false;\s*seekPointer.current = null;/);
      assert.match(body, /onSeekingChange\(false\)/);
    }
  }
});

test("desktop frame follows the directory dimensions at the same breakpoint", () => {
  const directory = read("../../app/app/psychologists/view/components/feed-styles.tsx");
  assert.match(desktopCss, /^@media \(min-width: 1024px\)/);
  for (const [property, value] of [
    ["card-top", "10px"],
    ["card-gap", "6px"],
    ["card-height", "min(900px, calc(100dvh - 82px))"],
    ["card-width", "min(506px, calc(56.25dvh - 46.125px))"],
  ]) {
    assert.ok(directory.includes(`--psychologists-desktop-${property}: ${value};`));
    assert.ok(desktopCss.includes(`--desktop-${property}: ${value};`));
  }
  assert.match(
    desktopCss,
    /--desktop-slide-height:\s*calc\(\s*var\(--desktop-card-top\)\s*\+\s*var\(--desktop-card-height\)\s*\+\s*var\(--desktop-card-gap\)\s*\)/,
  );
  assert.match(
    desktopCss,
    /\.stage \{[^}]*top: var\(--desktop-card-top\);[^}]*width: var\(--desktop-card-width\);[^}]*height: var\(--desktop-card-height\);/s,
  );
  assert.match(desktopCss, /\.dialog \{[^}]*background: var\(--lectum-surface-muted\);/s);
});

test("desktop preserves full-width native wheel scrolling and final short-slide alignment", () => {
  assert.match(
    css,
    /\.feed \{[^}]*width: 100%;[^}]*height: 100%;[^}]*overflow-y: auto;[^}]*scroll-snap-type: y mandatory;/s,
  );
  assert.match(desktopCss, /\.feed \{\s*scroll-padding-top: 0;\s*\}/);
  assert.match(
    desktopCss,
    /\.feed::after \{[^}]*display: block;[^}]*height: max\(0px, calc\(var\(--viewer-height, 100dvh\) - var\(--desktop-slide-height\)\)\);/s,
  );
  assert.match(desktopCss, /\.slide \{[^}]*height: var\(--desktop-slide-height\);/s);
  assert.doesNotMatch(read("./content-video-viewer.tsx"), /onWheel=/);
  assert.match(viewer, /key=\{`loading:\$\{queue.items.length\}`\}/);
});

test("desktop keeps the action rail outside while clipping only visual card layers", () => {
  assert.match(desktopCss, /\.stage \{[^}]*border-radius: 22px;[^}]*overflow: visible;/s);
  assert.match(desktopCss, /\.slide \{[^}]*overflow: visible;/s);
  assert.match(
    desktopCss,
    /\.player,\s*\.shade,\s*\.readingShade \{\s*border-radius: 22px;\s*overflow: hidden;/,
  );
  assert.match(desktopCss, /\.progress \{\s*border-radius: 0 0 22px 22px;\s*overflow: hidden;/);
  assert.match(
    desktopCss,
    /\.rail \{[^}]*position: fixed;[^}]*left: calc\(50% \+ var\(--desktop-card-width\) \/ 2 \+ 28px\);[^}]*right: auto;[^}]*top: 50%;[^}]*width: 68px;[^}]*transform: translateY\(-35%\);/s,
  );
  assert.match(
    desktopCss,
    /\.action::before,\s*\.contactGlyph \{\s*width: 40px;\s*height: 40px;\s*border: 1px solid var\(--lectum-border\);\s*border-radius: 50%;\s*background: var\(--lectum-surface\);/,
  );
  assert.match(css, /\.action \{[^}]*width: 44px;/s);
  assert.match(
    desktopCss,
    /\.slide\[aria-hidden="true"\] \.stage > :not\(\.player\),[^}]*visibility: hidden;/s,
  );
  assert.doesNotMatch(
    desktopCss,
    /\.slide\[aria-hidden="true"\]\s*\{[^}]*(?:display: none|visibility: hidden)/s,
  );
});

test("desktop navigation matches directory arrows, geometry and accessible interaction states", () => {
  assert.doesNotMatch(desktopCss, /--lectum-foreground/);
  assert.match(desktopCss, /color: color-mix\(in srgb, var\(--foreground\) 80%, transparent\)/);
  const directory = read("../../app/app/psychologists/view/components/desktop-rail.tsx");
  for (const icon of ["ArrowUp", "ArrowDown"]) {
    assert.ok(
      directory.includes(`<${icon} className="h-7 w-7" aria-hidden="true" strokeWidth={2.3}`),
    );
    assert.ok(viewer.includes(`<${icon} className="h-7 w-7" aria-hidden="true" strokeWidth={2.3}`));
  }
  assert.match(
    desktopCss,
    /\.navigation \{[^}]*top: 50%;[^}]*right: clamp\(24px, 3vw, 54px\);[^}]*transform: translateY\(-50%\);[^}]*gap: 20px;/s,
  );
  assert.match(
    desktopCss,
    /\.navigation button \{[^}]*width: 48px;[^}]*height: 48px;[^}]*border-radius: 16px;[^}]*background: transparent;/s,
  );
  assert.match(desktopCss, /\.navigation button:focus-visible \{[^}]*var\(--lectum-primary\) 25%/s);
  assert.match(desktopCss, /\.navigation button:hover:not\(:disabled\)/);
  assert.match(desktopCss, /\.navigation button:active:not\(:disabled\)/);
  assert.match(
    desktopCss,
    /\.navigation button:disabled \{\s*opacity: 0.35;\s*cursor: not-allowed;/,
  );
});

test("desktop navigation begins at 1024 and preserves the mobile progress focus indicator", () => {
  assert.match(css, /\.navigation \{[^}]*display: none;/s);
  assert.match(desktopCss, /\.navigation \{\s*display: flex;/);
  assert.doesNotMatch(css, /@media \(min-width: 768px\)/);
  assert.match(
    css,
    /\.progress:has\(\.progressInput:focus-visible\) \{\s*outline: 2px solid var\(--lectum-media-foreground\);\s*outline-offset: -2px;/,
  );
  assert.ok(css.trimEnd().split(/\r?\n/).length < 700, "viewer CSS stays below 700 lines");
});

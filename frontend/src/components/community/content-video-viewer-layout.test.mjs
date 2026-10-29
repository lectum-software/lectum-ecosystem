import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const viewer = read("./content-video-viewer.tsx") + read("./content-video-slide.tsx");
const css = read("./content-video-viewer.module.css");

test("the author uses one profile link and keeps its controls attached to the final word", () => {
  const author = read("./content-video-author.tsx");
  assert.match(
    author,
    /styles.name[\s\S]*?<\/Link>[\s\S]*?\{"\\u2060"\}[\s\S]*?styles.authorActions/,
  );
  assert.match(css, /\.author \{[^}]*white-space: nowrap;/s);
  assert.match(css, /\.name \{[^}]*white-space: normal;/s);
  assert.match(css, /\.authorActions:not\(:empty\) \{[^}]*display: inline-flex;/s);
  assert.match(viewer, /<Share2 className=\{styles.shareIcon\} aria-hidden \/>/);
});

test("action sizing stays balanced and author controls follow the last name", async (t) => {
  const require = createRequire(import.meta.url);
  const { createElement } = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { ArrowUp, MessageCircle, Bookmark, Share2 } = require("lucide-react");
  const icons = [ArrowUp, MessageCircle, Bookmark, Share2].map((icon, index) =>
    renderToStaticMarkup(createElement(icon, { className: index === 3 ? "shareIcon" : undefined })),
  );
  let chromium;
  try {
    ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"));
  } catch {
    t.skip("Playwright is unavailable");
    return;
  }
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [320, 390, 430, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      await page.setContent(`<style>
        *{box-sizing:border-box}body{margin:0;font-family:Arial}
        ${css}
        .test-stage{position:relative;width:${width < 1024 ? width : 506}px;height:700px;
          --info-bottom:24px;--desktop-card-width:506px}
        .favorite{flex:none;white-space:nowrap;font-size:12px;border:0;padding:0}
      </style><div class="test-stage">
        <div class="identity"><div class="author">
          <a class="name">Alessandra Ianhez de Camargo</a>&#8288;<span class="authorActions"><svg class="badge"></svg><button class="favorite">+ Favoritar</button></span>
        </div></div>
        <div class="rail">
          <button class="action" aria-pressed="false">${icons[0]}<span>1000</span></button>
          <button class="action">${icons[1]}<span>1000</span></button>
          <button class="action">${icons[2]}</button>
          <button class="action">${icons[3]}</button>
          <button class="contact"><i class="contactGlyph"><svg></svg></i></button>
        </div>
      </div>`);
      const result = await page.evaluate(() => {
        const actions = [...document.querySelectorAll(".rail > button")];
        const visible = actions.map((button) => {
          const icon = button.querySelector(".contactGlyph") || button.querySelector("svg");
          const text = button.querySelector("span");
          const rect = icon.getBoundingClientRect();
          const desktop = innerWidth >= 1024;
          const top = desktop ? button.getBoundingClientRect().top : rect.top;
          return {
            top,
            bottom: text ? text.getBoundingClientRect().bottom : desktop ? top + 40 : rect.bottom,
          };
        });
        const nameElement = document.querySelector(".name");
        const range = document.createRange();
        range.setStart(nameElement.firstChild, nameElement.textContent.lastIndexOf(" ") + 1);
        range.setEnd(nameElement.firstChild, nameElement.textContent.length);
        const name = range.getBoundingClientRect();
        const badge = document.querySelector(".badge").getBoundingClientRect();
        const favorite = document.querySelector(".favorite").getBoundingClientRect();
        const author = document.querySelector(".author").getBoundingClientRect();
        return {
          name: name.toJSON(),
          badge: badge.toJSON(),
          favorite: favorite.toJSON(),
          gaps: visible.slice(1).map((item, index) => item.top - visible[index].bottom),
          touchHeights: actions.map((button) => button.getBoundingClientRect().height),
          beside:
            favorite.top < name.bottom &&
            favorite.bottom > name.top &&
            badge.left >= name.right &&
            badge.left - name.right < 8 &&
            favorite.left >= badge.right &&
            favorite.left - badge.right < 8,
          contained: favorite.right <= author.right + 1 && name.left >= author.left,
          iconSizes: actions.slice(0, 4).map((action) => {
            const icon = action.querySelector("svg");
            const rect = icon.getBoundingClientRect();
            return { width: rect.width, height: rect.height, box: getComputedStyle(icon).width };
          }),
        };
      });
      assert.ok(
        Math.max(...result.gaps) - Math.min(...result.gaps) <= 2,
        `${width}: ${JSON.stringify(result)}`,
      );
      if (width < 1024) {
        // Directory: hit box minus icon height plus its rail gap.
        const directoryGap = width < 360 ? 40 - 18 + 6 : 44 - 20 + (width <= 390 ? 6 : 8);
        assert.equal(result.gaps[0], directoryGap);
        assert.ok(
          result.gaps.every((gap) => Math.abs(gap - directoryGap) <= 2),
          `${width}: icon and count form one item: ${JSON.stringify(result.gaps)}`,
        );
      }
      assert.ok(
        result.beside && result.contained,
        `${width}: badge and favorite must immediately follow the last name: ${JSON.stringify(result)}`,
      );
      assert.ok(result.touchHeights.every((height) => height >= (width < 1024 ? 44 : 40)));
      const size = width < 359 ? 18 : 20;
      for (const icon of result.iconSizes.slice(0, 3)) {
        assert.equal(icon.width, size);
        assert.equal(icon.height, size);
      }
      assert.ok(result.iconSizes.every((icon) => icon.box === `${size}px`));
      assert.ok(Math.abs(result.iconSizes[3].width - size * 0.9) < 0.1);
      assert.ok(Math.abs(result.iconSizes[3].height - size * 0.9) < 0.1);
      const upvote = page.locator(".rail > button").first();
      assert.equal(
        await upvote.locator("span").evaluate((el) => getComputedStyle(el).fontWeight),
        "600",
      );
      await upvote.evaluate((el) => el.setAttribute("aria-pressed", "true"));
      assert.equal(
        await upvote.locator("span").evaluate((el) => getComputedStyle(el).fontWeight),
        "800",
      );
      assert.equal(await upvote.locator("span").innerText(), "1000");
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("reels upvote shows only its count with accessible semantics and no tooltip", () => {
  const upvote = viewer.match(
    /<button\s+className=\{styles.action\}\s+aria-label="Marcar como útil"[\s\S]*?<\/button>/,
  )?.[0];
  assert.ok(upvote);
  assert.match(upvote, /aria-pressed=\{vote === 1\}/);
  assert.match(upvote, /<ArrowUp aria-hidden strokeWidth=\{vote === 1 \? 3\.2 : 2\} \/>/);
  assert.match(upvote, /<span>\{upvotes\}<\/span>/);
  assert.doesNotMatch(upvote, /title=|Tooltip|Útil ·/);
});

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
    /useEffect\(\s*\(\) =>\s*subscribeVideoSoundPreference\(\(enabled\) => \{\s*audioAttempt.current \+= 1;\s*if \(videoRef.current\) videoRef.current.muted = !enabled;\s*setMuted\(!enabled\);\s*if \(enabled\) void play\(\);\s*\}\),\s*\[play\],\s*\)/,
  );
  assert.match(slide, /!started && autoplayBlocked && video.paused && !video.muted/);
  assert.match(
    slide,
    /attempt !== audioAttempt.current \|\| revision !== getVideoSoundPreferenceRevision\(\)/,
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

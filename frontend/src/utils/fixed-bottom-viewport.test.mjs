import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getFixedBottomCorrection, getReplyKeyboardOffset } from "./fixed-bottom-viewport.ts";

test("bottom recovery is inert in a healthy viewport and ignores subpixel drift", () => {
  for (const bottom of [844, 843, 840, 850]) {
    assert.equal(getFixedBottomCorrection({ current: 0, bottom, height: 844 }), 0);
  }
});

test("upward drift is corrected once and released when native layout recovers", () => {
  const correction = getFixedBottomCorrection({ current: 0, bottom: 544, height: 844 });
  assert.equal(correction, 300);
  for (let event = 0; event < 100; event++) {
    assert.equal(getFixedBottomCorrection({ current: correction, bottom: 844, height: 844 }), 300);
  }
  assert.equal(getFixedBottomCorrection({ current: correction, bottom: 1144, height: 844 }), 0);
});

test("invalid viewport dimensions cannot produce unbounded corrections", () => {
  for (const height of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(getFixedBottomCorrection({ current: 0, bottom: 200, height }), 0);
  }
  assert.equal(getFixedBottomCorrection({ current: 0, bottom: -200, height: 844 }), 844);
});

const keyboard = {
  focused: true,
  layoutHeight: 844,
  viewportHeight: 500,
  viewportTop: 80,
  scale: 1,
  composerBottom: 844,
  currentOffset: 0,
};

test("composer uses viewport height plus top and does not double-compensate native movement", () => {
  assert.equal(getReplyKeyboardOffset(keyboard), 272);
  assert.equal(getReplyKeyboardOffset({ ...keyboard, composerBottom: 580 }), 0);
  assert.equal(
    getReplyKeyboardOffset({ ...keyboard, composerBottom: 572, currentOffset: 272 }),
    272,
  );
});

test("keyboard dismissal clears the offset even when composer active state was retained", () => {
  assert.equal(getReplyKeyboardOffset({ ...keyboard, focused: false, currentOffset: 272 }), 0);
  assert.equal(getReplyKeyboardOffset({ ...keyboard, viewportHeight: 844, currentOffset: 272 }), 0);
  assert.equal(getReplyKeyboardOffset({ ...keyboard, viewportHeight: 820 }), 0);
  assert.equal(getReplyKeyboardOffset({ ...keyboard, layoutHeight: 500, viewportTop: 0 }), 0);
  assert.equal(getReplyKeyboardOffset({ ...keyboard, scale: 2 }), 0);
  assert.equal(getReplyKeyboardOffset({ ...keyboard, composerBottom: Number.NaN }), 0);
});

test("recovery is scoped to iOS installed mobile bars and preserves explicit hidden/drag states", () => {
  const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
  const hook = read("../hooks/use-pwa-bottom-recovery.ts");
  assert.match(hook, /if \(!enabled \|\| !standalone \|\| !ios\) return/);
  assert.match(hook, /max-width: 639px/);
  assert.match(hook, /isKeyboardInput\(document.activeElement\)/);
  assert.match(hook, /Math.abs\(viewport.scale - 1\)/);
  assert.match(hook, /getComputedStyle\(element\).position !== "fixed"/);
  assert.match(hook, /removeProperty\(CORRECTION_PROPERTY\)/);
  assert.doesNotMatch(hook, /scrollTo\(|scrollBy\(|document.body.style|\.blur\(/);
  for (const event of [
    "scroll",
    "resize",
    "pageshow",
    "orientationchange",
    "focusin",
    "focusout",
  ]) {
    assert.ok(hook.includes(`addEventListener("${event}"`));
    assert.ok(hook.includes(`removeEventListener("${event}"`));
  }
  const navigation = read("../templates/private/index.tsx");
  assert.match(
    navigation,
    /shouldRenderMobileNavigation && isMobileNavigationRenderedVisible && !navigationDimmed/,
  );
  assert.match(navigation, /data-fixed-bottom-recovery\s+ref=\{bottomNavigationRef\}/);
  const composer = read("../app/app/community/[slug]/post/[id]/components/reply-composer.tsx");
  assert.match(
    composer,
    /!isInline && !shouldUseKeyboardSafeArea && !draggingToCancel && dragOffset === 0/,
  );
  assert.match(composer, /data-fixed-bottom-recovery=\{isInline \? undefined : true\}/);
});

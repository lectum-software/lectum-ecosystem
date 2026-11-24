import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (name) =>
  readFileSync(
    new URL(`../src/app/app/psychologist/[id]/components/${name}.tsx`, import.meta.url),
    "utf8",
  );

test("profile biography clamps before asynchronous overflow measurement", () => {
  const text = source("about");
  assert.match(text, /const collapsedTextStyle =\s*!expanded\s*\?/);
  assert.match(text, /WebkitLineClamp: PROFILE_ABOUT_MAX_LINES/);
  assert.match(text, /truncated && !expanded \? \(/);
  assert.match(text, /aria-expanded=\{expanded\}/);
  assert.doesNotMatch(text, /text-primary\/85/);
});

test("profile media optimizes HTTPS without removing local HTTP support", () => {
  const text = source("hero");
  assert.doesNotMatch(text, /isPublicMediaUrl/);
  assert.match(text, /unoptimized=\{avatarSrc.startsWith\("http:"\)\}/);
  assert.match(text, /unoptimized=\{coverImageSrc.startsWith\("http:"\)\}/);
  assert.match(text, /loading="eager"/);
  assert.match(text, /text-success-strong/);
});

test("profile availability and action tokens meet text contrast in both themes", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const colors = (name) =>
    [...css.matchAll(new RegExp(`--lectum-${name}: #(\\w{6});`, "g"))].map((match) => match[1]);
  const luminance = (hex) => {
    const [r, g, b] = hex.match(/../g).map((value) => {
      const channel = Number.parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  };
  for (const token of ["success-strong", "primary-strong"]) {
    const foreground = colors(token);
    const background = colors("surface");
    assert.equal(foreground.length, 2);
    assert.equal(background.length, 2);
    for (let index = 0; index < 2; index++) {
      const a = luminance(foreground[index]);
      const b = luminance(background[index]);
      assert.ok(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
        `${token} theme ${index}`,
      );
    }
  }
});

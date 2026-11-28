import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");

test("cookie action colors retain readable white text in default and hover states", () => {
  const css = source("app/globals.css");
  for (const token of ["cookie-action", "cookie-action-hover"]) {
    const hex = css.match(new RegExp(`--lectum-${token}: #([a-f0-9]{6});`))[1];
    const channels = hex.match(/../g).map((value) => {
      const s = Number.parseInt(value, 16) / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    assert.ok(1.05 / (luminance + 0.05) >= 4.5, token);
  }
  assert.match(source("components/privacy/notice.tsx"), /bg-cookie-action /);
});

test("privacy notice has no initial idle delay but preserves interaction and consent guards", () => {
  const notice = source("components/privacy/notice.tsx");
  assert.match(notice, /let idleAt = Date.now\(\);/);
  assert.match(notice, /idleAt = Date.now\(\) \+ 1800;/);
  assert.match(notice, /busySurface\(\) \|\|/);
  assert.match(notice, /ready &&\s*inviteReady &&\s*canShowPrivacyNotice\(path\) &&/);
  assert.match(notice, /!decided\s*\|\|\s*\(GOOGLE_ENABLED && googleChoice === null\)/);
});

test("directory action avatars use responsive optimization with a local HTTP fallback", () => {
  for (const component of ["slide-details", "desktop-rail"]) {
    const text = source(`app/app/psychologists/view/components/${component}.tsx`);
    assert.match(text, /sizes=/);
    assert.match(text, /unoptimized=\{resolvePublicMediaUrl\([^)]*\)\?\.startsWith\("http:"\)\}/);
    assert.doesNotMatch(text, /isPublicMediaUrl/);
  }
});

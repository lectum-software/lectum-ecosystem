import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("WhatsApp contact green has one theme-independent definition", () => {
  const css = source("../../app/globals.css");
  const favoritesGreen = css.match(/--lectum-success:\s*([^;]+);/)[1];
  assert.equal(css.match(/--lectum-whatsapp-contact:\s*([^;]+);/)[1], favoritesGreen);
  assert.equal((css.match(/--lectum-whatsapp-contact:/g) ?? []).length, 1);
  assert.match(css, /--color-whatsapp-contact:\s*var\(--lectum-whatsapp-contact\)/);
});

const surfaces = [
  ["feed overlay", "../community/community-whatsapp-cta.tsx", "bg-whatsapp-contact", 1],
  [
    "profile mobile and desktop",
    "../../app/app/psychologist/[id]/components/whatsapp-cta.tsx",
    "bg-whatsapp-contact",
    2,
  ],
  [
    "directory mobile",
    "../../app/app/psychologists/view/components/slide-details.tsx",
    "bg-whatsapp-contact",
    2,
  ],
  [
    "directory desktop",
    "../../app/app/psychologists/view/components/desktop-rail.tsx",
    "text-whatsapp-contact",
    4,
  ],
  ["psychologist cards", "./psychologist-card.tsx", "bg-whatsapp-contact", 2],
  ["favorites", "./psychologist-relation-list.tsx", "bg-whatsapp-contact", 1],
  ["redirect fallback", "./psychologist-whatsapp-redirect-button.tsx", "bg-whatsapp-contact", 1],
  ["mentor contact", "../../app/app/community/top-mentors/logic.tsx", "text-whatsapp-contact", 1],
];

for (const [name, path, token, minimum] of surfaces) {
  test(`${name} uses the approved WhatsApp contact token`, () => {
    const text = source(path);
    const classes = [
      ...text.matchAll(/className="([^"]+)"|"([^"\n]*(?:bg|text)-whatsapp-contact[^"\n]*)"/g),
    ].map((match) => match[1] ?? match[2]);
    const contactClasses = classes.filter((value) => value.split(/\s+/).includes(token));
    assert.ok(contactClasses.length >= minimum, `${name}: missing contact surface`);
    for (const value of contactClasses) {
      assert.doesNotMatch(value, /(?:bg|text|border|ring)-success|(?:bg|text)-whatsapp(?:\s|$|\/)/);
    }
  });
}

test("reels mobile fill and desktop glyph use the same contact token", () => {
  const css = source("../community/content-video-viewer.module.css");
  assert.match(css, /\.contactGlyph\s*\{[^}]*background:\s*var\(--lectum-whatsapp-contact\)/);
  assert.match(css, /\.contactGlyph\s*\{[^}]*color:\s*var\(--lectum-whatsapp-contact\)/);
  assert.doesNotMatch(css, /--lectum-success/);
});

test("availability indicators retain their success color", () => {
  assert.match(
    source("../../app/app/psychologists/view/components/slide-details.tsx"),
    /psychologists-availability-dot[^"\n]*bg-success/,
  );
  assert.match(
    source("./psychologist-relation-list.tsx"),
    /rounded-full bg-success ring-1 ring-success\/20/,
  );
});

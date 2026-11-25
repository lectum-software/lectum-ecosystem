import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/link" ? "next/link.js" : specifier, context);
  },
});
const { InlineExpandableText } = await import("./inline-expandable-text.tsx");

test("collapsed text is clamped in server HTML, without waiting for measurement", () => {
  for (const maxLines of [2, 4]) {
    const html = renderToStaticMarkup(
      createElement(InlineExpandableText, { text: "Texto do post", expanded: false, maxLines }),
    );
    assert.match(html, new RegExp(`-webkit-line-clamp:${maxLines}`));
    assert.match(html, /overflow:hidden/);
    assert.match(html, /Texto do post/);
  }
});

test("expanded text has no clamp and retains the original toggle color", () => {
  const html = renderToStaticMarkup(
    createElement(InlineExpandableText, { text: "Texto completo", expanded: true }),
  );
  assert.doesNotMatch(html, /line-clamp|overflow:hidden/);
  const source = readFileSync(new URL("./inline-expandable-text.tsx", import.meta.url), "utf8");
  assert.match(source, /text-muted\/80/);
  assert.match(source, /const maxHeight = lineHeightPx\(\) \* maxLines/);
});

test("measurement releases the CSS clamp so the inline toggle cannot be clipped", () => {
  const source = readFileSync(new URL("./inline-expandable-text.tsx", import.meta.url), "utf8");
  assert.match(source, /setMeasuredText\(text\)/);
  assert.match(source, /expanded \|\| measuredText === text\s*\? undefined/);
});

test("post and reply avatars optimize HTTPS at their existing responsive sizes", () => {
  const source = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/[id]/components/post-content.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /sizes=\{imageSize\}/);
  assert.match(source, /unoptimized=\{avatarSrc.startsWith\("http:"\)\}/);
  assert.doesNotMatch(source, /isPublicMediaUrl/);
});

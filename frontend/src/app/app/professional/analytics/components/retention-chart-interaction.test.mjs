import "../../../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const { RetentionChart } = await import("./presentation-video.tsx");
const { getRetentionSeekPercent, getRetentionKeyboardSeekPercent } = await import(
  "./retention-chart-interaction.ts"
);
const { toChartPoint } = await import("../modules/support.ts");
const source = readFileSync(new URL("./presentation-video.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile(
  "presentation-video.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let viewBox;
function visit(node) {
  if (ts.isJsxAttribute(node) && node.name.getText(ast) === "viewBox") {
    assert.ok(node.initializer && ts.isStringLiteral(node.initializer));
    viewBox = node.initializer.text.split(" ").map(Number);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(viewBox);
const [, , viewBoxWidth, viewBoxHeight] = viewBox;
const closeTo = (actual, expected) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual - expected) < 1e-8, `actual=${actual}; expected=${expected}`);
};

// Pure affine/viewport inputs, not a replacement SVG/DOM. toChartPoint, inverse
// calculation and React SSR are production functions. Only the parent browser
// run can measure an actual getScreenCTM() and dispatch pointer/keyboard events.
for (const layout of [
  { name: "unscaled", width: 300, height: 150, left: 0, top: 0 },
  { name: "mobile max320 centered in wider button", width: 320, height: 160, left: 72, top: 90 },
  { name: "desktop horizontal letterbox", width: 600, height: 224, left: 149, top: 300 },
  { name: "narrow vertical letterbox", width: 272, height: 160, left: 16, top: -40 },
]) {
  const scale = Math.min(layout.width / viewBoxWidth, layout.height / viewBoxHeight);
  const matrix = {
    a: scale,
    b: 0,
    c: 0,
    d: scale,
    e: layout.left + (layout.width - viewBoxWidth * scale) / 2,
    f: layout.top + (layout.height - viewBoxHeight * scale) / 2,
  };
  for (const milestone of [0, 50, 100]) {
    test(`${layout.name}: actual toChartPoint(${milestone}) roundtrips through screen coordinates`, () => {
      const point = toChartPoint(milestone, 50);
      closeTo(
        getRetentionSeekPercent(
          matrix.a * point.x + matrix.e,
          matrix.d * point.y + matrix.f,
          matrix,
        ),
        milestone,
      );
    });
  }
}

for (const matrix of [
  { a: 0, b: 2, c: -2, d: 0, e: 500, f: -40 },
  { a: 2, b: 0.25, c: 0.5, d: 3, e: 100, f: 75 },
  { a: -1.5, b: 0, c: 0, d: 1.5, e: 600, f: 20 },
]) {
  test(`inverse handles rotation/skew/reflection ${JSON.stringify(matrix)}`, () => {
    for (const milestone of [0, 25, 50, 75, 100]) {
      for (const rate of [0, 50, 100]) {
        const point = toChartPoint(milestone, rate);
        const x = matrix.a * point.x + matrix.c * point.y + matrix.e;
        const y = matrix.b * point.x + matrix.d * point.y + matrix.f;
        closeTo(getRetentionSeekPercent(x, y, matrix), milestone);
      }
    }
  });
}

const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
test("axis margins clamp; x=0/whole SVG width are not the drawn endpoints", () => {
  assert.equal(getRetentionSeekPercent(toChartPoint(0, 0).x - 20, 0, identity), 0);
  assert.equal(getRetentionSeekPercent(toChartPoint(100, 0).x + 20, 0, identity), 100);
  closeTo(getRetentionSeekPercent(toChartPoint(50, 0).x, 0, identity), 50);
});
test("missing, singular and nonfinite CTM/coordinates do not request a seek", () => {
  for (const matrix of [
    null,
    undefined,
    { ...identity, a: 0 },
    { ...identity, e: Number.NaN },
    { ...identity, a: Infinity },
  ]) {
    assert.equal(getRetentionSeekPercent(50, 20, matrix), null);
  }
  assert.equal(getRetentionSeekPercent(Number.NaN, 20, identity), null);
  assert.equal(getRetentionSeekPercent(50, Infinity, identity), null);
});

for (const [key, seconds] of [
  ["ArrowLeft", 55],
  ["ArrowDown", 55],
  ["ArrowRight", 65],
  ["ArrowUp", 65],
  ["Home", 0],
  ["End", 120],
]) {
  test(`keyboard ${key} follows existing media control step/Home/End`, () => {
    closeTo(getRetentionKeyboardSeekPercent(key, 60, 120), (seconds / 120) * 100);
  });
}
test("short media step and boundaries are clamped", () => {
  closeTo(getRetentionKeyboardSeekPercent("ArrowRight", 10, 40), 30);
  closeTo(getRetentionKeyboardSeekPercent("ArrowRight", 0, 10), 10);
  assert.equal(getRetentionKeyboardSeekPercent("ArrowLeft", 0, 120), 0);
  assert.equal(getRetentionKeyboardSeekPercent("ArrowRight", 120, 120), 100);
});
test("Enter/Space and unrelated keys have no positional seek", () => {
  for (const key of ["Enter", " ", "Tab", "Escape", "a"]) {
    assert.equal(getRetentionKeyboardSeekPercent(key, 60, 120), null);
  }
});
test("no duration/invalid time cannot produce nonfinite keyboard receipt", () => {
  for (const duration of [null, undefined, 0, -1, Infinity, Number.NaN]) {
    assert.equal(getRetentionKeyboardSeekPercent("ArrowRight", 60, duration), null);
  }
  assert.equal(getRetentionKeyboardSeekPercent("ArrowRight", Infinity, 120), null);
});

const props = {
  points: [],
  durationSeconds: 120,
  currentTimeSeconds: 60,
  onSeek: () => assert.fail("SSR cannot seek"),
};
const render = (overrides = {}) =>
  renderToStaticMarkup(createElement(RetentionChart, { ...props, ...overrides }));
test("real React SSR exposes a focusable horizontal slider, percent value and time text", () => {
  assert.equal(typeof document, "undefined");
  const html = render();
  assert.match(html, /role="slider"/);
  assert.match(html, /aria-label="Selecionar trecho no gráfico de retenção"/);
  assert.match(html, /aria-orientation="horizontal"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="100"/);
  assert.match(html, /aria-valuenow="50"/);
  assert.match(html, /aria-valuetext="1:00 de 2:00"/);
  assert.match(html, /aria-disabled="false"/);
  assert.match(html, /tabindex="0"/);
  assert.doesNotMatch(html, /<button/);
});
for (const [name, override] of [
  ["locked", { locked: true }],
  ["missing duration", { durationSeconds: undefined }],
  ["null duration", { durationSeconds: null }],
  ["zero duration", { durationSeconds: 0 }],
  ["invalid duration", { durationSeconds: Infinity }],
  ["missing callback", { onSeek: undefined }],
]) {
  test(`real SSR ${name}: disabled and outside tab order`, () => {
    const html = render(override);
    assert.match(html, /aria-disabled="true"/);
    assert.match(html, /tabindex="-1"/);
    assert.doesNotMatch(html, /NaN|Infinity/);
  });
}
test("SSR clamps position and retains chart copy, viewBox and mobile-first classes", () => {
  assert.match(render({ currentTimeSeconds: -10 }), /aria-valuenow="0"/);
  assert.match(render({ currentTimeSeconds: 200 }), /aria-valuenow="100"/);
  assert.match(render({ currentTimeSeconds: Number.NaN }), /aria-valuenow="0"/);
  const html = render({ locked: true });
  assert.match(html, /blur-\[4px\]/);
  assert.match(html, /viewBox="0 0 300 150"/);
  assert.match(html, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(html, /h-40 w-full max-w-\[320px\].*md:h-56 md:max-w-none/);
  assert.match(html, /Curva contínua estimada de retenção por minuto do vídeo/);
});

test("source wiring: actual SVG CTM, non-pointer guard and gated key handler remain connected", () => {
  assert.match(source, /svgRef\.current\?\.getScreenCTM\(\)/);
  assert.match(source, /if \(!canSeek \|\| event\.detail === 0\) return;/);
  assert.match(source, /onClick=\{handleSeekFromChart\}/);
  assert.match(source, /onKeyDown=\{handleChartKeyDown\}/);
  assert.match(source, /ref=\{svgRef\}/);
  assert.match(source, /const handleChartKeyDown[\s\S]*?if \(!canSeek\) return;/);
  assert.doesNotMatch(source, /getBoundingClientRect/);
});

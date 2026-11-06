import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { compile } = require("tailwindcss");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const globals = postcss.parse(
  readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8"),
);
const tokens = [];
globals.walkRules(":root", (rule) => {
  rule.walkDecls((declaration) => tokens.push(declaration.toString()));
});
const themePath = path.join(path.dirname(require.resolve("tailwindcss")), "../theme.css");
const { build } = await compile(
  `${readFileSync(themePath, "utf8")}\n:root { ${tokens.join(";")} }\n@theme { --color-media-background: var(--lectum-media-background); --color-media-foreground: var(--lectum-media-foreground); }\n@tailwind utilities;`,
);
const classes = ["./player-captions.tsx", "./caption-icon.tsx"].flatMap((file) =>
  [
    ...readFileSync(new URL(file, import.meta.url), "utf8").matchAll(/className="([^"]+)"/g),
  ].flatMap((match) => match[1].split(/\s+/)),
);
const styles = build(classes);
const domRequire = createRequire(require.resolve("react-dom/client"));
const production = (name, file, resolver = require) =>
  readFileSync(path.join(path.dirname(resolver.resolve(name)), "cjs", file), "utf8");
const source = (file) =>
  ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    fileName: file,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const modules = {
  react: production("react", "react.production.js"),
  "react/jsx-runtime": production("react", "react-jsx-runtime.production.js"),
  "react-dom": production("react-dom", "react-dom.production.js"),
  "react-dom/client": production("react-dom", "react-dom-client.production.js"),
  scheduler: production("scheduler", "scheduler.production.js", domRequire),
  "./caption-icon": source("./caption-icon.tsx"),
  player: source("./player-captions.tsx"),
};
const bundle = `
const factories = {${Object.entries(modules)
  .map(
    ([name, value]) => `${JSON.stringify(name)}: function(require, module, exports) {\n${value}\n}`,
  )
  .join(",")}}, cache = {};
function require(name) {
  if (cache[name]) return cache[name].exports;
  const module = cache[name] = {exports:{}};
  factories[name](require, module, module.exports);
  return module.exports;
}
const React = require("react"), root = require("react-dom/client").createRoot(document.querySelector("#root"));
const {PlayerCaptions} = require("player");
window.video = document.querySelector("video");
window.provider = video.addTextTrack("subtitles", "Provider", "pt");
provider.mode = "showing";
window.metadata = video.addTextTrack("metadata", "Metadata");
metadata.mode = "hidden";
window.mount = () => root.render(React.createElement(PlayerCaptions, {
  videoRef:{current:video},
  captions:{asset_id:"test_asset",revision:1,reviewed:false,language:"pt",
    cues:[{start:0,end:20,text:"Uma dica é pensar no que fez você considerar a terapia neste momento da sua vida."}]}
}));
window.unmount = () => root.render(null);
mount();
`;
let browser;
test("feed cards disable transcripts without changing discussion or caption controls", () => {
  for (const file of [
    "../community/community-post-card.tsx",
    "../../app/app/community/[slug]/components/post-card.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), "utf8"), /allowTranscript/);
  }
  const context = readFileSync(
    new URL("../community/content-video-context.tsx", import.meta.url),
    "utf8",
  );
  assert.match(context, /allowTranscript = false/);
  const discussion = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/[id]/components/replies-list.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(discussion, /<ContentVideoPost[^>]*allowTranscript/);
  assert.match(context, /TranscriptScope enabled=\{allowTranscript\}/);
  const transcript = readFileSync(new URL("./transcript.tsx", import.meta.url), "utf8");
  assert.match(transcript, /!scope\?\.enabled && !editable/);
  assert.match(transcript, /!onOpen && !scope\?\.enabled/);
  assert.match(transcript, /\{editable \?\s*(?:\(\s*)?<EditCaptionMenuItem/);
});
before(async () => {
  if (!process.env.PLAYWRIGHT_MODULE) return;
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  browser = await chromium.launch({ channel: "msedge", headless: true });
});
after(async () => browser?.close());

for (const width of [390, 1440]) {
  test(`single caption renderer and CC placement at ${width}px`, {
    skip:
      !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE to an installed Playwright module",
  }, async () => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.route("http://caption.test/**", (route) => {
        const resource = new URL(route.request().url()).pathname;
        if (resource === "/clip.mp4")
          return route.fulfill({
            contentType: "video/mp4",
            body: readFileSync(
              new URL("../../../public/videos/verification-v1.mp4", import.meta.url),
            ),
          });
        if (resource === "/icons/close-caption.png")
          return route.fulfill({
            contentType: "image/png",
            body: readFileSync(new URL("../../../public/icons/close-caption.png", import.meta.url)),
          });
        return route.fulfill({
          contentType: "text/html",
          body: `
          <style>
          ${styles}
          body{margin:0;background:var(--lectum-muted)} #stage{position:relative;width:320px;height:570px;margin:20px}
          video{width:100%;height:100%;object-fit:cover}
          *{box-sizing:border-box} body{font-family:Arial,sans-serif}
          </style><div id="stage"><video muted playsinline src="/clip.mp4"></video><div id="root" style="position:absolute;inset:0"></div></div>`,
        });
      });
      await page.goto("http://caption.test/");
      await page.addScriptTag({ content: bundle });
      await page.waitForFunction(() => video.readyState >= 2 && video.textTracks.length === 3);
      await page.evaluate(() => {
        video.currentTime = 1;
      });
      await page.locator("[data-lectum-captions]").waitFor();
      const typography = await page.locator("[data-lectum-captions]>span").evaluate((el) => {
        const style = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const lines = Array.from(range.getClientRects()).map((r) => ({
          top: r.top,
          bottom: r.bottom,
        }));
        return {
          display: style.display,
          lineHeight: parseFloat(style.lineHeight),
          fontSize: parseFloat(style.fontSize),
          fragments: el.getClientRects().length,
          lines,
        };
      });
      assert.equal(
        typography.display,
        "inline-block",
        "one continuous background, not cloned per line",
      );
      assert.equal(typography.fragments, 1);
      assert.ok(typography.lines.length > 1);
      assert.ok(typography.lineHeight >= typography.fontSize * 1.4);
      for (let i = 1; i < typography.lines.length; i++)
        assert.ok(
          typography.lines[i].top >= typography.lines[i - 1].bottom,
          "text lines never overlap",
        );
      const cc = page.getByRole("button", { name: "Desativar legendas" });
      const bounds = await cc.boundingBox();
      assert.equal(bounds.x, 284);
      assert.equal(bounds.y, 32);
      assert.equal(bounds.width, 44);
      assert.equal(bounds.height, 44);
      assert.deepEqual(await page.evaluate(() => Array.from(video.textTracks, (t) => t.mode)), [
        "disabled",
        "hidden",
        "hidden",
      ]);
      await page.evaluate(() => {
        window.late = video.addTextTrack("captions", "Late provider", "pt");
        late.mode = "showing";
        provider.mode = "showing";
      });
      await page.waitForFunction(() => late.mode === "disabled" && provider.mode === "disabled");
      const mask = await cc.locator("[data-caption-outline]").evaluate((el) => el.style.mask);
      assert.equal(await cc.locator("[data-caption-fill]").count(), 1);
      assert.equal(
        await cc
          .locator("[data-caption-fill]")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        await cc
          .locator("[data-caption-outline]")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      );
      assert.equal(await cc.locator("[data-caption-letters]").count(), 1);
      await cc.click();
      assert.equal(await page.locator("[data-caption-fill]").count(), 0);
      assert.equal(await page.locator("[data-caption-letters]").count(), 0);
      assert.equal(await page.locator("[data-lectum-captions]").count(), 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Ativar legendas" })
          .locator("[data-caption-outline]")
          .evaluate((el) => el.style.mask),
        mask,
      );
      await page.evaluate(() => {
        provider.mode = "showing";
      });
      await page.waitForFunction(() => provider.mode === "disabled");
      await page.getByRole("button", { name: "Ativar legendas" }).click();
      await page.locator("[data-lectum-captions]").waitFor();
      await page.evaluate(() => video.dispatchEvent(new Event("webkitbeginfullscreen")));
      await page.waitForFunction(() => video.textTracks[2].mode === "showing");
      assert.equal(await page.locator("[data-lectum-captions]").count(), 0);
      await page.evaluate(() => mount());
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(() => video.textTracks[2].mode),
        "showing",
        "native fullscreen survives rerender",
      );
      await page.evaluate(() => video.dispatchEvent(new Event("webkitendfullscreen")));
      await page.locator("[data-lectum-captions]").waitFor();
      await page.evaluate(() => {
        const anchor = document.createElement("button");
        anchor.id = "instagram";
        anchor.setAttribute("aria-label", "Abrir prévia para redes sociais");
        anchor.style.cssText = "position:absolute;right:12px;top:12px;width:44px;height:44px";
        document.querySelector("#root").append(anchor);
      });
      await page.waitForFunction(
        () => document.querySelector("[aria-pressed]").style.top === "64px",
      );
      assert.equal((await cc.boundingBox()).y, 84);
      await page.evaluate(() => document.querySelector("#instagram").remove());
      await page.waitForFunction(
        () => document.querySelector("[aria-pressed]").style.top === "12px",
      );
      await page.evaluate(() => {
        document.querySelector("#stage").setAttribute("data-lectum-caption-scope", "");
        const header = document.createElement("button");
        header.id = "create";
        header.setAttribute("data-reels-create-post", "");
        header.style.cssText = "position:absolute;right:16px;top:16px;width:44px;height:44px";
        document.querySelector("#root").append(header);
      });
      await page.waitForFunction(
        () => document.querySelector("[aria-pressed]").style.top === "68px",
      );
      await page.evaluate(() => document.querySelector("#create").remove());
      await page.waitForFunction(
        () => document.querySelector("[aria-pressed]").style.top === "12px",
      );
      if (process.env.LECTUM_QA_SCREENSHOTS)
        await page.screenshot({
          path: path.join(process.env.LECTUM_QA_SCREENSHOTS, `caption-fix-${width}.png`),
        });
      await page.evaluate(() => {
        const overlay = document.createElement("div");
        overlay.setAttribute("data-lectum-video-bottom-overlay", "true");
        overlay.style.cssText = "position:absolute;bottom:0;height:120px;width:100%";
        document.querySelector("#root").append(overlay);
      });
      await page.waitForFunction(() =>
        document.querySelector("[data-lectum-captions]").style.bottom.includes("132px"),
      );
      const captionBounds = await page.locator("[data-lectum-captions]").boundingBox();
      const overlayBounds = await page.locator("[data-lectum-video-bottom-overlay]").boundingBox();
      assert.ok(captionBounds.y + captionBounds.height <= overlayBounds.y - 12);
      await page.evaluate(() => document.querySelector("#stage").requestFullscreen());
      assert.equal(
        await page.evaluate(() => video.textTracks[2].mode),
        "hidden",
        "page fullscreen keeps Lectum captions",
      );
      assert.equal(await page.locator("[data-lectum-captions]").count(), 1);
      await page.evaluate(() => document.exitFullscreen());
      await page.evaluate(() => unmount());
      await page.waitForFunction(() => video.textTracks[2].mode === "disabled");
      await page.evaluate(() => {
        provider.mode = "showing";
      });
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(() => provider.mode),
        "showing",
        "listeners removed on unmount",
      );
    } finally {
      await page.close();
    }
  });
}

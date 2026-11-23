import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const domRequire = createRequire(require.resolve("react-dom/client"));
const production = (name, file, resolver = require) =>
  readFileSync(path.join(path.dirname(resolver.resolve(name)), "cjs", file), "utf8");
const modules = {
  react: production("react", "react.production.js"),
  "react/jsx-runtime": production("react", "react-jsx-runtime.production.js"),
  "react-dom/client": production("react-dom", "react-dom-client.production.js"),
  "react-dom": production("react-dom", "react-dom.production.js"),
  scheduler: production("scheduler", "scheduler.production.js", domRequire),
  "next/dynamic":
    "module.exports = () => props => { window.viewer = props; return require('react').createElement('output', null, props.initial.videoId || 'opened'); };",
  "next/navigation":
    "exports.usePathname = () => location.pathname; exports.useRouter = () => ({ replace: href => { window.replacedRoute = href; history.replaceState({}, '', href); document.querySelector('[data-public-reel-page]')?.remove(); } });",
  "@/hooks/redux": "exports.useAppSelector = select => select({ user: null });",
  "@/components/video-captions/transcript": "exports.TranscriptScope = ({children}) => children;",
};
for (const name of [
  "content-video-host",
  "content-video-context",
  "content-video-history",
  "content-video-link",
]) {
  const extension =
    name === "content-video-host" || name === "content-video-context" ? "tsx" : "ts";
  modules["./" + name] = ts.transpileModule(
    readFileSync(new URL("./" + name + "." + extension, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
}
modules["@/lib/video-sound-preference"] = ts.transpileModule(
  readFileSync(new URL("../../lib/video-sound-preference.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const factories = Object.entries(modules)
  .map(
    ([name, code]) =>
      JSON.stringify(name) + ": function(require,module,exports) {\n" + code + "\n}",
  )
  .join(",");
const harness = `
  const factories = { ${factories} }, cache = {};
  function require(name) {
    if (cache[name]) return cache[name].exports;
    const module = cache[name] = {exports:{}};
    factories[name](require,module,module.exports); return module.exports;
  }
  const React = require('react');
  const {createRoot} = require('react-dom/client');
  const {ContentVideoHost, ContentVideoScope} = require('./content-video-host');
  const {useContentVideoLauncher} = require('./content-video-context');
  function Launch() {
    const launch = useContentVideoLauncher();
    return React.createElement('button', {onClick: () => launch({initial:{postId:'p', videoId:'b'}})}, 'Open');
  }
  createRoot(document.getElementById('root')).render(
    React.createElement(ContentVideoHost, {directLink: location.pathname === '/shared'},
      location.pathname === '/shared' ? React.createElement(Launch) :
      React.createElement(ContentVideoScope, {mode:'feed', entries:[]}, React.createElement(Launch)))
  );
`;

test("host restores external links, refresh, back/forward and closes without losing the page query", {
  skip: !process.env.PLAYWRIGHT_MODULE,
}, async () => {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://reels.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<div id="root"></div><script>' + harness + "</script>",
      }),
    );
    await page.goto("https://reels.test/?tab=videos&reel=b&reelPost=p");
    await page.waitForSelector("output");
    assert.equal(await page.locator("output").textContent(), "b");
    assert.equal(await page.locator("output").count(), 1);
    await page.reload();
    await page.waitForSelector("output");
    assert.equal(await page.locator("output").textContent(), "b");
    await page.evaluate(() => viewer.onClose());
    await page.waitForFunction(() => !document.querySelector("output"));
    assert.equal(new URL(page.url()).search, "?tab=videos");
    await page.getByText("Open", { exact: true }).click();
    await page.waitForSelector("output");
    await page.evaluate(() => viewer.onActiveVideo({ postId: "p", videoId: "b" }));
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector("output"));
    await page.goForward();
    await page.waitForSelector("output");
    assert.equal(await page.locator("output").textContent(), "b");
    await page.evaluate(() => {
      viewer.onNavigate({
        initial: { postId: "p", videoId: "c" },
        initialTime: 12,
        watchedVideoKeys: ["a", "b"],
      });
    });
    await page.waitForFunction(() => !document.querySelector("output"));
    await page.goto("https://reels.test/profissional/example");
    await page.goBack();
    await page.waitForSelector("output");
    assert.equal(await page.locator("output").textContent(), "c");
    assert.deepEqual(await page.evaluate(() => viewer.watchedVideoKeys), ["a", "b"]);
    assert.equal(await page.evaluate(() => viewer.initialTime), 12);
    await page.evaluate(() => {
      const article = document.createElement("article");
      article.dataset.publicReelPage = "";
      article.dataset.postHref = "/comunidades/geral/publicacao/p";
      document.body.append(article);
      viewer.onActiveVideo({ postId: "other", videoId: "next" });
      viewer.onClose();
    });
    await page.waitForFunction(() => !document.querySelector("output"));
    assert.equal(new URL(page.url()).pathname, "/comunidades/geral/publicacao/p");
    assert.equal(new URL(page.url()).search, "");
    assert.equal(
      await page.evaluate(() => window.replacedRoute),
      "/comunidades/geral/publicacao/p",
    );
    assert.deepEqual(errors, []);
    await page.goto("https://reels.test/shared?reel=b&reelPost=p");
    await page.waitForSelector("output");
    await page.evaluate(() =>
      history.replaceState({ ...history.state, lectumReelScope: "feed" }, "", location.href),
    );
    await page.reload();
    await page.waitForSelector("output");
    assert.equal(await page.locator("output").count(), 1);
    assert.equal(await page.locator("output").textContent(), "b");
  } finally {
    await browser.close();
  }
});

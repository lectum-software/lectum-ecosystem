import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const domRequire = createRequire(require.resolve("react-dom/client"));
const productionModule = (name, file, resolver = require) =>
  readFileSync(path.join(path.dirname(resolver.resolve(name)), "cjs", file), "utf8");
const modules = {
  react: productionModule("react", "react.production.js"),
  "react-dom": productionModule("react-dom", "react-dom.production.js"),
  "react-dom/client": productionModule("react-dom", "react-dom-client.production.js"),
  scheduler: productionModule("scheduler", "scheduler.production.js", domRequire),
  scroll: ts.transpileModule(
    readFileSync(new URL("./use-content-video-scroll.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
};
const factories = Object.entries(modules)
  .map(
    ([name, source]) =>
      `${JSON.stringify(name)}: function(require, module, exports) {\n${source}\n}`,
  )
  .join(",\n");
const harness = `
  const factories = { ${factories} };
  const cache = {};
  function require(name) {
    if (cache[name]) return cache[name].exports;
    const module = cache[name] = { exports: {} };
    factories[name](require, module, module.exports);
    return module.exports;
  }
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const { flushSync } = require('react-dom');
  const { useContentVideoScroll } = require('scroll');
  window.selections = [];
  window.renders = 0;
  let root;
  let props;
  function Harness(options) {
    const [index, setIndex] = React.useState(options.initialIndex ?? 0);
    window.select = value => flushSync(() => setIndex(value));
    window.activeIndex = index;
    window.renders++;
    window.navigation = useContentVideoScroll({
      index, count: options.count, locked: options.locked,
      onSelect: value => { window.selections.push(value); setIndex(value); },
    });
    return React.createElement('div', {
      id: 'feed', ref: navigation.feedRef,
      onScroll: options.ignoreScroll ? undefined : navigation.onScroll,
      style: { position: 'relative', height: options.height, overflowY: 'auto',
        scrollSnapType: 'y mandatory', scrollBehavior: 'smooth', overscrollBehavior: 'contain',
        overflowAnchor: options.loadingTail ? 'none' : undefined },
    }, Array.from({ length: options.count }, (_, i) => React.createElement('section', {
      key: options.loadingTail && i === options.count - 1 ? 'loading:' + i : i,
      'data-content-video-slide-index': i,
      'data-loading-tail': options.loadingTail && i === options.count - 1 ? '' : undefined,
      style: { height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' },
    }, React.createElement('div', { className: 'nested', style: { height: 100, overflowY: 'auto' } },
      React.createElement('div', { style: { height: 500 } }, 'Page ' + i)))));
  }
  window.mount = (options = {}) => {
    props = { count: 4, height: 500, locked: false, ...options };
    root = createRoot(document.getElementById('root'));
    flushSync(() => root.render(React.createElement(Harness, props)));
  };
  window.update = patch => {
    props = { ...props, ...patch };
    flushSync(() => root.render(React.createElement(Harness, props)));
  };
  window.unmount = () => flushSync(() => root.unmount());
`;

describe("content video native scrolling mounted in React", {
  skip: !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE to an installed Playwright module",
}, () => {
  let browser;
  let page;
  let errors;
  before(async () => {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ channel: "chrome", headless: true });
  });
  after(async () => browser?.close());
  beforeEach(async () => {
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(
      '<style>body{margin:0}#root{margin-top:37px}</style><div id="root"></div>',
    );
    await page.addScriptTag({ content: harness });
  });
  afterEach(async () => {
    await page.close();
    assert.deepEqual(errors, []);
  });
  const wait = (predicate) => page.waitForFunction(predicate, undefined, { timeout: 5000 });

  test("wheel moves real pages and native snap selects the closest page", async () => {
    await page.evaluate(() => mount());
    await page.mouse.move(180, 350);
    await page.mouse.wheel(0, 420);
    await wait(
      () => activeIndex === 1 && Math.abs(document.getElementById("feed").scrollTop - 500) < 1,
    );
    assert.deepEqual(await page.evaluate(() => selections), [1]);
    assert.equal(
      await page
        .locator('[data-content-video-slide-index="1"]')
        .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
      37,
    );
    await page.mouse.wheel(0, -420);
    await wait(() => activeIndex === 0 && document.getElementById("feed").scrollTop === 0);
  });

  test("touch drag follows the finger before releasing into native snap", async () => {
    await page.close();
    page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(
      '<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}</style><div id="root"></div>',
    );
    await page.addScriptTag({ content: harness });
    await page.evaluate(() => mount({ height: 650 }));
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 180, y: 600 }],
      });
      for (const y of [550, 500, 450, 400, 350, 300, 250, 200]) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 180, y }],
        });
      }
      const dragged = await page.evaluate(() => document.getElementById("feed").scrollTop);
      assert.ok(dragged > 100 && dragged < 650, `expected partial drag, got ${dragged}`);
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await wait(
        () => activeIndex === 1 && Math.abs(document.getElementById("feed").scrollTop - 650) < 1,
      );
    } finally {
      await session.detach();
    }
  });

  test("scrollTo animates through intermediate offsets without an immediate index switch", async () => {
    await page.evaluate(() => mount());
    const initial = await page.evaluate(() => {
      navigation.scrollTo(2);
      return { index: activeIndex, top: document.getElementById("feed").scrollTop };
    });
    assert.deepEqual(initial, { index: 0, top: 0 });
    await wait(() => {
      const top = document.getElementById("feed").scrollTop;
      return top > 0 && top < 1000;
    });
    await wait(
      () => activeIndex === 2 && Math.abs(document.getElementById("feed").scrollTop - 1000) < 1,
    );
    assert.deepEqual(await page.evaluate(() => selections), [1, 2]);
  });

  test("reduced motion overrides CSS smooth behavior and clamps navigation bounds", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => mount());
    assert.equal(
      await page.evaluate(() => {
        navigation.scrollTo(99);
        return document.getElementById("feed").scrollTop;
      }),
      1500,
    );
    await wait(() => activeIndex === 3);
    await page.evaluate(() => navigation.scrollTo(-10));
    await wait(() => activeIndex === 0);
    await page.evaluate(() => navigation.scrollTo(NaN));
    assert.equal(await page.evaluate(() => document.getElementById("feed").scrollTop), 0);
  });

  test("panel/seeking lock stops navigation and momentum but allows nested text scrolling", async () => {
    await page.evaluate(() => mount({ initialIndex: 1 }));
    await page.evaluate(() => update({ locked: true }));
    await page.evaluate(() => navigation.scrollTo(3));
    assert.equal(await page.evaluate(() => document.getElementById("feed").scrollTop), 500);
    assert.equal(
      await page.locator('[id="feed"]').evaluate((el) => getComputedStyle(el).overflowY),
      "hidden",
    );
    await page.evaluate(() =>
      document.getElementById("feed").scrollTo({ top: 1000, behavior: "instant" }),
    );
    await wait(() => document.getElementById("feed").scrollTop === 500);
    await page.evaluate(
      () =>
        (document.querySelector('[data-content-video-slide-index="1"] .nested').scrollTop = 130),
    );
    await wait(
      () =>
        document.querySelector('[data-content-video-slide-index="1"] .nested').scrollTop === 130,
    );
    assert.equal(await page.evaluate(() => activeIndex), 1);
    await page.evaluate(() => update({ locked: false }));
    assert.equal(
      await page.locator('[id="feed"]').evaluate((el) => getComputedStyle(el).overflowY),
      "auto",
    );
    await page.evaluate(() => navigation.scrollTo(2));
    await wait(() => activeIndex === 2);
  });

  test("resize preserves the selected index and initial mount supports nonzero indices", async () => {
    await page.evaluate(() => mount({ initialIndex: 2 }));
    await wait(() => document.getElementById("feed").scrollTop === 1000);
    await page.evaluate(() => update({ height: 350 }));
    await wait(() => document.getElementById("feed").scrollTop === 700);
    assert.equal(await page.evaluate(() => activeIndex), 2);
    assert.deepEqual(await page.evaluate(() => selections), []);
  });

  test("appending pages keeps the current page, while external reset realigns immediately", async () => {
    await page.evaluate(() => mount({ initialIndex: 2, count: 3 }));
    await wait(() => document.getElementById("feed").scrollTop === 1000);
    await page.evaluate(() => update({ count: 6 }));
    assert.equal(await page.evaluate(() => document.getElementById("feed").scrollTop), 1000);
    await page.evaluate(() => select(0));
    await wait(() => document.getElementById("feed").scrollTop === 0);
    assert.equal(await page.evaluate(() => activeIndex), 0);
    await page.evaluate(() => update({ count: 0 }));
    await page.evaluate(() => update({ count: 2 }));
    await page.evaluate(() => navigation.scrollTo(1));
    await wait(() => activeIndex === 1);
  });

  test("rekeyed loading tail opens at index zero and pagination preserves the native snap position", async () => {
    const settledPosition = () =>
      page.evaluate(async () => {
        // Allow native layout, re-snapping, scroll events and React commits, not only flushSync.
        const positions = [];
        for (let frame = 0; frame < 20; frame++) {
          await new Promise(requestAnimationFrame);
          positions.push({ index: activeIndex, top: document.getElementById("feed").scrollTop });
        }
        return positions;
      });
    await page.evaluate(() => mount({ count: 1, height: 844, loadingTail: true }));
    await settledPosition();
    await page.evaluate(() => {
      window.initialTail = document.querySelector("[data-loading-tail]");
      update({ count: 3 });
    });
    assert.ok((await settledPosition()).every(({ index, top }) => index === 0 && top === 0));
    assert.equal(await page.evaluate(() => initialTail.isConnected), false);
    assert.deepEqual(await page.evaluate(() => selections), []);
    assert.deepEqual(
      await page.locator('[id="feed"]').evaluate((el) => ({
        snap: getComputedStyle(el).scrollSnapType,
        anchor: getComputedStyle(el).overflowAnchor,
      })),
      { snap: "y mandatory", anchor: "none" },
    );

    await page.evaluate(() => navigation.scrollTo(1));
    await wait(() => activeIndex === 1 && document.getElementById("feed").scrollTop === 844);
    await page.evaluate(() => update({ count: 5 }));
    assert.ok((await settledPosition()).every(({ index, top }) => index === 1 && top === 844));

    // When the selected loading page is filled, its index becomes the first newly loaded video.
    await page.evaluate(() => navigation.scrollTo(4));
    await wait(() => activeIndex === 4 && document.getElementById("feed").scrollTop === 3376);
    await page.evaluate(() => {
      window.previousTail = document.querySelector("[data-loading-tail]");
      update({ count: 7 });
    });
    assert.ok((await settledPosition()).every(({ index, top }) => index === 4 && top === 3376));
    assert.equal(await page.evaluate(() => previousTail.isConnected), false);
  });

  test("removing an active loading tail clamps selection without any scroll event", async () => {
    await page.evaluate(() =>
      mount({
        count: 5,
        initialIndex: 4,
        loadingTail: true,
        ignoreScroll: true,
      }),
    );
    await wait(() => document.getElementById("feed").scrollTop === 2000);
    const result = await page.evaluate(() => {
      update({ count: 4, loadingTail: false });
      return { index: activeIndex, top: document.getElementById("feed").scrollTop, selections };
    });
    assert.deepEqual(result, { index: 3, top: 1500, selections: [3] });
    await page.evaluate(() => update({ count: 1, locked: true }));
    assert.equal(await page.evaluate(() => activeIndex), 0);
    assert.equal(await page.evaluate(() => document.getElementById("feed").scrollTop), 0);
  });

  test("unmount restores inline lock styles and disconnects resize observation", async () => {
    await page.evaluate(() => mount({ locked: true }));
    await page.evaluate(() => {
      window.oldFeed = document.getElementById("feed");
      unmount();
    });
    assert.equal(await page.evaluate(() => oldFeed.style.overflowY), "auto");
    assert.equal(await page.locator("#root").textContent(), "");
  });
});

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
  "@/api/req/posts": "exports.getPostContentVideos = (...args) => window.requestVideos(...args);",
  "@/api/errors": ts.transpileModule(
    readFileSync(new URL("../../api/errors.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  queue: ts.transpileModule(
    readFileSync(new URL("./use-content-video-queue.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
};

// Emit static CommonJS factories as browser script source, not runtime string compilation.
const moduleFactories = Object.entries(modules)
  .map(
    ([name, source]) =>
      `${JSON.stringify(name)}: function(require, module, exports) {\n${source}\n}`,
  )
  .join(",\n");

// Real React/ReactDOM mount and effects. Only the network boundary is replaced by controlled data.
const harness = `
  const factories = { ${moduleFactories} };
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
  const { useContentVideoQueue, contentVideoKey } = require('queue');
  let root;
  let initial;
  window.calls = [];
  window.responses = {};
  window.requestVideos = async (id, query) => {
    window.calls.push({ id, ...query });
    if ('page' in query) throw new Error('Offset pagination is forbidden');
    const position = query.cursor ?? 1;
    const response = window.responses[id + ':' + position];
    if (!response) throw new Error('Unexpected API request: ' + id + ':' + position);
    return response;
  };
  window.video = (post, id, reply = null, media = id) => ({
    id, post_id: post, reply_id: reply, media_item_id: reply ? null : media,
    media_url: '/video/' + id, title: null, content: '', thumbnail_url: null,
    author: {}, community: {}, responding_to: null,
    current_user_vote: null, upvotes_count: 0, saved: false, replies_count: 0,
  });
  window.response = (data, page = 1, pages = 1) => ({
    data, page, pages, count: data.length, next_cursor: page < pages ? String(page + 1) : null,
  });
  function Harness({ source }) {
    window.queue = useContentVideoQueue(initial, source);
    return React.createElement('output', null, window.queue.items.map(contentVideoKey).join(','));
  }
  window.mount = (entry, source = null) => {
    initial = entry;
    root = createRoot(document.getElementById('root'));
    window.setSource(source);
  };
  window.setSource = source => flushSync(() => root.render(React.createElement(Harness, { source })));
  window.action = (name, ...args) => flushSync(() => window.queue[name](...args));
  window.snapshot = () => ({
    items: window.queue.items, index: window.queue.index, ended: window.queue.ended,
    error: window.queue.error, expired: window.queue.expired, loading: window.queue.loading,
  });
  window.unmount = () => flushSync(() => root.unmount());
  window.key = contentVideoKey;
`;

const snapshot = () => window.snapshot();

describe("content video queue mounted in React", {
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
    page = await browser.newPage();
    errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: harness });
  });
  afterEach(async () => {
    await page.close();
    assert.deepEqual(errors, []);
  });
  const wait = (predicate) => page.waitForFunction(predicate, undefined, { timeout: 5000 });

  test("keeps distinct post media, falls back to id and deduplicates across pages", async () => {
    await page.evaluate(() => {
      const a = video("p", "a");
      const b = video("p", "b", null, null);
      responses["p:1"] = response([a], 1, 2);
      responses["p:2"] = response([a, b], 2, 2);
      mount({ postId: "p" });
    });
    await wait(() => queue.items.length === 2);
    const keys = await page.evaluate(() => queue.items.map(key));
    assert.deepEqual(keys, ["p:post:a", "p:post:b"]);
    assert.equal(await page.evaluate(() => calls.length), 2);
  });

  test("opens the clicked second media without mutating API order or reordering later pages", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a"), video("p", "b")], 1, 2);
      const repeatedUrl = { ...video("p", "d"), media_url: "/video/b" };
      responses["p:2"] = response([video("p", "c"), repeatedUrl], 2, 2);
      mount({ postId: "p", mediaUrl: "/video/b" });
    });
    await wait(() => queue.items.length === 2);
    assert.equal(await page.evaluate(() => queue.items[queue.index].id), "b");
    await page.evaluate(() => action("next"));
    await wait(() => queue.items.length === 4);
    assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), [
      "b",
      "a",
      "c",
      "d",
    ]);
    assert.deepEqual(await page.evaluate(() => responses["p:1"].data.map((item) => item.id)), [
      "a",
      "b",
    ]);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => [call.cursor, call.limit])), [
      [undefined, 20],
      ["2", 20],
    ]);
  });

  for (const mode of ["profile", "feed"]) {
    test(`${mode} matches initial position by post/reply even when only initial has mediaUrl`, async () => {
      await page.evaluate((mode) => {
        responses["p:1"] = response([video("p", "a"), video("p", "b")]);
        responses["q:1"] = response([
          video("q", "c"),
          { ...video("q", "d"), media_url: "/video/b" },
        ]);
        mount(
          { postId: "p", mediaUrl: "/video/b" },
          {
            mode,
            entries: [{ postId: "before" }, { postId: "p" }, { postId: "q" }],
          },
        );
      }, mode);
      await wait(() => queue.items.length === 2);
      await page.evaluate(() => action("next"));
      await wait(() => queue.items.length === 4);
      assert.deepEqual(await page.evaluate(() => calls.map((call) => call.id)), ["p", "q"]);
      assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), [
        "b",
        "a",
        "c",
        "d",
      ]);
    });
  }

  test("unknown initial media URL preserves the server order", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a"), video("p", "b")]);
      mount({ postId: "p", mediaUrl: "/video/missing" });
    });
    await wait(() => queue.items.length === 2);
    assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), ["a", "b"]);
  });

  test("sets reply focus initially and continues with only cursor and limit", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "deep", "deep")], 1, 2);
      responses["p:2"] = response([video("p", "root")], 2, 2);
      mount(
        { postId: "p", replyId: "deep" },
        {
          mode: "discussion",
          entries: [{ postId: "p" }, { postId: "other" }],
        },
      );
    });
    await wait(() => queue.items.length === 2);
    await page.evaluate(() => action("next"));
    await wait(() => queue.ended);
    assert.deepEqual(await page.evaluate(() => calls), [
      { id: "p", limit: 20, focusReplyId: "deep" },
      { id: "p", limit: 20, cursor: "2" },
    ]);
    assert.equal(await page.evaluate(() => queue.items[0].reply_id), "deep");
  });

  test("next remains on the last video when ended, including rapid repeated calls", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      mount({ postId: "p" });
    });
    await wait(() => queue.ended);
    await page.evaluate(() => {
      for (let n = 0; n < 5; n++) action("next");
    });
    assert.equal((await page.evaluate(snapshot)).index, 0);
  });

  test("clamps a pending next back to the final item when an empty last page arrives", async () => {
    await page.evaluate(() => {
      requestVideos = async (id, query) => {
        calls.push({ id, ...query });
        if (!query.cursor) return response([video("p", "a")], 1, 2);
        return new Promise((resolve) => {
          window.finishPage = resolve;
        });
      };
      mount({ postId: "p" });
    });
    await wait(() => Boolean(window.finishPage));
    await page.evaluate(() => {
      action("next");
      finishPage(response([], 2, 2));
    });
    await wait(() => queue.ended);
    assert.equal((await page.evaluate(snapshot)).index, 0);
  });

  test("source update before loadMore resolves wakes the queue after its busy lock releases", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      responses["q:1"] = response([video("q", "b")]);
      mount(
        { postId: "p" },
        {
          mode: "feed",
          entries: [{ postId: "p" }],
          hasNextPage: true,
          onLoadMore: () =>
            new Promise((resolve) => {
              window.finishMore = resolve;
            }),
        },
      );
    });
    await wait(() => Boolean(window.finishMore));
    await page.evaluate(() =>
      setSource({
        mode: "feed",
        entries: [{ postId: "p" }, { postId: "q" }],
        hasNextPage: false,
      }),
    );
    await page.evaluate(() => finishMore({ isError: false }));
    await wait(() => queue.items.length === 2);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => call.id)), ["p", "q"]);
  });

  test("void profile callback waits for asynchronously published source entries", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      responses["q:1"] = response([video("q", "b")]);
      window.loadCount = 0;
      mount(
        { postId: "p" },
        {
          mode: "profile",
          entries: [{ postId: "p" }],
          hasNextPage: true,
          onLoadMore: () => {
            window.loadCount++;
          },
        },
      );
    });
    await wait(() => window.loadCount === 1);
    await page.evaluate(() =>
      setSource({
        mode: "profile",
        entries: [{ postId: "p" }, { postId: "q" }],
        hasNextPage: false,
      }),
    );
    await wait(() => queue.items.length === 2);
    assert.equal(await page.evaluate(() => window.loadCount), 1);
  });

  test("retries a guarded void profile callback when its loading guard changes", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      responses["q:1"] = response([video("q", "b")]);
      window.loadCount = 0;
      mount(
        { postId: "p" },
        {
          mode: "profile",
          entries: [{ postId: "p" }],
          hasNextPage: true,
          onLoadMore: () => {
            window.loadCount++;
          },
        },
      );
    });
    await wait(() => window.loadCount === 1);
    await page.evaluate(() =>
      setSource({
        mode: "profile",
        entries: [{ postId: "p" }],
        hasNextPage: true,
        onLoadMore: () => {
          window.loadCount++;
          setTimeout(
            () =>
              setSource({
                mode: "profile",
                entries: [{ postId: "p" }, { postId: "q" }],
                hasNextPage: false,
              }),
            0,
          );
        },
      }),
    );
    await wait(() => queue.items.length === 2);
    assert.equal(await page.evaluate(() => window.loadCount), 2);
  });

  test("resolved query errors expose retry and retry is not locked by unchanged entry count", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      responses["q:1"] = response([video("q", "b")]);
      window.loadCount = 0;
      mount(
        { postId: "p" },
        {
          mode: "feed",
          entries: [{ postId: "p" }],
          hasNextPage: true,
          onLoadMore: async () => {
            if (++window.loadCount === 1) return { isError: true };
            setSource({
              mode: "feed",
              entries: [{ postId: "p" }, { postId: "q" }],
              hasNextPage: false,
            });
            return { isError: false };
          },
        },
      );
    });
    await wait(() => queue.error);
    await page.evaluate(() => {
      action("retry");
    });
    await wait(() => queue.items.length === 2);
    assert.equal((await page.evaluate(snapshot)).error, false);
  });

  test("void source which never advances times out and can be retried without spinning", async () => {
    await page.clock.install();
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      window.loadCount = 0;
      mount(
        { postId: "p" },
        {
          mode: "profile",
          entries: [{ postId: "p" }],
          hasNextPage: true,
          onLoadMore: () => {
            window.loadCount++;
          },
        },
      );
    });
    // React schedules work through MessageChannel; virtual timer advancement alone need not
    // flush that work. Wait for the source request before advancing its timeout deadline.
    for (let tick = 0; tick < 50 && (await page.evaluate(() => window.loadCount)) === 0; tick++) {
      await page.clock.runFor(100);
    }
    assert.equal(await page.evaluate(() => window.loadCount), 1);
    await page.clock.fastForward(16000);
    await page.clock.runFor(200);
    assert.equal((await page.evaluate(snapshot)).error, true);
    await page.evaluate(() => {
      action("retry");
    });
    assert.equal(await page.evaluate(() => window.loadCount), 2);
  });

  test("profile post scans all pages but excludes replies from other contributions", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a"), video("p", "other", "other")], 1, 2);
      responses["p:2"] = response([video("p", "b")], 2, 2);
      mount({ postId: "p" }, { mode: "profile", entries: [{ postId: "p" }] });
    });
    await wait(() => queue.items.length === 2);
    assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), ["a", "b"]);
  });

  test("profile reply retains only the selected contribution then advances in publication order", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "r", "r"), video("p", "other", "other")], 1, 4);
      responses["p:2"] = response([], 2, 4);
      responses["p:3"] = response([video("p", "another", "another")], 3, 4);
      responses["p:4"] = response([], 4, 4);
      responses["q:1"] = response([video("q", "b")]);
      mount(
        { postId: "p", replyId: "r" },
        {
          mode: "profile",
          entries: [{ postId: "p", replyId: "r" }, { postId: "q" }],
        },
      );
    });
    await wait(() => queue.items.length === 2);
    assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), ["r", "b"]);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => [call.id, call.cursor])), [
      ["p", undefined],
      ["p", "2"],
      ["p", "3"],
      ["p", "4"],
      ["q", undefined],
    ]);
  });

  test("updateItem persists vote/save after next/previous and only patches the matching media", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a"), video("p", "b")]);
      mount({ postId: "p" });
    });
    await wait(() => queue.items.length === 2);
    await page.evaluate(() => {
      action("updateItem", key(queue.items[0]), {
        saved: true,
        current_user_vote: 1,
        upvotes_count: 8,
      });
      action("next");
      action("previous");
    });
    const state = await page.evaluate(snapshot);
    assert.equal(state.index, 0);
    assert.equal(state.items[0].saved, true);
    assert.equal(state.items[0].current_user_vote, 1);
    assert.equal(state.items[0].upvotes_count, 8);
    assert.equal(state.items[1].saved, false);
    assert.equal(state.items[1].upvotes_count, 0);
  });

  test("feed skips empty discussions and repeated entries without looping back", async () => {
    await page.evaluate(() => {
      responses["p:1"] = response([], 1, 0);
      responses["q:1"] = response([], 1, 0);
      responses["r:1"] = response([video("r", "a")]);
      mount(
        { postId: "p" },
        {
          mode: "feed",
          entries: ["before", "p", "q", "p", "r"].map((postId) => ({ postId })),
        },
      );
    });
    await wait(() => queue.ended);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => call.id)), ["p", "q", "r"]);
    assert.equal((await page.evaluate(snapshot)).items.length, 1);
  });

  test("concurrent retries serialize requests and API rejection retries the same page", async () => {
    await page.evaluate(() => {
      requestVideos = async (id, query) => {
        calls.push({ id, ...query });
        if (calls.length === 1) throw new Error("offline");
        return new Promise((resolve) => {
          window.finishPage = resolve;
        });
      };
      mount({ postId: "p" });
    });
    await wait(() => queue.error);
    await page.evaluate(() => {
      action("retry");
      action("retry");
      action("retry");
    });
    await wait(() => Boolean(window.finishPage));
    assert.equal(await page.evaluate(() => calls.length), 2);
    await page.evaluate(() => finishPage(response([video("p", "a")])));
    await wait(() => queue.ended);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => call.cursor)), [
      undefined,
      undefined,
    ]);
  });

  test("uses the opaque snapshot cursor after a ranking change without losing video 21", async () => {
    await page.evaluate(() => {
      window.ranking = Array.from({ length: 21 }, (_, i) => video("p", String(i + 1)));
      const stableIds = ranking.map((item) => item.id);
      requestVideos = async (id, query) => {
        calls.push({ id, ...query });
        if (query.cursor === undefined) {
          return { ...response(ranking.slice(0, 20)), next_cursor: "opaque-snapshot.20" };
        }
        if (query.cursor !== "opaque-snapshot.20" || query.page !== undefined)
          throw new Error("Snapshot continuation required");
        return {
          ...response(stableIds.slice(20).map((id) => ranking.find((item) => item.id === id))),
          pages: 99,
        };
      };
      mount({ postId: "p" });
    });
    await wait(() => queue.items.length === 20);
    await page.evaluate(() => {
      ranking.unshift(ranking.pop());
      for (let n = 0; n < 19; n++) action("next");
    });
    await wait(() => queue.items.length === 21);
    await page.evaluate(() => action("next"));
    await wait(() => queue.ended);
    assert.deepEqual(
      await page.evaluate(() => queue.items.map((item) => item.id)),
      Array.from({ length: 21 }, (_, i) => String(i + 1)),
    );
    assert.deepEqual(await page.evaluate(() => calls), [
      { id: "p", limit: 20 },
      { id: "p", limit: 20, cursor: "opaque-snapshot.20" },
    ]);
  });

  test("continues empty deleted pages until null cursor despite count and pages metadata", async () => {
    await page.evaluate(() => {
      responses["p:1"] = { ...response([], 1, 0), next_cursor: "after-deletion" };
      responses["p:after-deletion"] = { ...response([], 2, 0), next_cursor: "survivor" };
      responses["p:survivor"] = { ...response([video("p", "alive")], 3, 99), next_cursor: null };
      mount({ postId: "p" });
    });
    await wait(() => queue.ended);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => call.cursor)), [
      undefined,
      "after-deletion",
      "survivor",
    ]);
    assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), ["alive"]);
  });

  test("410 preserves the old list until explicit retry replaces the entire snapshot", async () => {
    await page.evaluate(() => {
      window.reopens = 0;
      requestVideos = async (id, query) => {
        calls.push({ id, ...query });
        if (query.cursor) throw Object.assign(new Error("expired"), { httpStatus: 410 });
        reopens++;
        return reopens === 1
          ? { ...response([video("p", "old", "selected")]), next_cursor: "expired-token" }
          : response([video("p", "new", "selected")]);
      };
      mount(
        { postId: "p", replyId: "selected" },
        { mode: "discussion", entries: [{ postId: "p" }] },
      );
    });
    await wait(() => queue.error && queue.expired && !queue.loading);
    assert.equal(await page.evaluate(() => calls.length), 2);
    assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), ["old"]);
    await page.evaluate(() => {
      action("next");
      action("previous");
      setSource({ mode: "discussion", entries: [{ postId: "p" }, { postId: "other" }] });
    });
    assert.equal(await page.evaluate(() => calls.length), 2);
    await page.evaluate(() => action("retry"));
    await wait(() => queue.ended && !queue.error && !queue.expired);
    assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), ["new"]);
    assert.equal((await page.evaluate(snapshot)).index, 0);
    assert.deepEqual(await page.evaluate(() => calls), [
      { id: "p", limit: 20, focusReplyId: "selected" },
      { id: "p", limit: 20, cursor: "expired-token" },
      { id: "p", limit: 20, focusReplyId: "selected" },
    ]);
  });

  test("transient continuation failure retries the same cursor and preserves earlier items", async () => {
    await page.evaluate(() => {
      window.continuations = 0;
      requestVideos = async (id, query) => {
        calls.push({ id, ...query });
        if (!query.cursor) return { ...response([video("p", "a")]), next_cursor: "retry-token" };
        if (++continuations === 1) throw Object.assign(new Error("offline"), { httpStatus: 503 });
        return response([video("p", "b")]);
      };
      mount({ postId: "p" });
    });
    await wait(() => queue.error && !queue.loading);
    assert.equal((await page.evaluate(snapshot)).expired, false);
    await page.evaluate(() => action("retry"));
    await wait(() => queue.items.length === 2);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => call.cursor)), [
      undefined,
      "retry-token",
      "retry-token",
    ]);
    assert.deepEqual(await page.evaluate(() => queue.items.map((item) => item.id)), ["a", "b"]);
  });

  test("missing next_cursor is an explicit contract error, never offset fallback", async () => {
    await page.evaluate(() => {
      const legacy = response([video("p", "a")], 1, 2);
      delete legacy.next_cursor;
      responses["p:1"] = legacy;
      mount({ postId: "p" });
    });
    await wait(() => queue.error);
    assert.equal(await page.evaluate(() => calls.length), 1);
    assert.equal((await page.evaluate(snapshot)).ended, false);
    assert.equal((await page.evaluate(snapshot)).items.length, 0);
  });

  test("unmount cancels source waiting and ignores late network completion", async () => {
    await page.evaluate(() => {
      requestVideos = async (id, query) => {
        calls.push({ id, ...query });
        return new Promise((resolve) => {
          window.finishPage = resolve;
        });
      };
      mount({ postId: "p" });
    });
    await wait(() => Boolean(window.finishPage));
    await page.evaluate(() => {
      unmount();
      finishPage(response([video("p", "a")]));
    });
    assert.equal(await page.evaluate(() => calls.length), 1);
    assert.equal(await page.locator("#root").textContent(), "");
  });
});

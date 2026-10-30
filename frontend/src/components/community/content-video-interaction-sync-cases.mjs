import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

export const registerContentVideoInteractionSyncCases = () => {
  for (const scenario of ["deleted", "submit-race", "submit-retry"])
    test(`Chrome: interaction sync settles without blocking navigation (${scenario})`, {
      skip:
        !process.env.PLAYWRIGHT_MODULE &&
        "Set PLAYWRIGHT_MODULE for the focused browser regression",
    }, async () => {
      const require = createRequire(import.meta.url);
      const backend = createRequire(new URL("../../../../backend/package.json", import.meta.url));
      const { build } = createRequire(backend.resolve("tsx/package.json"))("esbuild");
      const bundle = await build({
        stdin: {
          resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
          loader: "jsx",
          contents: `
        import React, { useState } from 'react';
        import { createRoot } from 'react-dom/client';
        import { QueryClient } from '@tanstack/react-query';
        import { useContentVideoInteractionSync, isContentVideoInteractionBlocking } from './src/components/community/content-video-interaction-refresh';
        import { ContentVideoInteractionStatus } from './src/components/community/content-video-interaction-status';
        const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
        const scenario = ${JSON.stringify(scenario)};
        window.reads = [];
        window.readThread = async (postId, id) => {
          window.reads.push(id);
          if (id === 'deleted') throw { response: { status: 404 } };
          const result = {reply:{id, replies_count:1, descendants_count:2, current_user_vote:null, upvotes_count:0, saved:false}};
          if (scenario !== 'deleted' && window.reads.length === 1)
            return new Promise(resolve => { window.finishAutomatic = () => resolve({reply:{...result.reply, descendants_count:1}}); });
          if (scenario === 'submit-retry' && window.reads.length === 2) throw {response:{status:503}};
          return result;
        };
        function Video({id, onNext}) {
          const [acknowledged, setAcknowledged] = useState({});
          const revision = acknowledged[id] ? 0 : 1;
          const sync = useContentVideoInteractionSync(client, {post_id:'post', reply_id:id}, (patch) => {
            window.acknowledgedCount = patch.descendants_count;
            setAcknowledged(previous => ({...previous, [id]:patch}));
          }, true, revision);
          window.submitRefresh = sync.refreshAfterSubmit;
          return <><output>{id}:{sync.interactionSync}</output>
            <button disabled={isContentVideoInteractionBlocking(sync.interactionSync)} onClick={onNext}>Next</button>
            <ContentVideoInteractionStatus state={sync.interactionSync} className="status" onRetry={sync.refreshInteractions}/></>;
        }
        function App() {
          const [id, setId] = useState(scenario === 'deleted' ? 'deleted' : 'race');
          return <Video key={id} id={id} onNext={() => setId('next')}/>;
        }
        createRoot(document.getElementById('root')).render(<App/>);
      `,
        },
        bundle: true,
        write: false,
        platform: "browser",
        define: { "process.env.NODE_ENV": '"production"' },
        plugins: [
          {
            name: "controlled-network",
            setup(build) {
              build.onResolve({ filter: /^@\/api\/req\/posts$/ }, () => ({
                path: "posts",
                namespace: "network",
              }));
              build.onLoad({ filter: /.*/, namespace: "network" }, () => ({
                contents:
                  "export const getPostReplyThread = (...args) => window.readThread(...args); export const getPostDetail = async () => { throw new Error('Unexpected post read'); };",
              }));
            },
          },
        ],
      });
      const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
      const browser = await chromium.launch({ channel: "chrome", headless: true });
      try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setContent('<div id="root"></div>');
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        if (scenario !== "deleted") {
          await page.waitForFunction(
            () =>
              window.finishAutomatic &&
              document.querySelector("output").textContent === "race:pending",
          );
          await page.evaluate(() => window.submitRefresh().catch(() => {}));
          if (scenario === "submit-retry") {
            await page.waitForFunction(
              () => document.querySelector("output").textContent === "race:error",
            );
            await page.evaluate(() => window.submitRefresh());
          }
          await page.waitForFunction(
            () => document.querySelector("output").textContent === "race:idle",
          );
          await page.evaluate(() => window.finishAutomatic());
          assert.equal(await page.evaluate(() => window.acknowledgedCount), 2);
          assert.equal(
            await page.getByRole("button", { name: "Next", exact: true }).isEnabled(),
            true,
          );
          assert.deepEqual(
            await page.evaluate(() => window.reads),
            scenario === "submit-retry" ? ["race", "race", "race"] : ["race", "race"],
          );
          assert.deepEqual(errors, []);
          return;
        }
        await page.waitForFunction(
          () => document.querySelector("output").textContent === "deleted:unavailable",
        );
        assert.equal(
          await page.getByRole("button", { name: "Next", exact: true }).isEnabled(),
          true,
        );
        await page.getByRole("button", { name: "Next", exact: true }).click();
        await page.waitForFunction(
          () => document.querySelector("output").textContent === "next:idle",
        );
        assert.deepEqual(await page.evaluate(() => window.reads), ["deleted", "next"]);
        assert.deepEqual(errors, []);
      } finally {
        await browser.close();
      }
    });
};

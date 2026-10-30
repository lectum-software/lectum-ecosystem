import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./testimonial-sheet-dialog.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile(
  "sheet.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const expressions = new Map();
let notify;
const visit = (node) => {
  if (ts.isVariableDeclaration(node) && node.initializer)
    expressions.set(node.name.getText(ast), node.initializer.getText(ast));
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(ast) === "useEffect" &&
    node.arguments[0]?.getText(ast).includes("closeNotifiedRef.current")
  )
    notify = node.arguments[0].getText(ast);
  ts.forEachChild(node, visit);
};
visit(ast);

test("sheet close commits open=false before notifying its parent once", () => {
  assert.match(source, /<Modal\s+open=\{open\}/);
  assert.match(source, /useSheetDragDismiss\(\{\s*open,/);
  assert.ok(notify);
  const events = [];
  const context = {
    open: true,
    closeNotifiedRef: { current: false },
    canLeave: () => false,
    setOpen: (value) => {
      context.open = value;
      events.push("state");
    },
    onClose: () => events.push("parent"),
  };
  const request = () => runInNewContext(`(${expressions.get("requestClose")})()`, context);
  const effect = () => runInNewContext(`(${notify})()`, context);
  effect();
  assert.equal(request(), false);
  assert.equal(context.open, true);
  assert.deepEqual(events, []);
  context.canLeave = () => true;
  assert.equal(request(), true);
  assert.equal(context.open, false);
  assert.deepEqual(events, ["state"]);
  effect();
  effect();
  assert.deepEqual(events, ["state", "parent"]);
});

test("successful standalone compose uses the close commit; list compose stays mounted", () => {
  for (const initialView of ["compose", "list"]) {
    const events = [];
    runInNewContext(`(${expressions.get("complete")})()`, {
      initialView,
      setFormState: (state) => {
        assert.equal(state.dirty, false);
        assert.equal(state.submitting, false);
      },
      setOpen: (value) => events.push(["open", value]),
      setView: (value) => events.push(["view", value]),
      onClose: () => assert.fail("parent must wait for the close commit"),
    });
    assert.deepEqual(events, initialView === "compose" ? [["open", false]] : [["view", "list"]]);
  }
});

test("Chrome: testimonial close restores focus before parent removal and preserves veto", {
  skip: !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE when the browser QA slot is free",
}, async (t) => {
  const require = createRequire(import.meta.url);
  const backend = createRequire(new URL("../../../../backend/package.json", import.meta.url));
  const { build } = createRequire(backend.resolve("tsx/package.json"))("esbuild");
  const boundaries = {
    "@/api/callers/directory": `export const useDirectoryPsychologist=()=>({});
      export const useInfiniteDirectoryPsychologistReviews=()=>({data:{pages:[{data:[],count:0}]}});`,
    "@/api/callers/reviews": "export const useReviewEligibility=()=>({data:{eligible:true}});",
    "@/hooks/redux": "export const useAppSelector=()=>({role:'paciente'});",
    "@/hooks/use-auth-token-presence": "export const useAuthTokenPresence=()=>true;",
    "./testimonial-professional": "export const TestimonialProfessionalIdentity=()=>null;",
    "./testimonial-card": "export const TestimonialCard=()=>null;",
    "./testimonial-invitation-action": `import React from 'react';
      export const TestimonialInvitationAction=({onCompose})=><button onClick={e=>onCompose(e.currentTarget)}>Compose</button>;`,
    "./testimonial-form": `import React,{useEffect} from 'react';
      export function TestimonialForm({onSuccess,onStateChange}) {
        useEffect(()=>{window.setFormState=onStateChange;},[onStateChange]);
        return <button id="success" onClick={onSuccess}>Complete</button>;
      }`,
  };
  const bundle = await build({
    stdin: {
      contents: `import React,{useState} from 'react';
        import {createRoot} from 'react-dom/client';
        import {flushSync} from 'react-dom';
        import {TestimonialSheetDialog} from './src/components/reviews/testimonial-sheet-dialog';
        window.events=[];
        const nativeClose=HTMLDialogElement.prototype.close;
        HTMLDialogElement.prototype.close=function(){
          window.events.push({kind:'native',connected:this.isConnected});
          return nativeClose.apply(this,arguments);
        };
        function Parent(){
          const [mounted,setMounted]=useState(true);
          return mounted && <TestimonialSheetDialog psychologistId="professional" initialView={window.initialView}
            onClose={()=>{window.events.push({kind:'parent',open:document.querySelector('dialog')?.open,
              focus:document.activeElement.id});setMounted(false);}}/>;
        }
        const root=createRoot(document.getElementById('root'));
        window.removeSheet=()=>flushSync(()=>root.unmount());
        flushSync(()=>root.render(<React.StrictMode><Parent/></React.StrictMode>));`,
      resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
      loader: "jsx",
    },
    bundle: true,
    write: false,
    jsx: "automatic",
    platform: "browser",
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [
      {
        name: "review-boundaries",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) =>
            Object.hasOwn(boundaries, args.path)
              ? { path: args.path, namespace: "review-boundary" }
              : undefined,
          );
          build.onLoad({ filter: /.*/, namespace: "review-boundary" }, (args) => ({
            contents: boundaries[args.path],
            loader: "jsx",
            resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
          }));
        },
      },
    ],
  });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  for (const mode of ["close", "success", "dirty", "route"]) {
    await t.test(mode, async () => {
      const page = await browser.newPage();
      const errors = [];
      const pageError = new Promise((resolve) => {
        page.on("pageerror", (error) => {
          errors.push(error.message);
          resolve(error);
        });
      });
      const checkPage = async (action) => {
        const error = await Promise.race([action().then(() => undefined), pageError]);
        if (error) throw error;
      };
      try {
        await checkPage(async () => {
          await page.setContent('<button id="opener">Open</button><div id="root"></div>');
          await page.locator("#opener").focus();
          await page.evaluate((mode) => {
            window.initialView = mode === "success" || mode === "dirty" ? "compose" : "list";
          }, mode);
          await page.addScriptTag({ content: bundle.outputFiles[0].text });
          await page.locator("dialog[open]").waitFor({ timeout: 10_000 });
          if (mode === "route") {
            await page.evaluate(() => {
              window.location.hash = "next";
              window.removeSheet();
            });
            assert.deepEqual(await page.evaluate(() => window.events), []);
          } else {
            if (mode === "dirty") {
              await page.evaluate(() => window.setFormState({ dirty: true, submitting: false }));
              for (let index = 0; index < 2; index++) {
                page.once("dialog", (dialog) => dialog.dismiss());
                await page.getByRole("button", { name: "Fechar depoimentos" }).click();
                assert.equal(await page.locator("dialog[open]").count(), 1);
                assert.deepEqual(await page.evaluate(() => window.events), []);
              }
              page.once("dialog", (dialog) => dialog.accept());
            }
            await page
              .getByRole("button", {
                name: mode === "success" ? "Complete" : "Fechar depoimentos",
                exact: true,
              })
              .click();
            await page.waitForFunction(() => !document.querySelector("dialog"));
            assert.deepEqual(await page.evaluate(() => window.events), [
              { kind: "native", connected: true },
              { kind: "parent", open: false, focus: "opener" },
            ]);
            assert.equal(await page.evaluate(() => document.activeElement.id), "opener");
          }
          assert.deepEqual(errors, []);
        });
      } finally {
        await page.close();
      }
    });
  }
});

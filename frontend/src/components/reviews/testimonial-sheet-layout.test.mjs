import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontend = fileURLToPath(new URL("../../../", import.meta.url));
const sheetPath = resolve(frontend, "src/components/reviews/testimonial-sheet-dialog.tsx");

test("testimonial dialog resets inherited nowrap at its own root", () => {
  const source = readFileSync(sheetPath, "utf8");
  assert.match(source, /className="min-w-0 overflow-hidden whitespace-normal p-0/);
  assert.match(source, /w-full min-w-0 max-w-\[430px\]/);
  const modal = readFileSync(resolve(frontend, "src/components/ui/modal.tsx"), "utf8");
  assert.doesNotMatch(modal, /whitespace-normal/);
});

test("Chrome: actual action bar and directory sheet wrap composer text within mobile bounds", {
  skip: !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE when the browser QA slot is free",
}, async (t) => {
  const require = createRequire(import.meta.url);
  const backend = createRequire(new URL("../../../../backend/package.json", import.meta.url));
  const { build } = createRequire(backend.resolve("tsx/package.json"))("esbuild");
  const postcss = createRequire(require.resolve("@tailwindcss/postcss"));
  const { compile } = postcss("@tailwindcss/node");
  const { Scanner } = postcss("@tailwindcss/oxide");
  const boundaries = {
    "@/api/callers/directory": `export const useDirectoryPsychologist=()=>({data:{id:'professional',name:'Profissional Exemplo',gender:'feminino',avatar:null,verified:true}});
      export const useInfiniteDirectoryPsychologistReviews=()=>({data:{pages:[{data:[],count:0}]}});`,
    "@/api/callers/reviews": "export const useReviewEligibility=()=>({data:{eligible:true}});",
    "@/hooks/redux": "export const useAppSelector=()=>({role:'paciente'});",
    "@/hooks/use-auth-token-presence": "export const useAuthTokenPresence=()=>true;",
    "./use-testimonial-mutation":
      "export const useTestimonialMutation=()=>({isPending:false,isError:false,mutate:()=>{throw Error('Unexpected submit')}});",
  };
  const contents = `import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {flushSync} from 'react-dom';
    import {CommunityActionBar} from './src/components/community/community-action-bar';
    import {TestimonialInvitation,TestimonialsButton} from './src/components/reviews/testimonials-sheet';
    const root=createRoot(document.getElementById('root'));
    const origin=window.previewOrigin;
    flushSync(()=>root.render(<section data-origin={origin}>
      {origin==='reply'
        ? <CommunityActionBar upvotesCount={0} size="xs" endSlot={<TestimonialInvitation psychologistId="professional" appearance="inline"/>}/>
        : <TestimonialsButton psychologistId="professional" name="Profissional Exemplo" count={0}/>}
    </section>));`;
  const bundle = await build({
    stdin: { contents, resolveDir: frontend, loader: "jsx" },
    bundle: true,
    write: false,
    metafile: true,
    jsx: "automatic",
    platform: "browser",
    // Next normally supplies these constants while compiling its client components.
    define: {
      "process.env.NODE_ENV": '"development"',
      "process.env.__NEXT_ROUTER_BASEPATH": '""',
      "process.env": "{}",
    },
    plugins: [
      {
        name: "review-data-boundaries",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) =>
            Object.hasOwn(boundaries, args.path)
              ? { path: args.path, namespace: "review-boundary" }
              : undefined,
          );
          build.onLoad({ filter: /.*/, namespace: "review-boundary" }, (args) => ({
            contents: boundaries[args.path],
            loader: "jsx",
            resolveDir: frontend,
          }));
        },
      },
    ],
  });
  const scanner = new Scanner({ sources: [] });
  const files = Object.keys(bundle.metafile.inputs)
    .filter(
      (path) =>
        !path.startsWith("review-boundary:") &&
        /\.[jt]sx?$/.test(path) &&
        !path.includes("node_modules"),
    )
    .map((path) => ({ content: readFileSync(resolve(path), "utf8"), extension: "tsx" }));
  const candidates = scanner.scanFiles([...files, { content: contents, extension: "tsx" }]);
  const cssPath = resolve(frontend, "src/app/globals.css");
  const css = (
    await compile(readFileSync(cssPath, "utf8"), { base: dirname(cssPath), onDependency() {} })
  ).build(candidates);
  assert.ok(css.includes("white-space: normal"));
  assert.ok(css.includes("white-space: nowrap"));
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  for (const width of [320, 390]) {
    for (const origin of ["reply", "directory"]) {
      await t.test(`${origin} ${width}px`, async () => {
        const page = await browser.newPage({
          viewport: { width, height: 844 },
          reducedMotion: "reduce",
        });
        const errors = [];
        const pageError = new Promise((resolve) =>
          page.on("pageerror", (error) => {
            errors.push(error.message);
            resolve(error);
          }),
        );
        try {
          const result = await Promise.race([
            pageError,
            (async () => {
              await page.route("**/*", (route) => route.abort());
              await page.setContent('<div id="root"></div>');
              await page.addStyleTag({ content: css });
              await page.evaluate((origin) => {
                window.previewOrigin = origin;
              }, origin);
              await page.addScriptTag({ content: bundle.outputFiles[0].text });
              if (origin === "directory")
                await page
                  .getByRole("button", { name: "Abrir depoimentos de Profissional Exemplo" })
                  .click();
              await page.getByRole("button", { name: "Deixar depoimento", exact: true }).click();
              const question = page.getByText(
                "Como foi sua experiência com as respostas e os conteúdos deste psicólogo?",
                { exact: true },
              );
              await question.waitFor({ timeout: 10_000 });
              const measure = () =>
                question.evaluate((element) => {
                  const range = document.createRange();
                  range.selectNodeContents(element);
                  const content = element.parentElement;
                  const box = content.getBoundingClientRect();
                  const style = getComputedStyle(content);
                  const sheet = document.querySelector("[data-testimonials-sheet]");
                  const compose = document.querySelector("[data-testimonials-compose]");
                  return {
                    whitespace: getComputedStyle(element).whiteSpace,
                    lineHeight: parseFloat(getComputedStyle(element).lineHeight),
                    height: element.getBoundingClientRect().height,
                    left: box.left + parseFloat(style.paddingLeft),
                    right: box.right - parseFloat(style.paddingRight),
                    lines: Array.from(range.getClientRects()).map((rect) => ({
                      left: rect.left,
                      right: rect.right,
                    })),
                    sheetOverflow: sheet.scrollWidth - sheet.clientWidth,
                    composeOverflow: compose.scrollWidth - compose.clientWidth,
                    contentOverflow: content.scrollWidth - content.clientWidth,
                    inheritedNowrap: Boolean(
                      document.querySelector("dialog").parentElement.closest(".whitespace-nowrap"),
                    ),
                  };
                });
              const state = await measure();
              assert.equal(state.inheritedNowrap, origin === "reply");
              assert.equal(state.whitespace, "normal");
              assert.ok(state.height > state.lineHeight, JSON.stringify(state));
              for (const line of state.lines) {
                assert.ok(
                  line.left >= state.left - 1 && line.right <= state.right + 1,
                  JSON.stringify(state),
                );
              }
              for (const key of ["sheetOverflow", "composeOverflow", "contentOverflow"])
                assert.ok(state[key] <= 1, JSON.stringify(state));
              if (origin === "reply") {
                await page
                  .locator("dialog")
                  .evaluate((dialog) => dialog.classList.remove("whitespace-normal"));
                const inherited = await measure();
                assert.equal(inherited.whitespace, "nowrap");
                assert.ok(
                  inherited.lines.some((line) => line.right > inherited.right + 1),
                  JSON.stringify(inherited),
                );
                await page
                  .locator("dialog")
                  .evaluate((dialog) => dialog.classList.add("whitespace-normal"));
                assert.equal((await measure()).whitespace, "normal");
              }
              assert.deepEqual(errors, []);
            })(),
          ]);
          if (result instanceof Error) throw result;
        } finally {
          await page.close();
        }
      });
    }
  }
});

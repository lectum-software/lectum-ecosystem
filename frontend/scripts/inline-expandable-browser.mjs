import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import compiler from "next/dist/compiled/webpack/webpack.js";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const output = path.resolve("../out/expandable-regression");
fs.mkdirSync(output, { recursive: true });
const source = fs.readFileSync("src/components/community/inline-expandable-text.tsx", "utf8");
const component = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
fs.writeFileSync(path.join(output, "component.cjs"), component);
fs.writeFileSync(
  path.join(output, "entry.cjs"),
  `
const React = require('react');
const { createRoot } = require('react-dom/client');
const { InlineExpandableText } = require('./component.cjs');
function App() {
  const [expanded, setExpanded] = React.useState(false);
  return React.createElement(InlineExpandableText, {
    text: window.testText, maxLines: 4, expanded,
    onToggle: () => setExpanded(value => !value)
  });
}
createRoot(document.getElementById('root')).render(React.createElement(App));
`,
);
async function main() {
  await new Promise((resolve, reject) =>
    compiler.webpack(
      {
        mode: "development",
        devtool: false,
        entry: path.join(output, "entry.cjs"),
        output: { path: output, filename: "bundle.js" },
        resolve: {
          modules: [path.resolve("node_modules"), "node_modules"],
          alias: {
            "@/lib/utils": path.resolve("src/lib/utils.ts"),
          },
        },
        module: { rules: [{ test: /utils\.ts$/, use: path.join(output, "loader.cjs") }] },
      },
      (error, stats) =>
        error || stats.hasErrors() ? reject(error || Error(stats.toString())) : resolve(),
    ),
  );
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [320, 375, 390, 430, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on("pageerror", (error) => console.error("BROWSER", error.message));
      for (const text of [
        "Texto curto.",
        "Texto longo com sintomas e dificuldades do dia a dia. ".repeat(30),
        "Linha de texto.\n".repeat(15),
      ]) {
        await page.setContent(
          '<style>*{box-sizing:border-box}body{margin:20px;font:16px/24px Arial}#root{max-width:640px}p{margin:0;white-space:pre-line}#root>div{position:relative}p[aria-hidden]{position:absolute;top:0;visibility:hidden;pointer-events:none}button{font:inherit;padding:0;border:0;background:transparent}</style><div id="root"></div>',
        );
        await page.evaluate((value) => {
          window.testText = value;
          window.process = { env: {} };
        }, text);
        await page.addScriptTag({ path: path.join(output, "bundle.js") });
        if (text.length < 30) {
          await page.waitForFunction(() => document.querySelector("#root p")?.style.display === "");
          assert.equal(await page.getByRole("button").count(), 0);
        } else {
          const more = page.getByRole("button", { name: "... ver mais", exact: true });
          await more.waitFor();
          const unclipped = await more.evaluate((button) => {
            const p = button.closest("p");
            const r = button.getBoundingClientRect();
            return getComputedStyle(p).overflow !== "hidden" && r.height > 0;
          });
          assert.equal(unclipped, true);
          await more.click();
          await page.getByRole("button", { name: "ver menos", exact: true }).waitFor();
          assert.equal(
            await page
              .locator("#root p")
              .first()
              .evaluate((p) => p.firstChild.textContent),
            text,
          );
          await page.getByRole("button", { name: "ver menos", exact: true }).click();
          await more.waitFor();
        }
      }
      await page.screenshot({ path: path.join(output, `collapsed-${width}.png`) });
      await page.close();
      console.log(`PASS ${width}px: short, long, multiline, expand and collapse`);
    }
  } finally {
    await browser.close();
  }
}
fs.writeFileSync(
  path.join(output, "loader.cjs"),
  `module.exports = source => require(${JSON.stringify(require.resolve("typescript"))}).transpileModule(source, {compilerOptions:{module:1,target:9}}).outputText;`,
);
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Children, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = new URL("../src/", import.meta.url);
const communityUrl = new URL(
  "app/(admin)/psicologos/%5Bid%5D/modules/tabs/statistics/community.tsx",
  root,
);
const configUrl = new URL("../../support/config.ts", communityUrl);
const sharedUrl = new URL("../../components/shared.tsx", communityUrl);
const platformUrl = new URL("./platform.tsx", communityUrl);
const baseline = process.argv.find((argument) => argument.startsWith("--baseline="))?.slice(11);
const selected = new Map([
  [
    communityUrl.href,
    [
      "contentFormatChartColors",
      "formatContentFormatPercentage",
      "formatContentFormatTotal",
      "formatContentFormatWhatsappClicks",
      "ContentFormatDistributionCard",
      "ContentFormatDistributionsBlock",
    ],
  ],
  [configUrl.href, ["CARD", "numberFormatter"]],
  [sharedUrl.href, ["CardShell", "Badge"]],
  [platformUrl.href, ["hexToRgba", "PlatformDevicePiePercentageLabel"]],
]);
const imports = new Map([
  [
    communityUrl.href,
    'import {Loader2} from "lucide-react"; import {cn} from "@/lib/utils"; import {Badge,CardShell} from "../../components/shared"; import {numberFormatter} from "../../support/config"; import {buildPieSlicePath,getPiePoint} from "@/lib/chart-geometry"; import {PlatformDevicePiePercentageLabel} from "./platform";',
  ],
  [sharedUrl.href, 'import {cn} from "@/lib/utils"; import {CARD} from "../support/config";'],
  [platformUrl.href, 'import {colorWithAlpha} from "@/lib/visual-tokens";'],
]);

// Compile original presentation declarations, including the actual cards and geometry.
// Never load API/auth modules or replace their data with mocked providers.
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) specifier = fileURLToPath(new URL(specifier.slice(2), root));
    if (
      context.parentURL?.startsWith(root.href) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".tsx")
    ) {
      const url = new URL(
        specifier.startsWith("/") ? `file://${specifier}` : specifier,
        context.parentURL,
      );
      const known = [...selected.keys()].find(
        (key) => key === `${url.href}.ts` || key === `${url.href}.tsx`,
      );
      if (known) specifier = fileURLToPath(known);
      else if (specifier.startsWith(fileURLToPath(root))) specifier += ".ts";
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(root.href) || !/\.tsx?$/.test(url)) return nextLoad(url, context);
    let source = readFileSync(
      url === communityUrl.href && baseline ? baseline : new URL(url),
      "utf8",
    );
    if (selected.has(url)) {
      const ast = ts.createSourceFile(url, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const declarations = ast.statements.filter(
        (node) =>
          ts.isVariableStatement(node) &&
          node.declarationList.declarations.some((item) =>
            selected.get(url).includes(item.name.getText(ast)),
          ),
      );
      assert.equal(declarations.length, selected.get(url).length);
      source = `${imports.get(url) ?? ""}\n${declarations.map((node) => node.getText(ast)).join("\n")}`;
    }
    return {
      format: "commonjs",
      shortCircuit: true,
      source: ts.transpileModule(source, {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    };
  },
});
let ContentFormatDistributionsBlock;
try {
  ({ ContentFormatDistributionsBlock } = createRequire(import.meta.url)(
    fileURLToPath(communityUrl),
  ));
} finally {
  loader.deregister();
}

for (const [postClicks, replyClicks] of [
  [3, 7],
  [0, 9],
  [9, 0],
  [undefined, 1],
  [1, undefined],
  [undefined, undefined],
  [1234, 2345],
]) {
  test(`cliques separados e PT-BR: posts=${postClicks}, respostas=${replyClicks}`, () => {
    const group = (clicks) =>
      Object.freeze({
        total: 1,
        total_whatsapp_clicks: clicks,
        items: Object.freeze([
          Object.freeze({
            id: "text",
            label: "Apenas texto",
            count: 1,
            percentage: 100,
            whatsapp_clicks: clicks,
          }),
        ]),
      });
    const distribution = Object.freeze({ posts: group(postClicks), replies: group(replyClicks) });
    for (const isRefreshing of [false, true]) {
      const props = {
        distribution,
        isRefreshing,
        className: "audit-grid",
        cardClassName: "audit-card",
      };
      const cards = Children.toArray(ContentFormatDistributionsBlock(props).props.children);
      assert.equal(cards.length, 2);
      for (const [index, [title, key, count]] of [
        ["Posts", "posts", postClicks ?? 0],
        ["Respostas", "replies", replyClicks ?? 0],
      ].entries()) {
        const card = cards[index];
        const label = `${count.toLocaleString("pt-BR")} ${count === 1 ? "clique WhatsApp" : "cliques WhatsApp"}`;
        assert.equal(card.props.title, title);
        assert.equal(card.props.badgeLabel, label);
        assert.equal(card.props.distribution, distribution[key]);
        assert.equal(card.props.isRefreshing, isRefreshing);
        assert.equal(card.props.className, "audit-card");
        const html = renderToStaticMarkup(card);
        assert.ok(html.includes(`<h3 class="text-lg font-bold text-foreground">${title}</h3>`));
        assert.ok(html.includes(label));
        assert.equal(html.includes("Atualizando"), isRefreshing);
      }
      assert.ok(
        renderToStaticMarkup(createElement(ContentFormatDistributionsBlock, props)).includes(
          "audit-grid",
        ),
      );
    }
  });
}

test("cartões vazios mantêm zero, grupos e mensagem acessível", () => {
  const group = Object.freeze({ items: Object.freeze([]), total: 0 });
  const html = renderToStaticMarkup(
    createElement(ContentFormatDistributionsBlock, {
      distribution: Object.freeze({ posts: group, replies: group }),
      isRefreshing: false,
    }),
  );
  assert.equal((html.match(/0 cliques WhatsApp/g) ?? []).length, 2);
  assert.equal((html.match(/sem conteúdo no período selecionado/g) ?? []).length, 2);
  assert.ok(!html.includes("NaN"));
});

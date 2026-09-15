import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Children, createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const chartUrl = new URL(
  "../src/app/(admin)/trafego/components/navigation-conversions.tsx",
  import.meta.url,
);
const supportUrl = new URL("../modules/traffic-support.ts", chartUrl);
const geometryUrl = new URL("../src/lib/chart-geometry.ts", import.meta.url);
const utilsUrl = new URL("../src/lib/utils.ts", import.meta.url);
const require = createRequire(import.meta.url);
const baseline = process.argv.find((argument) => argument.startsWith("--baseline="))?.slice(11);
const selected = new Map([
  [chartUrl.href, ["DonutChart"]],
  [supportUrl.href, ["CHART_COLORS", "numberFormatter", "formatPercentageValue"]],
]);

// Compile original declarations, with real React, geometry and formatting.
// No API modules, authentication, data-fetching substitutes or providers are loaded.
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliases = {
      "@/lib/chart-geometry": geometryUrl,
      "@/lib/utils": utilsUrl,
      "../modules/traffic-support": supportUrl,
    };
    return nextResolve(aliases[specifier] ? fileURLToPath(aliases[specifier]) : specifier, context);
  },
  load(url, context, nextLoad) {
    if (![chartUrl.href, supportUrl.href, geometryUrl.href, utilsUrl.href].includes(url)) {
      return nextLoad(url, context);
    }
    let source = readFileSync(url === chartUrl.href && baseline ? baseline : new URL(url), "utf8");
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
      const imports =
        url === chartUrl.href
          ? 'import { buildDonutCircleSegments } from "@/lib/chart-geometry"; import { cn } from "@/lib/utils"; import { CHART_COLORS, numberFormatter, formatPercentageValue } from "../modules/traffic-support";'
          : "";
      source = `${imports}\n${declarations.map((node) => node.getText(ast)).join("\n")}`;
    }
    return {
      format: "commonjs",
      source: ts.transpileModule(source, {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      shortCircuit: true,
    };
  },
});
let DonutChart;
let colors;
try {
  ({ DonutChart } = require(fileURLToPath(chartUrl)));
  ({ CHART_COLORS: colors } = require(fileURLToPath(supportUrl)));
} finally {
  loader.deregister();
}

const descendants = (node) => {
  if (!isValidElement(node)) return [];
  return [node, ...Children.toArray(node.props.children).flatMap(descendants)];
};

for (const counts of [[0, 4], [2, 0, 3], [0, 0, 1, 0, 2], [1, 1, 1, 1, 1, 1, 1], [0, 0], []]) {
  test(`cor do arco coincide com legenda sem alterar dados: ${counts.join(",") || "vazio"}`, () => {
    const total = counts.reduce((sum, value) => sum + value, 0);
    const items = Object.freeze(
      counts.map((count, index) =>
        Object.freeze({
          id: `category-${index}`,
          label: `Categoria ${index + 1}`,
          count,
          percentage: total ? (count / total) * 100 : 0,
        }),
      ),
    );
    const elements = descendants(DonutChart({ ariaLabel: "Distribuição", items, total }));
    const arcs = elements.filter((node) => node.type === "circle" && node.props.strokeDasharray);
    const dots = elements.filter(
      (node) => node.type === "span" && node.props.style?.backgroundColor,
    );
    assert.deepEqual(
      dots.map((node) => node.props.style.backgroundColor),
      counts.map((_, i) => colors[i % colors.length]),
    );
    assert.deepEqual(
      arcs.map((node) => node.props.stroke),
      counts.flatMap((count, i) => (count > 0 ? [colors[i % colors.length]] : [])),
    );
    const labels = elements.filter((node) => node.type === "figcaption");
    assert.equal(labels.length, 1);
    for (const item of items) assert.ok(labels[0].props.children.includes(item.label));
    assert.ok(
      elements.some((node) => node.type === "text" && node.props.children === String(total)),
    );
    const html = renderToStaticMarkup(
      createElement(DonutChart, { ariaLabel: "Distribuição", items, total }),
    );
    assert.ok(html.includes('aria-label="Distribuição"'));
    assert.equal(html.includes("Nenhum dado foi encontrado no período."), items.length === 0);
    assert.deepEqual(
      items.map((item) => item.count),
      counts,
    );
  });
}

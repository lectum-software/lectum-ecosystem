import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { buildRoundedChartTicks } from "../../../../lib/chart-time-series.ts";

// Source contracts only; real selectors and persistence are tested in the backend.
const read = (relative) => {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const ast = ts.createSourceFile(
    relative,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return { source, ast, nodes, text: (node) => node.getText(ast) };
};
const cards = read("../components/metric-cards.tsx");
const timeline = read("../components/timeline-filters.tsx");
const supply = read("../components/supply-demand.tsx");

test("AST: oferta desconhecida não recebe Sem oferta, razão ou ordenação por zero", () => {
  const status = supply.nodes.find(
    (node) => ts.isVariableDeclaration(node) && supply.text(node.name) === "getSupplyDemandStatus",
  );
  assert.ok(
    status && ts.isArrowFunction(status.initializer) && ts.isBlock(status.initializer.body),
  );
  const first = status.initializer.body.statements[0];
  assert.ok(ts.isIfStatement(first));
  assert.equal(supply.text(first.expression), "row.supplyUnavailable");
  assert.match(supply.text(first.thenStatement), /Sem histórico/);
  assert.match(supply.source, /supplyUnavailable: supplyItem\.unavailable === true/);
  assert.match(supply.source, /!supplyItem\.unavailable && supplyItem\.count > 0/);
  assert.match(supply.source, /row\.supplyUnavailable && sortKey !== "searches"/);
});

test("AST: célula de oferta indisponível oculta contagem e percentual sem ocultar demanda", () => {
  const branch = supply.nodes.find(
    (node) => ts.isConditionalExpression(node) && supply.text(node.condition) === "unavailable",
  );
  assert.ok(branch);
  assert.match(supply.text(branch.whenTrue), /Histórico indisponível/);
  assert.ok(!supply.text(branch.whenTrue).includes("formatPercentageValue"));
  assert.ok(!supply.text(branch.whenTrue).includes("numberFormatter.format"));
  const countCells = supply.nodes.filter(
    (node) =>
      ts.isJsxSelfClosingElement(node) && supply.text(node.tagName) === "SupplyDemandCountCell",
  );
  assert.equal(countCells.length, 2);
  assert.ok(!supply.text(countCells[0]).includes("unavailable="));
  assert.match(supply.text(countCells[1]), /unavailable=\{row\.supplyUnavailable\}/);
});

test("AST: contador desconhecido apresenta travessão, não zero nem participação percentual", () => {
  const parts = cards.nodes.find(
    (node) => ts.isVariableDeclaration(node) && cards.text(node.name) === "getMetricValueParts",
  );
  assert.ok(parts && ts.isArrowFunction(parts.initializer) && ts.isBlock(parts.initializer.body));
  const first = parts.initializer.body.statements[0];
  assert.ok(ts.isIfStatement(first));
  assert.equal(cards.text(first.expression), "metric.unavailable");
  assert.match(cards.text(first.thenStatement), /main: "—", rate: null/);
});

test("AST: comparação anterior desconhecida tem indicação própria", () => {
  assert.match(cards.source, /Sem histórico anterior/);
  assert.ok(
    cards.nodes.some(
      (node) =>
        ts.isIfStatement(node) &&
        cards.text(node.expression) === "metric.previous_unavailable && !metric.unavailable",
    ),
  );
});

test("AST: séries de plano/churn usam máscaras de cobertura agregadas por último valor", () => {
  for (const name of ["plan_history_coverage", "churn_history_coverage"]) {
    assert.ok(
      timeline.nodes.some(
        (node) =>
          ts.isPropertyAssignment(node) &&
          timeline.text(node.name) === name &&
          timeline.text(node.initializer) === '"last"',
      ),
    );
  }
  assert.ok(
    timeline.nodes.some(
      (node) =>
        ts.isConditionalExpression(node) &&
        timeline.text(node.condition) === "known" &&
        ts.isArrayLiteralExpression(node.whenFalse) &&
        node.whenFalse.elements.length === 0,
    ),
  );
});

test("AST: filtro desconhecido desabilita segmentos sem inventar grupo gratuito", () => {
  assert.ok(
    timeline.nodes.some(
      (node) =>
        ts.isJsxAttribute(node) &&
        timeline.text(node.name) === "disabled" &&
        node.initializer &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression?.getText(timeline.ast) ===
          '!historyKnown && option.id !== "all"',
    ),
  );
});

for (const [relative, count] of [
  ["../views/stats-content.tsx", 1],
  ["../components/signup-conversion.tsx", 4],
  ["../components/traffic-card.tsx", 1],
  ["../components/profile-signals.tsx", 1],
]) {
  test(`AST: todos os filtros de ${relative} recebem cobertura`, () => {
    const consumer = read(relative);
    const selectors = consumer.nodes.filter(
      (node) =>
        ts.isJsxSelfClosingElement(node) && consumer.text(node.tagName) === "PlanSegmentSelect",
    );
    assert.equal(selectors.length, count);
    for (const selector of selectors) {
      const flag = selector.attributes.properties.find(
        (node) => ts.isJsxAttribute(node) && consumer.text(node.name) === "historyKnown",
      );
      assert.ok(flag?.initializer && ts.isJsxExpression(flag.initializer));
      assert.equal(
        flag.initializer.expression?.getText(consumer.ast),
        "summary.plan_history?.current_known !== false",
      );
    }
  });
}

test("AST: mudança de cobertura remonta filtros e mostra início observado", () => {
  const dashboard = read("../views/dashboard-content.tsx");
  for (const name of [
    "StatsContent",
    "ConversionAndUsageBlocks",
    "DashboardTrafficSourcesCard",
    "DashboardProfileConversionCard",
  ]) {
    const component = dashboard.nodes.find(
      (node) => ts.isJsxSelfClosingElement(node) && dashboard.text(node.tagName) === name,
    );
    assert.ok(
      component?.attributes.properties.some(
        (node) =>
          ts.isJsxAttribute(node) && dashboard.text(node) === `key={\`${name}:\${historyKey}\`}`,
      ),
    );
  }
  assert.match(dashboard.source, /Cobertura observada desde/);
  assert.match(dashboard.source, /sem\s+atribuir planos desconhecidos/);
});

for (const maximum of [0, 1, 2, 3, 4, 10, 100, Number.NaN, Infinity]) {
  test(`eixo arredondado ${maximum}: valores únicos e ordenados sem linhas sobrepostas`, () => {
    const ticks = buildRoundedChartTicks(maximum);
    assert.equal(new Set(ticks).size, ticks.length);
    assert.deepEqual(
      ticks,
      ticks.toSorted((a, b) => a - b),
    );
    assert.ok(ticks.every(Number.isFinite));
    assert.equal(ticks[0], 0);
    assert.equal(ticks.at(-1), Number.isFinite(maximum) ? Math.max(1, maximum) : 1);
  });
}

test("AST: gráfico usa eixos únicos e título de dispositivos fica em PT-BR", () => {
  const grid = timeline.nodes.find(
    (node) => ts.isVariableDeclaration(node) && timeline.text(node.name) === "gridValues",
  );
  assert.equal(timeline.text(grid.initializer), "buildRoundedChartTicks(maxValue)");
  assert.match(read("../components/signup-conversion.tsx").source, /Dispositivos e sistemas/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import {
  COMMUNITY_CURRENT_TOTALS_DESCRIPTION,
  communityStatisticScopeLabel,
  communityStatisticSeriesLabel,
  isCurrentCommunityTotal,
} from "./statistics-scope.ts";

for (const id of ["followers_patients", "followers_psychologists"]) {
  test(`${id}: total atual separado do período, sem afirmar histórico de saídas`, () => {
    assert.equal(isCurrentCommunityTotal(id), true);
    assert.equal(communityStatisticScopeLabel(id), "Total atual");
    assert.equal(
      communityStatisticSeriesLabel(id, "Seguidores"),
      "Seguidores — base atual até a data",
    );
  });
}

for (const id of [
  "accesses",
  "active_patients",
  "active_psychologists",
  "new_active_patients",
  "new_active_psychologists",
  "patient_posts",
  "psychologist_posts",
  "upvotes",
  "saves",
  "whatsapp_clicks",
]) {
  test(`${id}: mantém escopo do período e nome da série`, () => {
    assert.equal(isCurrentCommunityTotal(id), false);
    assert.equal(communityStatisticScopeLabel(id), "No período");
    assert.equal(communityStatisticSeriesLabel(id, "Métrica"), "Métrica");
  });
}

test("explicação diferencia base atual e série sem inventar histórico", () => {
  assert.match(COMMUNITY_CURRENT_TOTALS_DESCRIPTION, /base atual, sem filtro de período/);
  assert.match(COMMUNITY_CURRENT_TOTALS_DESCRIPTION, /datas de entrada dessa base/);
  assert.match(COMMUNITY_CURRENT_TOTALS_DESCRIPTION, /não reconstrói seguidores que já saíram/);
});

// Contratos AST dos consumidores reais: não executam queries, React ou navegador.
const readConsumer = (relative) => {
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
  return { ast, nodes };
};

for (const [relative, subject] of [
  ["../components/statistics.tsx", "item"],
  ["../[slug]/components/statistics-metrics.tsx", "metric"],
]) {
  const { ast, nodes } = readConsumer(relative);
  const text = (node) => node.getText(ast);

  test(`AST ${subject}: label visível e tooltip usam o escopo real da métrica`, () => {
    assert.ok(
      nodes.some(
        (node) =>
          ts.isCallExpression(node) && text(node) === `communityStatisticScopeLabel(${subject}.id)`,
      ),
    );
    assert.ok(
      nodes.some(
        (node) =>
          ts.isJsxElement(node) &&
          text(node.openingElement.tagName) === "span" &&
          node.children.some(
            (child) => ts.isJsxExpression(child) && child.expression?.getText(ast) === "scopeLabel",
          ),
      ),
    );
    assert.ok(
      nodes.some(
        (node) =>
          ts.isCallExpression(node) &&
          text(node) === `communityStatisticSeriesLabel(${subject}.id, ${subject}.label)`,
      ),
    );
  });

  test(`AST ${subject}: total atual não apresenta comparação com período anterior`, () => {
    const branch = nodes.find(
      (node) =>
        ts.isConditionalExpression(node) &&
        text(node.condition) === "isCurrentTotal" &&
        text(node.whenTrue).includes("Sem filtro de período") &&
        text(node.whenFalse).includes(subject === "item" ? "formatChange" : "ComparisonLine"),
    );
    assert.ok(branch, "comparação temporal deve ficar exclusivamente no ramo não atual");
    if (subject === "metric") {
      assert.ok(
        nodes.some(
          (node) =>
            ts.isVariableDeclaration(node) &&
            text(node.name) === "comparison" &&
            node.initializer?.getText(ast) === "isCurrentTotal ? undefined : metric.comparison",
        ),
      );
    }
  });

  test(`AST ${subject}: explicação só aparece quando há totais atuais`, () => {
    assert.ok(
      nodes.some(
        (node) =>
          ts.isConditionalExpression(node) &&
          text(node.condition).startsWith("metrics.some(") &&
          text(node.condition).includes("isCurrentCommunityTotal") &&
          text(node.whenTrue).includes("COMMUNITY_CURRENT_TOTALS_DESCRIPTION") &&
          node.whenFalse.kind === ts.SyntaxKind.NullKeyword,
      ),
    );
  });
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Wiring AST real: não instancia hooks, query, DOM ou respostas simuladas.
const source = readFileSync(new URL("./logic.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile(
  "logic.tsx",
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
const text = (node) => node.getText(ast);

test("AST: preview e negação do plano descartam dados antes da apresentação", () => {
  const variable = (name) =>
    nodes.find((node) => ts.isVariableDeclaration(node) && text(node.name) === name);
  assert.equal(
    variable("isAnalyticsPreview")?.initializer?.getText(ast),
    'data?.access.mode === "preview" || isProfessionalPlanError',
  );
  assert.equal(
    variable("visibleData")?.initializer?.getText(ast),
    "isAnalyticsPreview ? undefined : data",
  );
});

for (const helper of ["metricCards", "getTrafficSources", "getCommunitiesAnalytics"]) {
  test(`AST: ${helper} recebe somente dados com acesso liberado`, () => {
    const calls = nodes.filter(
      (node) => ts.isCallExpression(node) && text(node.expression) === helper,
    );
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].arguments.map(text), ["visibleData"]);
  });
}

test("AST: dados de vídeo também não passam em preview; bloqueios visuais são preservados", () => {
  const video = nodes.find((node) => ts.isJsxAttribute(node) && text(node.name) === "video");
  assert.ok(video && ts.isJsxExpression(video.initializer));
  assert.equal(video.initializer.expression?.getText(ast), "visibleData?.presentation_video");
  const locks = nodes.filter((node) => ts.isJsxAttribute(node) && text(node.name) === "locked");
  assert.equal(locks.length, 4);
  for (const lock of locks) {
    assert.ok(ts.isJsxExpression(lock.initializer));
    assert.equal(lock.initializer.expression?.getText(ast), "isAnalyticsPreview");
  }
});

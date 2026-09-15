import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

// Contratos estáticos do serviço real. Não importam repositório, bootstrap ou provider.
const source = readFileSync(join(__dirname, "services.ts"), "utf8");
const ast = ts.createSourceFile("services.ts", source, ts.ScriptTarget.Latest, true);
const nodes: ts.Node[] = [];
const visit = (node: ts.Node) => {
  nodes.push(node);
  ts.forEachChild(node, visit);
};
visit(ast);
const text = (node: ts.Node) => node.getText(ast);

test("AST: Analytics profissional nega acesso antes da consulta de métricas", () => {
  const guard = nodes.find(
    (node): node is ts.IfStatement =>
      ts.isIfStatement(node) && text(node.expression) === "!hasEntitlement",
  );
  assert.ok(guard, "entitlement falso exige retorno antecipado");
  assert.ok(ts.isBlock(guard.thenStatement));
  assert.equal(guard.thenStatement.statements.length, 1);
  const returned = guard.thenStatement.statements[0];
  assert.ok(ts.isReturnStatement(returned));
  assert.ok(returned.expression && ts.isObjectLiteralExpression(returned.expression));
  assert.deepEqual(returned.expression.properties.map(text), [
    "status: 403",
    '...error("professional_analytics_professional_plan", {})',
  ]);
  const query = nodes.find(
    (node) => ts.isCallExpression(node) && text(node.expression) === "repository.index",
  );
  assert.ok(query && guard.end < query.pos);
});

test("AST: preserva a consulta de entitlement existente, inclusive cortesia", () => {
  assert.ok(
    nodes.some(
      (node) =>
        ts.isCallExpression(node) &&
        text(node) === "repository.hasProfessionalEntitlement(data.auth.id)",
    ),
  );
  const repository = readFileSync(
    join(__dirname, "../repositories/queries/PsychologistAnalyticsCommunityRepository.ts"),
    "utf8",
  );
  const entitlement = repository.slice(
    repository.indexOf("async hasProfessionalEntitlement("),
    repository.indexOf("async buildCommunities("),
  );
  assert.match(entitlement, /some: activeProfessionalEntitlementWhere\(\)/);
});

test("AST: assinante consulta o período pedido, sem recorte pela data de upgrade", () => {
  const query = nodes.find(
    (node): node is ts.CallExpression =>
      ts.isCallExpression(node) && text(node.expression) === "repository.index",
  );
  assert.ok(query);
  assert.deepEqual(query.arguments.map(text), ["data", "period", "hasEntitlement"]);
  assert.ok(
    nodes.some(
      (node) =>
        ts.isVariableDeclaration(node) &&
        text(node.name) === "period" &&
        node.initializer?.getText(ast) === "buildPeriod(normalizePeriod(data.q.period), data.q)",
    ),
  );
  assert.ok(
    nodes.some(
      (node) =>
        ts.isVariableDeclaration(node) &&
        text(node.name) === "ALL_PERIOD_START_AT" &&
        node.initializer?.getText(ast) === 'new Date("1970-01-01T00:00:00.000Z")',
    ),
  );
});

test("AST: autenticação e validação do intervalo continuam no serviço", () => {
  for (const code of [
    "token_not_authorized",
    "role_not_authorized",
    "invalid_analytics_date_range",
  ]) {
    assert.ok(nodes.some((node) => ts.isStringLiteral(node) && node.text === code));
  }
});

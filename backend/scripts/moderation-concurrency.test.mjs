import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Static caller contracts complement the real PostgreSQL probe; these do not prove isolation.
const parse = (path) =>
  ts.createSourceFile(
    path,
    readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
const nodes = (root, predicate) => {
  const result = [];
  const visit = (node) => {
    if (predicate(node)) result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return result;
};
const property = (node, name) => ts.isPropertyAssignment(node) && node.name.getText() === name;
const root = "modules/api/admin/private/";
const operations = parse(`${root}moderation/use-cases/services/operations.ts`);

test("cada decisão individual refaz política e before com registro transacional", () => {
  const callbacks = nodes(operations, (node) => property(node, "prepareAudit"));
  assert.equal(callbacks.length, 2);
  for (const callback of callbacks) {
    const fn = callback.initializer;
    assert.ok(ts.isArrowFunction(fn));
    const current = fn.parameters[0].name.getText();
    const checks = nodes(
      fn,
      (node) => ts.isCallExpression(node) && node.expression.getText() === "postReportStatusGroup",
    );
    assert.equal(checks.length, 1);
    assert.equal(checks[0].arguments[0].getText(), `${current}.status`);
    const audits = nodes(
      fn,
      (node) => ts.isCallExpression(node) && node.expression.getText() === "createReportAudit",
    );
    assert.equal(audits.length, 1);
    const report = nodes(audits[0], (node) => property(node, "report"));
    assert.equal(report.length, 1);
    assert.equal(report[0].initializer.getText(), current);
  }
});

test("todos os sete limites administrativos usam a transação serializável compartilhada", () => {
  for (const [path, methods] of [
    [
      "moderation/repositories/queries/AdminModerationResolutionRepository.ts",
      ["resolveReportDismissed", "resolveReportUpheld", "markReviewing", "resolveEvent"],
    ],
    [
      "communities/manage/repositories/queries/AdminCommunityManageContentMutationRepository.ts",
      ["removePostContent", "removeReplyContent"],
    ],
    [
      "communities/manage/repositories/queries/AdminCommunityManageReportRepository.ts",
      ["resolveReportsForTarget"],
    ],
  ]) {
    const source = parse(root + path);
    for (const name of methods) {
      const [method] = nodes(
        source,
        (node) => ts.isMethodDeclaration(node) && node.name.getText() === name,
      );
      assert.ok(method, name);
      const wrappers = nodes(
        method,
        (node) =>
          ts.isCallExpression(node) && node.expression.getText() === "withSerializableTransaction",
      );
      assert.equal(wrappers.length, 1, name);
      assert.ok(ts.isArrowFunction(wrappers[0].arguments[0]), name);
    }
  }
});

test("remoção por comunidade projeta before a partir dos dois argumentos correntes", () => {
  const source = parse(`${root}communities/manage/use-cases/services/content-operations.ts`);
  const callbacks = nodes(source, (node) => property(node, "buildSafeBefore"));
  assert.equal(callbacks.length, 2);
  for (const callback of callbacks) {
    const fn = callback.initializer;
    assert.ok(ts.isArrowFunction(fn));
    const [record, community] = fn.parameters.map((parameter) => parameter.name.getText());
    const [projection] = nodes(
      fn,
      (node) =>
        ts.isCallExpression(node) &&
        ["mapPostContent", "mapReplyContent"].includes(node.expression.getText()),
    );
    assert.ok(projection);
    assert.deepEqual(
      projection.arguments.map((argument) => argument.getText()),
      [community, record],
    );
  }
});

test("falha de intenção retorna o conflito público existente e não sucesso", () => {
  const checks = nodes(
    operations,
    (node) => ts.isIfStatement(node) && node.expression.getText() === "!result",
  );
  assert.equal(checks.length, 2);
  for (const check of checks) {
    assert.ok(ts.isReturnStatement(check.thenStatement));
    assert.equal(check.thenStatement.expression.getText(), "invalidReportStatus()");
  }
});

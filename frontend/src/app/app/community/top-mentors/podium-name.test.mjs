import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./logic.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile(
  "logic.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const variables = [];
const jsxExpressions = [];
function visit(node) {
  if (ts.isVariableDeclaration(node)) variables.push(node);
  if (ts.isJsxExpression(node)) jsxExpressions.push(node);
  ts.forEachChild(node, visit);
}
visit(tree);

test("profession label uses the API gender-based label instead of headline text", () => {
  const value = variables.find(
    (node) => node.name.getText(tree) === "professionLabel",
  )?.initializer;
  assert.ok(value && ts.isArrowFunction(value) && ts.isBinaryExpression(value.body));
  assert.equal(value.body.left.getText(tree), "mentor.professional.type_label");
  assert.equal(value.body.right.text, "Psicólogo(a)");
});

test("podium consumes the configured name without splitting compound names", () => {
  const value = variables.find((node) => node.name.getText(tree) === "firstName")?.initializer;
  assert.ok(value && ts.isBinaryExpression(value));
  assert.equal(value.operatorToken.kind, ts.SyntaxKind.BarBarToken);
  assert.equal(value.left.getText(tree), "mentor.professional.whatsapp_name?.trim()");
  assert.equal(value.right.getText(tree), "displayName");
});

test("podium renders the configured name directly", () => {
  assert.ok(jsxExpressions.some((node) => node.expression?.getText(tree) === "firstName"));
});

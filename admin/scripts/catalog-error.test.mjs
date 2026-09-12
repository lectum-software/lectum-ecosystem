import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const path = new URL(
  "../src/app/(admin)/psicologos/[id]/modules/tabs/profile/professional.tsx",
  import.meta.url,
);
const baseline = process.argv.find((arg) => arg.startsWith("--baseline="))?.slice(11);
const source = ts.createSourceFile(
  "professional.tsx",
  readFileSync(baseline || path, "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let errorElement;
const visit = (node) => {
  if (
    ts.isJsxSelfClosingElement(node) &&
    node.attributes.properties.some(
      (p) =>
        ts.isJsxAttribute(p) &&
        p.name.getText(source) === "message" &&
        p.initializer?.getText(source) === "{catalogError}",
    )
  )
    errorElement = node;
  ts.forEachChild(node, visit);
};
visit(source);
const attribute = (name) =>
  errorElement?.attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.getText(source) === name,
  )?.initializer;
test("catálogo utiliza componente compartilhado com contexto próprio", () => {
  assert.equal(errorElement?.tagName.getText(source), "AdminQueryErrorState");
});
test("título não confunde opções com o perfil já carregado", () => {
  const title = attribute("title");
  assert.ok(title && ts.isStringLiteral(title));
  assert.equal(title.text, "Não foi possível carregar as opções de edição");
});
test("mensagem sanitizada e refetch permanecem no caller real", () => {
  assert.equal(attribute("message")?.getText(source), "{catalogError}");
  assert.equal(attribute("onRetry")?.getText(source), "{() => void catalogsQuery.refetch()}");
  assert.ok(source.text.includes("resolveApiError(catalogsQuery.error)"));
});

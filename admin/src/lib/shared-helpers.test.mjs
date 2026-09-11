import assert from "node:assert/strict";
import test from "node:test";
import { buildDonutCircleSegments, buildPieSlicePath, getPiePoint } from "./chart-geometry.ts";
import { startOfCurrentWeek } from "./date-period.ts";
import { isConfirmedAdminSessionRejection } from "./session-rejection.ts";

test("calcula a segunda-feira local sem alterar a data de referência", () => {
  const reference = new Date(2026, 7, 5, 15, 30);
  const monday = startOfCurrentWeek(reference);

  assert.equal(monday.getDay(), 1);
  assert.equal(monday.getDate(), 3);
  assert.equal(monday.getHours(), 15);
  assert.equal(reference.getDate(), 5);

  const sunday = startOfCurrentWeek(new Date(2026, 7, 9, 8));
  assert.equal(sunday.getDate(), 3);
});

test("preserva ordem e deslocamento dos segmentos de donut visíveis", () => {
  const result = buildDonutCircleSegments(
    [
      { count: 2, id: "a" },
      { count: 0, id: "hidden" },
      { count: 1, id: "b" },
    ],
    4,
    10,
  );

  assert.deepEqual(
    result.visibleItems.map((item) => item.id),
    ["a", "b"],
  );
  assert.equal(result.segments[0]?.strokeDashoffset, -0);
  assert.equal(result.segments[1]?.strokeDashoffset, -Math.PI * 10);
});

test("mantém a geometria compartilhada de fatias de pizza", () => {
  assert.deepEqual(getPiePoint(50, 10, 0), { x: 60, y: 50 });
  assert.match(buildPieSlicePath(50, 10, 0, 90), /^M 50 50 L 60 50 A 10 10 0 0 1 /);
});

test("só encerra o Admin local quando a própria API rejeita a credencial", () => {
  for (const code of [
    "token_device_not_authorized",
    "token_invalid",
    "token_mal_formatted",
    "token_not_authorized",
    "token_not_provided",
  ]) {
    assert.equal(
      isConfirmedAdminSessionRejection({ response: { data: { code }, status: 401 } }),
      true,
    );
  }

  for (const error of [
    new Error("offline"),
    { response: { status: 401 } },
    { response: { data: { code: "proxy_auth_required" }, status: 401 } },
    { response: { data: { code: "token_not_authorized" }, status: 403 } },
    { response: { data: { code: "token_not_authorized" }, status: 500 } },
    { response: { data: { code: "token_not_authorized" }, status: 502 } },
  ]) {
    assert.equal(isConfirmedAdminSessionRejection(error), false);
  }
});

test("catálogo informa limites do nome em português sem alterar o tamanho permitido", async () => {
  const { formSchema } = await import("../app/(admin)/configuracoes/modules/catalog-schema.ts");
  assert.equal(formSchema.parse({ active: "true", name: "  AB  " }).name, "AB");
  assert.equal(formSchema.safeParse({ active: "true", name: "A".repeat(160) }).success, true);
  for (const [name, message] of [
    ["", "Informe pelo menos 2 caracteres"],
    ["A", "Informe pelo menos 2 caracteres"],
    ["A".repeat(161), "Use no máximo 160 caracteres."],
    [null, "Informe o nome."],
  ]) {
    const result = formSchema.safeParse({ active: "true", name });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, message);
  }
});

test("catálogo mantém confirmação forte e status inválido com mensagem compreensível", async () => {
  const { formSchema, deleteSchema } = await import(
    "../app/(admin)/configuracoes/modules/catalog-schema.ts"
  );
  const status = formSchema.safeParse({ active: "invalid", name: "Categoria" });
  assert.equal(status.success, false);
  assert.equal(status.error.issues[0].message, "Selecione um status válido.");
  assert.equal(deleteSchema.safeParse({ confirmation: "  excluir catalogo  " }).success, true);
  assert.equal(deleteSchema.safeParse({ confirmation: "EXCLUIR" }).success, false);
});

test("controllers separam rótulo, controle e mensagem de erro", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  for (const control of ["input", "select", "textarea"]) {
    const source = readFileSync(
      new URL(`../components/controllers/${control}.tsx`, import.meta.url),
      "utf8",
    );
    const ast = ts.createSourceFile(
      `${control}.tsx`,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const labels = [];
    const visit = (node) => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "label")
        labels.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.equal(labels.length, 1);
    assert.match(labels[0].openingElement.getText(ast), /htmlFor=\{String\(name\)\}/);
    assert.doesNotMatch(labels[0].getText(ast), /<(input|select|textarea)\b|fieldState\.error/);
    assert.match(source, /aria-describedby=\{errorId\}/);
    assert.match(source, /aria-required=\{required \|\| undefined\}/);
    assert.match(source, /role="alert"/);
    assert.match(source, /min-h-5/);
  }
});

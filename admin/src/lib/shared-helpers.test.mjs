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
    assert.match(labels[0].openingElement.getText(ast), /htmlFor=\{controlId\}/);
    assert.doesNotMatch(labels[0].getText(ast), /<(input|select|textarea)\b|fieldState\.error/);
    assert.match(source, /const controlId = useId\(\)/);
    assert.match(source, /id=\{controlId\}/);
    assert.match(source, /const errorId = `\$\{controlId\}-error`/);
    assert.match(source, /aria-describedby=\{errorId\}/);
    assert.match(source, /aria-required=\{required \|\| undefined\}/);
    assert.match(source, /role="alert"/);
    assert.match(source, /min-h-5/);
  }
});

test("controllers mantêm IDs e mensagens únicos entre formulários reais simultâneos", async (t) => {
  const { readFileSync } = await import("node:fs");
  const { createRequire, registerHooks } = await import("node:module");
  const { fileURLToPath } = await import("node:url");
  const { default: ts } = await import("typescript");
  const require = createRequire(import.meta.url);
  const { createElement } = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { FormProvider, useForm } = require("react-hook-form");
  const sourceFiles = new Set(
    [
      "./utils.ts",
      ...["input", "textarea", "select", "checkbox-group"].map(
        (name) => `../components/controllers/${name}.tsx`,
      ),
    ].map((path) => new URL(path, import.meta.url).href),
  );
  const loader = registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(
        specifier === "@/lib/utils"
          ? fileURLToPath(new URL("./utils.ts", import.meta.url))
          : specifier,
        context,
      );
    },
    load(url, context, nextLoad) {
      if (!sourceFiles.has(url)) return nextLoad(url, context);
      const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      });
      return { format: "commonjs", source: outputText, shortCircuit: true };
    },
  });
  t.after(() => loader.deregister());
  const loadSource = (relativePath) =>
    require(fileURLToPath(new URL(relativePath, import.meta.url)));
  const controls = [
    ["input", "InputController", "text", {}],
    ["textarea", "TextareaController", "description", {}],
    ["select", "SelectController", "status", { options: [{ value: "active", label: "Ativo" }] }],
    [
      "checkbox-group",
      "CheckboxGroupController",
      "groups",
      { options: [{ value: "test", label: "Teste" }] },
    ],
  ].map(([file, exported, name, props]) => ({
    Component: loadSource(`../components/controllers/${file}.tsx`)[exported],
    name,
    props,
  }));
  const TestForm = ({ suffix }) => {
    const form = useForm({
      defaultValues: { text: "", description: "", status: "active", groups: [] },
    });
    return createElement(
      FormProvider,
      { ...form },
      createElement(
        "form",
        null,
        controls.map(({ Component, name, props }) =>
          createElement(Component, { ...props, key: name, name, label: `${name} ${suffix}` }),
        ),
      ),
    );
  };
  const render = () =>
    renderToStaticMarkup(
      createElement(
        "main",
        null,
        createElement(TestForm, { suffix: "página" }),
        createElement(TestForm, { suffix: "modal" }),
      ),
    );
  const html = render();
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 14);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\b(?:for|aria-describedby)="([^"]+)"/g)) {
    assert.equal(ids.filter((candidate) => candidate === id).length, 1);
  }
  assert.equal([...html.matchAll(/\bfor="/g)].length, 6);
  assert.equal(render(), html, "IDs de SSR devem ser determinísticos");
});

test("moderação apresenta a data civil sem retroceder um dia no fuso do browser", async () => {
  const { formatCalendarDayMonth } = await import("./chart-time-series.ts");
  for (const [input, expected] of [
    ["2026-09-11", "11 de set."],
    ["2027-01-01", "01 de jan."],
    ["2024-02-29", "29 de fev."],
  ]) {
    assert.equal(formatCalendarDayMonth(input), expected);
  }
  assert.equal(formatCalendarDayMonth("data inválida"), "data inválida");
});

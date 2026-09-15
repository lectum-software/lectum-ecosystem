import "../../../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { zodResolver } from "@hookform/resolvers/zod";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFormControl } from "react-hook-form";
import ts from "typescript";

const { analyticsCustomRangeSchema, CustomPeriodForm, CUSTOM_PERIOD_FIELDS } = await import(
  "./custom-period-form.tsx"
);
const valid = { start_at: "2026-08-12", end_at: "2026-09-11" };

for (const range of [
  valid,
  { start_at: "2026-09-11", end_at: "2026-09-11" },
  { start_at: "2024-02-29", end_at: "2024-03-01" },
]) {
  test(`RHF/Zod aceita intervalo válido ${range.start_at}–${range.end_at}`, async () => {
    const form = createFormControl({
      defaultValues: range,
      resolver: zodResolver(analyticsCustomRangeSchema),
    });
    let submitted;
    await form.handleSubmit(
      (values) => {
        submitted = values;
      },
      () => assert.fail("intervalo válido recusado"),
    )();
    assert.deepEqual(submitted, range);
  });
}

for (const [patch, field, message] of [
  [{ start_at: "" }, "start_at", "Informe a data de início."],
  [{ end_at: "" }, "end_at", "Informe a data de fim."],
  [{ start_at: "2026-02-29" }, "start_at", "Informe uma data válida."],
  [{ end_at: "2026-09-31" }, "end_at", "Informe uma data válida."],
  [{ start_at: "2026-13-01" }, "start_at", "Informe uma data válida."],
  [{ start_at: "11/09/2026" }, "start_at", "Informe uma data válida."],
  [{ start_at: "2026-09-12" }, "end_at", "Fim anterior ao início."],
  [{ end_at: "2026-09-11T12:00:00Z" }, "end_at", "Informe uma data válida."],
]) {
  test(`RHF/Zod preserva consulta e devolve erro no campo ${field}: ${JSON.stringify(patch)}`, async () => {
    const range = { ...valid, ...patch };
    const form = createFormControl({
      defaultValues: range,
      resolver: zodResolver(analyticsCustomRangeSchema),
    });
    let errors;
    await form.handleSubmit(
      () => assert.fail("intervalo inválido não pode ser aplicado"),
      (value) => {
        errors = value;
      },
    )();
    assert.equal(errors[field].message, message);
    assert.deepEqual(form.getValues(), range);
  });
}

test("formulário real utiliza controllers, nomes, labels e slots reservados sem validação nativa em inglês", () => {
  const html = renderToStaticMarkup(
    createElement(CustomPeriodForm, {
      range: valid,
      onApply: () => assert.fail("SSR não submete"),
    }),
  );
  assert.match(html, /<form[^>]*noValidate=""/i);
  assert.equal((html.match(/type="date"/g) ?? []).length, 2);
  for (const field of CUSTOM_PERIOD_FIELDS) {
    assert.ok(html.includes(`name="${field.name}"`));
    assert.ok(html.includes(`id="${field.name}-error"`));
    assert.equal(field.className, "[&>[role=alert]]:h-8");
  }
  assert.match(html, /Aplicar período/);
});

test("formulário desabilitado mantém ambos os campos e ação inativos", () => {
  const html = renderToStaticMarkup(
    createElement(CustomPeriodForm, {
      range: valid,
      disabled: true,
      onApply: () => assert.fail("SSR não submete"),
    }),
  );
  assert.equal((html.match(/<input[^>]*disabled=""/g) ?? []).length, 2);
  assert.match(html, /<button[^>]*disabled=""/);
});

// Wiring estático separado: não equivale a consulta HTTP ou clique no navegador.
test("abrir o rascunho personalizado não altera o período aplicado", () => {
  const source = readFileSync(new URL("./period-and-metrics.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile(
    "period.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let handler;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "handlePeriodClick")
      handler = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  const branch = handler.body.statements.find(ts.isIfStatement);
  assert.equal(branch.expression.getText(ast), 'nextPeriod === "custom"');
  assert.doesNotMatch(branch.thenStatement.getText(ast), /onChange\(/);
  assert.match(branch.thenStatement.getText(ast), /onCustomPopoverOpenChange\(true\)/);
  assert.match(source, /<CustomPeriodForm/);
  const logic = readFileSync(new URL("../logic.tsx", import.meta.url), "utf8");
  assert.match(logic, /setCustomRange\(range\);\s*setPeriod\("custom"\)/);
});

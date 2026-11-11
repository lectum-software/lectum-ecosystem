import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { AxiosError } from "axios";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const src = fileURLToPath(new URL("../src/", import.meta.url));
const hook = registerHooks({
  resolve(specifier, context, next) {
    const local = specifier.startsWith("@/")
      ? resolve(src, specifier.slice(2))
      : specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(src).href)
        ? resolve(dirname(fileURLToPath(context.parentURL)), specifier)
        : null;
    const target =
      local &&
      [local, `${local}.ts`, `${local}.tsx`, `${local}/index.ts`, `${local}/index.tsx`].find(
        (path) => existsSync(path) && /\.tsx?$/.test(path),
      );
    return next(target || specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith(pathToFileURL(src).href) || !/\.tsx?$/.test(url)) return next(url, context);
    return {
      format: "commonjs",
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      shortCircuit: true,
    };
  },
});
let policy,
  scopedExpenseRecovery,
  ExpenseFormDialog,
  ExpenseVoidDialog,
  ExpenseSummary,
  ExpenseTable,
  ExpenseFilters;
try {
  const load = createRequire(import.meta.url);
  const base = resolve(src, "app/(admin)/financeiro/despesas");
  policy = load(resolve(base, "modules/expense-policy.ts"));
  ({ scopedExpenseRecovery } = load(resolve(base, "modules/use-expense-recovery.ts")));
  ({ ExpenseFormDialog } = load(resolve(base, "components/expense-form.tsx")));
  ({ ExpenseVoidDialog } = load(resolve(base, "components/void-dialog.tsx")));
  ({ ExpenseSummary } = load(resolve(base, "components/summary.tsx")));
  ({ ExpenseTable } = load(resolve(base, "components/table.tsx")));
  ({ ExpenseFilters } = load(resolve(base, "components/filters.tsx")));
} finally {
  hook.deregister();
}
// Disposable policy/SSR fixtures, not accounting evidence. Production components and RHF are executed unmodified.
const neverMutate = () => assert.fail("Rendering must not mutate data");
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
const categories = policy.expenseCategories.map((id) => ({ id, label: policy.categoryLabel[id] }));
const item = {
  id: "local-expense",
  revision: 7,
  amount_cents: 12345,
  currency: "BRL",
  category: "software",
  description: "Licença operacional local",
  competence_date: "2026-11-10",
  paid_date: "2026-10-31",
  status: "active",
  created_at: "2026-11-11T12:00:00Z",
  updated_at: "2026-11-11T12:00:00Z",
  correction_reason: null,
  void_reason: null,
  voided_at: null,
};
const request = {
  request_key: "410ec3e0-1e3d-4d8e-aafa-82fb21cc368a",
  amount_cents: 12345,
  competence_date: item.competence_date,
  paid_date: item.paid_date,
  category: item.category,
  description: item.description,
};

test("manual BRL parser supports one cent, integer cents and bounded maximum without floating-point rounding", () => {
  for (const [value, cents] of [
    ["0,01", 1],
    ["123,45", 12345],
    ["123.4", 12340],
    ["1", 100],
    ["999999,99", 99999999],
  ])
    assert.equal(policy.parseExpenseAmount(value), cents);
  for (const value of [
    "0",
    "-1",
    "0,001",
    "1.234,56",
    "1e4",
    "1000000",
    "Infinity",
    "R$ 1,00",
    "1,",
  ])
    assert.equal(policy.parseExpenseAmount(value), null, value);
});
test("civil dates do not shift on display, BRT today is explicit and leap/bounds are validated", () => {
  assert.equal(policy.formatExpenseDate("2026-11-10"), "10/11/2026");
  assert.equal(policy.expenseToday(new Date("2026-11-12T01:00:00Z")), "2026-11-11");
  assert.equal(policy.expenseToday(new Date("2026-11-12T03:00:00Z")), "2026-11-12");
  assert.equal(policy.isExpenseCivilDate("2000-02-29"), true);
  for (const value of [
    "1999-12-31",
    "2101-01-01",
    "2100-02-29",
    "2026-02-30",
    "2026-1-01",
    "2026-11-10T00:00:00Z",
  ])
    assert.equal(policy.isExpenseCivilDate(value), false, value);
  assert.equal(policy.formatExpenseDate(null), "Não informado");
});
test("text validation matches backend Unicode codepoint bounds and control character rules", () => {
  for (const text of ["Texto válido", "😀".repeat(140), "Linha\ncom\ttab"])
    assert.equal(policy.expenseDescriptionSchema.safeParse(text).success, true);
  for (const text of ["😀😀", "😀".repeat(141), "test\0control", "test\x7fcontrol"])
    assert.equal(policy.expenseDescriptionSchema.safeParse(text).success, false);
  assert.equal(policy.expenseReasonSchema.safeParse("😀".repeat(8)).success, true);
  assert.equal(policy.expenseReasonSchema.safeParse("😀".repeat(7)).success, false);
});
test("form allows prepayment and pending status, requires reason only for corrections and rejects future payment", () => {
  const values = policy.expenseFormDefaults(item);
  assert.equal(policy.expenseFormSchema(false).safeParse(values).success, true);
  assert.equal(policy.expenseFormSchema(true).safeParse(values).success, false);
  assert.equal(
    policy.expenseFormSchema(true).safeParse({ ...values, reason: "Correção documentada" }).success,
    true,
  );
  assert.equal(
    policy.expenseFormSchema(false).safeParse({ ...values, paid_date: "" }).success,
    true,
  );
  assert.equal(
    policy.expenseFormSchema(false).safeParse({ ...values, paid_date: "2100-12-31" }).success,
    false,
  );
  assert.equal(policy.expenseFormInput({ ...values, paid_date: "" }).paid_date, null);
  assert.equal(policy.expenseFormInput(values).amount_cents, 12345);
});
test("pending request recovery retains initial data, strips unknown fields and corrupt data fails closed", () => {
  assert.deepEqual(
    policy.readExpenseCreation(JSON.stringify({ ...request, private_extra: "not-returned" })),
    { ready: true, request },
  );
  assert.deepEqual(
    policy.readExpenseCreation(
      JSON.stringify(policy.readExpenseCreation(JSON.stringify(request)).request),
    ),
    { ready: true, request },
  );
  assert.deepEqual(policy.readExpenseCreation(null), { ready: true, request: null });
  for (const raw of [
    "",
    "{}",
    "bad json",
    JSON.stringify({ ...request, request_key: "invalid" }),
    JSON.stringify({ ...request, amount_cents: 0 }),
  ])
    assert.deepEqual(policy.readExpenseCreation(raw), { ready: false, request: null });
  const key = policy.expenseStorageKey("admin-local");
  const loaded = { key, ready: true, request };
  assert.deepEqual(scopedExpenseRecovery(key, loaded), { ready: true, request });
  for (const other of [null, policy.expenseStorageKey("admin-other")])
    assert.deepEqual(scopedExpenseRecovery(other, loaded), { ready: false, request: null });
  assert.equal(policy.expenseStorageKey("invalid:actor"), null);
});
test("only a documented HTTP400 negative envelope releases rejected creation, never network/server/conflict errors", () => {
  const failure = (status, data) =>
    new AxiosError("private-message", undefined, undefined, undefined, { status, data });
  assert.equal(
    policy.expenseCreationWasRejected(
      failure(400, { success: false, code: "expense_invalid_input" }),
    ),
    true,
  );
  for (const cause of [
    new AxiosError("network"),
    new Error("unsafe"),
    failure(500, { success: false }),
    failure(409, { success: false }),
    failure(400, { success: true }),
    failure(400, null),
  ])
    assert.equal(policy.expenseCreationWasRejected(cause), false);
});
test("invalid URL filters never resolve as a valid unfiltered query", () => {
  assert.equal(policy.resolveExpenseQuery(new URLSearchParams()).valid, true);
  assert.equal(
    policy.resolveExpenseQuery(
      new URLSearchParams(
        "status=all&category=software&competence_from=2026-11-01&competence_to=2026-11-30&page=2&limit=8",
      ),
    ).query.page,
    2,
  );
  for (const raw of [
    "status=unexpected",
    "category=constructor",
    "competence_from=2026-11-30&competence_to=2026-11-01",
    "competence_from=bad",
    "limit=101",
    "page=-1",
    `search=${"x".repeat(121)}`,
  ])
    assert.equal(policy.resolveExpenseQuery(new URLSearchParams(raw)).valid, false, raw);
});
test("real RHF create/correction dialogs have stable slots, civil dates and no automatic payment or provider fields", () => {
  const common = { busy: false, onClose: neverMutate, onSubmit: neverMutate, categories };
  const create = render(ExpenseFormDialog, common);
  assert.match(create, /Registrar sem efetuar pagamento/);
  assert.match(create, /não paga contas, não cobra cartão e não emite nota/);
  assert.match(create, /adiantamentos são permitidos/);
  assert.match(create, /name="paid_date"/);
  assert.match(create, /min-h-5/);
  assert.doesNotMatch(create, /name="(?:supplier|provider|request_key|recurrence|card|secret)/);
  const correction = render(ExpenseFormDialog, { ...common, item });
  assert.match(correction, /revisão 7/);
  assert.match(correction, /Motivo da correção/);
  assert.match(correction, /Confirmar correção/);
});
test("real void dialog preserves audited data and requires reason without promising refund", () => {
  const html = render(ExpenseVoidDialog, {
    item,
    busy: false,
    onClose: neverMutate,
    onSubmit: neverMutate,
  });
  assert.match(html, /Motivo da anulação/);
  assert.match(html, /Não haverá estorno/);
  assert.match(html, /sem.*exclusão|exclusão de dados/);
  assert.match(html, /revisão 7/);
});
test("real summary names filtered manual totals, keeps unknown amounts unavailable and never computes profit", () => {
  const data = {
    totals: {
      available: true,
      recorded_cents: 12345,
      paid_cents: 12345,
      pending_cents: 0,
      voided_cents: 0,
      active_count: 1,
      paid_count: 1,
      pending_count: 0,
      voided_count: 0,
    },
    coverage: {
      source: "manual_local_records",
      complete: false,
      fees_available: false,
      profit_available: false,
      note: "Somente lançamentos manuais filtrados.",
    },
  };
  const html = render(ExpenseSummary, { data });
  assert.match(html, /123,45/);
  assert.match(html, /não apenas desta página/);
  assert.match(html, /competência, não a data do desembolso/);
  assert.match(html, /lucro líquido não apurados/);
  const unknown = render(ExpenseSummary, {
    data: { ...data, totals: { ...data.totals, available: false, recorded_cents: null } },
  });
  assert.match(unknown, /Indisponível/);
  assert.doesNotMatch(unknown, /123,45/);
});
test("real responsive table renders civil dates, escapes free text and does not offer edits on voided rows", () => {
  const props = { busy: false, onCorrect: neverMutate, onVoid: neverMutate };
  const active = render(ExpenseTable, {
    ...props,
    items: [{ ...item, description: "<script>unsafe</script>" }],
  });
  assert.match(active, /10\/11\/2026/);
  assert.match(active, /31\/10\/2026/);
  assert.match(active, /lg:hidden/);
  assert.match(active, /hidden overflow-x-auto lg:block/);
  assert.match(active, /&lt;script&gt;/);
  assert.doesNotMatch(active, /<script>|token|account_id/);
  const voided = render(ExpenseTable, {
    ...props,
    items: [{ ...item, status: "voided", void_reason: "Lançamento duplicado corrigido" }],
  });
  assert.match(voided, /Lançamento duplicado corrigido/);
  assert.doesNotMatch(voided, /<button/);
  assert.match(render(ExpenseTable, { ...props, items: [] }), /não comprova ausência de custos/);
});
test("real filter form uses competence dates, explicit apply/clear and controlled categories", () => {
  const html = render(ExpenseFilters, {
    query: {},
    categories,
    onApply: neverMutate,
    onClear: neverMutate,
  });
  assert.match(html, /name="competence_from"/);
  assert.match(html, /name="competence_to"/);
  assert.match(html, /maxLength="120"/i);
  assert.match(html, /Aplicar filtros/);
  assert.match(html, /Buscar descrição/);
  assert.doesNotMatch(html, /código local/);
  assert.match(html, /Anulados/);
  assert.doesNotMatch(html, /name="paid_date"/);
});

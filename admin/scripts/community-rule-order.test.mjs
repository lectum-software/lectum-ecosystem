import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { zodResolver } from "@hookform/resolvers/zod";
import { Children, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const base = new URL("../src/app/(admin)/comunidades/[slug]/", import.meta.url);
const urls = {
  controls: new URL("components/rule-order-controls.tsx", base),
  order: new URL("modules/rule-order.ts", base),
  forms: new URL("components/rule-forms.tsx", base),
  support: new URL("modules/detail-support.tsx", base),
  manager: new URL("components/rules-manager.tsx", base),
  textarea: new URL("../src/components/controllers/textarea.tsx", import.meta.url),
  utils: new URL("../src/lib/utils.ts", import.meta.url),
};
for (const key of Object.keys(urls)) urls[key] = pathToFileURL(fileURLToPath(urls[key]));
const sources = new Map(Object.values(urls).map((url) => [url.href, readFileSync(url, "utf8")]));
const parse = (url) =>
  ts.createSourceFile(
    url.pathname,
    sources.get(url.href),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
const declaration = (ast, name) =>
  ast.statements
    .filter(ts.isVariableStatement)
    .find((statement) =>
      statement.declarationList.declarations.some((item) => item.name.getText(ast) === name),
    );
const formAst = parse(urls.forms);
const formComponent = (name) =>
  declaration(formAst, name).declarationList.declarations[0].initializer;
const nodes = (root, predicate) => {
  const result = [];
  const visit = (node) => {
    if (predicate(node)) result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return result;
};
const compilerOptions = {
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
};
const require = createRequire(import.meta.url);

// Complete pure order/controls/controller modules, real React/RHF/Zod/Lucide.
// Only the original RuleEditForm and rule payload/schema declarations are isolated
// from their surrounding imports. RulesManager and API/auth/provider modules are
// never imported. No mocked hooks, DOM, clocks or network substitutes are used.
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliases = {
      "@/components/controllers": urls.textarea,
      "@/lib/utils": urls.utils,
      "../modules/detail-support": urls.support,
    };
    return nextResolve(aliases[specifier] ? fileURLToPath(aliases[specifier]) : specifier, context);
  },
  load(url, context, nextLoad) {
    if (!sources.has(url) || url === urls.manager.href) return nextLoad(url, context);
    let source = sources.get(url);
    if (url === urls.support.href) {
      const ast = parse(urls.support);
      source =
        'import { z } from "zod";\n' +
        ["ruleFormSchema", "deriveRuleTitle", "toRulePayload", "existingRulePayload"]
          .map((name) => declaration(ast, name).getText(ast))
          .join("\n");
    }
    if (url === urls.forms.href) {
      const allowed = [
        "react",
        "react-hook-form",
        "@hookform/resolvers/zod",
        "@/components/controllers",
        "../modules/detail-support",
      ];
      const imports = formAst.statements.filter(
        (node) => ts.isImportDeclaration(node) && allowed.includes(node.moduleSpecifier.text),
      );
      source = [...imports, declaration(formAst, "RuleEditForm")]
        .map((node) => node.getText(formAst))
        .join("\n");
    }
    const compiled = ts.transpileModule(source, {
      fileName: fileURLToPath(url),
      compilerOptions,
      reportDiagnostics: true,
    });
    assert.equal(compiled.diagnostics?.length ?? 0, 0);
    return { format: "commonjs", source: compiled.outputText, shortCircuit: true };
  },
});
let RuleOrderControls,
  RuleEditForm,
  planRuleMove,
  sortCommunityRules,
  acquireRuleOperation,
  settleRuleUpdates,
  payloads;
try {
  ({ RuleOrderControls } = require(fileURLToPath(urls.controls)));
  ({ RuleEditForm } = require(fileURLToPath(urls.forms)));
  ({ planRuleMove, sortCommunityRules, acquireRuleOperation, settleRuleUpdates } = require(
    fileURLToPath(urls.order),
  ));
  payloads = require(fileURLToPath(urls.support));
} finally {
  loader.deregister();
}
const { createFormControl } = require("react-hook-form");
const rule = (id, position, overrides = {}) => ({
  id,
  position,
  active: true,
  title: `Título ${id}`,
  description: `Regra local ${id}`,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});
const rules = [rule("a", 3), rule("b", 8, { active: false }), rule("c", 20)];
const buttons = (props) => Children.toArray(RuleOrderControls(props).props.children);
const deferred = () => Promise.withResolvers();
const expression = (node, scope) => {
  const { outputText } = ts.transpileModule(`return (${node.getText(formAst)});`, {
    compilerOptions,
  });
  return new Function("require", ...Object.keys(scope), outputText)(
    require,
    ...Object.values(scope),
  );
};
const submitExpression = (name) =>
  nodes(
    formComponent(name),
    (node) => ts.isJsxAttribute(node) && node.name.getText(formAst) === "onSubmit",
  )[0].initializer.expression;
const formOptions = (name, inputRule) => {
  const call = nodes(
    formComponent(name),
    (node) => ts.isCallExpression(node) && node.expression.getText(formAst) === "useForm",
  )[0];
  return expression(call.arguments[0], { rule: inputRule, zodResolver, ...payloads });
};

test("planejamento usa índice visual, normaliza posições esparsas sem mutar registros", () => {
  const before = structuredClone(rules);
  const plan = planRuleMove(rules, "c", 0);
  assert.deepEqual(
    plan.ordered.map((item) => item.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    plan.updates.map(({ rule, position }) => [rule.id, position]),
    [
      ["c", 0],
      ["a", 1],
      ["b", 2],
    ],
  );
  assert.deepEqual(rules, before);
  assert.equal(plan.ordered[0], rules[2]);
  assert.equal(plan.ordered[2].active, false);
  assert.deepEqual(
    planRuleMove(rules, "a", 2).ordered.map((item) => item.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    planRuleMove(rules, "b", 0).ordered.map((item) => item.id),
    ["b", "a", "c"],
  );
});

test("limites, lista vazia/unitária, ID ausente e no-op não geram plano", () => {
  for (const [list, id, index] of [
    [[], "a", 0],
    [[rules[0]], "a", 1],
    [rules, "x", 1],
    [rules, "b", 1],
    [rules, "a", -4],
    [rules, "c", 99],
    [rules, "a", Number.NaN],
    [rules, "a", 0.5],
  ]) {
    assert.equal(planRuleMove(list, id, index), null);
  }
});

test("apenas posições modificadas são gravadas em lista contígua", () => {
  const contiguous = rules.map((item, position) => ({ ...item, position }));
  assert.deepEqual(
    planRuleMove(contiguous, "a", 1).updates.map(({ rule }) => rule.id),
    ["b", "a"],
  );
});

test("payload real preserva título/conteúdo/ativo e fallback legado", () => {
  const plan = planRuleMove(rules, "b", 0);
  for (const { rule, position } of plan.updates) {
    assert.deepEqual(payloads.existingRulePayload(rule, position), {
      active: rule.active,
      description: rule.description,
      position,
      title: rule.title,
    });
  }
  assert.equal(
    payloads.existingRulePayload(rule("a", 9, { title: "  " }), 0).title,
    "Regra local a",
  );
});

test("leitura canônica desempata por data e ID, sem alterar entrada", () => {
  const input = [
    rule("b", 0),
    rule("a", 0),
    rule("c", 0, { created_at: "2025-12-01T00:00:00.000Z" }),
  ];
  assert.deepEqual(
    sortCommunityRules(input).map((item) => item.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    input.map((item) => item.id),
    ["b", "a", "c"],
  );
});

test("ref bloqueia reentrada síncrona e bloqueio externo sem adquirir", () => {
  const lock = { current: false };
  assert.equal(acquireRuleOperation(lock, true), false);
  assert.equal(lock.current, false);
  assert.equal(acquireRuleOperation(lock, false), true);
  assert.equal(acquireRuleOperation(lock, false), false);
  lock.current = false;
  assert.equal(acquireRuleOperation(lock, false), true);
});

test("allSettled aguarda a última Promise mesmo após falha, sem fail-fast", async () => {
  const first = deferred(),
    last = deferred();
  let complete = false;
  const result = settleRuleUpdates([first.promise, last.promise], (promise) => promise).then(
    (value) => {
      complete = true;
      return value;
    },
  );
  first.reject(new Error("falha local de teste"));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(complete, false);
  last.resolve("fim");
  assert.deepEqual(
    (await result).map((item) => item.status),
    ["rejected", "fulfilled"],
  );
});

test("throw síncrono não impede execução dos demais itens; vazio também conclui", async () => {
  const visited = [];
  const result = await settleRuleUpdates([0, 1, 2], (value) => {
    visited.push(value);
    if (value === 0) throw new Error("falha síncrona local");
    return Promise.resolve(value);
  });
  assert.deepEqual(visited, [0, 1, 2]);
  assert.deepEqual(
    result.map((item) => item.status),
    ["rejected", "fulfilled", "fulfilled"],
  );
  assert.deepEqual(await settleRuleUpdates([], () => assert.fail("lista vazia")), []);
});

test("controles reais: SSR nomes contextuais, botões nativos e alvo mínimo44", () => {
  const props = {
    index: 1,
    total: 3,
    disabled: false,
    onMove: () => assert.fail("SSR não aciona movimento"),
  };
  const html = renderToStaticMarkup(createElement(RuleOrderControls, props));
  assert.match(html, /aria-label="Subir regra 2"/);
  assert.match(html, /aria-label="Descer regra 2"/);
  for (const button of buttons(props)) {
    assert.equal(button.type, "button");
    assert.equal(button.props.type, "button");
    assert.match(button.props.className, /min-h-11 min-w-11/);
    assert.match(button.props.className, /focus-visible:/);
    assert.equal(button.props.tabIndex, undefined);
  }
});

test("controles: extremos, vazio/unitário e disabled bloqueiam callbacks inclusive diretos", () => {
  for (const [index, total, disabled, expected] of [
    [0, 3, false, [true, false]],
    [1, 3, false, [false, false]],
    [2, 3, false, [false, true]],
    [0, 1, false, [true, true]],
    [0, 0, false, [true, true]],
    [1, 3, true, [true, true]],
  ]) {
    const moved = [];
    const controls = buttons({ index, total, disabled, onMove: (target) => moved.push(target) });
    assert.deepEqual(
      controls.map((item) => item.props.disabled),
      expected,
    );
    controls.forEach((item) => {
      item.props.onClick();
    });
    assert.deepEqual(
      moved,
      [index - 1, index + 1].filter((_, offset) => !expected[offset]),
    );
  }
});

test("editar: SSR real mantém controller e bloqueia campo/cancelar/salvar", () => {
  for (const disabled of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(RuleEditForm, {
        disabled,
        rule: rules[0],
        onCancel: () => assert.fail("SSR"),
        onSubmit: () => assert.fail("SSR"),
      }),
    );
    assert.match(html, /<textarea/);
    assert.match(html, /Regra local a/);
    assert.equal((html.match(/disabled=""/g) ?? []).length, disabled ? 3 : 0);
    assert.match(html, /Texto da regra/);
  }
});

for (const name of ["RuleEditForm", "RuleCreateModal"]) {
  test(`${name}: handler original RHF aguarda submit real e mantém isSubmitting`, async (t) => {
    const form = createFormControl(formOptions(name, rules[0]));
    let submitting = false;
    t.after(
      form.subscribe({
        formState: { isSubmitting: true },
        callback: (state) => {
          submitting = state.isSubmitting;
        },
      }),
    );
    form.register("description");
    form.setValue("description", "Texto local válido");
    const completion = deferred(),
      entered = deferred();
    let closed = false;
    const submit = expression(submitExpression(name), {
      form,
      busy: false,
      nextPosition: 9,
      ...payloads,
      onClose: () => {
        closed = true;
      },
      onSubmit: async (value) => {
        entered.resolve(value);
        return completion.promise;
      },
    });
    const pending = submit();
    const value = await entered.promise;
    assert.equal(submitting, true);
    assert.equal(closed, false);
    assert.equal(value.description, "Texto local válido");
    if (name === "RuleCreateModal") assert.equal(value.position, 9);
    completion.resolve(name === "RuleCreateModal" ? true : undefined);
    await pending;
    assert.equal(submitting, false);
    assert.equal(closed, name === "RuleCreateModal");
  });
  test(`${name}: busy/validação inválida não chamam submit`, async () => {
    const form = createFormControl(formOptions(name, rules[0]));
    form.register("description");
    for (const [busy, value] of [
      [true, "Texto local válido"],
      [false, "x"],
    ]) {
      form.setValue("description", value);
      await expression(submitExpression(name), {
        form,
        busy,
        nextPosition: 9,
        ...payloads,
        onClose: () => assert.fail("não fechar"),
        onSubmit: () => assert.fail("não enviar"),
      })();
    }
  });
}

test("criação não confirmada mantém texto e não fecha o formulário", async (t) => {
  const form = createFormControl(formOptions("RuleCreateModal", rules[0]));
  t.after(form.subscribe({ formState: { values: true }, callback: () => {} }));
  form.register("description");
  form.setValue("description", "Texto mantido após falha");
  await expression(submitExpression("RuleCreateModal"), {
    form,
    busy: false,
    nextPosition: 9,
    ...payloads,
    onClose: () => assert.fail("não fechar sem criação confirmada"),
    onSubmit: async () => false,
  })();
  assert.equal(form.getValues("description"), "Texto mantido após falha");
});

test("edição rejeitada libera isSubmitting e mantém os valores RHF", async (t) => {
  const form = createFormControl(formOptions("RuleEditForm", rules[0]));
  let submitting = false;
  t.after(
    form.subscribe({
      formState: { isSubmitting: true },
      callback: (state) => {
        submitting = state.isSubmitting;
      },
    }),
  );
  form.register("description");
  form.setValue("description", "Texto mantido após falha");
  const submit = expression(submitExpression("RuleEditForm"), {
    form,
    busy: false,
    onSubmit: async () => {
      throw new Error("falha local");
    },
  });
  await assert.rejects(submit(), /falha local/);
  assert.equal(submitting, false);
  assert.equal(form.getValues("description"), "Texto mantido após falha");
});

test("contrato: lote/refetch/falha e bloqueios continuam na implementação real", () => {
  const source = sources.get(urls.manager.href);
  assert.match(source, /const orderedRules = optimisticRules \?\? sortedRules/);
  assert.match(source, /sortCommunityRules\(rules\)/);
  assert.doesNotMatch(source, /detailQuery.data\?\.rules/);
  assert.match(source, /await settleRuleUpdates\(plan.updates/);
  assert.match(source, /input: existingRulePayload\(rule, position\)/);
  assert.match(source, /detailQuery.refetch\(\{ throwOnError: true \}\)/);
  assert.ok(
    source.indexOf("await settleRuleUpdates") < source.lastIndexOf("await refreshSavedRules()"),
  );
  assert.match(source, /needsRefreshRef.current = true/);
  assert.match(source, /Atualizar regras/);
  assert.doesNotMatch(source, /setOptimisticRules\(sortedRules\)|ruleOrderPersistenceRef/);
  for (const name of ["createRule", "updateRule", "deleteRule", "reorderRules"]) {
    const ast = parse(urls.manager);
    const component = declaration(ast, "RulesManagerContent").declarationList.declarations[0]
      .initializer;
    const fn = nodes(
      component,
      (node) => ts.isVariableDeclaration(node) && node.name.getText(ast) === name,
    )[0];
    assert.match(fn.getText(ast), /beginOperation\(\)/);
    assert.match(fn.getText(ast), /finally\s*\{\s*endOperation\(\)/);
  }
});

test("contrato: foco one-shot condicionado à regra ainda focada; grupos mobile; forms protegidos", () => {
  const source = sources.get(urls.manager.href);
  assert.match(source, /card\?\.contains\(document.activeElement\)/);
  assert.match(source, /focusAfterMoveRef.current = null/);
  assert.match(source, /document.activeElement === request.previous/);
  assert.match(source, /request.card.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(source, /setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(
    source,
    /if \(ruleId\) preserveFocusedRule|refreshSavedRules\(sourceRuleId\)/,
  );
  assert.match(source, /data-rule-card="true"/);
  assert.match(source, /data-rule-id=\{rule.id\}/);
  assert.match(source, /flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap/);
  assert.match(source, /aria-live="polite"/);
  const forms = sources.get(urls.forms.href);
  assert.equal(
    (forms.match(/const busy = disabled \|\| form.formState.isSubmitting/g) ?? []).length,
    2,
  );
  assert.equal((forms.match(/disabled=\{busy\}/g) ?? []).length, 6);
  assert.match(forms, /closeEnabled: !busy/);
  assert.match(forms, /if \(!busy\) onCancel\(\)/);
  assert.match(forms, /if \(!busy\) onClose\(\)/);
});

test("limites: nenhuma fonte nova acima de700; nenhum módulo API/Manager foi carregado", () => {
  for (const key of ["manager", "forms", "order", "controls"])
    assert.ok(sources.get(urls[key].href).split("\n").length < 700, key);
  assert.ok(
    !Object.keys(require.cache).some(
      (path) => path.includes("/src/api/") || path.endsWith("/rules-manager.tsx"),
    ),
  );
});

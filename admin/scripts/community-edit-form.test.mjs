import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { zodResolver } from "@hookform/resolvers/zod";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { z } from "zod";

const formUrl = new URL(
  "../src/app/(admin)/comunidades/[slug]/components/community-edit-form.tsx",
  import.meta.url,
);
const supportUrl = new URL("../modules/detail-support.tsx", formUrl);
const baseline = process.argv.find((argument) => argument.startsWith("--baseline="))?.slice(11);
const source = readFileSync(baseline || formUrl, "utf8");
const supportSource = readFileSync(supportUrl, "utf8");
const parse = (name, text) =>
  ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const ast = parse(formUrl.pathname, source);
const supportAst = parse(supportUrl.pathname, supportSource);
const require = createRequire(import.meta.url);
// Match the real CJS entry used by the transpiled controllers: one RHF context.
const { createFormControl, FormProvider, useForm } = require("react-hook-form");
const inputUrl = new URL("../../../../../components/controllers/input.tsx", formUrl);
const textareaUrl = new URL("../../../../../components/controllers/textarea.tsx", formUrl);
const utilsUrl = new URL("../../../../../lib/utils.ts", formUrl);
// Complete real controller modules, resolving only their cn import. No barrels.
const controllerLoader = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "@/lib/utils" ? fileURLToPath(utilsUrl) : specifier, context);
  },
  load(url, context, nextLoad) {
    if (![inputUrl.href, textareaUrl.href, utilsUrl.href].includes(url))
      return nextLoad(url, context);
    const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      fileName: fileURLToPath(url),
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    });
    return { format: "commonjs", source: outputText, shortCircuit: true };
  },
});
let InputController;
let TextareaController;
try {
  ({ InputController } = require(fileURLToPath(inputUrl)));
  ({ TextareaController } = require(fileURLToPath(textareaUrl)));
} finally {
  controllerLoader.deregister();
}
const variable = (statements, name) =>
  statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((declaration) => declaration.name.getText() === name);
const component = variable(ast.statements, "CommunityEditForm").initializer;
const statements = component.body.statements;
const formOptions = variable(statements, "form").initializer.arguments[0];
const effect = statements.find(
  (statement) =>
    ts.isExpressionStatement(statement) &&
    ts.isCallExpression(statement.expression) &&
    statement.expression.expression.getText(ast) === "useEffect",
).expression;
const submit = variable(statements, "onSubmit").initializer;
const submitTry = submit.body.statements.find(ts.isTryStatement);
const findNodes = (root, predicate) => {
  const found = [];
  const visit = (node) => {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
};
const cancelButton = findNodes(
  component,
  (node) =>
    ts.isJsxElement(node) &&
    node.openingElement.tagName.getText(ast) === "button" &&
    node.children.some((child) => ts.isJsxText(child) && child.text.trim() === "Cancelar"),
)[0];
const cancelExpression = cancelButton.openingElement.attributes.properties.find(
  (attribute) => attribute.name?.getText(ast) === "onClick",
).initializer.expression;

// Execute original AST slices, not a reimplementation of the reset policy.
// No API-backed module, upload, auth/provider, mocked hook or DOM is loaded.
// Effect callbacks and post-await statements are dispatched explicitly: this
// tests real RHF transitions, NOT React effect scheduling or remote persistence.
const compile = (body, scope) => {
  const { outputText } = ts.transpileModule(body, {
    fileName: "isolated.tsx",
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  });
  return new Function("require", "exports", ...Object.keys(scope), outputText)(
    require,
    {},
    ...Object.values(scope),
  );
};
const readExpression = (node, scope) => compile(`return (${node.getText()});`, scope);
const mappingNames = [
  "hexColor",
  "colorSchema",
  "communityFormSchema",
  "colorValue",
  "nullableText",
  "nullableColor",
  "defaultCommunityValues",
  "toCommunityPayload",
];
const mappings = compile(
  `${mappingNames
    .map((name) => `const ${variable(supportAst.statements, name).getText(supportAst)};`)
    .join("\n")}\nreturn { communityFormSchema, defaultCommunityValues, toCommunityPayload };`,
  { z },
);
const subscriptionStatements = statements.filter(
  (statement) =>
    ts.isExpressionStatement(statement) &&
    ts.isVoidExpression(statement.expression) &&
    /^form\.formState\.(dirtyFields|isDirty)$/.test(statement.expression.expression.getText(ast)),
);
const savedStatements = submitTry.tryBlock.statements.filter(
  (statement) =>
    findNodes(
      statement,
      (node) => ts.isCallExpression(node) && node.expression.getText(ast) === "form.reset",
    ).length || statement.getText(ast) === "onDone();",
);
const optionsFor = (community) =>
  readExpression(formOptions, { community, zodResolver, ...mappings });
const identity = (overrides = {}) => ({
  id: "local-a",
  name: "Comunidade local",
  description: "Descrição local",
  visual_primary_color: "#123456",
  avatar_url: null,
  ...overrides,
});
const fields = ["name", "description", "visual_primary_color"];

const setup = (t, community = identity()) => {
  const options = optionsFor(community);
  const form = createFormControl(options);
  const communityIdRef = { current: community.id };
  let state;
  const unsubscribe = form.subscribe({
    formState: { values: true, dirtyFields: true, isDirty: true, isSubmitting: true, errors: true },
    callback: (next) => {
      state = next;
    },
  });
  t.after(unsubscribe);
  // Real controls register again after reset, as controllers do on rerender.
  // This is headless registration, not a replacement DOM/controller.
  const register = () => {
    for (const field of fields) form.register(field);
  };
  form.reset(options.defaultValues);
  register();
  return {
    form,
    state: () => structuredClone(state),
    edit: (name, value) => form.setValue(name, value, { shouldDirty: true, shouldTouch: true }),
    refresh(next) {
      readExpression(effect.arguments[0], { form, community: next, communityIdRef, ...mappings })();
      register();
    },
    cancel(onDone = () => undefined, isSaving = false) {
      readExpression(cancelExpression, { form, onDone, isSaving })();
      register();
    },
    saved(updatedCommunity, onDone = () => undefined) {
      compile(savedStatements.map((statement) => statement.getText(ast)).join("\n"), {
        form,
        communityIdRef,
        updatedCommunity,
        onDone,
        ...mappings,
      });
      register();
    },
  };
};
const clean = (scenario, expected) => {
  const defaults = mappings.defaultCommunityValues(expected);
  assert.deepEqual(scenario.form.getValues(), defaults);
  assert.deepEqual(scenario.state().defaultValues, defaults);
  assert.deepEqual(scenario.state().dirtyFields, {});
  assert.equal(scenario.state().isDirty, false);
};

test("SSR real: useForm assina dirtyFields/isDirty sem retenção global de reset", () => {
  let form;
  function Scenario() {
    form = useForm(optionsFor(identity()));
    compile(subscriptionStatements.map((statement) => statement.getText(ast)).join("\n"), { form });
    return createElement("output", null, form.getValues("name"));
  }
  assert.match(renderToStaticMarkup(createElement(Scenario)), /Comunidade local/);
  assert.ok(form.control._proxyFormState.dirtyFields);
  assert.ok(form.control._proxyFormState.isDirty);
  assert.equal(optionsFor(identity()).resetOptions?.keepDirtyValues, undefined);
});

test("refetch independente preserva cada campo dirty, isDirty e defaults persistidos", (t) => {
  for (const [field, draft] of [
    ["name", "Nome em edição"],
    ["description", "Descrição em edição"],
    ["visual_primary_color", "#ABCDEF"],
  ]) {
    const scenario = setup(t);
    scenario.edit(field, draft);
    scenario.refresh(identity({ avatar_url: "avatar-local-alterado" }));
    assert.equal(scenario.form.getValues(field), draft);
    assert.deepEqual(scenario.state().dirtyFields, { [field]: true });
    assert.equal(scenario.state().isDirty, true);
    assert.deepEqual(scenario.state().defaultValues, mappings.defaultCommunityValues(identity()));
  }
});

test("refetch não repõe descrição/cor deliberadamente esvaziadas no rascunho", (t) => {
  const scenario = setup(t);
  scenario.edit("description", "");
  scenario.edit("visual_primary_color", "");
  scenario.refresh(identity({ name: "Nome persistido novo" }));
  assert.deepEqual(scenario.form.getValues(), {
    name: "Nome persistido novo",
    description: "",
    visual_primary_color: "",
  });
  assert.deepEqual(scenario.state().dirtyFields, { description: true, visual_primary_color: true });
  assert.equal(scenario.state().isDirty, true);
});

test("refetch atualiza campos limpos/defaults; Cancelar noop descarta para esses defaults", (t) => {
  const scenario = setup(t);
  const persisted = identity({ description: "Descrição persistida nova", name: "Nome persistido" });
  scenario.edit("name", "Nome em edição");
  scenario.refresh(persisted);
  assert.equal(scenario.form.getValues("name"), "Nome em edição");
  assert.equal(scenario.form.getValues("description"), persisted.description);
  assert.deepEqual(scenario.state().defaultValues, mappings.defaultCommunityValues(persisted));
  scenario.cancel();
  clean(scenario, persisted);
});

test("sem rascunho, refetch adota valores persistidos e permanece clean", (t) => {
  const scenario = setup(t);
  const persisted = identity({ name: "Novo nome", description: null, visual_primary_color: null });
  scenario.refresh(persisted);
  clean(scenario, persisted);
});

test("Cancelar limpa edição/erro e chama onDone depois do reset completo", (t) => {
  const scenario = setup(t);
  scenario.edit("name", "Rascunho");
  scenario.form.setError("name", { type: "manual", message: "Revise o campo." });
  let calls = 0;
  scenario.cancel(() => {
    calls++;
    clean(scenario, identity());
    assert.deepEqual(scenario.state().errors, {});
  });
  assert.equal(calls, 1);
});

test("save após refetch da invalidação aceita normalizado e limpa dirty/defaults", (t) => {
  const scenario = setup(t);
  scenario.edit("name", "  Nome salvo  ");
  scenario.edit("description", "  ");
  scenario.edit("visual_primary_color", "#abcdef");
  const payload = mappings.toCommunityPayload(
    mappings.communityFormSchema.parse(scenario.form.getValues()),
  );
  assert.deepEqual(payload, {
    name: "Nome salvo",
    description: null,
    visual_primary_color: "#ABCDEF",
  });
  // Local transition inputs, not an API response/mock. No request is performed.
  const persisted = identity(payload);
  scenario.refresh(persisted);
  assert.equal(scenario.state().isDirty, true);
  let calls = 0;
  scenario.saved(persisted, () => {
    calls++;
    clean(scenario, persisted);
  });
  assert.equal(calls, 1);
});

test("save estabelece defaults próprios mesmo sem nova prop; Cancelar usa a baseline salva", (t) => {
  const scenario = setup(t);
  scenario.edit("name", "Primeiro rascunho");
  const persisted = identity({ name: "Nome confirmado", description: null });
  scenario.saved(persisted);
  clean(scenario, persisted);
  scenario.edit("name", "Segundo rascunho");
  scenario.cancel();
  clean(scenario, persisted);
});

test("refetch após save não restaura dirty; edição posterior continua protegida", (t) => {
  const scenario = setup(t);
  const persisted = identity({ name: "Nome confirmado" });
  scenario.edit("name", "Nome confirmado");
  scenario.saved(persisted);
  scenario.refresh({ ...persisted });
  clean(scenario, persisted);
  scenario.edit("description", "Novo rascunho");
  scenario.refresh({ ...persisted });
  assert.equal(scenario.form.getValues("description"), "Novo rascunho");
  assert.deepEqual(scenario.state().dirtyFields, { description: true });
  assert.equal(scenario.state().isDirty, true);
  scenario.cancel();
  clean(scenario, persisted);
});

test("troca de identidade descarta draft anterior e ignora reset de save antigo", (t) => {
  const scenario = setup(t);
  scenario.edit("name", "Rascunho anterior");
  const next = identity({ id: "local-b", name: "Outra comunidade" });
  scenario.refresh(next);
  clean(scenario, next);
  scenario.edit("description", "Rascunho da outra comunidade");
  scenario.saved(identity({ name: "Save antigo confirmado" }));
  assert.equal(scenario.form.getValues("name"), next.name);
  assert.equal(scenario.form.getValues("description"), "Rascunho da outra comunidade");
  assert.deepEqual(scenario.state().dirtyFields, { description: true });
  assert.equal(scenario.state().isDirty, true);
});

test("RHF/Zod reais: submissão inválida conserva draft; Cancelar limpa erros e dirty", async (t) => {
  const scenario = setup(t);
  scenario.edit("name", "x");
  await scenario.form.handleSubmit(() => assert.fail("não deve aceitar nome inválido"))();
  assert.equal(scenario.form.getValues("name"), "x");
  assert.equal(scenario.state().isDirty, true);
  assert.ok(scenario.state().dirtyFields.name);
  assert.ok(scenario.state().errors.name);
  scenario.cancel();
  clean(scenario, identity());
  assert.deepEqual(scenario.state().errors, {});
});

test("wiring estático: save aguarda mutation, reset antes de onDone; catch não descarta draft", () => {
  const success = submitTry.tryBlock.statements.map((statement) => statement.getText(ast));
  assert.match(
    success[0],
    /const updatedCommunity = await updateMutation\.mutateAsync\(toCommunityPayload\(values\)\)/,
  );
  assert.match(success[1], /form\.reset\(defaultCommunityValues\(updatedCommunity\)\)/);
  assert.match(success[2], /toast\.success/);
  assert.equal(success[3], "onDone();");
  assert.match(submitTry.catchClause.getText(ast), /toast\.error\(resolveApiError\(error\)\)/);
  assert.doesNotMatch(submitTry.catchClause.getText(ast), /reset\(|onDone\(/);
  assert.equal(effect.arguments[1].getText(ast), "[community, form]");
  assert.match(source, /const communityIdRef = useRef\(community\.id\)/);
  assert.match(
    source,
    /onSubmit=\{\(event\) => \{\s*void form\.handleSubmit\(onSubmit\)\(event\);\s*\}\}/,
  );
  assert.match(source, /<FormProvider \{\.\.\.form\}>/);
  for (const field of fields) assert.ok(source.includes(`name="${field}"`));
  assert.match(source, /disabled=\{isSaving\}/);
  // Request rejection is covered by this wiring check only, not a fake API failure.
});

test("pending: controllers reais recebem disabled sem apagar os valores do payload RHF", async () => {
  const controllers = findNodes(
    component,
    (node) =>
      ts.isJsxSelfClosingElement(node) &&
      ["InputController", "TextareaController"].includes(node.tagName.getText(ast)),
  );
  assert.equal(controllers.length, 3);
  const jsx = `<>${controllers.map((node) => node.getText(ast)).join("\n")}${cancelButton.getText(ast)}</>`;
  for (const isSaving of [false, true]) {
    let form;
    function Scenario() {
      form = useForm(optionsFor(identity()));
      const contents = compile(`return (${jsx});`, {
        InputController,
        TextareaController,
        isSaving,
        form,
        onDone: () => undefined,
      });
      return createElement(FormProvider, form, contents);
    }
    const html = renderToStaticMarkup(createElement(Scenario));
    const controls = html.match(/<(?:input|textarea|button)\b[^>]*>/g);
    assert.equal(controls.length, 4);
    for (const control of controls) assert.equal(control.includes('disabled=""'), isSaving);
    assert.equal(optionsFor(identity()).disabled, undefined);
    let payload;
    await form.handleSubmit((values) => {
      payload = mappings.toCommunityPayload(values);
    })();
    assert.deepEqual(
      payload,
      mappings.toCommunityPayload(mappings.defaultCommunityValues(identity())),
    );
  }
});

test("submit RHF real mantém pending até handler local terminar, bloqueia Cancelar e preserva erro/draft", async (t) => {
  const scenario = setup(t);
  scenario.edit("name", "Nome em edição");
  const entered = Promise.withResolvers();
  const finish = Promise.withResolvers();
  let submitted;
  // A local async submit handler, not an API/mutation stub or a remote-failure claim.
  const submitting = scenario.form.handleSubmit(async (values) => {
    submitted = mappings.toCommunityPayload(values);
    entered.resolve();
    await finish.promise;
    scenario.form.setError("root", { type: "manual", message: "Revise os dados." });
  })();
  await entered.promise;
  assert.equal(scenario.state().isSubmitting, true);
  scenario.cancel(() => assert.fail("Cancelar pendente não deve chamar onDone"), true);
  assert.equal(scenario.form.getValues("name"), "Nome em edição");
  assert.deepEqual(submitted, {
    name: "Nome em edição",
    description: "Descrição local",
    visual_primary_color: "#123456",
  });
  finish.resolve();
  await submitting;
  assert.equal(scenario.state().isSubmitting, false);
  assert.equal(scenario.state().isDirty, true);
  assert.deepEqual(scenario.state().dirtyFields, { name: true });
  assert.equal(scenario.form.getValues("name"), "Nome em edição");
  assert.ok(scenario.state().errors.root);
  scenario.cancel();
  clean(scenario, identity());
});

test("wiring pending: só submit/mutation de dados bloqueiam edição, não avatar/refetch", () => {
  assert.equal(
    variable(statements, "isSaving")?.initializer.getText(ast),
    "form.formState.isSubmitting || updateMutation.isPending",
  );
  assert.match(source, /disabled=\{avatarMutation\.isPending\}/);
  assert.doesNotMatch(formOptions.getText(ast), /disabled\s*:/);
  assert.equal((source.match(/disabled=\{isSaving\}/g) ?? []).length, 5);
});

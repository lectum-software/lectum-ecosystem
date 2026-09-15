import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Children, createElement, isValidElement, useReducer } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const routes = [
  {
    name: "pacientes",
    component: "./search-box.tsx",
    client: "./client.tsx",
    label: "Buscar por nome ou e-mail",
  },
  {
    name: "psicologos",
    component: "../../psicologos/lista/components/search-box.tsx",
    client: "../../psicologos/lista/client.tsx",
    label: "Buscar por nome, e-mail ou CRP",
  },
];
const hookUrl = new URL("../../../../hooks/use-debounced-search.ts", import.meta.url);
const sourceUrls = new Set([
  hookUrl.href,
  ...routes.map(({ component }) => new URL(component, import.meta.url).href),
]);
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === "@/hooks/use-debounced-search" ? fileURLToPath(hookUrl) : specifier,
      context,
    );
  },
  load(url, context, nextLoad) {
    if (!sourceUrls.has(url)) return nextLoad(url, context);
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
const require = createRequire(import.meta.url);
for (const route of routes)
  route.module = require(fileURLToPath(new URL(route.component, import.meta.url)));
const policy = require(fileURLToPath(hookUrl));
loader.deregister();

const findInput = (node) => {
  if (!isValidElement(node)) return undefined;
  if (node.type === "input") return node;
  return Children.toArray(node.props.children).map(findInput).find(Boolean);
};

// Execute the complete real component inside a React SSR render-phase scenario.
// React owns every hook/state update. No DOM, API, router or hooks are substituted.
// This tests handlers/state/markup, NOT browser focus or mounted effects.
const renderScenario = (Component, initialValue, steps) => {
  let value = initialValue;
  let step = 0;
  function Scenario() {
    const [, rerender] = useReducer((revision) => revision + 1, 0);
    const element = Component({ value, onSearch: () => assert.fail("SSR must not send searches") });
    const input = findInput(element);
    assert.ok(input);
    if (step < steps.length) {
      steps[step++](input, (next) => {
        value = next;
      });
      rerender();
    }
    return element;
  }
  return renderToStaticMarkup(createElement(Scenario));
};

for (const route of routes) {
  test(`${route.name}: SSR mantém input nativo, rótulo e largura`, () => {
    const html = renderToStaticMarkup(
      createElement(route.module.SearchBox, {
        value: "busca",
        onSearch: () => assert.fail("no request"),
      }),
    );
    assert.match(html, /type="search"/);
    assert.match(html, /value="busca"/);
    assert.ok(html.includes(route.label));
    assert.match(html, /w-full/);
    assert.doesNotMatch(html, /autofocus|tabindex="-1"/);
  });

  test(`${route.name}: handler altera draft imediatamente sem disparar busca no SSR`, () => {
    const html = renderScenario(route.module.SearchBox, "", [
      (input) => input.props.onChange({ target: { value: "  busca local  " } }),
      (input) => assert.equal(input.props.value, "  busca local  "),
    ]);
    assert.ok(html.includes('value="  busca local  "'));
  });

  test(`${route.name}: nova URL, voltar e avançar não ressuscitam draft antigo`, () => {
    renderScenario(route.module.SearchBox, "primeira", [
      (input) => input.props.onChange({ target: { value: "rascunho pendente" } }),
      (_, setUrl) => setUrl("segunda"),
      (input, setUrl) => {
        assert.equal(input.props.value, "segunda");
        setUrl("primeira");
      },
      (input, setUrl) => {
        assert.equal(input.props.value, "primeira");
        setUrl("segunda");
      },
      (input, setUrl) => {
        assert.equal(input.props.value, "segunda");
        setUrl(undefined);
      },
      (input) => assert.equal(input.props.value, ""),
    ]);
  });

  test(`${route.name}: wiring não remonta SearchBox ao mudar query.q`, () => {
    const source = readFileSync(new URL(route.client, import.meta.url), "utf8");
    const ast = ts.createSourceFile(
      route.client,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const boxes = [];
    const visit = (node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "SearchBox")
        boxes.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.equal(boxes.length, 1);
    assert.equal(
      boxes[0].attributes.properties.some((property) => property.name?.getText(ast) === "key"),
      false,
    );
    assert.match(boxes[0].getText(ast), /value=\{query\.q\}/);
    assert.match(boxes[0].getText(ast), /replaceParams\(\{ q: value \|\| null \}\)/);
    assert.match(source, /params\.delete\("page"\)/);
    assert.match(
      source,
      /router\.replace\(next \? `\$\{pathname\}\?\$\{next\}` : pathname, \{ scroll: false \}\)/,
    );
  });
}

// Shared production policy is tested once, not duplicated for each wrapper.
{
  const { createSearchState, reduceSearchState, scheduleSearchDraft } = policy;
  const edit = (state, value) => reduceSearchState(state, { type: "edit", value });
  const request = (state, value) => reduceSearchState(state, { type: "request", value });
  const url = (state, value) => reduceSearchState(state, { type: "url", value });

  test(`política compartilhada: echo próprio preserva digitação posterior e espaços`, () => {
    const pending = request(edit(createSearchState(""), "primeira"), "primeira");
    const acknowledged = url(edit(pending, "  primeira ampliada  "), "primeira");
    assert.deepEqual(acknowledged, {
      draft: "  primeira ampliada  ",
      urlValue: "primeira",
      pending: [],
    });
    assert.deepEqual(url(acknowledged, "externa"), createSearchState("externa"));
  });

  test(`política compartilhada: respostas sucessivas e coalescidas não apagam draft`, () => {
    let state = request(createSearchState("inicial"), "a");
    state = request(edit(state, "b"), "b");
    state = edit(state, "c");
    const firstEcho = url(state, "a");
    assert.equal(firstEcho.draft, "c");
    assert.deepEqual(firstEcho.pending, ["b"]);
    assert.deepEqual(url(firstEcho, "b"), { draft: "c", urlValue: "b", pending: [] });
    assert.deepEqual(url(state, "b"), { draft: "c", urlValue: "b", pending: [] });
    assert.deepEqual(url(request(state, "a"), "a"), { draft: "c", urlValue: "a", pending: [] });
  });

  test(`política compartilhada: histórico descarta pendência mesmo quando q não muda`, () => {
    const state = request(edit(createSearchState("aplicada"), "rascunho"), "rascunho");
    const reset = reduceSearchState(state, { type: "history" });
    assert.deepEqual(reset, createSearchState("aplicada"));
    // A history destination matching an earlier own request is still external.
    assert.deepEqual(url(reset, "rascunho"), createSearchState("rascunho"));
    assert.deepEqual(url(url(reset, "anterior"), "aplicada"), createSearchState("aplicada"));
  });

  test(`política compartilhada: debounce nativo aguarda 350ms e normaliza`, {
    timeout: 2000,
  }, async () => {
    const received = [];
    const start = performance.now();
    await new Promise((resolve) => {
      scheduleSearchDraft(edit(createSearchState(""), "  consulta  "), (value) => {
        received.push(value);
        resolve();
      });
      assert.deepEqual(received, []);
    });
    assert.ok(performance.now() - start >= 330, "debounce não deve enviar imediatamente");
    assert.deepEqual(received, ["consulta"]);
  });

  test(`política compartilhada: cancelamento nativo descarta timer antigo e só envia último draft`, {
    timeout: 2000,
  }, async () => {
    const received = [];
    const cancel = scheduleSearchDraft(edit(createSearchState(""), "antiga"), (value) =>
      received.push(value),
    );
    cancel();
    cancel();
    await new Promise((resolve) =>
      scheduleSearchDraft(edit(createSearchState(""), "nova"), (value) => {
        received.push(value);
        resolve();
      }),
    );
    assert.deepEqual(received, ["nova"]);
  });

  test(`política compartilhada: normalizado igual não envia e limpar emite string vazia`, {
    timeout: 2000,
  }, async () => {
    const received = [];
    scheduleSearchDraft(edit(createSearchState("aplicada"), " aplicada "), (value) =>
      received.push(value),
    );
    const pending = request(edit(createSearchState("antiga"), "enviada"), "enviada");
    scheduleSearchDraft(pending, (value) => received.push(value));
    await new Promise((resolve) =>
      scheduleSearchDraft(edit(createSearchState("aplicada"), "  "), (value) => {
        received.push(value);
        resolve();
      }),
    );
    assert.deepEqual(received, [""]);
  });

  test(`política compartilhada: voltar a digitar valor aplicado ainda envia se há busca em voo`, {
    timeout: 2000,
  }, async () => {
    const pending = request(createSearchState("aplicada"), "enviada");
    const result = await new Promise((resolve) => scheduleSearchDraft(pending, resolve));
    assert.equal(result, "aplicada");
  });

  test("política compartilhada: wiring do hook mantém callback atual, timer e histórico", () => {
    const source = readFileSync(hookUrl, "utf8");
    const ast = ts.createSourceFile(
      hookUrl.pathname,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const effects = [];
    const visit = (node) => {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect")
        effects.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    const effectWith = (pattern) => {
      const matches = effects.filter((effect) => pattern.test(effect.arguments[0].getText(ast)));
      assert.equal(matches.length, 1);
      return matches[0];
    };
    const callback = effectWith(/onSearchRef\.current = onSearch/);
    assert.equal(callback.arguments[1].getText(ast), "[onSearch]");
    const history = effectWith(/addEventListener\("popstate", handleHistory\)/);
    assert.match(
      history.getText(ast),
      /cancelRef\.current\(\);[\s\S]*dispatch\(\{ type: "history" \}\)/,
    );
    assert.match(
      history.getText(ast),
      /return \(\) => window\.removeEventListener\("popstate", handleHistory\)/,
    );
    assert.equal(history.arguments[1].getText(ast), "[]");
    const timer = effectWith(/scheduleSearchDraft\(/);
    assert.match(timer.getText(ast), /dispatch\(\{ type: "request", value: query \}\)/);
    assert.match(timer.getText(ast), /onSearchRef\.current\(query\)/);
    assert.match(timer.getText(ast), /cancelRef\.current = cancel;\s*return cancel/);
    assert.equal(timer.arguments[1].getText(ast), "[draft, urlValue, pending]");
    assert.match(source, /useReducer\(\s*reduceSearchState,/);
    assert.match(source, /if \(nextDraft !== draft\) cancelRef\.current\(\)/);
    assert.doesNotMatch(source, /\.focus\(|location\./);
  });
}

test("ambos wrappers usam uma única política compartilhada, sem estado ou timers locais", () => {
  for (const route of routes) {
    const source = readFileSync(new URL(route.component, import.meta.url), "utf8");
    const ast = ts.createSourceFile(
      route.component,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const imports = ast.statements.filter(ts.isImportDeclaration);
    assert.equal(
      imports.filter((entry) => entry.moduleSpecifier.text === "@/hooks/use-debounced-search")
        .length,
      1,
    );
    assert.match(
      source,
      /const \{ draft, onDraftChange \} = useDebouncedSearch\(\{ onSearch, value \}\)/,
    );
    assert.match(source, /onChange=\{\(event\) => onDraftChange\(event\.target\.value\)\}/);
    assert.match(source, /value=\{draft\}/);
    assert.doesNotMatch(
      source,
      /useEffect|useState|useReducer|useRef|setTimeout|popstate|reduceSearchState|scheduleSearchDraft|\.focus\(|autoFocus|key=/,
    );
  }
});

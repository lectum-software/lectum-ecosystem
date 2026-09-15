import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Children, createElement, isValidElement, useReducer } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const professionalUrl = new URL("../profile/professional.tsx", import.meta.url);
const publicationsUrl = new URL("./index.tsx", import.meta.url);
const utilsUrl = new URL("../../../../../../../lib/utils.ts", import.meta.url);
const sources = new Map(
  [professionalUrl, publicationsUrl].map((url) => [url.href, readFileSync(url, "utf8")]),
);
const parse = (url) =>
  ts.createSourceFile(
    url.pathname,
    sources.get(url.href),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
const declarations = new Map([
  [professionalUrl.href, ["toggleSelectedValue", "AdminProfessionalTagField"]],
  [publicationsUrl.href, ["PublicationsPagination"]],
]);

// Compile original declarations verbatim, not the surrounding API-backed tab/form.
// Only real React, Lucide and cn imports are retained. No API/auth/provider, DOM
// or hook substitutes are loaded. This is isolated SSR, not an integration test.
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "@/lib/utils" ? fileURLToPath(utilsUrl) : specifier, context);
  },
  load(url, context, nextLoad) {
    if (!declarations.has(url) && url !== utilsUrl.href) return nextLoad(url, context);
    let source;
    if (declarations.has(url)) {
      const ast = parse(new URL(url));
      const names = declarations.get(url);
      const selected = ast.statements.filter(
        (node) =>
          ts.isVariableStatement(node) &&
          node.declarationList.declarations.some((declaration) =>
            names.includes(declaration.name.getText(ast)),
          ),
      );
      assert.equal(selected.length, names.length);
      const imports = ast.statements.filter(
        (node) =>
          ts.isImportDeclaration(node) &&
          ["react", "lucide-react", "@/lib/utils"].includes(node.moduleSpecifier.text),
      );
      source = [...imports, ...selected].map((node) => node.getText(ast)).join("\n");
      if (url === professionalUrl.href) source += "\nexport { AdminProfessionalTagField };";
    } else {
      source = readFileSync(new URL(url), "utf8");
    }
    const { outputText } = ts.transpileModule(source, {
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
let AdminProfessionalTagField;
let PublicationsPagination;
try {
  ({ AdminProfessionalTagField } = require(fileURLToPath(professionalUrl)));
  ({ PublicationsPagination } = require(fileURLToPath(publicationsUrl)));
} finally {
  loader.deregister();
}

const findAll = (node, predicate) => {
  if (!isValidElement(node)) return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...Children.toArray(node.props.children).flatMap((child) => findAll(child, predicate)),
  ];
};
const buttons = (node) => findAll(node, (child) => child.type === "button");
const expander = (node) => buttons(node).find((button) => "aria-expanded" in button.props);
const tagProps = {
  label: "Especialidades",
  options: [
    { label: "Opção A", value: "a" },
    { label: "Opção B", value: "b" },
  ],
  placeholder: "Selecione as opções",
  selected: [],
  onChange: () => assert.fail("sem mudança de seleção esperada"),
};

// React owns useState/useMemo throughout the render-phase scenario. Calling the
// actual handlers requests real React rerenders; no mounted effects/native click
// suppression, browser accessible-name computation or keyboard behavior is claimed.
const renderTagScenario = (initialProps, steps) => {
  let props = { ...tagProps, ...initialProps };
  let step = 0;
  function Scenario() {
    const [, rerender] = useReducer((revision) => revision + 1, 0);
    const element = AdminProfessionalTagField(props);
    if (step < steps.length) {
      steps[step++](element, (next) => {
        props = { ...props, ...next };
      });
      rerender();
    }
    return element;
  }
  return renderToStaticMarkup(createElement(Scenario));
};

test("expansores: SSR nomeia ambos os campos, vazios, selecionados e disabled", () => {
  for (const label of ["Especialidades", "Abordagens"]) {
    for (const disabled of [false, true]) {
      for (const selected of [[], ["a"]]) {
        const html = renderToStaticMarkup(
          createElement(AdminProfessionalTagField, {
            ...tagProps,
            label,
            disabled,
            selected,
          }),
        );
        assert.ok(html.includes(`aria-label="${label}"`));
        assert.match(html, /aria-expanded="false"/);
        assert.doesNotMatch(html, /tabindex="-1"|autofocus/);
      }
    }
  }
});

test("expansor: handler abre/fecha, nome estável e opções acompanham aria-expanded", () => {
  renderTagScenario({}, [
    (node) => {
      assert.equal(expander(node).props["aria-expanded"], false);
      expander(node).props.onClick();
    },
    (node) => {
      assert.equal(expander(node).props["aria-label"], "Especialidades");
      assert.equal(expander(node).props["aria-expanded"], true);
      assert.equal(buttons(node).length, 3);
      expander(node).props.onClick();
    },
    (node) => {
      assert.equal(expander(node).props["aria-expanded"], false);
      assert.equal(buttons(node).length, 1);
    },
  ]);
});

test("expansor aberto depois disabled reporta painel recolhido sem mudar seu estado", () => {
  const html = renderTagScenario({}, [
    (node) => expander(node).props.onClick(),
    (_, updateProps) => updateProps({ disabled: true }),
    (node) => {
      assert.equal(expander(node).props.disabled, true);
      assert.equal(expander(node).props["aria-expanded"], false);
      assert.equal(buttons(node).length, 1);
    },
  ]);
  assert.match(html, /aria-expanded="false"[^>]*disabled=""/);
});

test("expansor: selecionar/remover conserva valores e callbacks locais", () => {
  const changes = [];
  let stopped = false;
  renderTagScenario({ onChange: (values) => changes.push(values) }, [
    (node) => expander(node).props.onClick(),
    (node, updateProps) => {
      buttons(node)[1].props.onClick();
      assert.deepEqual(changes, [["a"]]);
      updateProps({ selected: changes[0] });
    },
    (node) => {
      const remove = buttons(node).find(
        (button) => button.props["aria-label"] === "Remover Opção A",
      );
      remove.props.onClick({
        stopPropagation() {
          stopped = true;
        },
      });
      assert.equal(stopped, true);
      assert.deepEqual(changes, [["a"], []]);
    },
  ]);
});

test("paginação: SSR nomeia setas/páginas e marca somente a página atual", () => {
  for (const [page, pages] of [
    [1, 1],
    [1, 8],
    [4, 8],
    [8, 8],
  ]) {
    const props = { page, pages, setPage: () => assert.fail("SSR sem navegação") };
    const html = renderToStaticMarkup(createElement(PublicationsPagination, props));
    assert.match(html, /<span class="sr-only">Página anterior<\/span>/);
    assert.match(html, /<span class="sr-only">Próxima página<\/span>/);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    const controls = buttons(PublicationsPagination(props));
    assert.equal(controls[0].props.disabled, page <= 1);
    assert.equal(controls.at(-1).props.disabled, page >= pages);
    for (const button of controls.slice(1, -1)) {
      const number = button.props.children;
      assert.equal(button.props["aria-label"], `Página ${number}`);
      assert.equal(button.props["aria-current"], number === page ? "page" : undefined);
    }
  }
});

test("paginação: callbacks e janela de cinco páginas permanecem locais e inalterados", () => {
  const changes = [];
  const controls = buttons(
    PublicationsPagination({ page: 4, pages: 8, setPage: (value) => changes.push(value) }),
  );
  assert.deepEqual(
    controls.slice(1, -1).map((button) => button.props.children),
    [2, 3, 4, 5, 6],
  );
  controls[0].props.onClick();
  controls.at(-1).props.onClick();
  controls[1].props.onClick();
  assert.deepEqual(changes, [3, 5, 2]);
  const empty = buttons(
    PublicationsPagination({ page: 1, pages: 0, setPage: () => assert.fail("sem clique") }),
  );
  assert.equal(empty.length, 2);
  assert.ok(empty.every((button) => button.props.disabled));
});

test("wiring estático mantém os dois campos RHF e a paginação na view original", () => {
  const components = (url, name) => {
    const ast = parse(url);
    const matches = [];
    const visit = (node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === name)
        matches.push(node.getText(ast));
      ts.forEachChild(node, visit);
    };
    visit(ast);
    return matches;
  };
  const fields = components(professionalUrl, "AdminProfessionalTagField");
  assert.equal(fields.length, 2);
  for (const [label, field] of [
    ["Especialidades", "specialty_ids"],
    ["Abordagens", "approach_ids"],
  ]) {
    const source = fields.find((item) => item.includes(`label="${label}"`));
    assert.ok(source);
    assert.ok(
      source.includes(
        `form.setValue("${field}", values, { shouldDirty: true, shouldValidate: true })`,
      ),
    );
    assert.ok(source.includes(`selected={selected.${field} ?? []}`));
    assert.ok(source.includes("disabled={disabled}"));
  }
  const pagination = components(publicationsUrl, "PublicationsPagination");
  assert.equal(pagination.length, 1);
  assert.ok(pagination[0].includes("page={publications.page}"));
  assert.ok(pagination[0].includes("pages={publications.pages}"));
  assert.ok(pagination[0].includes("setPage={handlePageChange}"));
});

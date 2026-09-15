import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Static assertions against the real TSX source. Components, queries and imports
// are not executed or replaced; no DOM emulation. Browser QA is separate.
const source = readFileSync(new URL("./ranking-tab.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile(
  "ranking-tab.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const collect = (predicate) => {
  const nodes = [];
  const visit = (node) => {
    if (predicate(node)) nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return nodes;
};
const elementName = (node) =>
  ts.isJsxElement(node)
    ? node.openingElement.tagName.getText(ast)
    : ts.isJsxSelfClosingElement(node)
      ? node.tagName.getText(ast)
      : undefined;
const elements = (name) => collect((node) => elementName(node) === name);
const onlyElement = (name) => {
  const matches = elements(name);
  assert.equal(matches.length, 1, `expected one ${name}`);
  return matches[0];
};
const attribute = (node, name) =>
  (ts.isJsxElement(node) ? node.openingElement : node).attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText(ast) === name,
  );
const expression = (node, name) => attribute(node, name)?.initializer?.expression?.getText(ast);
const jsxText = (node) =>
  node.children
    .filter(ts.isJsxText)
    .map((child) => child.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
const calls = (name) =>
  collect((node) => ts.isCallExpression(node) && node.expression.getText(ast) === name);

test("AST: fonte TSX permanece sintaticamente válida", () => {
  assert.deepEqual(ast.parseDiagnostics, []);
});

test("AST: busca possui rótulo implícito sr-only com nome acessível explícito", () => {
  const input = onlyElement("input");
  const label = input.parent;
  assert.equal(elementName(label), "label");
  const captions = label.children.filter(
    (node) =>
      elementName(node) === "span" && attribute(node, "className")?.initializer?.text === "sr-only",
  );
  assert.equal(captions.length, 1);
  assert.equal(jsxText(captions[0]), "Buscar psicólogo participante");
  assert.equal(attribute(input, "aria-label"), undefined);
  assert.equal(attribute(input, "aria-labelledby"), undefined);
});

test("AST: ícone decorativo de busca não participa do nome acessível", () => {
  const icon = onlyElement("Search");
  const hidden = attribute(icon, "aria-hidden");
  assert.ok(hidden);
  assert.ok(
    hidden.initializer === undefined ||
      hidden.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword,
  );
  assert.equal(icon.parent, onlyElement("input").parent);
});

test("AST: busca usa input search preservando placeholder e valor controlado", () => {
  const input = onlyElement("input");
  assert.equal(attribute(input, "type")?.initializer?.text, "search");
  assert.equal(attribute(input, "placeholder")?.initializer?.text, "Buscar psicólogo participante");
  assert.equal(expression(input, "value"), 'query.q ?? ""');
  for (const name of ["disabled", "autoFocus", "tabIndex", "role"])
    assert.equal(attribute(input, name), undefined);
});

test("AST: singular reservado a count === 1, plural para demais contagens", () => {
  const badge = onlyElement("StatusBadge");
  const plural = badge.children
    .filter(ts.isJsxExpression)
    .map((child) => child.expression)
    .find((node) => node && ts.isConditionalExpression(node));
  assert.ok(plural);
  assert.ok(ts.isBinaryExpression(plural.condition));
  assert.equal(plural.condition.left.getText(ast), "result.data?.count");
  assert.equal(plural.condition.operatorToken.kind, ts.SyntaxKind.EqualsEqualsEqualsToken);
  assert.equal(plural.condition.right.getText(ast), "1");
  assert.equal(plural.whenTrue.text, "psicólogo");
  assert.equal(plural.whenFalse.text, "psicólogos");
  assert.ok(badge.getText(ast).includes("numberFormatter.format(result.data?.count ?? 0)"));
});

test("AST: rótulo Pontuação preserva valor e formatter existentes", () => {
  assert.ok(
    elements("span").some((node) => ts.isJsxElement(node) && jsxText(node) === "Pontuação"),
  );
  assert.equal(
    elements("span").some((node) => ts.isJsxElement(node) && jsxText(node) === "Score"),
    false,
  );
  assert.deepEqual(
    calls("numberFormatter.format").map((call) => call.arguments[0].getText(ast)),
    ["result.data?.count ?? 0", "item.score"],
  );
});

test("AST: descrição usa pontuação zero sem alterar elegibilidade apresentada", () => {
  assert.ok(
    elements("p").some(
      (node) =>
        jsxText(node) ===
        "Todos os psicólogos participantes recebem uma posição, inclusive com pontuação zero.",
    ),
  );
  assert.equal(source.includes("score zero"), false);
});

test("AST: query, defaults e reset da página não mudam", () => {
  const state = calls("useState");
  assert.equal(state.length, 1);
  assert.deepEqual(
    state[0].arguments[0].properties.map((property) => [
      property.name.getText(ast),
      property.initializer.getText(ast),
    ]),
    [
      ["limit", "10"],
      ["page", "1"],
      ["period", '"30d"'],
      ["q", '""'],
    ],
  );
  assert.deepEqual(
    calls("useAdminCommunityRanking").map((call) =>
      call.arguments.map((argument) => argument.getText(ast)),
    ),
    [["slug", "query"]],
  );
  assert.equal(
    calls("setQuery")[0].arguments[0].getText(ast),
    "(current) => ({ ...current, ...patch, page: patch.page ?? 1 })",
  );
});

test("AST: alteração de busca conserva callback direto, sem debounce ou nova fundação", () => {
  assert.equal(
    expression(onlyElement("input"), "onChange"),
    "(event) => updateQuery({ q: event.target.value })",
  );
  assert.doesNotMatch(source, /useDebouncedSearch|setTimeout|useForm|react-hook-form/);
  assert.equal(elements("form").length, 0);
});

test("AST: paginação conserva dados e callback originais", () => {
  const pagination = onlyElement("PaginationControls");
  assert.equal(expression(pagination, "page"), "result.data.page");
  assert.equal(expression(pagination, "pages"), "result.data.pages");
  assert.equal(expression(pagination, "setPage"), "(page) => updateQuery({ page })");
});

test("AST: classes do campo e layout mobile-first permanecem iguais", () => {
  const input = onlyElement("input");
  assert.equal(attribute(input.parent, "className").initializer.text, "relative mt-5 block");
  assert.equal(
    attribute(input, "className").initializer.text,
    "h-11 w-full rounded-control border border-border bg-surface pl-10 pr-3 text-sm font-bold outline-none transition focus:border-primary",
  );
  assert.ok(
    elements("div").some(
      (node) =>
        attribute(node, "className")?.initializer?.text ===
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
    ),
  );
  assert.equal(
    attribute(onlyElement("article"), "className").initializer.text,
    "grid gap-4 rounded-2xl border border-border bg-surface p-4 xl:grid-cols-[1fr_auto] xl:items-center",
  );
});

test("AST: tendência continua recebendo item e exibindo posição anterior", () => {
  assert.equal(expression(onlyElement("RankingTrend"), "item"), "item");
  assert.ok(source.includes('item.trend === "up"'));
  assert.ok(source.includes('item.trend === "down"'));
  assert.ok(source.includes('item.trend === "new"'));
  assert.ok(source.includes("Math.abs(item.position_delta ?? 0)"));
  assert.ok(source.includes("· antes #{item.previous_position}"));
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  PLAN_HISTORY_PAGE_SIZE,
  PLAN_HISTORY_SCOPE_BATCH_SIZE,
  planHistoryPage,
  subscriptionHistoryPage,
} from "./plan-history-pages";

// Real Prisma SQL builders; these contracts do not claim PostgreSQL execution.
const range = {
  start: new Date("2026-09-12T12:00:00Z"),
  end: new Date("2026-09-13T12:00:00Z"),
};
const compact = (sql: string) => sql.replace(/\s+/gu, " ").trim();

for (const [kind, build] of [
  ["subscription", subscriptionHistoryPage],
  ["plan", planHistoryPage],
] as const) {
  test(`SQL ${kind}: scope, inclusive window and page limit are bound parameters`, () => {
    const query = build({ ids: ["scope-a", "scope-b"], range });
    assert.deepEqual(query.values, [
      "scope-a",
      "scope-b",
      range.end,
      range.start,
      range.start,
      PLAN_HISTORY_PAGE_SIZE,
    ]);
    assert.match(query.sql, /h\."observed_at" <= \?/u);
    assert.match(query.sql, /h\."observed_at" >= \?/u);
    assert.ok(!query.sql.includes("scope-a"));
    assert.ok(!query.sql.includes("2026-09"));
    assert.match(compact(query.sql), /ORDER BY h\."id" ASC LIMIT \?$/u);
  });

  test(`SQL ${kind}: predecessor is strictly before the window, with revision tie-break`, () => {
    const sql = compact(build({ ids: ["scope-a"], range }).sql);
    assert.match(sql, /OR NOT EXISTS \( SELECT 1/u);
    assert.match(sql, /n\."observed_at" < \?/u);
    assert.match(sql, /\(n\."observed_at", n\."id"\) > \(h\."observed_at", h\."id"\)/u);
    if (kind === "subscription") {
      assert.match(sql, /n\."psychologist_id" = h\."psychologist_id"/u);
      assert.match(sql, /n\."subscription_id" = h\."subscription_id"/u);
    } else assert.match(sql, /n\."plan_id" = h\."plan_id"/u);
    // Tombstones/cancellations and their original observation timestamps must survive.
    assert.ok(!/\b(deleted|active|status|observation)\b/u.test(sql));
  });

  test(`SQL ${kind}: keyset advances without offset or timestamp-based loss`, () => {
    const query = build({ ids: ["scope-a"], range, afterId: 987n });
    assert.match(query.sql, /AND h\."id" > \?/u);
    assert.equal(query.values[1], 987n);
    assert.ok(!query.sql.includes("OFFSET"));
    assert.ok(!query.sql.includes('h."observed_at" > ?'));
  });

  test(`SQL ${kind}: empty scope cannot load everyone's history`, () => {
    const query = build({ ids: [], range });
    assert.match(compact(query.sql), /WHERE FALSE/u);
    assert.ok(!query.sql.includes("IN ()"));
  });
}

const parse = (path: string) => {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const nodes: ts.Node[] = [];
  const visit = (node: ts.Node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { nodes, text: (node: ts.Node) => node.getText(source) };
};

test("AST: history uses the resolved comparative start/current end and every eligible profile", () => {
  const { nodes, text } = parse(join(__dirname, "../../use-cases/services.ts"));
  const call = nodes.find(
    (node): node is ts.CallExpression =>
      ts.isCallExpression(node) && text(node.expression) === "repository.listPsychologistProfiles",
  );
  assert.ok(call);
  assert.deepEqual(
    call.arguments.map((node) => compact(text(node))),
    ["{ start: previous.start, end: current.end, }"],
  );
  assert.ok(
    nodes.some(
      (node) =>
        ts.isCallExpression(node) &&
        text(node) === "getAllPeriodStartDate(signupDates, deletedAccounts)",
    ),
  );
});

test("AST: batches are bounded, with exhaustion rather than a global truncation", () => {
  assert.equal(PLAN_HISTORY_SCOPE_BATCH_SIZE, 200);
  assert.equal(PLAN_HISTORY_PAGE_SIZE, 500);
  const { nodes, text } = parse(join(__dirname, "plan-history.ts"));
  const exhaustions = nodes.filter(
    (node) =>
      ts.isIfStatement(node) && text(node.expression) === "page.length < PLAN_HISTORY_PAGE_SIZE",
  );
  assert.equal(exhaustions.length, 2);
  const cursors = nodes.filter(
    (node) => ts.isBinaryExpression(node) && text(node) === "afterId = page[page.length - 1].id",
  );
  assert.equal(cursors.length, 2);
  for (const collection of ["profileIds", "associatedPlanIds"]) {
    assert.ok(
      nodes.some(
        (node) =>
          ts.isCallExpression(node) &&
          text(node) === `${collection}.slice(offset, offset + PLAN_HISTORY_SCOPE_BATCH_SIZE)`,
      ),
    );
  }
});

test("AST: all history pages and both sources use the same RepeatableRead transaction", () => {
  const { nodes, text } = parse(
    join(__dirname, "AdminPsychologistsDashboardDirectoryRepository.ts"),
  );
  const method = nodes.find(
    (node): node is ts.MethodDeclaration =>
      ts.isMethodDeclaration(node) && text(node.name) === "listPsychologistProfiles",
  );
  assert.ok(method);
  assert.match(text(method), /prisma\.\$transaction\(/u);
  assert.match(
    compact(text(method)),
    /loadPlanHistoryByProfile\( transaction, profiles\.map\(\(profile\) => profile\.id\), range, \)/u,
  );
  assert.match(text(method), /transaction\.psychologist_profile\.findMany\(/u);
  assert.match(text(method), /where: profilePopulationWhere/u);
  assert.match(text(method), /isolationLevel: "RepeatableRead"/u);
});

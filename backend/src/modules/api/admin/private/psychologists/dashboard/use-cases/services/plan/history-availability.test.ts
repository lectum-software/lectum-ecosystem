import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import type { AdminPsychologistsDashboardSummary } from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import { applyPlanHistoryAvailability } from "./history-availability";

const current = { start: new Date("2026-09-12T00:00:00Z"), end: new Date("2026-09-12T23:59:59Z") };
const previous = { start: new Date("2026-09-11T00:00:00Z"), end: new Date("2026-09-11T23:59:59Z") };
const statistics = () => ({
  features: {
    items: [
      { id: "verified", count: 3, percentage: 75 },
      { id: "available_today", count: 2, percentage: 50 },
    ],
  },
});

// An explicit DTO fixture for this pure decorator, never a substituted repository.
const fixture = () =>
  ({
    statistics: statistics(),
    cards: Object.fromEntries(
      ["courtesy_psychologists", "free_psychologists", "subscriber_psychologists", "churn"].map(
        (id) => [
          id,
          { value: 3, previous_value: 2, change_percent: 50, trend: "up", unavailable: false },
        ],
      ),
    ),
    plan_segments: Object.fromEntries(
      ["all", "courtesy", "free", "subscribers"].map((id) => [id, { statistics: statistics() }]),
    ),
  }) as AdminPsychologistsDashboardSummary;

test("pure DTO: unknown verification supply is flagged in All and every segment, even empty", () => {
  const summary = fixture();
  applyPlanHistoryAvailability(summary, [], current, previous, new Date("2026-09-13T00:00:00Z"));
  for (const stats of [
    summary.statistics,
    ...Object.values(summary.plan_segments).map((segment) => segment.statistics),
  ]) {
    const [verified, available] = stats.features.items;
    assert.equal(verified.unavailable, true);
    assert.match(verified.unavailable_reason ?? "", /desconhecido/u);
    // Additive compatibility: only availability changes, never rights or numeric contracts.
    assert.equal(verified.count, 3);
    assert.equal(verified.percentage, 75);
    assert.deepEqual(available, { id: "available_today", count: 2, percentage: 50 });
  }
});

test("pure DTO: observed verification supply remains available and comparisons unchanged", () => {
  const summary = fixture();
  applyPlanHistoryAvailability(summary, [], current, previous, new Date("2026-09-10T00:00:00Z"));
  assert.equal(summary.statistics.features.items[0].unavailable, undefined);
  assert.equal(summary.plan_segments.all.statistics.features.items[0].count, 3);
  assert.equal(summary.cards.free_psychologists.change_percent, 50);
});

test("AST: list DTO explicitly marks unknown plan-dependent legacy fields", () => {
  const path = join(__dirname, "../dashboard/plan-summary.ts");
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
  const declaration = nodes.find(
    (node): node is ts.VariableDeclaration =>
      ts.isVariableDeclaration(node) && node.name.getText(source) === "buildPsychologistsList",
  );
  assert.ok(declaration);
  const text = declaration.getText(source);
  assert.match(text, /isPlanHistoryKnownAt\(profile\.plan_history, date\)/u);
  assert.match(text, /plan_history_known: planHistoryKnown/u);
  assert.match(text, /plan_history_unavailable_reason: PLAN_HISTORY_UNAVAILABLE_REASON/u);
  assert.match(text, /status: mapPsychologistStatus\(profile, date\)/u);
  assert.match(text, /verified: hasVerifiedEntitlementAt\(profile, date\)/u);
});

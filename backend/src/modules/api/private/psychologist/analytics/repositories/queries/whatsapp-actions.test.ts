import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import prisma from "@/infra/database/prisma";
import { buildAnalyticsComparison } from "./comparison";
import { analyticsWhatsappActions } from "./whatsapp-actions";

const stub = (
  t: TestContext,
  object: object,
  method: string,
  implementation: (...args: unknown[]) => unknown,
) => {
  const target = object as Record<string, unknown>;
  const original = target[method];
  target[method] = t.mock.fn(implementation);
  t.after(() => {
    target[method] = original;
  });
};
test("current and previous clicks share ownership, availability, self-click and time guards", async (t) => {
  const queries: unknown[] = [];
  stub(t, prisma.community_post, "findMany", (args) => {
    assert.deepEqual(args, {
      where: {
        author_id: "professional",
        deleted: false,
        status: "publicado",
        community: { active: true, deleted: false },
      },
      select: { id: true },
    });
    return [{ id: "post" }];
  });
  stub(t, prisma.post_reply, "findMany", () => [{ id: "reply" }]);
  stub(t, prisma.important_action_event, "findMany", (args) => {
    queries.push(args);
    return [
      { id: "1", user_id: "same" },
      { id: "2", user_id: "same" },
    ];
  });
  for (const delegate of [
    prisma.profile_view_event,
    prisma.psychologist_favorite,
    prisma.professional_review,
  ])
    stub(t, delegate, "count", () => 0);
  stub(t, prisma.professional_whatsapp_week, "findMany", () => []);
  const period = {
    key: "custom" as const,
    label: "Teste",
    start_at: new Date("2026-10-19T03:00:00Z"),
    end_at: new Date("2026-10-20T02:59:59.999Z"),
  };
  assert.equal((await analyticsWhatsappActions("professional", period)).length, 2);
  const comparison = await buildAnalyticsComparison("professional", period, null);
  assert.equal(
    comparison?.previous_values.whatsapp_clicks,
    2,
    "repeat clicks must count in the comparison too",
  );
  const [current, previous] = queries as Array<{
    where: { deleted: boolean; occurred_at: { gte: Date; lte: Date }; AND: unknown[] };
  }>;
  assert.equal(current.where.deleted, false);
  assert.deepEqual(current.where.AND[0], {
    OR: [{ user_id: null }, { user_id: { not: "professional" } }],
  });
  assert.deepEqual(current.where.occurred_at, { gte: period.start_at, lte: period.end_at });
  assert.deepEqual(previous.where.AND, current.where.AND);
  assert.equal(previous.where.occurred_at.lte.getTime(), period.start_at.getTime() - 1);
  assert.equal(
    previous.where.occurred_at.lte.getTime() - previous.where.occurred_at.gte.getTime(),
    period.end_at.getTime() - period.start_at.getTime(),
  );
});

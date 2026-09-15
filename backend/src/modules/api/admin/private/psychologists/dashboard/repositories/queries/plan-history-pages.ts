import { Prisma } from "@/external/generated/prisma/client";

export const PLAN_HISTORY_SCOPE_BATCH_SIZE = 200;
export const PLAN_HISTORY_PAGE_SIZE = 500;

type HistoryPage = {
  ids: string[];
  range: { start: Date; end: Date };
  afterId?: bigint;
};

const historyPage = (kind: "subscription" | "plan", { ids, range, afterId }: HistoryPage) => {
  const table =
    kind === "subscription"
      ? Prisma.sql`"professional_subscription_history"`
      : Prisma.sql`"subscription_plan_history"`;
  const scope = kind === "subscription" ? Prisma.sql`h."psychologist_id"` : Prisma.sql`h."plan_id"`;
  const sameSource =
    kind === "subscription"
      ? Prisma.sql`n."psychologist_id" = h."psychologist_id" AND n."subscription_id" = h."subscription_id"`
      : Prisma.sql`n."plan_id" = h."plan_id"`;

  // Keep every event in the inclusive window and exactly one predecessor per source.
  // The predecessor retains its real timestamp/observation; it is not a new event.
  return Prisma.sql`
    SELECT h.* FROM ${table} h
    WHERE ${ids.length ? Prisma.sql`${scope} IN (${Prisma.join(ids)})` : Prisma.sql`FALSE`}
      ${afterId === undefined ? Prisma.empty : Prisma.sql`AND h."id" > ${afterId}`}
      AND h."observed_at" <= ${range.end}
      AND (
        h."observed_at" >= ${range.start}
        OR NOT EXISTS (
          SELECT 1 FROM ${table} n
          WHERE ${sameSource}
            AND n."observed_at" < ${range.start}
            AND (n."observed_at", n."id") > (h."observed_at", h."id")
        )
      )
    ORDER BY h."id" ASC
    LIMIT ${PLAN_HISTORY_PAGE_SIZE}
  `;
};

export const subscriptionHistoryPage = (params: HistoryPage) => historyPage("subscription", params);
export const planHistoryPage = (params: HistoryPage) => historyPage("plan", params);

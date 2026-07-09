import type { DashboardSummaryQuery } from "@/api/req/dashboard";

const normalizeRange = (input: DashboardSummaryQuery) => ({
  from: input.from || "default",
  to: input.to || "default",
});

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  summary: (input: DashboardSummaryQuery) =>
    [...adminDashboardKeys.all, "summary", normalizeRange(input)] as const,
};

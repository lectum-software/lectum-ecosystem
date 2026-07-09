import type { CommunitiesDashboardQuery } from "@/api/req/communities";
import type { DashboardSummaryQuery } from "@/api/req/dashboard";
import type { TrafficSummaryQuery } from "@/api/req/traffic";

type AdminRangeQuery = CommunitiesDashboardQuery | DashboardSummaryQuery | TrafficSummaryQuery;

const normalizeRange = (input: AdminRangeQuery) => ({
  from: input.from || "default",
  to: input.to || "default",
});

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  summary: (input: DashboardSummaryQuery) =>
    [...adminDashboardKeys.all, "summary", normalizeRange(input)] as const,
};

export const adminTrafficKeys = {
  all: ["admin", "traffic"] as const,
  summary: (input: TrafficSummaryQuery) =>
    [...adminTrafficKeys.all, "summary", normalizeRange(input)] as const,
};

export const adminCommunitiesKeys = {
  all: ["admin", "communities"] as const,
  dashboard: (input: CommunitiesDashboardQuery) =>
    [...adminCommunitiesKeys.all, "dashboard", normalizeRange(input)] as const,
  detail: (id: string) => [...adminCommunitiesKeys.all, "detail", id] as const,
  rules: (id: string) => [...adminCommunitiesKeys.all, "rules", id] as const,
};

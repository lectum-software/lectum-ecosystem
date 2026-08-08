import type { AdminCommunityContentDetailQuery } from "./types/content";
import type { CommunitiesDashboardQuery } from "./types/dashboard";
import type { AdminCommunityStatisticsQuery } from "./types/statistics";

export const cleanParams = (input: CommunitiesDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

export const cleanPaginationParams = <T extends object>(input: T = {} as T) => {
  const params = input as Record<string, unknown>;

  return {
    ...(params.limit ? { limit: params.limit } : {}),
    ...(params.page ? { page: params.page } : {}),
    ...(params.q ? { q: params.q } : {}),
    ...Object.fromEntries(
      Object.entries(params).filter(
        ([key, value]) => !["limit", "page", "q"].includes(key) && value !== undefined,
      ),
    ),
  };
};

export const cleanStatisticsParams = (input: AdminCommunityStatisticsQuery) => ({
  ...(input.period ? { period: input.period } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.to ? { to: input.to } : {}),
});

export const cleanContentDetailParams = (input: AdminCommunityContentDetailQuery) => ({
  ...(input.period ? { period: input.period } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.to ? { to: input.to } : {}),
});

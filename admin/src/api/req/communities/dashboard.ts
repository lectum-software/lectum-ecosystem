import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import { cleanPaginationParams, cleanParams } from "./params";
import type { AdminCommunitiesDashboard, CommunitiesDashboardQuery } from "./types/dashboard";

import type {
  AdminCommunitiesList,
  AdminCommunitiesListQuery,
  AdminCommunityDetail,
  AdminCommunityIdentity,
} from "./types/detail-list";

import type { AdminCommunityCreateInput } from "./types/statistics";

export const getAdminCommunitiesDashboard = async (input: CommunitiesDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunitiesDashboard>>(
    "/api/admin/private/communities/dashboard",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunitiesList = async (input: AdminCommunitiesListQuery = {}) => {
  const response = await adminApi.get<ApiResponse<AdminCommunitiesList>>(
    "/api/admin/private/communities",
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityDetail = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityDetail>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}`,
  );

  return resolveApiData(response.data);
};

export const createAdminCommunity = async (input: AdminCommunityCreateInput) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityIdentity>>(
    "/api/admin/private/communities",
    input,
  );

  return resolveApiData(response.data);
};

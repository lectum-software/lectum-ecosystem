import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import { cleanContentDetailParams, cleanPaginationParams } from "./params";
import type {
  AdminCommunityContent,
  AdminCommunityContentAnalyticsDetail,
  AdminCommunityContentDetailQuery,
  AdminCommunityContentQuery,
  AdminCommunityRankingQuery,
  AdminCommunityRemoveContentInput,
  AdminCommunityRemoveContentResult,
  AdminCommunityResolveReportsInput,
} from "./types/content";

import type {
  AdminCommunityRanking,
  AdminCommunityReports,
  AdminCommunityReportsQuery,
  AdminCommunityResolveReportsResult,
} from "./types/ranking-reports";

export const getAdminCommunityContent = async (id: string, input: AdminCommunityContentQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityContent>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityContentDetail = async (
  id: string,
  targetType: "comment" | "post" | "reply",
  targetId: string,
  input: AdminCommunityContentDetailQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityContentAnalyticsDetail>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/detail`,
    {
      params: cleanContentDetailParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const removeAdminCommunityContent = async (
  id: string,
  targetType: "comment" | "post",
  targetId: string,
  input: AdminCommunityRemoveContentInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityRemoveContentResult>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/remove`,
    input,
  );

  return resolveApiData(response.data);
};

export const resolveAdminCommunityReports = async (
  id: string,
  targetType: "comment" | "post",
  targetId: string,
  input: AdminCommunityResolveReportsInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityResolveReportsResult>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/reports/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/resolve`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityRanking = async (id: string, input: AdminCommunityRankingQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityRanking>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/ranking`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityReports = async (id: string, input: AdminCommunityReportsQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityReports>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/reports`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

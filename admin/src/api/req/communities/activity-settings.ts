import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import { cleanPaginationParams, cleanStatisticsParams } from "./params";
import type { AdminCommunityIdentity, AdminCommunityRule } from "./types/detail-list";
import type {
  AdminCommunityActivities,
  AdminCommunityActivitiesQuery,
  AdminCommunityAvatarResponse,
  AdminCommunityRuleInput,
  AdminCommunityRulesResponse,
  AdminCommunityStatistics,
  AdminCommunityStatisticsQuery,
  AdminCommunityStatusInput,
  AdminCommunityUpdateInput,
} from "./types/statistics";

export const getAdminCommunityActivities = async (
  id: string,
  input: AdminCommunityActivitiesQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityActivities>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/activities`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityStatistics = async (
  id: string,
  input: AdminCommunityStatisticsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityStatistics>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/statistics`,
    {
      params: cleanStatisticsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const updateAdminCommunity = async (id: string, input: AdminCommunityUpdateInput) => {
  const response = await adminApi.put<ApiResponse<AdminCommunityIdentity>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminCommunityStatus = async (id: string, input: AdminCommunityStatusInput) => {
  const response = await adminApi.patch<ApiResponse<AdminCommunityIdentity>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/status`,
    input,
  );

  return resolveApiData(response.data);
};

export const uploadAdminCommunityAvatar = async (id: string, file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await adminApi.post<ApiResponse<AdminCommunityAvatarResponse>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/avatar`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityRules = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityRulesResponse>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules`,
  );

  return resolveApiData(response.data);
};

export const createAdminCommunityRule = async (id: string, input: AdminCommunityRuleInput) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminCommunityRule = async (
  id: string,
  ruleId: string,
  input: AdminCommunityRuleInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules/${encodeURIComponent(ruleId)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminCommunityRule = async (id: string, ruleId: string) => {
  const response = await adminApi.delete<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules/${encodeURIComponent(ruleId)}`,
  );

  return resolveApiData(response.data);
};

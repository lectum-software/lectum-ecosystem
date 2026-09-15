import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import {
  cleanActivitiesParams,
  cleanPublicationsParams,
  cleanReportsParams,
  cleanReviewsParams,
  cleanStatisticsParams,
} from "./params";

import type {
  AdminPsychologistActivities,
  AdminPsychologistActivitiesQuery,
  AdminPsychologistPublications,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistReportActionResponse,
  AdminPsychologistReportResolveInput,
  AdminPsychologistReports,
  AdminPsychologistReportsQuery,
  AdminPsychologistReviews,
  AdminPsychologistReviewsQuery,
  AdminPsychologistStatisticsQuery,
} from "./types/content";
import type {
  AdminPsychologistBilling,
  AdminPsychologistRegistryVerification,
} from "./types/detail";
import type { AdminPsychologistStatistics } from "./types/statistics";

export const getAdminPsychologistBilling = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistBilling>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing`,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistRegistryVerification = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification`,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistStatistics = async (
  id: string,
  input: AdminPsychologistStatisticsQuery = {},
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistStatistics>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/statistics`,
    {
      params: cleanStatisticsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistPublications = async (
  id: string,
  input: AdminPsychologistPublicationsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistPublications>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/publications`,
    {
      params: cleanPublicationsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistReviews = async (
  id: string,
  input: AdminPsychologistReviewsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistReviews>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reviews`,
    {
      params: cleanReviewsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistReports = async (
  id: string,
  input: AdminPsychologistReportsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistReports>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reports`,
    {
      params: cleanReportsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const resolveAdminPsychologistReport = async (
  id: string,
  reportId: string,
  input: AdminPsychologistReportResolveInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistReportActionResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reports/${encodeURIComponent(
      reportId,
    )}/resolve`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistActivities = async (
  id: string,
  input: AdminPsychologistActivitiesQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistActivities>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/activities`,
    {
      params: cleanActivitiesParams(input),
    },
  );

  return resolveApiData(response.data);
};

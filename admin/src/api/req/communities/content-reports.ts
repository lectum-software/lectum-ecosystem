import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import { resolveSafeDownloadFilename } from "@/lib/download";
import { cleanContentDetailParams, cleanPaginationParams, cleanReportsParams } from "./params";
import type {
  AdminCommunityContent,
  AdminCommunityContentAnalyticsDetail,
  AdminCommunityContentDetailQuery,
  AdminCommunityContentOriginalVideoDownload,
  AdminCommunityContentQuery,
  AdminCommunityContentVideoArtFile,
  AdminCommunityContentVideoArtRenderJob,
  AdminCommunityRankingQuery,
  AdminCommunityRemoveContentInput,
  AdminCommunityRemoveContentResult,
  AdminCommunityResolveReportsInput,
  AdminCommunityVideoDownloadTargetType,
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

export const prepareAdminCommunityContentOriginalVideoDownload = async (
  id: string,
  targetType: AdminCommunityVideoDownloadTargetType,
  targetId: string,
) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityContentOriginalVideoDownload>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/video-downloads/original`,
  );

  return resolveApiData(response.data);
};

export const startAdminCommunityContentVideoArtRenderJob = async (
  id: string,
  targetType: AdminCommunityVideoDownloadTargetType,
  targetId: string,
) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityContentVideoArtRenderJob>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/video-downloads/art/render-jobs`,
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityContentVideoArtRenderJob = async (
  id: string,
  targetType: AdminCommunityVideoDownloadTargetType,
  targetId: string,
  jobId: string,
) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityContentVideoArtRenderJob>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/video-downloads/art/render-jobs/${encodeURIComponent(
      jobId,
    )}`,
  );

  return resolveApiData(response.data);
};

export const downloadAdminCommunityContentVideoArtRenderJobFile = async (
  id: string,
  targetType: AdminCommunityVideoDownloadTargetType,
  targetId: string,
  jobId: string,
): Promise<AdminCommunityContentVideoArtFile> => {
  const response = await adminApi.get<Blob>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/video-downloads/art/render-jobs/${encodeURIComponent(
      jobId,
    )}/file`,
    {
      responseType: "blob",
      timeout: 120_000,
    },
  );
  const contentDisposition = response.headers["content-disposition"];
  const fileName = resolveSafeDownloadFilename(
    typeof contentDisposition === "string" ? contentDisposition : undefined,
    "video-Lectum.mp4",
    ".mp4",
  );

  return {
    blob: response.data,
    file_name: fileName,
  };
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
      params: cleanReportsParams(input),
    },
  );

  return resolveApiData(response.data);
};

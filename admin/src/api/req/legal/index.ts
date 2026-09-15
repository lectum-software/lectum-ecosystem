import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import type {
  AdminLegalAcceptance,
  AdminLegalDocument,
  AdminLegalDocuments,
  AdminLegalDraftInput,
  AdminLegalPage,
  AdminLegalPublishInput,
  AdminLegalUpdateInput,
} from "./types";

const baseUrl = "/api/admin/private/settings/legal";
const documentUrl = (id: string) => `${baseUrl}/${encodeURIComponent(id)}`;

export const getAdminLegalDocuments = async (page = 1, signal?: AbortSignal) => {
  const response = await adminApi.get<ApiResponse<AdminLegalDocuments>>(baseUrl, {
    params: { page },
    signal,
  });
  return resolveApiData(response.data);
};

export const getAdminLegalDocument = async (id: string, signal?: AbortSignal) => {
  const response = await adminApi.get<ApiResponse<AdminLegalDocument>>(documentUrl(id), { signal });
  return resolveApiData(response.data);
};

export const createAdminLegalDraft = async (input: AdminLegalDraftInput) => {
  const response = await adminApi.post<ApiResponse<AdminLegalDocument>>(baseUrl, input);
  return resolveApiData(response.data);
};

export const updateAdminLegalDraft = async (id: string, input: AdminLegalUpdateInput) => {
  const response = await adminApi.put<ApiResponse<AdminLegalDocument>>(documentUrl(id), input);
  return resolveApiData(response.data);
};

export const duplicateAdminLegalDocument = async (id: string) => {
  const response = await adminApi.post<ApiResponse<AdminLegalDocument>>(
    `${documentUrl(id)}/duplicate`,
    {},
  );
  return resolveApiData(response.data);
};

export const publishAdminLegalDocument = async (id: string, input: AdminLegalPublishInput) => {
  const response = await adminApi.post<ApiResponse<AdminLegalDocument>>(
    `${documentUrl(id)}/publish`,
    input,
  );
  return resolveApiData(response.data);
};

export const getAdminLegalAcceptances = async (id: string, page = 1, signal?: AbortSignal) => {
  const response = await adminApi.get<ApiResponse<AdminLegalPage<AdminLegalAcceptance>>>(
    `${documentUrl(id)}/acceptances`,
    { params: { page }, signal },
  );
  return resolveApiData(response.data);
};

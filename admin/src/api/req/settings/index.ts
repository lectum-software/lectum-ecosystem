import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export const ADMIN_SETTINGS_CATALOG_TYPES = [
  "approach",
  "service",
  "language",
  "target_audience",
  "gender",
  "race_color",
  "religion",
  "specialty",
  "specialty_category",
] as const;

export type AdminSettingsCatalogType = (typeof ADMIN_SETTINGS_CATALOG_TYPES)[number];

export type AdminSettingsCatalogOption = {
  active: boolean;
  created_at: string;
  id: string;
  linked_count: number | null;
  name: string;
  position: number;
  slug: string;
  updated_at: string;
};

export type AdminSettingsSpecialty = AdminSettingsCatalogOption & {
  category_id: string | null;
};

export type AdminSettingsSpecialtyCategory = AdminSettingsCatalogOption & {
  specialties: AdminSettingsSpecialty[];
};

export type AdminSettingsCatalogs = {
  approaches: AdminSettingsCatalogOption[];
  genders: AdminSettingsCatalogOption[];
  languages: AdminSettingsCatalogOption[];
  race_colors: AdminSettingsCatalogOption[];
  religions: AdminSettingsCatalogOption[];
  services: AdminSettingsCatalogOption[];
  specialty_categories: AdminSettingsSpecialtyCategory[];
  target_audiences: AdminSettingsCatalogOption[];
};

export type AdminSettingsCatalogPayload = {
  active?: boolean;
  category_id?: string;
  name?: string;
  position?: number;
};

export type AdminSettingsReorderPayload = {
  category_id?: string;
  ids: string[];
  type: AdminSettingsCatalogType;
};

export type AdminSettingsDeletePayload = {
  confirmation: string;
};

const baseUrl = "/api/admin/private/settings/catalogs";

export const getAdminSettingsCatalogs = async () => {
  const response = await adminApi.get<ApiResponse<AdminSettingsCatalogs>>(baseUrl);

  return resolveApiData(response.data);
};

export const createAdminSpecialtyCategory = async (input: AdminSettingsCatalogPayload) => {
  const response = await adminApi.post<ApiResponse<AdminSettingsCatalogs>>(
    `${baseUrl}/specialty-categories`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminSpecialtyCategory = async (
  id: string,
  input: AdminSettingsCatalogPayload,
) => {
  const response = await adminApi.put<ApiResponse<AdminSettingsCatalogs>>(
    `${baseUrl}/specialty-categories/${encodeURIComponent(id)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminSpecialtyCategory = async (
  id: string,
  input: AdminSettingsDeletePayload,
) => {
  const response = await adminApi.delete<ApiResponse<AdminSettingsCatalogs>>(
    `${baseUrl}/specialty-categories/${encodeURIComponent(id)}`,
    { data: input },
  );

  return resolveApiData(response.data);
};

const pathByType: Record<Exclude<AdminSettingsCatalogType, "specialty_category">, string> = {
  approach: "approaches",
  gender: "genders",
  language: "languages",
  race_color: "race-colors",
  religion: "religions",
  service: "services",
  specialty: "specialties",
  target_audience: "target-audiences",
};

export const createAdminCatalogItem = async (
  type: Exclude<AdminSettingsCatalogType, "specialty_category">,
  input: AdminSettingsCatalogPayload,
) => {
  const response = await adminApi.post<ApiResponse<AdminSettingsCatalogs>>(
    `${baseUrl}/${pathByType[type]}`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminCatalogItem = async (
  type: Exclude<AdminSettingsCatalogType, "specialty_category">,
  id: string,
  input: AdminSettingsCatalogPayload,
) => {
  const response = await adminApi.put<ApiResponse<AdminSettingsCatalogs>>(
    `${baseUrl}/${pathByType[type]}/${encodeURIComponent(id)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminCatalogItem = async (
  type: Exclude<AdminSettingsCatalogType, "specialty_category">,
  id: string,
  input: AdminSettingsDeletePayload,
) => {
  const response = await adminApi.delete<ApiResponse<AdminSettingsCatalogs>>(
    `${baseUrl}/${pathByType[type]}/${encodeURIComponent(id)}`,
    { data: input },
  );

  return resolveApiData(response.data);
};

export const reorderAdminSettingsCatalog = async (input: AdminSettingsReorderPayload) => {
  const response = await adminApi.post<ApiResponse<AdminSettingsCatalogs>>(
    `${baseUrl}/reorder`,
    input,
  );

  return resolveApiData(response.data);
};

export const restoreAdminSettingsCatalogDefaults = async (confirmation: string) => {
  const response = await adminApi.post<ApiResponse<AdminSettingsCatalogs>>(
    `${baseUrl}/restore-defaults`,
    { confirmation },
  );

  return resolveApiData(response.data);
};

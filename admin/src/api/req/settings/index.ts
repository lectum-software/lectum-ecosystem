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

export const ADMIN_SEO_METADATA_PAGE_KEYS = [
  "default",
  "home",
  "psychologists",
  "psychologist_profile",
  "community",
  "community_post",
  "top_mentors",
] as const;

export type AdminSeoMetadataPageKey = (typeof ADMIN_SEO_METADATA_PAGE_KEYS)[number];

export type AdminSeoMetadataSetting = {
  canonical_url: string | null;
  created_at: string;
  description: string;
  id: string;
  keywords: string[];
  label: string;
  og_description: string | null;
  og_image_url: string | null;
  og_title: string | null;
  page_key: AdminSeoMetadataPageKey;
  robots_follow: boolean;
  robots_index: boolean;
  route_path: string | null;
  title: string;
  updated_at: string;
};

export type AdminSeoMetadataSettings = {
  settings: AdminSeoMetadataSetting[];
  updated_at: string | null;
};

export type AdminSeoMetadataPayload = {
  canonical_url?: string | null;
  description: string;
  keywords?: string;
  og_description?: string | null;
  og_image_url?: string | null;
  og_title?: string | null;
  robots_follow: boolean;
  robots_index: boolean;
  title: string;
};

export type AdminSubscriptionPlanSetting = {
  active: boolean;
  created_at: string;
  currency: "BRL";
  gateway_plan_configured: boolean;
  id: string;
  interval: string;
  name: string;
  price_cents: number;
  slug: string;
  source: "subscription_plan";
  updated_at: string;
};

export type AdminSubscriptionPlanSettings = {
  plan: AdminSubscriptionPlanSetting;
};

const baseUrl = "/api/admin/private/settings/catalogs";
const seoBaseUrl = "/api/admin/private/settings/seo";
const subscriptionPlanBaseUrl = "/api/admin/private/settings/subscription-plan";

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

export const getAdminSeoMetadataSettings = async () => {
  const response = await adminApi.get<ApiResponse<AdminSeoMetadataSettings>>(seoBaseUrl);

  return resolveApiData(response.data);
};

export const updateAdminSeoMetadataSetting = async (
  pageKey: AdminSeoMetadataPageKey,
  input: AdminSeoMetadataPayload,
) => {
  const response = await adminApi.put<ApiResponse<AdminSeoMetadataSettings>>(
    `${seoBaseUrl}/${encodeURIComponent(pageKey)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminSubscriptionPlanSetting = async () => {
  const response =
    await adminApi.get<ApiResponse<AdminSubscriptionPlanSettings>>(subscriptionPlanBaseUrl);

  return resolveApiData(response.data);
};

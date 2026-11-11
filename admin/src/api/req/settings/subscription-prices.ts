import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type AdminPriceVersion = {
  id: string;
  amount_cents: number;
  currency: "BRL";
  interval: "month";
  interval_count: 1;
  created_at: string;
  is_current: boolean;
};
export type AdminPriceOperation = {
  id: string;
  amount_cents: number;
  status: "pending" | "processing" | "completed" | "failed" | "manual_review";
  created_at: string;
  updated_at: string;
  version_id: string | null;
  can_resume: boolean;
};
export type AdminPricePage<T> = { items: T[]; next_cursor: string | null };
export type AdminPriceCreation = {
  amount_cents: number;
  request_key: string;
  confirm_new_adhesions_only: true;
};
export type AdminPriceResult = {
  operation: AdminPriceOperation;
  version: AdminPriceVersion | null;
  offer_changed: false;
  existing_contracts_changed: false;
};
export type AdminOfferResult = {
  revision: number;
  checkout_enabled: boolean;
  changed: boolean;
  price_version_id: string;
};
const base = "/api/admin/private/settings/subscription-plan";
export const getAdminPriceVersions = async (cursor: string | null) => {
  const response = await adminApi.get<ApiResponse<AdminPricePage<AdminPriceVersion>>>(
    `${base}/prices`,
    { params: { ...(cursor ? { cursor } : {}), limit: 10 } },
  );
  return resolveApiData(response.data);
};
export const getAdminPriceOperations = async (cursor: string | null) => {
  const response = await adminApi.get<ApiResponse<AdminPricePage<AdminPriceOperation>>>(
    `${base}/price-operations`,
    { params: { ...(cursor ? { cursor } : {}), limit: 10 } },
  );
  return resolveApiData(response.data);
};
export const createAdminPriceVersion = async (input: AdminPriceCreation) => {
  const response = await adminApi.post<ApiResponse<AdminPriceResult>>(`${base}/prices`, input);
  return resolveApiData(response.data);
};
export const resumeAdminPriceOperation = async (id: string) => {
  const response = await adminApi.post<ApiResponse<AdminPriceResult>>(
    `${base}/price-operations/${encodeURIComponent(id)}/resume`,
    {},
  );
  return resolveApiData(response.data);
};
export const linkAdminPriceVersion = async (input: {
  price_version_id: string;
  expected_revision: number;
  confirm_new_adhesions_only: true;
}) => {
  const response = await adminApi.put<ApiResponse<AdminOfferResult>>(`${base}/offer`, input);
  return resolveApiData(response.data);
};
export const setAdminOfferEnabled = async (input: {
  enabled: boolean;
  expected_revision: number;
  confirm_publish?: true;
}) => {
  const response = await adminApi.patch<ApiResponse<AdminOfferResult>>(`${base}/offer`, input);
  return resolveApiData(response.data);
};

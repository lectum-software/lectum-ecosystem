import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type FiscalIdentity = {
  current: {
    full_name: string;
    source: string;
    updated_at: string;
    actor_id: string | null;
    registry_check_id: string | null;
  } | null;
  revision: string | null;
  profile_revision: string;
  history: {
    id: string;
    full_name: string;
    source: string;
    created_at: string;
    actor_id: string | null;
    actor_name: string | null;
  }[];
};
export type FiscalIdentityInput = {
  full_name: string;
  revision: string | null;
  profile_revision: string;
};
const path = (id: string) =>
  `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/fiscal-identity`;
export async function getFiscalIdentity(id: string) {
  const response = await adminApi.get<ApiResponse<FiscalIdentity>>(path(id));
  return resolveApiData(response.data);
}
export async function saveFiscalIdentity(id: string, input: FiscalIdentityInput) {
  const response = await adminApi.put<ApiResponse<FiscalIdentity>>(path(id), input);
  return resolveApiData(response.data);
}

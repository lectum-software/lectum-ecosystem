import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

import type {
  AdminPsychologistApproveRegistryVerificationInput,
  AdminPsychologistGrantCourtesyInput,
  AdminPsychologistGrantCourtesyResponse,
  AdminPsychologistRegistryVerification,
  AdminPsychologistRejectRegistryVerificationInput,
  AdminPsychologistRevokeCourtesyResponse,
  AdminPsychologistUpdateRegistryIdentityInput,
} from "./types/detail";

export const grantAdminPsychologistCourtesy = async (
  id: string,
  input: AdminPsychologistGrantCourtesyInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistGrantCourtesyResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing/grant-courtesy`,
    input,
  );

  return resolveApiData(response.data);
};

export const revokeAdminPsychologistCourtesy = async (id: string) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRevokeCourtesyResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing/revoke-courtesy`,
  );

  return resolveApiData(response.data);
};

export const approveAdminPsychologistRegistryVerification = async (
  id: string,
  input: AdminPsychologistApproveRegistryVerificationInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/approve`,
    input,
  );

  return resolveApiData(response.data);
};

export const rejectAdminPsychologistRegistryVerification = async (
  id: string,
  input: AdminPsychologistRejectRegistryVerificationInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/reject`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminPsychologistRegistryIdentity = async (
  id: string,
  input: AdminPsychologistUpdateRegistryIdentityInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/identity`,
    input,
  );

  return resolveApiData(response.data);
};

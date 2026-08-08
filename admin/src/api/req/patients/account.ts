import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

import type {
  AdminPatientAccount,
  AdminPatientAccountDeleteResponse,
  AdminPatientAccountReasonInput,
  AdminPatientAccountStatusActionInput,
  AdminPatientAccountViewAsResponse,
  AdminPatientChangeEmailInput,
  AdminPatientRevokeSessionsInput,
  AdminPatientSetTemporaryPasswordInput,
} from "./types/account-reports";

export const getAdminPatientAccount = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account`,
  );

  return resolveApiData(response.data);
};

export const changeAdminPatientAccountEmail = async (
  id: string,
  input: AdminPatientChangeEmailInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/change-email`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPatientAccountEmailConfirmation = async (
  id: string,
  input: AdminPatientAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/send-email-confirmation`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPatientAccountPasswordReset = async (
  id: string,
  input: AdminPatientAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/send-password-reset`,
    input,
  );

  return resolveApiData(response.data);
};

export const setAdminPatientAccountTemporaryPassword = async (
  id: string,
  input: AdminPatientSetTemporaryPasswordInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/set-temporary-password`,
    input,
  );

  return resolveApiData(response.data);
};

export const revokeAdminPatientAccountSessions = async (
  id: string,
  input: AdminPatientRevokeSessionsInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/revoke-sessions`,
    input,
  );

  return resolveApiData(response.data);
};

export const suspendAdminPatientAccount = async (
  id: string,
  input: AdminPatientAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/suspend`,
    input,
  );

  return resolveApiData(response.data);
};

export const deactivateAdminPatientAccount = async (
  id: string,
  input: AdminPatientAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/deactivate`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminPatientAccount = async (
  id: string,
  input: AdminPatientAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccountDeleteResponse>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/delete`,
    input,
  );

  return resolveApiData(response.data);
};

export const startAdminPatientAccountViewAs = async (
  id: string,
  input: AdminPatientAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccountViewAsResponse>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/view-as`,
    input,
  );

  return resolveApiData(response.data);
};

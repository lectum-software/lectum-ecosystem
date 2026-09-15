import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

import type {
  AdminPsychologistAccount,
  AdminPsychologistAccountDeleteResponse,
  AdminPsychologistAccountReasonInput,
  AdminPsychologistAccountStatusActionInput,
  AdminPsychologistAccountViewAsResponse,
  AdminPsychologistChangeEmailInput,
  AdminPsychologistDetail,
  AdminPsychologistRevokeSessionsInput,
  AdminPsychologistSetTemporaryPasswordInput,
  AdminPsychologistUpdatePersonalDataInput,
  AdminPsychologistUpdateProfessionalDataInput,
} from "./types/detail";

export const updateAdminPsychologistPersonalData = async (
  id: string,
  input: AdminPsychologistUpdatePersonalDataInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/personal-data`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminPsychologistProfessionalData = async (
  id: string,
  input: AdminPsychologistUpdateProfessionalDataInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/professional-data`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistAccount = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account`,
  );

  return resolveApiData(response.data);
};

export const changeAdminPsychologistAccountEmail = async (
  id: string,
  input: AdminPsychologistChangeEmailInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/change-email`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPsychologistAccountEmailConfirmation = async (
  id: string,
  input: AdminPsychologistAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/send-email-confirmation`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPsychologistAccountPasswordReset = async (
  id: string,
  input: AdminPsychologistAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/send-password-reset`,
    input,
  );

  return resolveApiData(response.data);
};

export const setAdminPsychologistAccountTemporaryPassword = async (
  id: string,
  input: AdminPsychologistSetTemporaryPasswordInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/set-temporary-password`,
    input,
  );

  return resolveApiData(response.data);
};

export const revokeAdminPsychologistAccountSessions = async (
  id: string,
  input: AdminPsychologistRevokeSessionsInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/revoke-sessions`,
    input,
  );

  return resolveApiData(response.data);
};

export const suspendAdminPsychologistAccount = async (
  id: string,
  input: AdminPsychologistAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/suspend`,
    input,
  );

  return resolveApiData(response.data);
};

export const deactivateAdminPsychologistAccount = async (
  id: string,
  input: AdminPsychologistAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/deactivate`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminPsychologistAccount = async (
  id: string,
  input: AdminPsychologistAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccountDeleteResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/delete`,
    input,
  );

  return resolveApiData(response.data);
};

export const startAdminPsychologistAccountViewAs = async (
  id: string,
  input: AdminPsychologistAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccountViewAsResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/view-as`,
    input,
  );

  return resolveApiData(response.data);
};

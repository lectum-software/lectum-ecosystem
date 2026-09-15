import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import { cleanActivitiesParams, cleanParams, cleanReportsParams } from "./params";
import type {
  AdminPatientActivities,
  AdminPatientActivitiesQuery,
  AdminPatientReports,
  AdminPatientReportsQuery,
  PatientsDashboardQuery,
  PatientsDetailQuery,
} from "./types/account-reports";
import type { AdminPatientsDashboard } from "./types/dashboard";

import type { AdminPatientDetail } from "./types/detail";

export const getAdminPatientsDashboard = async (input: PatientsDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientsDashboard>>(
    "/api/admin/private/patients/dashboard",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPatientDetail = async (id: string, input: PatientsDetailQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientDetail>>(
    `/api/admin/private/patients/${id}`,
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPatientActivities = async (id: string, input: AdminPatientActivitiesQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientActivities>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/activities`,
    {
      params: cleanActivitiesParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPatientReports = async (id: string, input: AdminPatientReportsQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientReports>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/reports`,
    {
      params: cleanReportsParams(input),
    },
  );

  return resolveApiData(response.data);
};

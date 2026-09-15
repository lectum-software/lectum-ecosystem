import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import { cleanDashboardParams, cleanListParams } from "./params";

import type { AdminPsychologistsDashboard } from "./types/content";
import type { PsychologistsDashboardQuery, PsychologistsListQuery } from "./types/dashboard-core";
import type { AdminPsychologistDetail } from "./types/detail";
import type { AdminPsychologistsList } from "./types/list";

export const getAdminPsychologistsDashboard = async (input: PsychologistsDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistsDashboard>>(
    "/api/admin/private/psychologists/dashboard",
    {
      params: cleanDashboardParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistsList = async (input: PsychologistsListQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistsList>>(
    "/api/admin/private/psychologists",
    {
      params: cleanListParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistDetail = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}`,
  );

  return resolveApiData(response.data);
};

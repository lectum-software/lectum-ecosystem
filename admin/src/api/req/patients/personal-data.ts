import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

import type { AdminPatientUpdatePersonalDataInput } from "./types/account-reports";

import type { AdminPatientDetail } from "./types/detail";

export const updateAdminPatientPersonalData = async (
  id: string,
  input: AdminPatientUpdatePersonalDataInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPatientDetail>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/personal-data`,
    input,
  );

  return resolveApiData(response.data);
};

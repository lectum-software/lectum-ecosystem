import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { Admin, AdminLoginInput, ApiResponse } from "@/api/types";

export const loginAdmin = async (payload: AdminLoginInput) => {
  const response = await adminApi.post<ApiResponse<Admin>>("/api/admin/public/auth/login", payload);
  return resolveApiData(response.data);
};

export const hydrateAdmin = async () => {
  const response = await adminApi.get<ApiResponse<Admin>>("/api/admin/private/auth/hidrate");
  return resolveApiData(response.data);
};

export const logoutAdmin = async () => {
  const response = await adminApi.post<ApiResponse>("/api/admin/private/auth/logout", undefined, {
    timeout: 5_000,
  });
  return response.data;
};

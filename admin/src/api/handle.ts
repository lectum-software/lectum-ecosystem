import { AxiosError } from "axios";
import { getSafeAdminApiError } from "@/api/errors";
import type { ApiResponse } from "@/api/types";
import { sanitizeAdminNavigationData } from "@/lib/safe-redirect";

export const resolveApiData = <T>(response: ApiResponse<T>) => {
  if (!response.success) {
    throw new Error(getSafeAdminApiError(response));
  }

  return sanitizeAdminNavigationData(response.data as T);
};

export const resolveApiError = (error: unknown) => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return "Não foi possível conectar ao serviço. Tente novamente.";
    }

    return getSafeAdminApiError(error);
  }

  return getSafeAdminApiError(error);
};

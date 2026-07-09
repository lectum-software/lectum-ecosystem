import { AxiosError } from "axios";
import type { ApiResponse } from "@/api/types";

export const resolveApiData = <T>(response: ApiResponse<T>) => {
  if (!response.success || !response.data) {
    throw new Error(response.error || response.message || "Não foi possível concluir a operação.");
  }

  return response.data;
};

export const resolveApiError = (error: unknown) => {
  if (error instanceof AxiosError) {
    const response = error.response?.data as ApiResponse | undefined;
    return response?.error || response?.message || "Não foi possível conectar ao backend.";
  }

  if (error instanceof Error) return error.message;

  return "Não foi possível concluir a operação.";
};

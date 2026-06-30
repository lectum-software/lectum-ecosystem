import type { AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import api from "@/api";
import type { ApiMethod } from "@/api/generator";
import { signOut } from "@/hooks/cookies/signout";

type ApiResponse<T = unknown> = {
  success: boolean;
  status?: number;
  data?: T;
  message?: string;
  error?: string;
  code?: unknown;
  errors?: unknown;
};

class CustomError extends Error {
  public data: unknown;

  constructor(message: string, data: unknown) {
    super(message);
    this.data = data;
  }
}

type HandleApiRequestParams = {
  url: string;
  body?: object | FormData;
  method: ApiMethod;
  config?: AxiosRequestConfig;
  showSuccess?: boolean;
  successMessage?: string;
  hideError?: boolean;
  signOutOnUnauthorized?: boolean;
};

export const handleReq = async <T = unknown>({
  url,
  body,
  method,
  config,
  showSuccess,
  successMessage,
  hideError,
  signOutOnUnauthorized = true,
}: HandleApiRequestParams) => {
  const isGetMethod = method === "GET";
  const response = await api
    .request<ApiResponse<T>>({
      ...config,
      data: isGetMethod ? undefined : body,
      method,
      url,
    })
    .then((res) => {
      const data = res.data;

      if (!data.success) {
        throw new CustomError(data.error || data.message || "Erro inesperado", data);
      }

      if (showSuccess && (data.message || successMessage)) {
        toast.success(data.message || successMessage);
      }

      return data.data as T;
    })
    .catch((err) => {
      const res = err?.response?.data as ApiResponse | undefined;
      const status = err?.response?.status as number | undefined;

      if (status === 401 && signOutOnUnauthorized && typeof window !== "undefined") {
        signOut(true);
      }

      const message = res?.error || res?.message || err?.message || "Erro de conexão";

      if (!isGetMethod && !hideError) {
        toast.error(message);
      }

      throw new CustomError(message, {
        ...res,
        status: status || res?.status || 400,
        method,
      });
    });

  return response;
};

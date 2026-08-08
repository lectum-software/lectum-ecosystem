import type { AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import api from "@/api";
import { getSafeApiErrorMessage, getSafePublicMessage } from "@/api/errors";
import type { ApiMethod } from "@/api/generator";
import { signOut } from "@/hooks/cookies/signout";
import { isAdminViewAsReadOnlyError } from "@/utils/admin-view-as";

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
      timeout:
        config?.timeout ??
        (typeof FormData !== "undefined" && body instanceof FormData ? 120_000 : 30_000),
      url,
    })
    .then((res) => {
      const data = res.data;

      if (!data.success) {
        throw new CustomError(getSafeApiErrorMessage(data), data);
      }

      if (showSuccess && (data.message || successMessage)) {
        toast.success(
          getSafePublicMessage(
            data.message || successMessage,
            successMessage || "Operação concluída com sucesso.",
          ),
        );
      }

      return data.data as T;
    })
    .catch((err) => {
      const directData =
        err instanceof CustomError && err.data && typeof err.data === "object"
          ? (err.data as ApiResponse)
          : undefined;
      const res = (err?.response?.data as ApiResponse | undefined) ?? directData;
      const status = (err?.response?.status as number | undefined) ?? res?.status;

      if (status === 401 && signOutOnUnauthorized && typeof window !== "undefined") {
        signOut(true);
      }

      const message = getSafeApiErrorMessage(err, "Não foi possível conectar ao serviço.");

      if (!isGetMethod && !hideError && !isAdminViewAsReadOnlyError(res)) {
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

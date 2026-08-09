import axios, { AxiosHeaders } from "axios";
import { adminApiRequestUrl } from "@/lib/api-url";
import { getAdminDeviceId } from "@/lib/fingerprint";
import { isConfirmedAdminSessionRejection } from "@/lib/session-rejection";
import { clearAdminSession } from "@/lib/storage";

export const adminApi = axios.create({
  // Nunca enviar credenciais administrativas ao origin do Next.js quando a
  // API publicada estiver ausente. O origin reservado falha de forma segura.
  baseURL: adminApiRequestUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": "pt-BR",
    "X-Requested-With": "Lectum-Admin-Cookie-Auth",
  },
  timeout: 30_000,
});

adminApi.interceptors.request.use(async (config) => {
  const headers = AxiosHeaders.from(config.headers);
  const device = await getAdminDeviceId();

  headers.set("x-device", device);

  config.headers = headers;
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && isConfirmedAdminSessionRejection(error)) {
      clearAdminSession();
      if (!window.location.pathname.startsWith("/login")) {
        const callbackUrl = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    }

    return Promise.reject(error);
  },
);

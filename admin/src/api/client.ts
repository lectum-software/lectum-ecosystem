import axios, { AxiosHeaders } from "axios";
import { adminApiUrl } from "@/lib/api-url";
import { getAdminDeviceId } from "@/lib/fingerprint";
import { clearAdminSession, getAdminToken } from "@/lib/storage";

export const adminApi = axios.create({
  baseURL: adminApiUrl,
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
  const token = getAdminToken();

  headers.set("x-device", device);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  config.headers = headers;
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      clearAdminSession();
      if (!window.location.pathname.startsWith("/login")) {
        const callbackUrl = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    }

    return Promise.reject(error);
  },
);

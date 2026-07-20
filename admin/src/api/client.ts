import axios, { AxiosHeaders } from "axios";
import { getAdminDeviceId } from "@/lib/fingerprint";
import { clearAdminSession, getAdminToken } from "@/lib/storage";

const normalizeApiUrl = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\/+$/, "") : "http://localhost:3001";
};

export const adminApiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export const adminApi = axios.create({
  baseURL: adminApiUrl,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": "pt-BR",
  },
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

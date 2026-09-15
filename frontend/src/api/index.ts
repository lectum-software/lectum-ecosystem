import axios, { AxiosHeaders } from "axios";

import { applyStoredBearerFallback, USER_COOKIE_AUTH_HEADERS } from "@/api/auth-cookie";
import { getBearerToken } from "@/hooks/cookies/token";
import { fingerprint } from "@/utils/fingerprint";
import { getPublicApiSource } from "@/utils/public-asset-sources";

const API_URL = getPublicApiSource()?.origin ?? "https://api.invalid";
const NGROK_BROWSER_WARNING_HOSTS = ["ngrok-free.app", "ngrok-free.dev", "ngrok.app", "ngrok.io"];

const shouldSkipNgrokBrowserWarning = (apiUrl: string) => {
  try {
    const { hostname } = new URL(apiUrl);

    return NGROK_BROWSER_WARNING_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
};

const shouldSendNgrokBrowserWarningBypass = shouldSkipNgrokBrowserWarning(API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: USER_COOKIE_AUTH_HEADERS,
  timeout: 30_000,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const headers = AxiosHeaders.from(config.headers);
  const token = getBearerToken();
  const device = await fingerprint();

  if (device) headers.set("x-device", device);
  applyStoredBearerFallback(headers, token);
  if (shouldSendNgrokBrowserWarningBypass) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  headers.set("Accept-Language", "pt");
  config.headers = headers;

  return config;
});

export default api;

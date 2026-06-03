import axios, { AxiosHeaders } from "axios";

import { getToken } from "@/hooks/cookies/token";
import { fingerprint } from "@/utils/fingerprint";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const api = axios.create({
  baseURL: API_URL,
  timeout: 240000,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const headers = AxiosHeaders.from(config.headers);
  const token = getToken();
  const device = await fingerprint();

  if (device) headers.set("x-device", device);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  headers.set("Accept-Language", "pt");
  config.headers = headers;

  return config;
});

export default api;

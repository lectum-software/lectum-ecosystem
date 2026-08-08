import type { Admin } from "@/api/types";

const TOKEN_KEY = "lectum.admin.token";
const ADMIN_KEY = "lectum.admin.user";
const SIDEBAR_KEY = "lectum.admin.sidebar.collapsed";
const DEVICE_KEY = "lectum.admin.device";

const isBrowser = () => typeof window !== "undefined";
let transientAdminToken: string | null = null;

export type StoredAdmin = Omit<Admin, "admin_tokens" | "password" | "password_confirm">;

export const sanitizeAdmin = (admin: Admin): StoredAdmin => {
  const safe: Admin = { ...admin };
  delete safe.admin_tokens;
  delete safe.password;
  delete safe.password_confirm;
  return safe as StoredAdmin;
};

export const getAdminToken = () => {
  if (!isBrowser()) return null;

  if (transientAdminToken) return transientAdminToken;

  const sessionToken = window.sessionStorage.getItem(TOKEN_KEY);
  if (sessionToken) {
    transientAdminToken = sessionToken;
    return transientAdminToken;
  }

  const legacyToken = window.localStorage.getItem(TOKEN_KEY);
  if (legacyToken) transientAdminToken = legacyToken;

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
  if (transientAdminToken) window.sessionStorage.setItem(TOKEN_KEY, transientAdminToken);
  return transientAdminToken;
};

export const storeAdminSession = (token?: string | null) => {
  if (!isBrowser()) return;

  transientAdminToken = token || null;
  if (transientAdminToken) window.sessionStorage.setItem(TOKEN_KEY, transientAdminToken);
  else window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
};

export const clearAdminSession = () => {
  if (!isBrowser()) return;

  transientAdminToken = null;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
};

export const getSidebarCollapsed = () => {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(SIDEBAR_KEY) === "true";
};

export const setSidebarCollapsed = (collapsed: boolean) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
};

export const getStoredDevice = () => {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(DEVICE_KEY);
};

export const setStoredDevice = (device: string) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEVICE_KEY, device);
};

import type { Admin } from "@/api/types";

const TOKEN_KEY = "lectum.admin.token";
const ADMIN_KEY = "lectum.admin.user";
const SIDEBAR_KEY = "lectum.admin.sidebar.collapsed";
const DEVICE_KEY = "lectum.admin.device";

const isBrowser = () => typeof window !== "undefined";

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
  return window.localStorage.getItem(TOKEN_KEY);
};

export const getStoredAdmin = (): StoredAdmin | null => {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAdmin;
  } catch {
    window.localStorage.removeItem(ADMIN_KEY);
    return null;
  }
};

export const storeAdminSession = (admin: Admin, token: string) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_KEY, JSON.stringify(sanitizeAdmin(admin)));
};

export const clearAdminSession = () => {
  if (!isBrowser()) return;
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

import type { Admin } from "@/api/types";
import { ADMIN_SESSION_MARKER_COOKIE } from "@/lib/admin-session";

const TOKEN_KEY = "lectum.admin.token";
const ADMIN_KEY = "lectum.admin.user";
const SIDEBAR_KEY = "lectum.admin.sidebar.collapsed";
const DEVICE_KEY = "lectum.admin.device";

const isBrowser = () => typeof window !== "undefined";

type BrowserStorage = "localStorage" | "sessionStorage";
const transientStorage: Record<BrowserStorage, Map<string, string>> = {
  localStorage: new Map(),
  sessionStorage: new Map(),
};

const readStorageItem = (storageName: BrowserStorage, key: string) => {
  if (!isBrowser()) return null;
  if (transientStorage[storageName].has(key)) {
    return transientStorage[storageName].get(key) ?? null;
  }

  try {
    return window[storageName].getItem(key);
  } catch {
    return null;
  }
};

const writeStorageItem = (storageName: BrowserStorage, key: string, value: string) => {
  if (!isBrowser()) return;
  transientStorage[storageName].set(key, value);

  try {
    window[storageName].setItem(key, value);
  } catch {
    // O estado em memória continua funcional quando storage está bloqueado ou sem espaço.
  }
};

const removeStorageItem = (storageName: BrowserStorage, key: string) => {
  if (!isBrowser()) return;
  transientStorage[storageName].delete(key);

  try {
    window[storageName].removeItem(key);
  } catch {
    // Limpeza best-effort para navegadores que bloqueiam acesso ao storage.
  }
};

const sessionMarkerAttributes = () =>
  `Path=/; SameSite=Strict${window.location.protocol === "https:" ? "; Secure" : ""}`;

const storeAdminSessionMarker = () => {
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: o marcador precisa ser lido pelo proxy antes do JavaScript da página.
    document.cookie = `${ADMIN_SESSION_MARKER_COOKIE}=1; ${sessionMarkerAttributes()}`;
  } catch {
    // O cookie é apenas um marcador de navegação; a API continua sendo a autoridade da sessão.
  }
};

const clearAdminSessionMarker = () => {
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: o marcador precisa ser removido de forma compatível com todos os navegadores suportados.
    document.cookie = `${ADMIN_SESSION_MARKER_COOKIE}=; Max-Age=0; ${sessionMarkerAttributes()}`;
  } catch {
    // A limpeza da sessão em memória e na API não depende deste marcador best-effort.
  }
};

export type StoredAdmin = Omit<Admin, "admin_tokens" | "password" | "password_confirm">;

export const sanitizeAdmin = (admin: Admin): StoredAdmin => {
  const safe: Admin = { ...admin };
  delete safe.admin_tokens;
  delete safe.password;
  delete safe.password_confirm;
  return safe as StoredAdmin;
};

export const storeAdminSession = () => {
  if (!isBrowser()) return;

  storeAdminSessionMarker();
  removeStorageItem("sessionStorage", TOKEN_KEY);
  removeStorageItem("localStorage", TOKEN_KEY);
  removeStorageItem("localStorage", ADMIN_KEY);
};

export const clearAdminSession = () => {
  if (!isBrowser()) return;

  clearAdminSessionMarker();
  removeStorageItem("sessionStorage", TOKEN_KEY);
  removeStorageItem("localStorage", TOKEN_KEY);
  removeStorageItem("localStorage", ADMIN_KEY);
};

export const getSidebarCollapsed = () => {
  return readStorageItem("localStorage", SIDEBAR_KEY) === "true";
};

export const setSidebarCollapsed = (collapsed: boolean) => {
  writeStorageItem("localStorage", SIDEBAR_KEY, String(collapsed));
};

export const getStoredDevice = () => {
  return readStorageItem("localStorage", DEVICE_KEY);
};

export const setStoredDevice = (device: string) => {
  writeStorageItem("localStorage", DEVICE_KEY, device);
};

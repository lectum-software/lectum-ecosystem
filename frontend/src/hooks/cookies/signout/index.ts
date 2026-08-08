import api from "@/api";
import { removeToken } from "@/hooks/cookies/token";
import { removeUser } from "@/hooks/cookies/user";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";

const AUTH_STORAGE_KEYS = ["persist:lectum", "lectum.adminViewAs"];
const AUTH_SESSION_STORAGE_KEYS = [
  "lectum.adminViewAs",
  "lectum:analytics:authenticated-user-linked",
  "lectum:analytics:location-captured-session",
];

export const revokeSession = async () => {
  try {
    await api.post("/api/private/account/logout", undefined, { timeout: 5_000 });
  } catch {
    // A limpeza local deve continuar mesmo se a sessão já tiver expirado.
  }

  removeToken();
  removeUser();
};

export const signOut = async (callback?: boolean, redirect?: string) => {
  if (typeof window !== "undefined") {
    AUTH_STORAGE_KEYS.forEach((key) => {
      window.localStorage.removeItem(key);
    });
    AUTH_SESSION_STORAGE_KEYS.forEach((key) => {
      window.sessionStorage.removeItem(key);
    });
  }

  await revokeSession();

  if (typeof window === "undefined") return;

  const currentPath = window.location.pathname;

  if (redirect) {
    window.location.href = normalizeSafeInternalRedirect(redirect, "/auth/login") || "/auth/login";
    return;
  }

  window.location.href = callback ? `/auth/login?callbackUrl=${currentPath}` : "/auth/login";
};

export const useSignOut = (callback?: boolean) => {
  const out = async (redirect?: string) => {
    await signOut(callback, redirect);
  };

  return { out };
};

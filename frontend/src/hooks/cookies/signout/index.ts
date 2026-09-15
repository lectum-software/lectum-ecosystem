import { toast } from "sonner";
import api from "@/api";
import { getBearerToken, removeToken } from "@/hooks/cookies/token";
import { removeUser } from "@/hooks/cookies/user";
import { resetAnalyticsSession } from "@/utils/analytics-session";
import { unsubscribeCurrentPushSubscription } from "@/utils/push-subscription";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";
import { isConfirmedUserSessionRejection } from "@/utils/session-rejection";

const AUTH_STORAGE_KEYS = ["persist:lectum", "lectum.adminViewAs"];
const AUTH_SESSION_STORAGE_KEYS = ["lectum.adminViewAs"];

export const revokeSession = async () => {
  const bearerToken = getBearerToken();

  try {
    await api.post("/api/private/account/logout", undefined, {
      headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
      timeout: 5_000,
    });
  } catch (error) {
    // Uma rejeição controlada indica que a sessão já não autentica. Falhas de
    // rede/proxy não permitem apagar apenas a aparência local do login.
    if (!isConfirmedUserSessionRejection(error)) throw error;
  }

  await clearLocalAuthSession();
};

const clearStorageKeys = (storageName: "localStorage" | "sessionStorage", keys: string[]) => {
  if (typeof window === "undefined") return;

  try {
    const storage = window[storageName];
    keys.forEach((key) => {
      storage.removeItem(key);
    });
  } catch {
    // Restrições do browser não podem impedir a revogação da sessão.
  }
};

export const clearLocalAuthSession = async () => {
  await unsubscribeCurrentPushSubscription().catch(() => {
    // Browser offline/bloqueado não pode impedir a limpeza local após exclusão confirmada.
  });

  resetAnalyticsSession();
  removeToken();
  removeUser();
  clearStorageKeys("localStorage", AUTH_STORAGE_KEYS);
  clearStorageKeys("sessionStorage", AUTH_SESSION_STORAGE_KEYS);
};

export const signOut = async (callback?: boolean, redirect?: string) => {
  await revokeSession();

  if (typeof window === "undefined") return;

  const currentPath = window.location.pathname;

  if (redirect) {
    window.location.href = normalizeSafeInternalRedirect(redirect, "/auth/login") || "/auth/login";
    return;
  }

  window.location.href = callback
    ? `/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`
    : "/auth/login";
};

export const useSignOut = (callback?: boolean) => {
  const out = async (redirect?: string) => {
    try {
      await signOut(callback, redirect);
    } catch {
      toast.error("Não foi possível encerrar a sessão. Verifique sua conexão e tente novamente.");
    }
  };

  return { out };
};

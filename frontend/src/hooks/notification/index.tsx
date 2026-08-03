"use client";

import { BellRing, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotificationSubscription } from "@/api/callers/notification_subscription";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  clearPromptDismissalState,
  hasCompletedRegistrationForPrompts,
  markPromptDismissedWithBackoff,
  type PromptUserRole,
} from "@/utils/prompt-cooldown";
import { urlToBase64 } from "@/utils/urlToBase64";

type PermissionRequestResult =
  | "denied"
  | "default"
  | "granted"
  | "unsupported"
  | "vapid-unavailable";

type NotificationPermissionValue = NotificationPermission | "loading" | "unsupported";

const DISMISSED_UNTIL_KEY = "lectum.notificationsPermissionPrompt.dismissedUntil";
const DISMISS_COUNT_KEY = "lectum.notificationsPermissionPrompt.dismissCount";
const LEGACY_NEVER_ASK_AGAIN_KEY = "lectum.notificationsPermissionPrompt.neverAskAgain";
const ACTIVE_PROMPT_KEY = "lectum.activePrompt";
const ACTIVE_PROMPT_VALUE = "notification-permission";
const SHOW_DELAY_MS = 3200;

// A subscription do browser fica presa à VAPID key com que foi criada. Se a key
// do backend mudou, a antiga gera 403 no envio — então precisamos detectar e recriar.
function hasSameApplicationServerKey(subscription: PushSubscription, current: Uint8Array): boolean {
  const existing = subscription.options?.applicationServerKey;
  if (!existing) {
    return false;
  }

  const bytes = new Uint8Array(existing as ArrayBuffer);
  if (bytes.length !== current.length) {
    return false;
  }

  return bytes.every((value, index) => value === current[index]);
}

const supportsPushNotifications = () => {
  if (typeof window === "undefined") return false;

  return (
    "Notification" in window &&
    typeof window.Notification.requestPermission === "function" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
};

const safeLocalStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const safeSessionStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const isDismissedByPreference = () => {
  const storage = safeLocalStorage();
  if (!storage) return true;

  const dismissedUntil = Number(storage.getItem(DISMISSED_UNTIL_KEY) ?? 0);

  return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
};

const markDismissedForCooldown = (role: PromptUserRole) => {
  const storage = safeLocalStorage();
  if (!storage) return;

  markPromptDismissedWithBackoff({
    dismissedUntilKey: DISMISSED_UNTIL_KEY,
    dismissCountKey: DISMISS_COUNT_KEY,
    role,
    storage,
  });
};

const clearPromptCooldown = () => {
  const storage = safeLocalStorage();
  if (!storage) return;

  clearPromptDismissalState({
    dismissedUntilKey: DISMISSED_UNTIL_KEY,
    dismissCountKey: DISMISS_COUNT_KEY,
    legacyPermanentDismissKeys: [LEGACY_NEVER_ASK_AGAIN_KEY],
    storage,
  });
};

const reserveActivePrompt = () => {
  const storage = safeSessionStorage();
  if (!storage) return true;

  const activePrompt = storage.getItem(ACTIVE_PROMPT_KEY);
  if (activePrompt && activePrompt !== ACTIVE_PROMPT_VALUE) return false;

  storage.setItem(ACTIVE_PROMPT_KEY, ACTIVE_PROMPT_VALUE);

  return true;
};

const releaseActivePrompt = () => {
  const storage = safeSessionStorage();
  if (!storage) return;

  if (storage.getItem(ACTIVE_PROMPT_KEY) === ACTIVE_PROMPT_VALUE) {
    storage.removeItem(ACTIVE_PROMPT_KEY);
  }
};

const registerNotificationServiceWorker = async () => {
  if (!supportsPushNotifications()) return null;

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.error("Falha ao registrar o service worker:", error);
    return null;
  }
};

/**
 * Estado e ações de push web da Lectum.
 *
 * Camadas separadas:
 * 1. Preferências de produto (`notification_preference`) vivem nos callers de notificação.
 * 2. Permissão nativa (`Notification.permission`) é lida aqui e só é pedida após gesto explícito.
 * 3. Subscription técnica (`notification_subscription`) é criada/revalidada quando a permissão já existe.
 */
export const useNotificationPushPermission = () => {
  const user = useAppSelector((state) => state.user);
  const { key: keyMutation, store: storeMutation } = useNotificationSubscription();
  const keyMutateAsyncRef = useRef(keyMutation.mutateAsync);
  const storeMutateAsyncRef = useRef(storeMutation.mutateAsync);
  const [isSupported, setIsSupported] = useState(() => supportsPushNotifications());
  const [isChecking, setIsChecking] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionValue>(() => {
    if (!supportsPushNotifications()) return "unsupported";

    return window.Notification.permission;
  });
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const bootSignatureRef = useRef<string | null>(null);

  const isConfirmedUser = Boolean(user?.id && user.confirmed);

  useEffect(() => {
    keyMutateAsyncRef.current = keyMutation.mutateAsync;
  }, [keyMutation.mutateAsync]);

  useEffect(() => {
    storeMutateAsyncRef.current = storeMutation.mutateAsync;
  }, [storeMutation.mutateAsync]);

  const loadVapidKey = useCallback(async () => {
    if (!isConfirmedUser || !supportsPushNotifications()) {
      setVapidPublicKey(null);
      return null;
    }

    try {
      const vapid = await keyMutateAsyncRef.current();
      const nextKey = vapid?.key || null;
      setVapidPublicKey(nextKey);

      return nextKey;
    } catch (error) {
      console.error("Erro ao obter chave VAPID para notificações:", error);
      setVapidPublicKey(null);

      return null;
    }
  }, [isConfirmedUser]);

  const ensurePushSubscription = useCallback(async (publicKey: string) => {
    if (!supportsPushNotifications()) return false;

    const registration = await registerNotificationServiceWorker();
    if (!registration) return false;

    const applicationServerKey = urlToBase64(publicKey);
    let subscription = await registration.pushManager.getSubscription();

    // Subscription criada com VAPID key diferente da atual → descarta (senão dá 403).
    if (subscription && !hasSameApplicationServerKey(subscription, applicationServerKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // SEMPRE persiste no servidor (upsert idempotente via force): garante o
    // re-save quando a subscription existe no browser mas sumiu do banco.
    await storeMutateAsyncRef.current({ subscription: subscription.toJSON(), force: true });

    return true;
  }, []);

  useEffect(() => {
    if (!isConfirmedUser) {
      bootSignatureRef.current = null;
      return;
    }

    if (!supportsPushNotifications()) {
      bootSignatureRef.current = null;
      return;
    }

    const bootSignature = `${user?.id}:${user?.confirmed}`;
    if (bootSignatureRef.current === bootSignature) {
      return;
    }

    bootSignatureRef.current = bootSignature;
    let cancelled = false;

    const boot = async () => {
      setIsChecking(true);
      setIsSupported(true);

      await registerNotificationServiceWorker();

      const currentPermission = window.Notification.permission;
      if (!cancelled) {
        setPermission(currentPermission);
      }

      const publicKey = await loadVapidKey();
      if (cancelled) return;

      setIsChecking(false);

      if (currentPermission === "granted" && publicKey) {
        try {
          await ensurePushSubscription(publicKey);
        } catch (error) {
          console.error("Erro ao revalidar subscription de notificações push:", error);
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (bootSignatureRef.current === bootSignature) {
        bootSignatureRef.current = null;
      }
    };
  }, [ensurePushSubscription, isConfirmedUser, loadVapidKey, user?.confirmed, user?.id]);

  const requestPermissionAndSubscribe = useCallback(async (): Promise<PermissionRequestResult> => {
    if (!isConfirmedUser || !supportsPushNotifications()) {
      setPermission("unsupported");
      return "unsupported";
    }

    setIsSupported(true);
    setIsChecking(true);

    const publicKey = vapidPublicKey ?? (await loadVapidKey());
    if (!publicKey) {
      setIsChecking(false);
      return "vapid-unavailable";
    }

    const currentPermission = window.Notification.permission;
    if (currentPermission === "denied") {
      setPermission("denied");
      setIsChecking(false);
      return "denied";
    }

    if (currentPermission === "granted") {
      setPermission("granted");
      try {
        await ensurePushSubscription(publicKey);
      } finally {
        setIsChecking(false);
      }
      return "granted";
    }

    const nextPermission = await window.Notification.requestPermission();
    setPermission(nextPermission);

    if (nextPermission === "granted") {
      clearPromptCooldown();
      try {
        await ensurePushSubscription(publicKey);
      } finally {
        setIsChecking(false);
      }
      return "granted";
    }

    setIsChecking(false);
    return nextPermission;
  }, [ensurePushSubscription, isConfirmedUser, loadVapidKey, vapidPublicKey]);

  return useMemo(
    () => ({
      canRequestPermission:
        isConfirmedUser &&
        isSupported &&
        Boolean(vapidPublicKey) &&
        permission === "default" &&
        !isChecking,
      hasVapidKey: Boolean(vapidPublicKey),
      isChecking,
      isConfirmedUser,
      isRequestingPermission: keyMutation.isPending || storeMutation.isPending,
      isSupported,
      permission,
      requestPermissionAndSubscribe,
    }),
    [
      isChecking,
      isConfirmedUser,
      isSupported,
      keyMutation.isPending,
      permission,
      requestPermissionAndSubscribe,
      storeMutation.isPending,
      vapidPublicKey,
    ],
  );
};

const NotificationPermissionPrompt = ({
  isRequestingPermission,
  onClose,
  onEnable,
}: {
  isRequestingPermission: boolean;
  onClose: (persist: "cooldown" | "none") => void;
  onEnable: () => Promise<void>;
}) => (
  <div
    className={cn(
      "fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 px-3 pt-6 text-foreground backdrop-blur-[8px] transition-opacity duration-200 ease-out supports-[backdrop-filter]:bg-slate-950/35",
      "pb-[calc(5rem+env(safe-area-inset-bottom))] sm:items-center sm:px-6 sm:pb-6",
    )}
  >
    <section
      aria-label="Ativar notificações da Lectum"
      aria-modal="true"
      className="relative w-full max-w-[440px] rounded-[1.75rem] border border-border bg-surface p-4 text-foreground shadow-[var(--lectum-shadow)]"
      role="dialog"
    >
      <button
        aria-label="Agora não"
        className="absolute top-3 right-3 inline-grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        onClick={() => onClose("cooldown")}
        type="button"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex gap-3 pr-8">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft p-1.5">
          <Image
            alt=""
            aria-hidden="true"
            className="h-9 w-9 object-contain"
            height={36}
            src="/icon.png"
            width={36}
          />
        </div>

        <div className="min-w-0">
          <p className="text-base font-extrabold tracking-[-0.03em] text-foreground">
            Ative notificações da Lectum
          </p>
          <p className="mt-1 text-sm leading-5 text-muted">
            Receba avisos importantes sobre respostas, interações e contatos.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Button
          className="h-11 rounded-2xl text-sm font-extrabold"
          disabled={isRequestingPermission}
          onClick={onEnable}
          type="button"
        >
          <BellRing className="h-4 w-4" aria-hidden="true" />
          <span>{isRequestingPermission ? "Ativando..." : "Ativar notificações"}</span>
        </Button>

        <Button
          className="h-10 rounded-2xl text-xs font-bold"
          onClick={() => onClose("cooldown")}
          type="button"
          variant="outline"
        >
          Agora não
        </Button>
      </div>
    </section>
  </div>
);

/**
 * Gerencia o push web (TASK-29A/TASK-38). O fluxo in-app (listar/marcar/limpar)
 * vive em `@/api/callers/notification`. Aqui registramos o service worker,
 * revalidamos subscription quando a permissão já está concedida e exibimos o
 * consentimento contextual antes de qualquer chamada a `Notification.requestPermission()`.
 *
 * Sem VAPID configurado no backend (`_product/decisions.md`), a obtenção da key
 * retorna vazio e a inscrição é abortada — sem prometer push.
 */
export const NotificationManager = () => {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user);
  const [isVisible, setIsVisible] = useState(false);
  const {
    canRequestPermission,
    isRequestingPermission,
    permission,
    requestPermissionAndSubscribe,
  } = useNotificationPushPermission();
  const hasCompletedRegistration = hasCompletedRegistrationForPrompts(user);

  useEffect(() => {
    if (isVisible) return;

    const isPrivateAppRoute = pathname.startsWith("/app");
    const isNotificationsSettingsRoute = pathname === "/app/configuracoes/notificacoes";

    if (
      !isPrivateAppRoute ||
      isNotificationsSettingsRoute ||
      !hasCompletedRegistration ||
      !canRequestPermission ||
      isDismissedByPreference()
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!reserveActivePrompt()) return;
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [canRequestPermission, hasCompletedRegistration, isVisible, pathname]);

  useEffect(() => {
    if (!isVisible) return;
    if (permission !== "default") {
      releaseActivePrompt();
    }
  }, [isVisible, permission]);

  useEffect(() => {
    if (!isVisible || hasCompletedRegistration) return;

    releaseActivePrompt();
  }, [hasCompletedRegistration, isVisible]);

  useEffect(
    () => () => {
      releaseActivePrompt();
    },
    [],
  );

  const closePrompt = useCallback(
    (persist: "cooldown" | "none") => {
      if (persist === "cooldown") {
        markDismissedForCooldown(user?.role);
      }

      setIsVisible(false);
      releaseActivePrompt();
    },
    [user?.role],
  );

  const handleEnable = async () => {
    const result = await requestPermissionAndSubscribe();
    closePrompt(result === "granted" ? "none" : "cooldown");
  };

  if (!isVisible || !hasCompletedRegistration || permission !== "default") return null;

  return (
    <NotificationPermissionPrompt
      isRequestingPermission={isRequestingPermission}
      onClose={closePrompt}
      onEnable={handleEnable}
    />
  );
};

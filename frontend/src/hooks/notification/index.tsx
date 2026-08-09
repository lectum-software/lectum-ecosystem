"use client";

import { BellRing, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotificationSubscription } from "@/api/callers/notification_subscription";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getBrowserStorage, readStorageItem } from "@/utils/browser-storage";
import { reportClientFailure } from "@/utils/client-log";
import {
  clearPromptDismissalState,
  hasCompletedRegistrationForPrompts,
  markPromptDismissedWithBackoff,
  type PromptUserRole,
} from "@/utils/prompt-cooldown";
import {
  releaseActivePrompt as releaseCoordinatedPrompt,
  reserveActivePrompt as reserveCoordinatedPrompt,
} from "@/utils/prompt-coordinator";
import { withPushOperationTimeout } from "@/utils/push-subscription";
import { urlToBase64 } from "@/utils/urlToBase64";

type PermissionRequestResult =
  | "denied"
  | "default"
  | "granted"
  | "subscription-unavailable"
  | "unsupported"
  | "vapid-unavailable";

type NotificationPermissionValue = NotificationPermission | "loading" | "unsupported";

const DISMISSED_UNTIL_KEY = "lectum.notificationsPermissionPrompt.dismissedUntil";
const DISMISS_COUNT_KEY = "lectum.notificationsPermissionPrompt.dismissCount";
const LEGACY_NEVER_ASK_AGAIN_KEY = "lectum.notificationsPermissionPrompt.neverAskAgain";
const ACTIVE_PROMPT_VALUE = "notification-permission";
const SHOW_DELAY_MS = 3200;

const isPrivateAppPath = (pathname: string) => pathname === "/app" || pathname.startsWith("/app/");

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

const isDismissedByPreference = () => {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return true;

  const dismissedUntil = Number(readStorageItem(storage, DISMISSED_UNTIL_KEY) ?? 0);

  return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
};

const markDismissedForCooldown = (role: PromptUserRole) => {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return;

  markPromptDismissedWithBackoff({
    dismissedUntilKey: DISMISSED_UNTIL_KEY,
    dismissCountKey: DISMISS_COUNT_KEY,
    role,
    storage,
  });
};

const clearPromptCooldown = () => {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return;

  clearPromptDismissalState({
    dismissedUntilKey: DISMISSED_UNTIL_KEY,
    dismissCountKey: DISMISS_COUNT_KEY,
    legacyPermanentDismissKeys: [LEGACY_NEVER_ASK_AGAIN_KEY],
    storage,
  });
};

const reserveActivePrompt = () => {
  return reserveCoordinatedPrompt(ACTIVE_PROMPT_VALUE);
};

const releaseActivePrompt = () => {
  releaseCoordinatedPrompt(ACTIVE_PROMPT_VALUE);
};

const registerNotificationServiceWorker = async () => {
  if (!supportsPushNotifications()) return null;

  try {
    return await withPushOperationTimeout(navigator.serviceWorker.register("/sw.js"));
  } catch (error) {
    reportClientFailure("service-worker-registration", error);
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
  const vapidLoadGenerationRef = useRef(0);

  const isConfirmedUser = Boolean(user?.id && user.confirmed);
  // Um boot cancelado ao trocar/sair da conta nao deve manter loading visivel
  // para um contexto que ja nao pode usar notificacoes.
  const isCheckingForCurrentUser = isConfirmedUser && isChecking;

  useEffect(() => {
    keyMutateAsyncRef.current = keyMutation.mutateAsync;
  }, [keyMutation.mutateAsync]);

  useEffect(() => {
    storeMutateAsyncRef.current = storeMutation.mutateAsync;
  }, [storeMutation.mutateAsync]);

  const loadVapidKey = useCallback(async () => {
    const generation = vapidLoadGenerationRef.current + 1;
    vapidLoadGenerationRef.current = generation;

    if (!isConfirmedUser || !supportsPushNotifications()) {
      if (vapidLoadGenerationRef.current === generation) setVapidPublicKey(null);
      return null;
    }

    try {
      const vapid = await keyMutateAsyncRef.current();
      const nextKey = vapid?.key || null;
      if (vapidLoadGenerationRef.current === generation) setVapidPublicKey(nextKey);

      return nextKey;
    } catch (error) {
      reportClientFailure("notification-vapid-key", error);
      if (vapidLoadGenerationRef.current === generation) setVapidPublicKey(null);

      return null;
    }
  }, [isConfirmedUser]);

  const ensurePushSubscription = useCallback(async (publicKey: string) => {
    if (!supportsPushNotifications()) return false;

    const registration = await registerNotificationServiceWorker();
    if (!registration) return false;

    const applicationServerKey = urlToBase64(publicKey);
    let subscription = await withPushOperationTimeout(registration.pushManager.getSubscription());

    // Subscription criada com VAPID key diferente da atual → descarta (senão dá 403).
    if (subscription && !hasSameApplicationServerKey(subscription, applicationServerKey)) {
      await withPushOperationTimeout(subscription.unsubscribe());
      subscription = null;
    }

    if (!subscription) {
      subscription = await withPushOperationTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }),
      );
    }

    // SEMPRE persiste no servidor (upsert idempotente via force): garante o
    // re-save quando a subscription existe no browser mas sumiu do banco.
    await storeMutateAsyncRef.current({ subscription: subscription.toJSON(), force: true });

    return true;
  }, []);

  useEffect(() => {
    if (!isConfirmedUser) {
      bootSignatureRef.current = null;
      vapidLoadGenerationRef.current += 1;
      return;
    }

    if (!supportsPushNotifications()) {
      bootSignatureRef.current = null;
      vapidLoadGenerationRef.current += 1;
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

      try {
        await registerNotificationServiceWorker();

        const currentPermission = window.Notification.permission;
        if (!cancelled) {
          setPermission(currentPermission);
        }

        const publicKey = await loadVapidKey();
        if (cancelled) return;

        if (currentPermission === "granted" && publicKey) {
          await ensurePushSubscription(publicKey);
        }
      } catch (error) {
        reportClientFailure("notification-push-subscription", error);
      } finally {
        if (!cancelled) setIsChecking(false);
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

    try {
      const publicKey = vapidPublicKey ?? (await loadVapidKey());
      if (!publicKey) return "vapid-unavailable";

      const currentPermission = window.Notification.permission;
      if (currentPermission === "denied") {
        setPermission("denied");
        return "denied";
      }

      if (currentPermission === "granted") {
        setPermission("granted");
        const subscribed = await ensurePushSubscription(publicKey);
        return subscribed ? "granted" : "subscription-unavailable";
      }

      const nextPermission = await window.Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission === "granted") {
        const subscribed = await ensurePushSubscription(publicKey);
        if (!subscribed) return "subscription-unavailable";

        clearPromptCooldown();
        return "granted";
      }

      return nextPermission;
    } catch (error) {
      reportClientFailure("notification-permission-subscription", error);

      const currentPermission = window.Notification.permission;
      setPermission(currentPermission);
      return currentPermission === "granted" ? "subscription-unavailable" : currentPermission;
    } finally {
      setIsChecking(false);
    }
  }, [ensurePushSubscription, isConfirmedUser, loadVapidKey, vapidPublicKey]);

  return useMemo(
    () => ({
      canRequestPermission:
        isConfirmedUser &&
        isSupported &&
        Boolean(vapidPublicKey) &&
        permission === "default" &&
        !isCheckingForCurrentUser,
      hasVapidKey: Boolean(vapidPublicKey),
      isChecking: isCheckingForCurrentUser,
      isConfirmedUser,
      isRequestingPermission:
        isConfirmedUser &&
        (isCheckingForCurrentUser || keyMutation.isPending || storeMutation.isPending),
      isSupported,
      permission,
      requestPermissionAndSubscribe,
    }),
    [
      isCheckingForCurrentUser,
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
      "fixed inset-0 z-[70] flex items-end justify-center bg-media-background/35 px-3 pt-6 text-foreground backdrop-blur-[8px] transition-opacity duration-200 ease-out supports-[backdrop-filter]:bg-media-background/35",
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
 * Gerencia o push web. O fluxo in-app (listar/marcar/limpar)
 * vive em `@/api/callers/notification`. Aqui registramos o service worker,
 * revalidamos subscription quando a permissão já está concedida e exibimos o
 * consentimento contextual antes de qualquer chamada a `Notification.requestPermission()`.
 *
 * Sem a chave pública configurada, a obtenção retorna vazio e a inscrição é
 * abortada sem alterar a preferência do usuário.
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

    const isPrivateAppRoute = isPrivateAppPath(pathname);
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
      const timer = window.setTimeout(() => setIsVisible(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, [isVisible, permission]);

  useEffect(() => {
    if (!isVisible) return;

    const canRemainVisible =
      hasCompletedRegistration &&
      isPrivateAppPath(pathname) &&
      pathname !== "/app/configuracoes/notificacoes";
    if (canRemainVisible) return;

    releaseActivePrompt();
    const timer = window.setTimeout(() => setIsVisible(false), 0);
    return () => window.clearTimeout(timer);
  }, [hasCompletedRegistration, isVisible, pathname]);

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
    try {
      const result = await requestPermissionAndSubscribe();
      closePrompt(result === "granted" ? "none" : "cooldown");
    } catch (error) {
      reportClientFailure("notification-permission-request", error);
      closePrompt("cooldown");
    }
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

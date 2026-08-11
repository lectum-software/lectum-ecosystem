"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotificationSubscription } from "@/api/callers/notification_subscription";
import { useAppSelector } from "@/hooks/redux";
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
 * 2. Permissão nativa (`Notification.permission`) é lida aqui e pedida somente pelas superfícies autorizadas.
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

/**
 * Gerencia o push web. O fluxo in-app (listar/marcar/limpar)
 * vive em `@/api/callers/notification`. Aqui registramos o service worker,
 * revalidamos subscription quando a permissão já está concedida e, por decisão
 * de produto, chamamos diretamente o prompt nativo no momento em que a modal
 * contextual automática seria exibida.
 *
 * Sem a chave pública configurada, a obtenção retorna vazio e a inscrição é
 * abortada sem alterar a preferência do usuário.
 */
export const NotificationManager = () => {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user);
  const [isNativePromptRequesting, setIsNativePromptRequesting] = useState(false);
  const { canRequestPermission, requestPermissionAndSubscribe } = useNotificationPushPermission();
  const userRole = user?.role;
  const hasCompletedRegistration = hasCompletedRegistrationForPrompts(user);

  const requestNativePermission = useCallback(async () => {
    setIsNativePromptRequesting(true);

    try {
      const result = await requestPermissionAndSubscribe();

      if (result !== "granted") {
        markDismissedForCooldown(userRole);
      }
    } catch (error) {
      reportClientFailure("notification-permission-request", error);
      markDismissedForCooldown(userRole);
    } finally {
      setIsNativePromptRequesting(false);
      releaseActivePrompt();
    }
  }, [requestPermissionAndSubscribe, userRole]);

  useEffect(() => {
    if (isNativePromptRequesting) return;

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
      void requestNativePermission();
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    canRequestPermission,
    hasCompletedRegistration,
    isNativePromptRequesting,
    pathname,
    requestNativePermission,
  ]);

  useEffect(
    () => () => {
      releaseActivePrompt();
    },
    [],
  );

  return null;
};

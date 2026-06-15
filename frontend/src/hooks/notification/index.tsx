"use client";

import { useEffect, useRef } from "react";
import { useNotificationSubscription } from "@/api/callers/notification_subscription";
import { useAppSelector } from "@/hooks/redux";
import { urlToBase64 } from "@/utils/urlToBase64";

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

/**
 * Gerencia o push web (TASK-29A). O fluxo in-app (listar/marcar/limpar) vive em
 * `@/api/callers/notification`. Aqui registramos o service worker e, após o
 * usuário confirmar o e-mail, inscrevemos no pushManager e persistimos a
 * subscription via `/api/private/notification_subscription/*`.
 *
 * Sem VAPID configurado no backend (`_product/decisions.md`), a obtenção da key
 * retorna vazio e a inscrição é abortada silenciosamente — sem prometer push.
 */
export const NotificationManager = () => {
  const user = useAppSelector((state) => state.user);
  const { key, store } = useNotificationSubscription();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Falha ao registrar o service worker:", error);
    });
  }, []);

  useEffect(() => {
    if (!user?.id || !user?.confirmed || startedRef.current) {
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    startedRef.current = true;

    const subscribe = async () => {
      try {
        const vapid = await key.mutateAsync();
        if (!vapid?.key) {
          return;
        }

        const permission = await window.Notification.requestPermission();
        if (permission !== "granted") {
          return;
        }

        const applicationServerKey = urlToBase64(vapid.key);

        const registration = await navigator.serviceWorker.ready;
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
        await store.mutateAsync({ subscription: subscription.toJSON(), force: true });
      } catch (error) {
        console.error("Erro ao inscrever notificações push:", error);
      }
    };

    void subscribe();
  }, [user?.id, user?.confirmed, key, store]);

  return null;
};

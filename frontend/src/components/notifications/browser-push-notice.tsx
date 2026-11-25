"use client";

import { useState, useSyncExternalStore } from "react";
import { useNotificationPushPermission } from "@/hooks/notification";
import { useAppSelector } from "@/hooks/redux";
import { getBrowserStorage, readStorageItem, writeStorageItem } from "@/utils/browser-storage";
import {
  getPushNoticeState,
  isDismissiblePushNotice,
  needsHomeScreen,
  pushNoticeDismissalKey,
} from "./push-notice-state";
import { PushNoticeView } from "./push-notice-view";

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export const BrowserPushNotice = ({ settings = false }: { settings?: boolean }) => {
  const userId = useAppSelector((state) => state.user?.id);
  const push = useNotificationPushPermission();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [requesting, setRequesting] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const homeScreenRequired =
    mounted &&
    needsHomeScreen(
      navigator.userAgent,
      navigator.maxTouchPoints,
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
  const state = getPushNoticeState({
    confirmed: push.isConfirmedUser,
    mounted,
    homeScreenRequired,
    supported: push.isSupported,
    checking: push.isChecking,
    requesting,
    hasKey: push.hasVapidKey,
    permission: push.permission,
    subscriptionStatus: push.subscriptionStatus,
  });
  const key =
    userId && isDismissiblePushNotice(state) ? pushNoticeDismissalKey(userId, state) : null;
  const storedDismissal = useSyncExternalStore(
    subscribe,
    () => Boolean(key && readStorageItem(getBrowserStorage("localStorage"), key) === "1"),
    serverSnapshot,
  );
  if (!settings && key && (dismissedKey === key || storedDismissal)) return null;
  return (
    <PushNoticeView
      state={state}
      settings={settings}
      onDismiss={() => {
        if (!key) return;
        writeStorageItem(getBrowserStorage("localStorage"), key, "1");
        setDismissedKey(key);
        document
          .querySelector<HTMLAnchorElement>('[aria-label="Configurações de notificações"]')
          ?.focus();
      }}
      onRequest={() => {
        if (requesting) return;
        setRequesting(true);
        void push.requestPermissionAndSubscribe().finally(() => setRequesting(false));
      }}
    />
  );
};

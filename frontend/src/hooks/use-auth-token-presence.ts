"use client";

import { useSyncExternalStore } from "react";
import { getToken } from "@/hooks/cookies/token";

const subscribers = new Set<() => void>();
let stopListening: (() => void) | undefined;

export const subscribeAuthToken = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  // Each subscription owns its cleanup; all consumers share the browser listeners.
  const subscriber = () => onStoreChange();
  subscribers.add(subscriber);

  if (!stopListening) {
    const notify = () => {
      for (const callback of subscribers) callback();
    };
    const interval = window.setInterval(notify, 1000);
    window.addEventListener("focus", notify);
    window.addEventListener("storage", notify);
    stopListening = () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", notify);
      window.removeEventListener("storage", notify);
    };
  }

  return () => {
    if (!subscribers.delete(subscriber) || subscribers.size > 0) return;
    stopListening?.();
    stopListening = undefined;
  };
};

export const getAuthTokenSnapshot = () => {
  if (typeof window === "undefined") return false;

  return Boolean(getToken());
};

// SSR and the first hydration render must agree before consulting browser cookies.
export const getAuthTokenServerSnapshot = () => false;

// Presence only enables session validation; it does not establish identity or access.
export const useAuthTokenPresence = () =>
  useSyncExternalStore(subscribeAuthToken, getAuthTokenSnapshot, getAuthTokenServerSnapshot);

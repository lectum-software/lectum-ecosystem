"use client";

import { useEffect, useRef } from "react";
import { useLocationCapture } from "@/api/callers/analytics";
import { useAppSelector } from "@/hooks/redux";

const VISITOR_ID_KEY = "lectum:analytics:visitor-id";
const SESSION_ID_KEY = "lectum:analytics:session-id";
const SESSION_CAPTURED_KEY = "lectum:analytics:location-captured-session";
const LAST_CAPTURED_AT_KEY = "lectum:analytics:location-captured-at";
const LAST_USER_ID_KEY = "lectum:analytics:location-captured-user-id";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const createTrackingId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lectum-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const safeGetItem = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (storage: Storage, key: string, value: string) => {
  try {
    storage.setItem(key, value);
  } catch {
    // Analytics não deve quebrar a experiência caso storage esteja indisponível.
  }
};

const getOrCreateStorageId = (storage: Storage, key: string) => {
  const existingId = safeGetItem(storage, key);
  if (existingId) return existingId;

  const newId = createTrackingId();
  safeSetItem(storage, key, newId);

  return newId;
};

export const LocationCapture = () => {
  const userId = useAppSelector((state) => state.user?.id ?? null);
  const { mutateAsync } = useLocationCapture();
  const inFlightKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visitorId = getOrCreateStorageId(window.localStorage, VISITOR_ID_KEY);
    const sessionId = getOrCreateStorageId(window.sessionStorage, SESSION_ID_KEY);
    const now = Date.now();
    const lastCapturedAt = Number(safeGetItem(window.localStorage, LAST_CAPTURED_AT_KEY) || 0);
    const lastUserId = safeGetItem(window.localStorage, LAST_USER_ID_KEY);
    const alreadyCapturedInSession =
      safeGetItem(window.sessionStorage, SESSION_CAPTURED_KEY) === "true";
    const shouldLinkAuthenticatedUser = Boolean(userId && lastUserId !== userId);
    const shouldCaptureByTime = !lastCapturedAt || now - lastCapturedAt >= ONE_DAY_MS;

    if (alreadyCapturedInSession && !shouldLinkAuthenticatedUser) return;
    if (!shouldCaptureByTime && !shouldLinkAuthenticatedUser) return;

    const inFlightKey = `${visitorId}:${sessionId}:${userId || "anonymous"}:${
      shouldCaptureByTime ? "capture" : "link"
    }`;

    if (inFlightKeyRef.current === inFlightKey) return;
    inFlightKeyRef.current = inFlightKey;

    void mutateAsync({ visitor_id: visitorId, session_id: sessionId })
      .then((response) => {
        safeSetItem(window.sessionStorage, SESSION_CAPTURED_KEY, "true");
        safeSetItem(window.localStorage, LAST_CAPTURED_AT_KEY, String(now));

        if (userId && response.authenticated) {
          safeSetItem(window.localStorage, LAST_USER_ID_KEY, userId);
        }
      })
      .catch(() => {
        // Falhas de analytics são silenciosas por requisito de privacidade/UX.
      })
      .finally(() => {
        if (inFlightKeyRef.current === inFlightKey) {
          inFlightKeyRef.current = null;
        }
      });
  }, [mutateAsync, userId]);

  return null;
};

import { ANALYTICS_SESSION_ID_KEY } from "@/utils/analytics-session";
import { getBrowserStorage, readStorageItem, writeStorageItem } from "@/utils/browser-storage";

export const VISITOR_ID_KEY = "lectum:analytics:visitor-id";

export const createTrackingId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lectum-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const safeGetItem = (storage: Storage | null, key: string) => {
  return readStorageItem(storage, key);
};

export const safeSetItem = (storage: Storage | null, key: string, value: string) => {
  return writeStorageItem(storage, key, value);
};

export const getOrCreateStorageId = (storage: Storage, key: string) => {
  const existingId = safeGetItem(storage, key);
  if (existingId) return existingId;

  const newId = createTrackingId();
  if (!safeSetItem(storage, key, newId)) return null;

  return newId;
};

export const getOrCreateAnalyticsIdentity = () => {
  const localStorage = getBrowserStorage("localStorage");
  const sessionStorage = getBrowserStorage("sessionStorage");
  if (!localStorage || !sessionStorage) return null;

  const visitorId = getOrCreateStorageId(localStorage, VISITOR_ID_KEY);
  const sessionId = getOrCreateStorageId(sessionStorage, ANALYTICS_SESSION_ID_KEY);
  if (!visitorId || !sessionId) return null;

  return {
    visitorId,
    sessionId,
  };
};

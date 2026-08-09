import { getBrowserStorage, removeStorageItem } from "@/utils/browser-storage";

export const ANALYTICS_SESSION_ID_KEY = "lectum:analytics:session-id";
export const ANALYTICS_LOCATION_CAPTURED_KEY = "lectum:analytics:location-captured-session";
export const ANALYTICS_AUTH_LINKED_KEY = "lectum:analytics:authenticated-user-linked";
export const ANALYTICS_LOCATION_RETRY_SCOPE_KEY = "lectum:analytics:location-retry-scope";
export const ANALYTICS_LOCATION_RETRY_COUNT_KEY = "lectum:analytics:location-retry-count";
export const ANALYTICS_LOCATION_RETRY_AT_KEY = "lectum:analytics:location-retry-at";
export const ANALYTICS_ATTRIBUTION_KEY = "lectum:analytics:session-attribution";
export const ANALYTICS_REFERRER_SENT_KEY = "lectum:analytics:initial-referrer-sent";

const ANALYTICS_SESSION_STORAGE_KEYS = [
  ANALYTICS_SESSION_ID_KEY,
  ANALYTICS_LOCATION_CAPTURED_KEY,
  ANALYTICS_AUTH_LINKED_KEY,
  ANALYTICS_LOCATION_RETRY_SCOPE_KEY,
  ANALYTICS_LOCATION_RETRY_COUNT_KEY,
  ANALYTICS_LOCATION_RETRY_AT_KEY,
  ANALYTICS_ATTRIBUTION_KEY,
  ANALYTICS_REFERRER_SENT_KEY,
] as const;

export const resetAnalyticsSession = () => {
  const storage = getBrowserStorage("sessionStorage");

  for (const key of ANALYTICS_SESSION_STORAGE_KEYS) {
    removeStorageItem(storage, key);
  }
};

export const VISITOR_ID_KEY = "lectum:analytics:visitor-id";
export const SESSION_ID_KEY = "lectum:analytics:session-id";

export const createTrackingId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lectum-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const safeGetItem = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSetItem = (storage: Storage, key: string, value: string) => {
  try {
    storage.setItem(key, value);
  } catch {
    // Analytics must never break the user experience.
  }
};

export const getOrCreateStorageId = (storage: Storage, key: string) => {
  const existingId = safeGetItem(storage, key);
  if (existingId) return existingId;

  const newId = createTrackingId();
  safeSetItem(storage, key, newId);

  return newId;
};

export const getOrCreateAnalyticsIdentity = () => {
  if (typeof window === "undefined") return null;

  return {
    visitorId: getOrCreateStorageId(window.localStorage, VISITOR_ID_KEY),
    sessionId: getOrCreateStorageId(window.sessionStorage, SESSION_ID_KEY),
  };
};

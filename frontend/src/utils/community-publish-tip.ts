const STORAGE_PREFIX = "lectum:community-publish-tip:v1";
const seenInDocument = new Set<string>();

const keyFor = (userId?: string | null) =>
  userId ? `${STORAGE_PREFIX}:user:${userId}` : `${STORAGE_PREFIX}:anonymous`;

const readSeen = (key: string) => {
  if (typeof window === "undefined") return false;
  if (seenInDocument.has(key)) return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

// A visitor's completed tip also applies after login; account history stays scoped.
export const hasSeenCommunityPublishTip = (userId?: string | null) =>
  readSeen(keyFor()) || Boolean(userId && readSeen(keyFor(userId)));

export const markCommunityPublishTipSeen = (userId?: string | null) => {
  if (typeof window === "undefined") return;
  const key = keyFor(userId);
  seenInDocument.add(key);
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Keep deduplication for this document when browser storage is unavailable.
  }
};

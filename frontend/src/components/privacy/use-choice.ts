"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";
import { browserAttribution } from "./attribution-client";
import {
  createPrivacyChoice,
  PRIVACY_CHANGED,
  parsePrivacyChoice,
  privacyStorageKey,
} from "./policy";

const deniedInMemory = new Map<string, string>();

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PRIVACY_CHANGED, callback);
  window.addEventListener("focus", callback);
  const timer = window.setInterval(callback, 30_000);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PRIVACY_CHANGED, callback);
    window.removeEventListener("focus", callback);
    window.clearInterval(timer);
  };
}
export function usePrivacyChoice(userId?: string | null) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      const key = privacyStorageKey(userId);
      const value =
        deniedInMemory.get(key) ?? readStorageItem(getBrowserStorage("localStorage"), key);
      return parsePrivacyChoice(value) ? value : null;
    },
    () => null,
  );
  return useMemo(() => parsePrivacyChoice(raw), [raw]);
}
export function persistPrivacyChoice(
  userId: string | null,
  campaigns: boolean,
  pendingRevocation = false,
  serverExpiresAt?: number,
  authorizeTransfer = false,
) {
  const key = privacyStorageKey(userId);
  const storage = getBrowserStorage("localStorage");
  const choice = createPrivacyChoice(campaigns, Date.now(), authorizeTransfer);
  if (!campaigns) void browserAttribution.revoke();
  if (campaigns && serverExpiresAt !== undefined)
    choice.expiresAt = Math.min(choice.expiresAt, serverExpiresAt);
  const serialized = JSON.stringify({ ...choice, pendingRevocation });
  const saved =
    Boolean(parsePrivacyChoice(serialized)) && writeStorageItem(storage, key, serialized);
  if (saved) deniedInMemory.delete(key);
  else {
    // A quota/security failure cannot keep an older affirmative choice active.
    deniedInMemory.set(key, JSON.stringify({ ...createPrivacyChoice(false), pendingRevocation }));
    removeStorageItem(storage, key);
  }
  window.dispatchEvent(new Event(PRIVACY_CHANGED));
  return saved;
}
export function localCampaignConsentScope(userId: string | null) {
  if (deniedInMemory.has(privacyStorageKey(userId))) return null;
  const choice = parsePrivacyChoice(
    readStorageItem(getBrowserStorage("localStorage"), privacyStorageKey(userId)),
  );
  return choice?.campaigns === true && !choice.pendingRevocation
    ? `${userId || "guest"}:${choice.savedAt}`
    : null;
}
export function hasLocalCampaignConsent(userId: string | null) {
  return localCampaignConsentScope(userId) !== null;
}

"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";
import {
  createExperienceChoice,
  EXPERIENCE_CHANGED,
  experienceStorageKey,
  parseExperienceChoice,
} from "./experience-policy";

// Localhost remains opt-in; production still requires consent and an approved URL.
export const EXPERIENCE_PREVIEW =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_EXPERIENCE_PREVIEW === "true";
export const EXPERIENCE_ENABLED =
  process.env.NEXT_PUBLIC_EXPERIENCE_ENABLED !== "false" &&
  (process.env.NODE_ENV === "production" || EXPERIENCE_PREVIEW);

const denied = new Set<string>();

export function readExperienceChoice(userId: string | null) {
  const key = experienceStorageKey(userId);
  if (denied.has(key)) return null;
  return parseExperienceChoice(readStorageItem(getBrowserStorage("localStorage"), key));
}

function subscribe(callback: () => void) {
  if (!EXPERIENCE_ENABLED) return () => {};
  window.addEventListener(EXPERIENCE_CHANGED, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("focus", callback);
  const timer = window.setInterval(callback, 30_000);
  return () => {
    window.removeEventListener(EXPERIENCE_CHANGED, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("focus", callback);
    window.clearInterval(timer);
  };
}

export function useExperienceChoice(userId: string | null) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      const key = experienceStorageKey(userId);
      if (denied.has(key)) return null;
      const value = readStorageItem(getBrowserStorage("localStorage"), key);
      return parseExperienceChoice(value) ? value : null;
    },
    () => null,
  );
  return useMemo(() => parseExperienceChoice(raw), [raw]);
}

export function persistExperienceChoice(userId: string | null, allowed: boolean) {
  const key = experienceStorageKey(userId);
  const storage = getBrowserStorage("localStorage");
  // Close permission before notifying consumers, even if storage cannot be written.
  denied.add(key);
  const saved = writeStorageItem(storage, key, JSON.stringify(createExperienceChoice(allowed)));
  if (saved) denied.delete(key);
  else removeStorageItem(storage, key);
  window.dispatchEvent(new Event(EXPERIENCE_CHANGED));
  return saved;
}

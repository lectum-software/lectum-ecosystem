"use client";
import { useSyncExternalStore } from "react";
import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";
import {
  GOOGLE_CHOICE_CHANGED,
  GOOGLE_CHOICE_KEY,
  GOOGLE_CHOICE_MAX_AGE,
  GOOGLE_CHOICE_VERSION,
  parseGoogleChoice,
} from "./google-policy";

let denied = false;
export function readGoogleChoice() {
  return denied
    ? null
    : parseGoogleChoice(readStorageItem(getBrowserStorage("localStorage"), GOOGLE_CHOICE_KEY));
}
export function googleConsentScope() {
  const choice = readGoogleChoice();
  return choice?.allowed ? String(choice.savedAt) : null;
}
export function persistGoogleChoice(allowed: boolean) {
  const savedAt = Date.now();
  denied = true;
  const storage = getBrowserStorage("localStorage");
  const saved = writeStorageItem(
    storage,
    GOOGLE_CHOICE_KEY,
    JSON.stringify({
      version: GOOGLE_CHOICE_VERSION,
      allowed,
      savedAt,
      expiresAt: savedAt + GOOGLE_CHOICE_MAX_AGE,
    }),
  );
  if (saved) denied = false;
  else removeStorageItem(storage, GOOGLE_CHOICE_KEY);
  window.dispatchEvent(new Event(GOOGLE_CHOICE_CHANGED));
  return saved;
}
function subscribe(callback: () => void) {
  window.addEventListener(GOOGLE_CHOICE_CHANGED, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("focus", callback);
  const timer = window.setInterval(callback, 1000);
  return () => {
    window.removeEventListener(GOOGLE_CHOICE_CHANGED, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("focus", callback);
    window.clearInterval(timer);
  };
}
export function useGoogleChoice() {
  return useSyncExternalStore(
    subscribe,
    () => {
      const choice = readGoogleChoice();
      return choice ? (choice.allowed ? "granted" : "denied") : null;
    },
    () => null,
  );
}

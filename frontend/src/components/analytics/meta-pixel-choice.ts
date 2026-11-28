"use client";
import { useSyncExternalStore } from "react";
import { PRIVACY_CHANGED, PRIVACY_MAX_AGE_MS } from "@/components/privacy/policy";
import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";

export const META_PIXEL_ENABLED = process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === "true";
const key = "lectum.meta-pixel-consent.v1";
let denied = false;
export function pixelConsentStart(): number | null {
  if (readPixelChoice() !== "granted") return null;
  try {
    return JSON.parse(readStorageItem(getBrowserStorage("localStorage"), key) || "null").savedAt;
  } catch {
    return null;
  }
}
export function readPixelChoice(): "granted" | "denied" | null {
  if (denied) return "denied";
  try {
    const value = JSON.parse(readStorageItem(getBrowserStorage("localStorage"), key) || "null");
    const now = Date.now();
    if (
      value?.version !== 1 ||
      typeof value.allowed !== "boolean" ||
      !Number.isFinite(value.savedAt) ||
      !Number.isFinite(value.expiresAt) ||
      value.savedAt > now ||
      value.expiresAt <= now ||
      value.expiresAt <= value.savedAt ||
      value.expiresAt - value.savedAt > PRIVACY_MAX_AGE_MS
    )
      return null;
    return value.allowed ? "granted" : "denied";
  } catch {
    return null;
  }
}
export function persistPixelChoice(allowed: boolean) {
  denied = true;
  const savedAt = Date.now();
  const storage = getBrowserStorage("localStorage");
  const saved = writeStorageItem(
    storage,
    key,
    JSON.stringify({
      version: 1,
      allowed,
      savedAt,
      expiresAt: savedAt + PRIVACY_MAX_AGE_MS,
    }),
  );
  if (saved) denied = false;
  else removeStorageItem(storage, key);
  window.dispatchEvent(new Event(PRIVACY_CHANGED));
  return saved;
}
function subscribe(callback: () => void) {
  window.addEventListener(PRIVACY_CHANGED, callback);
  window.addEventListener("storage", callback);
  const timer = setInterval(callback, 1000);
  return () => {
    clearInterval(timer);
    window.removeEventListener(PRIVACY_CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}
export function usePixelChoice() {
  return useSyncExternalStore(subscribe, readPixelChoice, () => null);
}

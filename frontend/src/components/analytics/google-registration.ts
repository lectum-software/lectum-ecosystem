"use client";
import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";
import { googleActionScope } from "./google-runtime";

const key = "lectum.google-registration.v1";
export function rememberGoogleRegistration() {
  const storage = getBrowserStorage("sessionStorage");
  removeStorageItem(storage, key);
  const scope = googleActionScope();
  if (scope)
    writeStorageItem(storage, key, JSON.stringify({ scope, expiresAt: Date.now() + 10 * 60_000 }));
}
export function consumeGoogleRegistration(): string | null {
  const storage = getBrowserStorage("sessionStorage");
  const raw = readStorageItem(storage, key);
  removeStorageItem(storage, key);
  try {
    const value = JSON.parse(raw || "null");
    return value && value.scope === googleActionScope() && value.expiresAt > Date.now()
      ? value.scope
      : null;
  } catch {
    return null;
  }
}

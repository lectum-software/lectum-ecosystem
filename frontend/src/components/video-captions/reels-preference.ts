"use client";

import { useSyncExternalStore } from "react";

const key = "lectum:reels-captions:v1";
const eventName = "lectum:reels-captions-change";
let memory = true;

function snapshot() {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "true" || value === "false") return value === "true";
  } catch {
    // Keep the choice for this visit when browser storage is unavailable.
  }
  return memory;
}

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", listener);
  };
}

export function setReelsCaptionPreference(enabled: boolean) {
  memory = enabled;
  try {
    window.localStorage.setItem(key, String(enabled));
  } catch {
    // Mounted players still share the in-memory preference.
  }
  window.dispatchEvent(new Event(eventName));
}

export function useReelsCaptionPreference() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}

"use client";

import { useSyncExternalStore } from "react";

const key = "lectum:directory-captions:v1";
const eventName = "lectum:directory-captions-change";
let memory: boolean | null = null;

function snapshot() {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "true" || value === "false") return value === "true";
  } catch {
    // Private browsing can deny storage; keep the choice for this visit.
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

export function setDirectoryCaptionPreference(enabled: boolean) {
  memory = enabled;
  try {
    window.localStorage.setItem(key, String(enabled));
  } catch {
    // The in-memory preference still synchronizes every mounted player.
  }
  window.dispatchEvent(new Event(eventName));
}

export function useDirectoryCaptionPreference() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

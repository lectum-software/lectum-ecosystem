"use client";

let suspended = false;
let attached = false;
const listeners = new Set<() => void>();

export const subscribeDocumentAttention = (listener: () => void) => {
  if (!attached && typeof window !== "undefined") {
    attached = true;
    const notify = () => {
      for (const callback of listeners) callback();
    };
    const suspend = () => {
      suspended = true;
      notify();
    };
    const restore = () => {
      suspended = document.visibilityState !== "visible" || !document.hasFocus();
      notify();
    };
    window.addEventListener("blur", suspend);
    window.addEventListener("pagehide", suspend);
    document.addEventListener("freeze", suspend);
    window.addEventListener("focus", restore);
    window.addEventListener("pageshow", restore);
    document.addEventListener("resume", restore);
    document.addEventListener("visibilitychange", restore);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const documentHasUserAttention = () => {
  if (typeof document === "undefined") return false;
  if (suspended) return false;
  if (document.visibilityState !== "visible") return false;

  return typeof document.hasFocus !== "function" || document.hasFocus();
};

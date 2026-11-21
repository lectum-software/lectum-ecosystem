"use client";
import { useSyncExternalStore } from "react";
import { PRIVACY_OPEN } from "./policy";

const subscribe = () => () => {};

export function PrivacyPreferencesTrigger() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <button
      className="mt-4 min-h-11 text-sm font-semibold text-primary underline underline-offset-4"
      type="button"
      disabled={!ready}
      onClick={() => window.dispatchEvent(new Event(PRIVACY_OPEN))}
    >
      Preferências de cookies
    </button>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { LECTUM_APP_REFRESH_EVENT } from "@/utils/app-refresh";
import { createFeedVariationSession } from "@/utils/feed-variation-session";

const session = createFeedVariationSession();
const listeners = new Set<() => void>();
const refresh = () => {
  session.refresh();
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  session.initialize();
  if (!listeners.size) window.addEventListener(LECTUM_APP_REFRESH_EVENT, refresh);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener(LECTUM_APP_REFRESH_EVENT, refresh);
  };
};
const serverSnapshot = () => 0;
export const useFeedVariationSeed = () =>
  useSyncExternalStore(subscribe, session.current, serverSnapshot);

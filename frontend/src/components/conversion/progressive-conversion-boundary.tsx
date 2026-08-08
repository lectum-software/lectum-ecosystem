"use client";

import { usePathname } from "next/navigation";
import { type PropsWithChildren, useSyncExternalStore } from "react";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";

import { ProgressiveConversionProvider } from "./progressive-conversion-core";

export const subscribeAuthToken = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const interval = window.setInterval(onStoreChange, 1000);
  window.addEventListener("focus", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

export const getAuthTokenSnapshot = () => {
  if (typeof window === "undefined") return false;

  return Boolean(getToken());
};

export const ProgressiveConversionBoundary = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const sessionUser = useAppSelector((state) => state.user);
  const hasToken = useSyncExternalStore(subscribeAuthToken, getAuthTokenSnapshot, () => false);
  const isAuthenticated = Boolean(sessionUser?.id) || hasToken;

  return (
    <ProgressiveConversionProvider isAuthenticated={isAuthenticated} pathname={pathname}>
      {children}
    </ProgressiveConversionProvider>
  );
};

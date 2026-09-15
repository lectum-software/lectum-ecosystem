"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";

import { ProgressiveConversionProvider } from "./progressive-conversion-core";

export const ProgressiveConversionBoundary = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const sessionUser = useAppSelector((state) => state.user);
  const hasToken = useAuthTokenPresence();
  const isAuthenticated = Boolean(sessionUser?.id) || hasToken;

  return (
    <ProgressiveConversionProvider isAuthenticated={isAuthenticated} pathname={pathname}>
      {children}
    </ProgressiveConversionProvider>
  );
};

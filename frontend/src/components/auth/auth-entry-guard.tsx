"use client";

import { usePathname, useRouter } from "next/navigation";
import { type PropsWithChildren, useEffect } from "react";
import { useAuth } from "@/api/callers/auth";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import { isAuthEntryPath } from "@/utils/auth-entry";
import { resolveAuthRedirect, resolveAuthReturnTo } from "@/utils/auth-redirect";

export const AuthEntryGuard = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const router = useRouter();
  const hasToken = useAuthTokenPresence();
  const entry = isAuthEntryPath(pathname);
  const { hidrate } = useAuth({ enableHidrate: entry && hasToken });
  const { refetch } = hidrate;

  useEffect(() => {
    if (!entry || !hasToken) return;
    const revalidate = () => void refetch();
    window.addEventListener("pageshow", revalidate);
    return () => window.removeEventListener("pageshow", revalidate);
  }, [entry, hasToken, refetch]);

  useEffect(() => {
    if (!entry || !hasToken || !hidrate.data?.id || hidrate.isError || hidrate.isFetching) return;
    const params = new URLSearchParams(window.location.search);
    const returnTo = resolveAuthReturnTo(params.get("redirectTo"), params.get("callbackUrl"));
    const safeReturnTo = returnTo && !returnTo.startsWith("/auth/") ? returnTo : null;
    const target = resolveAuthRedirect(hidrate.data, safeReturnTo ?? "/", "/");
    if (target) router.replace(target);
  }, [entry, hasToken, hidrate.data, hidrate.isError, hidrate.isFetching, router]);

  if (entry && hasToken && !hidrate.isError) return null;
  return children;
};

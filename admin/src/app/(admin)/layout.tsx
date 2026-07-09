"use client";

import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { LoadingSplash } from "@/components/admin-shell/loading-splash";
import { AdminShell } from "@/components/admin-shell/shell";
import { useAdminAuth } from "@/providers/admin-auth";

export default function AdminProtectedLayout({ children }: PropsWithChildren) {
  const { isAuthenticated, isHydrating } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrating && !isAuthenticated) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isHydrating, pathname, router]);

  if (isHydrating) return <LoadingSplash />;
  if (!isAuthenticated) return <LoadingSplash message="Redirecionando para o login..." />;

  return <AdminShell>{children}</AdminShell>;
}

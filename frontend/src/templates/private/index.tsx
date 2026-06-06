"use client";

import { Bell, Heart, Home, type LucideIcon, Network, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/api/callers/auth";
import type { user } from "@/api/generator/types";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { PageShell } from "@/components/ui/page-shell";
import { useSignOut } from "@/hooks/cookies/signout";
import { getToken } from "@/hooks/cookies/token";
import { NotificationManager } from "@/hooks/notification";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import * as userActions from "@/store/modules/user/actions";

type PrivateTemplateProps = PropsWithChildren<{
  showHeader?: boolean;
}>;

type UserRole = NonNullable<user["role"]>;

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  title: string;
  activePrefixes?: string[];
};

const fallbackNavigation: NavigationItem[] = [
  {
    href: "/app",
    icon: Home,
    label: "Início",
    title: "Lectum",
  },
];

const navigationByRole: Record<Extract<UserRole, "paciente" | "psicologo">, NavigationItem[]> = {
  paciente: [
    {
      href: "/app/psychologists",
      icon: UsersRound,
      label: "Psicólogos",
      title: "Encontre seu psicólogo",
    },
    {
      href: "/app/favorites",
      icon: Heart,
      label: "Favoritos",
      title: "Favoritos",
      activePrefixes: ["/app/following"],
    },
    {
      href: "/app/community",
      icon: Network,
      label: "Comunidade",
      title: "Comunidade",
    },
    {
      href: "/app/notifications",
      icon: Bell,
      label: "Notificações",
      title: "Notificações",
      activePrefixes: ["/app/settings/notifications"],
    },
    {
      href: "/app/profile",
      icon: UserRound,
      label: "Perfil",
      title: "Meu Perfil",
    },
  ],
  psicologo: [
    {
      href: "/app/psychologists",
      icon: UsersRound,
      label: "Psicólogos",
      title: "Psicólogos",
    },
    {
      href: "/app/favorites",
      icon: Heart,
      label: "Favoritos",
      title: "Favoritos",
      activePrefixes: ["/app/following"],
    },
    {
      href: "/app/community",
      icon: Network,
      label: "Comunidade",
      title: "Comunidade",
    },
    {
      href: "/app/notifications",
      icon: Bell,
      label: "Notificações",
      title: "Notificações",
      activePrefixes: ["/app/settings/notifications"],
    },
    {
      href: "/app/profile",
      icon: UserRound,
      label: "Perfil",
      title: "Meu Perfil",
    },
  ],
};

const getNavigation = (role?: user["role"] | null) => {
  if (role === "paciente" || role === "psicologo") {
    return navigationByRole[role];
  }

  return fallbackNavigation;
};

const isActivePath = (pathname: string, item: NavigationItem) => {
  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    Boolean(item.activePrefixes?.some((prefix) => pathname.startsWith(prefix)))
  );
};

export const PrivateTemplate = ({ children }: PrivateTemplateProps) => {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const storedUser = useAppSelector((state) => state.user);
  const { out } = useSignOut();
  const [hasToken] = useState(() => {
    if (typeof window === "undefined") return false;

    return Boolean(getToken());
  });

  const { hidrate } = useAuth({ enableHidrate: hasToken });

  useEffect(() => {
    if (hidrate.data?.id) {
      dispatch(userActions.create(hidrate.data));
    }
  }, [dispatch, hidrate.data]);

  const sessionUser = hidrate.data ?? storedUser;
  const navigation = useMemo(() => getNavigation(sessionUser?.role), [sessionUser?.role]);
  const isSessionLoading = hasToken && !sessionUser && (hidrate.isLoading || hidrate.isPending);
  const shouldShowSessionError = Boolean(hasToken && hidrate.isError && !sessionUser);

  if (isSessionLoading) {
    return (
      <>
        <NotificationManager />
        <PageShell contentClassName="grid min-h-[55vh] place-items-center pb-28">
          <LoadingState label="Carregando sua sessão" />
        </PageShell>
      </>
    );
  }

  if (!hasToken || shouldShowSessionError) {
    return (
      <>
        <NotificationManager />
        <PageShell contentClassName="grid min-h-[55vh] place-items-center pb-28">
          <InlineAlert title="Sessão não encontrada" variant="error">
            Entre novamente para acessar sua área privada da Lectum.
          </InlineAlert>
          <Button className="mt-4" onClick={() => out("/auth/login")} type="button">
            Ir para login
          </Button>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <NotificationManager />
      <PageShell contentClassName="pb-28 sm:pb-32">{children}</PageShell>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 shadow-[0_-10px_30px_rgb(15_23_42_/_8%)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[var(--lectum-card-radius)] sm:border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-[560px] grid-cols-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item);

            return (
              <li key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.68rem] font-semibold transition",
                    isActive ? "text-primary" : "text-muted hover:text-primary",
                  )}
                  href={item.href}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

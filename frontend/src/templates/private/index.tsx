"use client";

import {
  Bell,
  Heart,
  LogIn,
  type LucideIcon,
  Network,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  allowAnonymous?: boolean;
  autoHideNavigation?: boolean;
  showHeader?: boolean;
  showNavigation?: boolean;
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

export const PrivateTemplate = ({
  allowAnonymous = false,
  autoHideNavigation = false,
  children,
  showHeader = true,
  showNavigation,
}: PrivateTemplateProps) => {
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

  const sessionUser = hasToken ? (hidrate.data ?? storedUser) : null;
  const navigation = useMemo(() => getNavigation(sessionUser?.role), [sessionUser?.role]);
  const shouldShowNavigation = showNavigation ?? showHeader;
  const shouldAutoHideNavigation = shouldShowNavigation && autoHideNavigation;
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const pageShellClassName = shouldShowNavigation ? "pb-28 sm:pb-32" : undefined;
  const isSessionLoading = hasToken && !sessionUser && (hidrate.isLoading || hidrate.isPending);
  const shouldShowSessionError = Boolean(hasToken && hidrate.isError && !sessionUser);

  useEffect(() => {
    if (!shouldAutoHideNavigation) return;

    const onScroll = () => {
      if (ticking.current) return;

      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;

        if (currentY <= 12) {
          setIsNavigationVisible(true);
          lastScrollY.current = currentY;
          ticking.current = false;

          return;
        }

        const delta = currentY - lastScrollY.current;

        if (delta > 8) {
          setIsNavigationVisible(false);
        } else if (delta < -8) {
          setIsNavigationVisible(true);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [shouldAutoHideNavigation]);

  const navigationMarkup = shouldShowNavigation ? (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 shadow-[0_-10px_30px_rgb(15_23_42_/_8%)] backdrop-blur transition-transform duration-300 ease-out supports-[backdrop-filter]:bg-surface/85 sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[var(--lectum-card-radius)] sm:border"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        transform: isNavigationVisible ? "translateY(0)" : "translateY(140%)",
        pointerEvents: isNavigationVisible ? "auto" : "none",
      }}
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
  ) : null;

  if (isSessionLoading) {
    return (
      <>
        <NotificationManager />
        <PageShell contentClassName="grid min-h-[55vh] place-items-center pb-28">
          <LoadingState label="Carregando sua sessão" />
        </PageShell>
        {navigationMarkup}
      </>
    );
  }

  if (!hasToken && allowAnonymous) {
    return (
      <>
        <NotificationManager />
        <PageShell contentClassName={pageShellClassName}>{children}</PageShell>
        {navigationMarkup}
      </>
    );
  }

  if (!hasToken || shouldShowSessionError) {
    return (
      <>
        <NotificationManager />
        <PageShell
          contentClassName={cn("grid min-h-[55vh] place-items-center", pageShellClassName)}
        >
          <div className="grid w-full max-w-[430px] gap-4 text-center">
            <InlineAlert title="Acesse sua conta" variant="info">
              Esta área é autenticada. Cadastre-se ou faça login para continuar na Lectum.
            </InlineAlert>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild>
                <Link href="/auth/profile-selection">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Criar conta
                </Link>
              </Button>
              <Button onClick={() => out("/auth/login")} type="button" variant="outline">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Fazer login
              </Button>
            </div>
          </div>
        </PageShell>
        {navigationMarkup}
      </>
    );
  }

  return (
    <>
      <NotificationManager />
      <PageShell contentClassName={pageShellClassName}>{children}</PageShell>
      {navigationMarkup}
    </>
  );
};

"use client";

import {
  Bell,
  Heart,
  LogIn,
  type LucideIcon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
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
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";

type PrivateTemplateProps = PropsWithChildren<{
  allowAnonymous?: boolean;
  autoHideNavigation?: boolean;
  bottomNavigationCenterAction?: {
    ariaLabel: string;
    href: string;
    title?: string;
  };
  contentClassName?: string;
  desktopSidebarDefaultCollapsed?: boolean;
  desktopNavigation?: "bottom" | "sidebar";
  navigationDimmed?: boolean;
  navigationHidden?: boolean;
  navigationTheme?: "default" | "solidWhite";
  showHeader?: boolean;
  showMobileNavigation?: boolean;
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
    activePrefixes: ["/app/psychologist"],
  },
  {
    href: "/app/favorites",
    icon: Heart,
    label: "Favoritos",
    title: "Favoritos",
  },
  {
    href: DEFAULT_COMMUNITY_FEED_HREF,
    icon: Network,
    label: "Comunidade",
    title: "Comunidade",
    activePrefixes: ["/app/community"],
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
      activePrefixes: ["/app/psychologist"],
    },
    {
      href: "/app/favorites",
      icon: Heart,
      label: "Favoritos",
      title: "Favoritos",
    },
    {
      href: DEFAULT_COMMUNITY_FEED_HREF,
      icon: Network,
      label: "Comunidade",
      title: "Comunidade",
      activePrefixes: ["/app/community"],
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
      activePrefixes: ["/app/psychologist"],
    },
    {
      href: "/app/favorites",
      icon: Heart,
      label: "Favoritos",
      title: "Favoritos",
    },
    {
      href: DEFAULT_COMMUNITY_FEED_HREF,
      icon: Network,
      label: "Comunidade",
      title: "Comunidade",
      activePrefixes: ["/app/community"],
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

const DESKTOP_SIDEBAR_STORAGE_KEY = "lectum.desktopSidebar";

export const PrivateTemplate = ({
  allowAnonymous = false,
  autoHideNavigation = false,
  bottomNavigationCenterAction,
  children,
  contentClassName,
  desktopSidebarDefaultCollapsed = false,
  desktopNavigation = "sidebar",
  navigationDimmed = false,
  navigationHidden = false,
  navigationTheme = "default",
  showHeader = true,
  showMobileNavigation = true,
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
  const shouldRenderMobileNavigation = shouldShowNavigation && showMobileNavigation;
  const shouldRenderDesktopSidebar = shouldShowNavigation && desktopNavigation === "sidebar";
  const shouldAutoHideNavigation = shouldShowNavigation && autoHideNavigation;
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return desktopSidebarDefaultCollapsed;

    const storedPreference = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);

    if (storedPreference === "collapsed") return true;
    if (storedPreference === "expanded") return false;

    return desktopSidebarDefaultCollapsed;
  });
  const isNavigationRenderedVisible = isNavigationVisible && !navigationHidden;
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const pageShellClassName = cn(
    shouldRenderMobileNavigation ? "pb-28 sm:pb-32" : undefined,
    shouldRenderDesktopSidebar
      ? cn(isDesktopSidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[240px]", "lg:pb-8")
      : undefined,
    contentClassName,
  );
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

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed((current) => {
      const nextValue = !current;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          DESKTOP_SIDEBAR_STORAGE_KEY,
          nextValue ? "collapsed" : "expanded",
        );
      }

      return nextValue;
    });
  };

  const bottomNavigationMarkup = shouldRenderMobileNavigation ? (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-[transform,opacity,filter] duration-200 ease-out sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[var(--lectum-card-radius)] lg:hidden",
        navigationDimmed ? "opacity-55 brightness-90 saturate-75" : "opacity-100",
        navigationTheme === "solidWhite"
          ? "border-t border-[#e5e7eb] bg-white shadow-[0_-10px_30px_rgb(15_23_42_/_8%)]"
          : "border-t border-border bg-surface/95 shadow-[0_-10px_30px_rgb(15_23_42_/_8%)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:border",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        transform: isNavigationRenderedVisible ? "translateY(0)" : "translateY(140%)",
        pointerEvents: isNavigationRenderedVisible && !navigationDimmed ? "auto" : "none",
      }}
    >
      <ul className="mx-auto grid w-full max-w-[560px] grid-cols-5">
        {navigation.map((item, index) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item);

          if (bottomNavigationCenterAction && index === 2) {
            return (
              <li
                className="relative flex min-h-16 items-end justify-center pb-3"
                key="create-post"
              >
                <Link
                  aria-label={bottomNavigationCenterAction.ariaLabel}
                  className="grid h-14 w-14 place-items-center rounded-full border-[5px] border-white bg-[#308CE8] text-white shadow-[0_12px_28px_rgba(48,140,232,0.28)] transition hover:-translate-y-px hover:bg-[#2579CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  href={bottomNavigationCenterAction.href}
                  title={
                    bottomNavigationCenterAction.title ?? bottomNavigationCenterAction.ariaLabel
                  }
                >
                  <Plus className="h-8 w-8 stroke-[2.2]" aria-hidden="true" />
                  <span className="sr-only">{bottomNavigationCenterAction.ariaLabel}</span>
                </Link>
              </li>
            );
          }

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

  const desktopSidebarMarkup = shouldRenderDesktopSidebar ? (
    <aside
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-y-0 left-0 z-50 hidden border-border border-r bg-surface py-6 text-foreground shadow-[12px_0_36px_rgb(15_23_42_/_5%)] transition-[width,transform,opacity,filter,padding] duration-200 ease-out lg:flex lg:flex-col",
        isDesktopSidebarCollapsed ? "w-[88px] px-2" : "w-[240px] px-4",
        navigationDimmed ? "opacity-55 brightness-95 saturate-75" : "opacity-100",
        isNavigationRenderedVisible ? "translate-x-0" : "-translate-x-full opacity-0",
      )}
      style={{
        paddingTop: "max(24px, env(safe-area-inset-top))",
        pointerEvents: isNavigationRenderedVisible && !navigationDimmed ? "auto" : "none",
      }}
    >
      <div
        className={cn(
          "mb-8 flex items-center gap-2 text-xl font-black tracking-tight text-foreground",
          isDesktopSidebarCollapsed ? "justify-between px-0" : "justify-between px-2",
        )}
      >
        <Link
          className={cn(
            "flex min-w-0 items-center gap-2 transition hover:text-primary",
            isDesktopSidebarCollapsed ? "justify-center" : "flex-1",
          )}
          href="/app/psychologists"
          title={isDesktopSidebarCollapsed ? "Lectum" : undefined}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-black text-white">
            L
          </span>
          <span className={cn("truncate", isDesktopSidebarCollapsed ? "sr-only" : undefined)}>
            Lectum
          </span>
        </Link>
        <button
          aria-label={isDesktopSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
          onClick={toggleDesktopSidebar}
          title={isDesktopSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          type="button"
        >
          {isDesktopSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Menu lateral">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center rounded-2xl text-[15px] font-bold transition",
                isDesktopSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-primary-soft/60 hover:text-primary",
              )}
              href={item.href}
              key={item.href}
              title={isDesktopSidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={cn("truncate", isDesktopSidebarCollapsed ? "sr-only" : undefined)}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  ) : null;

  const navigationMarkup = shouldShowNavigation ? (
    <>
      {bottomNavigationMarkup}
      {desktopSidebarMarkup}
    </>
  ) : null;

  if (isSessionLoading) {
    return (
      <>
        <NotificationManager />
        <PageShell
          contentClassName={cn("grid min-h-[55vh] place-items-center", pageShellClassName)}
        >
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

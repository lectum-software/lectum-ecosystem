"use client";

import {
  Bell,
  ChevronLeft,
  Heart,
  LogIn,
  Plus,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, CSSProperties, PropsWithChildren } from "react";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuth } from "@/api/callers/auth";
import { useUnreadNotificationStatus } from "@/api/callers/notification";
import type { user } from "@/api/generator/types";
import { LoadingState } from "@/components/ui/loading-state";
import { Logo, LogoIcon } from "@/components/ui/logo";
import { PageShell } from "@/components/ui/page-shell";
import { useSignOut } from "@/hooks/cookies/signout";
import { getToken } from "@/hooks/cookies/token";
import { NotificationManager } from "@/hooks/notification";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import * as userActions from "@/store/modules/user/actions";
import { COMMUNITY_FEED_SLUG, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { recordAppNavigationPoint } from "@/utils/navigation-history";

type PrivateTemplateProps = PropsWithChildren<{
  allowAnonymous?: boolean;
  autoHideNavigation?: boolean;
  bottomNavigationCenterAction?: {
    ariaLabel: string;
    href: string;
    onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
    scroll?: boolean;
    title?: string;
  };
  contentClassName?: string;
  desktopSidebarDefaultCollapsed?: boolean;
  desktopNavigation?: "bottom" | "sidebar";
  desktopSidebarSurface?: "default" | "flat";
  navigationDimmed?: boolean;
  navigationHidden?: boolean;
  navigationTheme?: "default" | "solidWhite";
  showHeader?: boolean;
  showMobileNavigation?: boolean;
  showNavigation?: boolean;
}>;

type UserRole = NonNullable<user["role"]>;

type NavigationIconProps = {
  "aria-hidden"?: boolean | "false" | "true";
  className?: string;
};

type NavigationIcon = ComponentType<NavigationIconProps>;

type NavigationItem = {
  href: string;
  icon: NavigationIcon;
  label: string;
  mobileIcon?: NavigationIcon;
  title: string;
};

const NOTIFICATIONS_HREF = "/app/notifications";
const COMMUNITY_NAV_ICON_URL = "/svg/atr_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg";

const communityNavigationIconStyle: CSSProperties = {
  WebkitMaskImage: `url("${COMMUNITY_NAV_ICON_URL}")`,
  WebkitMaskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskImage: `url("${COMMUNITY_NAV_ICON_URL}")`,
  maskPosition: "center",
  maskRepeat: "no-repeat",
  maskSize: "contain",
};

const CommunityNavigationIcon = ({ "aria-hidden": ariaHidden, className }: NavigationIconProps) => (
  <span
    aria-hidden={ariaHidden ?? true}
    className={cn("inline-block bg-current", className)}
    style={communityNavigationIconStyle}
  />
);

const NotificationUnreadIndicator = () => (
  <span
    aria-hidden="true"
    className="-right-1 -top-1 absolute h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface"
  />
);

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
    href: DEFAULT_COMMUNITY_FEED_HREF,
    icon: CommunityNavigationIcon,
    label: "Comunidade",
    title: "Comunidade",
  },
  {
    href: "/app/notifications",
    icon: Bell,
    label: "Notificações",
    title: "Notificações",
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
      href: DEFAULT_COMMUNITY_FEED_HREF,
      icon: CommunityNavigationIcon,
      label: "Comunidade",
      title: "Comunidade",
    },
    {
      href: "/app/notifications",
      icon: Bell,
      label: "Notificações",
      title: "Notificações",
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
      href: DEFAULT_COMMUNITY_FEED_HREF,
      icon: CommunityNavigationIcon,
      label: "Comunidade",
      title: "Comunidade",
    },
    {
      href: "/app/notifications",
      icon: Bell,
      label: "Notificações",
      title: "Notificações",
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

const normalizePathname = (pathname: string) => {
  if (pathname.length <= 1) return pathname;

  return pathname.replace(/\/+$/, "");
};

const getNavigationContextPathname = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  const segments = normalizedPathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "app" &&
    segments[1] === "community" &&
    segments[3] === "post" &&
    segments[4] === "new"
  ) {
    if (segments[2] === COMMUNITY_FEED_SLUG) {
      return DEFAULT_COMMUNITY_FEED_HREF;
    }

    return `/app/community/${segments[2]}`;
  }

  return normalizedPathname;
};

const PRIMARY_DESKTOP_NAVIGATION_PATHS = new Set([
  "/app/psychologists",
  "/app/favorites",
  DEFAULT_COMMUNITY_FEED_HREF,
  "/app/notifications",
  "/app/profile",
]);

const isPrimaryDesktopNavigationPath = (pathname: string) => {
  return PRIMARY_DESKTOP_NAVIGATION_PATHS.has(pathname);
};

const isDesktopActivePath = (pathname: string, item: NavigationItem) => {
  return isPrimaryDesktopNavigationPath(pathname) && pathname === item.href;
};

const MOBILE_NAVIGATION_ACTIVE_HREF_BY_PATH = new Map<string, string>([
  ["/app/psychologists", "/app/psychologists"],
  ["/app/favorites", "/app/favorites"],
  [DEFAULT_COMMUNITY_FEED_HREF, DEFAULT_COMMUNITY_FEED_HREF],
  ["/app/notifications", "/app/notifications"],
  ["/app/profile", "/app/profile"],
]);

const COMMUNITY_MAIN_ROUTE_RESERVED_SEGMENTS = new Set([
  COMMUNITY_FEED_SLUG,
  "post",
  "suggest",
  "top-mentors",
]);

const isCommunityMainMobileNavigationPath = (pathname: string) => {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);

  return (
    segments.length === 3 &&
    segments[0] === "app" &&
    segments[1] === "community" &&
    !COMMUNITY_MAIN_ROUTE_RESERVED_SEGMENTS.has(segments[2])
  );
};

const isPsychologistProfileMobileNavigationPath = (pathname: string) => {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);

  return segments.length === 3 && segments[0] === "app" && segments[1] === "psychologist";
};

const shouldShowMobileNavigationForPath = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);

  return (
    MOBILE_NAVIGATION_ACTIVE_HREF_BY_PATH.has(normalizedPathname) ||
    isCommunityMainMobileNavigationPath(normalizedPathname) ||
    isPsychologistProfileMobileNavigationPath(normalizedPathname)
  );
};

const getMobileNavigationActiveHref = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);

  if (isPsychologistProfileMobileNavigationPath(normalizedPathname)) {
    return "/app/psychologists";
  }

  return MOBILE_NAVIGATION_ACTIVE_HREF_BY_PATH.get(normalizedPathname) ?? null;
};

const DESKTOP_SIDEBAR_STORAGE_KEY_PREFIX = "lectum.desktopSidebar";
const DESKTOP_SIDEBAR_STORAGE_EVENT = "lectum:desktop-sidebar-change";

const getDesktopSidebarStorageKey = (pathname: string) => {
  return `${DESKTOP_SIDEBAR_STORAGE_KEY_PREFIX}:${pathname}`;
};

const readDesktopSidebarPreference = (pathname: string) => {
  if (typeof window === "undefined") return null;

  const storedPreference = window.localStorage.getItem(getDesktopSidebarStorageKey(pathname));

  if (storedPreference === "collapsed") return true;
  if (storedPreference === "expanded") return false;

  return null;
};

const subscribeDesktopSidebarPreference = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handleStoreChange = () => onStoreChange();

  window.addEventListener("storage", handleStoreChange);
  window.addEventListener(DESKTOP_SIDEBAR_STORAGE_EVENT, handleStoreChange);

  return () => {
    window.removeEventListener("storage", handleStoreChange);
    window.removeEventListener(DESKTOP_SIDEBAR_STORAGE_EVENT, handleStoreChange);
  };
};

export const PrivateTemplate = ({
  allowAnonymous = false,
  autoHideNavigation = false,
  bottomNavigationCenterAction,
  children,
  contentClassName,
  desktopSidebarDefaultCollapsed,
  desktopNavigation = "sidebar",
  desktopSidebarSurface = "default",
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
  const { hasUnread: hasUnreadNotifications } = useUnreadNotificationStatus(hasToken);

  useEffect(() => {
    if (hidrate.data?.id) {
      dispatch(userActions.create(hidrate.data));
    }
  }, [dispatch, hidrate.data]);

  const sessionUser = hasToken ? (hidrate.data ?? storedUser) : null;
  const navigation = useMemo(() => getNavigation(sessionUser?.role), [sessionUser?.role]);
  const shouldShowNavigation = showNavigation ?? showHeader;
  const normalizedPathname = normalizePathname(pathname);
  const navigationContextPathname = getNavigationContextPathname(normalizedPathname);
  const shouldRenderMobileNavigation =
    shouldShowNavigation &&
    showMobileNavigation &&
    shouldShowMobileNavigationForPath(navigationContextPathname);
  const shouldRenderDesktopSidebar = shouldShowNavigation && desktopNavigation === "sidebar";
  const shouldAutoHideNavigation = shouldShowNavigation && autoHideNavigation;
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  const isMainDesktopNavigationRoute = isPrimaryDesktopNavigationPath(navigationContextPathname);
  const desktopSidebarRouteDefaultCollapsed =
    desktopSidebarDefaultCollapsed ?? !isMainDesktopNavigationRoute;
  const storedDesktopSidebarPreference = useSyncExternalStore(
    subscribeDesktopSidebarPreference,
    () => readDesktopSidebarPreference(navigationContextPathname),
    () => null,
  );
  const isDesktopSidebarCollapsed =
    storedDesktopSidebarPreference ?? desktopSidebarRouteDefaultCollapsed;
  const isNavigationRenderedVisible = !navigationHidden;
  const isMobileNavigationRenderedVisible = isNavigationVisible && !navigationHidden;
  const mobileNavigationActiveHref = getMobileNavigationActiveHref(navigationContextPathname);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const navigationAwarePageShellClassName = cn(
    shouldRenderMobileNavigation ? "pb-28 sm:pb-32" : undefined,
    shouldRenderDesktopSidebar
      ? cn(isDesktopSidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[240px]", "lg:pb-8")
      : undefined,
  );
  const pageShellClassName = cn(navigationAwarePageShellClassName, contentClassName);
  const mobileNavigationAwareFabBottom =
    shouldRenderMobileNavigation && isMobileNavigationRenderedVisible
      ? "calc(4rem + env(safe-area-inset-bottom) + 0.625rem)"
      : "calc(env(safe-area-inset-bottom) + 1rem)";
  const mobileNavigationAwareFabBottomSm =
    shouldRenderMobileNavigation && isMobileNavigationRenderedVisible
      ? "calc(5rem + env(safe-area-inset-bottom) + 0.625rem)"
      : "calc(env(safe-area-inset-bottom) + 1rem)";
  const pageShellStyle = {
    "--lectum-mobile-nav-aware-fab-bottom": mobileNavigationAwareFabBottom,
    "--lectum-mobile-nav-aware-fab-bottom-sm": mobileNavigationAwareFabBottomSm,
  } as CSSProperties;
  const isSessionLoading = hasToken && !sessionUser && (hidrate.isLoading || hidrate.isPending);
  const shouldShowSessionError = Boolean(hasToken && hidrate.isError && !sessionUser);

  useEffect(() => {
    recordAppNavigationPoint(pathname);
  }, [pathname]);

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
    const nextValue = !isDesktopSidebarCollapsed;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        getDesktopSidebarStorageKey(navigationContextPathname),
        nextValue ? "collapsed" : "expanded",
      );
      window.dispatchEvent(new Event(DESKTOP_SIDEBAR_STORAGE_EVENT));
    }
  };

  const bottomNavigationMarkup = shouldRenderMobileNavigation ? (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-[transform,opacity,filter] duration-200 ease-out sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[var(--lectum-card-radius)] lg:hidden",
        navigationDimmed ? "opacity-55 brightness-90 saturate-75" : "opacity-100",
        navigationTheme === "solidWhite"
          ? "border-t border-[#e5e7eb] bg-white text-foreground shadow-[0_-10px_30px_rgb(15_23_42_/_8%)] dark:border-border dark:bg-surface dark:shadow-[0_-14px_34px_rgb(0_0_0_/_28%)]"
          : "border-t border-border bg-surface/95 text-foreground shadow-[0_-10px_30px_rgb(15_23_42_/_8%)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:border dark:shadow-[0_-14px_34px_rgb(0_0_0_/_28%)]",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        transform: isMobileNavigationRenderedVisible ? "translateY(0)" : "translateY(140%)",
        pointerEvents: isMobileNavigationRenderedVisible && !navigationDimmed ? "auto" : "none",
      }}
    >
      <ul className="mx-auto grid w-full max-w-[560px] grid-cols-5">
        {navigation.map((item, index) => {
          const Icon = item.mobileIcon ?? item.icon;
          const isActive = item.href === mobileNavigationActiveHref;
          const shouldShowUnreadIndicator =
            hasUnreadNotifications && item.href === NOTIFICATIONS_HREF;

          if (bottomNavigationCenterAction && index === 2) {
            return (
              <li className="relative flex min-h-16 items-center justify-center" key="create-post">
                <Link
                  aria-label={bottomNavigationCenterAction.ariaLabel}
                  className="absolute -top-3 grid h-14 w-14 place-items-center rounded-full border-[5px] border-white bg-primary text-white shadow-[0_12px_28px_rgba(48,140,232,0.28)] transition hover:-translate-y-px hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-surface dark:shadow-[0_14px_30px_rgb(0_0_0_/_35%)]"
                  href={bottomNavigationCenterAction.href}
                  onClick={bottomNavigationCenterAction.onClick}
                  scroll={bottomNavigationCenterAction.scroll}
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
                aria-label={
                  shouldShowUnreadIndicator ? `${item.label}, há notificações não lidas` : undefined
                }
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.68rem] font-semibold transition",
                  isActive ? "text-primary" : "text-muted hover:text-primary",
                )}
                href={item.href}
              >
                <span className="relative inline-grid h-5 w-5 place-items-center">
                  <Icon className="h-5 w-5" aria-hidden={true} />
                  {shouldShowUnreadIndicator ? <NotificationUnreadIndicator /> : null}
                </span>
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
        "fixed inset-y-0 left-0 z-50 hidden border-border border-r bg-surface py-6 text-foreground transition-[width,transform,opacity,filter,padding] duration-200 ease-out lg:flex lg:flex-col",
        isDesktopSidebarCollapsed ? "w-[88px] px-2" : "w-[240px] px-4",
        desktopSidebarSurface === "default" ? "shadow-[12px_0_36px_rgb(15_23_42_/_5%)]" : null,
        navigationDimmed ? "opacity-55 brightness-95 saturate-75" : "opacity-100",
        isNavigationRenderedVisible ? "translate-x-0" : "-translate-x-full opacity-0",
      )}
      style={{
        paddingTop: "max(24px, env(safe-area-inset-top))",
        pointerEvents: isNavigationRenderedVisible && !navigationDimmed ? "auto" : "none",
      }}
    >
      <button
        aria-label={isDesktopSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        aria-pressed={!isDesktopSidebarCollapsed}
        className="absolute top-9 right-0 z-20 inline-grid h-6 w-6 translate-x-1/2 place-items-center rounded-full border border-border/70 bg-surface/95 text-muted opacity-75 shadow-[0_3px_10px_rgb(15_23_42_/_8%)] transition-[background,color,opacity,transform,box-shadow] duration-200 ease-out hover:scale-[1.03] hover:bg-background hover:text-foreground hover:opacity-100 hover:shadow-[0_6px_14px_rgb(15_23_42_/_10%)] focus-visible:bg-background focus-visible:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-95"
        onClick={toggleDesktopSidebar}
        title={isDesktopSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        type="button"
      >
        <ChevronLeft
          className={cn(
            "h-3 w-3 transition-transform duration-200 ease-out",
            isDesktopSidebarCollapsed ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
          strokeWidth={2}
        />
      </button>

      <div
        className={cn(
          "relative mb-8 flex h-12 items-center",
          isDesktopSidebarCollapsed ? "justify-center" : "justify-start",
        )}
      >
        <Link
          className={cn(
            "group/brand flex min-w-0 items-center rounded-2xl transition-opacity duration-200 ease-out hover:opacity-85",
            isDesktopSidebarCollapsed
              ? "h-12 w-[72px] justify-center overflow-hidden"
              : "h-12 flex-1",
          )}
          href="/app/psychologists"
          title={isDesktopSidebarCollapsed ? "Lectum" : undefined}
        >
          {isDesktopSidebarCollapsed ? (
            <LogoIcon className="h-8 w-8 shrink-0" />
          ) : (
            <Logo className="w-[132px] shrink-0" />
          )}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Menu lateral">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = isDesktopActivePath(navigationContextPathname, item);
          const shouldShowUnreadIndicator =
            hasUnreadNotifications && item.href === NOTIFICATIONS_HREF;

          return (
            <Link
              aria-label={
                shouldShowUnreadIndicator ? `${item.label}, há notificações não lidas` : undefined
              }
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
              title={
                isDesktopSidebarCollapsed
                  ? shouldShowUnreadIndicator
                    ? `${item.label} — há notificações não lidas`
                    : item.label
                  : undefined
              }
            >
              <span className="relative inline-grid h-5 w-5 shrink-0 place-items-center">
                <Icon className="h-5 w-5" aria-hidden={true} />
                {shouldShowUnreadIndicator ? <NotificationUnreadIndicator /> : null}
              </span>
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
          contentClassName={cn(
            "grid min-h-[55vh] place-items-center",
            navigationAwarePageShellClassName,
          )}
          style={pageShellStyle}
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
        <PageShell contentClassName={pageShellClassName} style={pageShellStyle}>
          {children}
        </PageShell>
        {navigationMarkup}
      </>
    );
  }

  if (!hasToken || shouldShowSessionError) {
    return (
      <>
        <NotificationManager />
        <PageShell
          contentClassName={cn(
            "grid min-h-[55vh] place-items-center",
            navigationAwarePageShellClassName,
          )}
          style={pageShellStyle}
        >
          <section className="w-full max-w-[460px] px-1 text-center">
            <div className="relative overflow-hidden rounded-[2rem] border border-[#DCEBFA] bg-white px-6 py-8 shadow-[0_24px_70px_rgba(31,95,159,0.12)] ring-1 ring-white/80 sm:px-8 sm:py-10">
              <div
                aria-hidden="true"
                className="-top-24 -right-20 absolute h-48 w-48 rounded-full bg-primary/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="-bottom-24 -left-20 absolute h-48 w-48 rounded-full bg-[#9DD7FF]/20 blur-3xl"
              />

              <div className="relative z-10 grid justify-items-center">
                <div className="relative mb-5 grid h-20 w-20 place-items-center rounded-[1.65rem] bg-gradient-to-br from-primary-soft via-white to-[#E9F5FF] text-primary shadow-[0_16px_34px_rgba(47,141,235,0.16)] ring-1 ring-[#CFE5FB]">
                  <span
                    aria-hidden="true"
                    className="absolute inset-2 rounded-[1.3rem] border border-white/80"
                  />
                  <ShieldCheck className="h-9 w-9" aria-hidden="true" />
                </div>

                <p className="mb-3 rounded-full border border-[#CFE5FB] bg-[#F7FBFF] px-3 py-1 text-[11px] font-extrabold tracking-[0.16em] text-primary uppercase">
                  Área restrita
                </p>

                <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-foreground sm:text-3xl">
                  Acesse sua conta
                </h1>
                <p className="mt-3 max-w-[360px] text-balance text-sm leading-6 text-muted sm:text-base">
                  Entre ou crie sua conta para acessar seu perfil, salvar preferências e continuar
                  sua experiência na Lectum.
                </p>

                <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
                  <Button
                    asChild
                    className="h-12 rounded-2xl text-sm font-extrabold shadow-[0_14px_30px_rgba(47,141,235,0.22)]"
                  >
                    <Link
                      className="inline-flex items-center justify-center gap-2"
                      href="/auth/profile-selection"
                    >
                      <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Criar conta</span>
                    </Link>
                  </Button>
                  <Button
                    className="h-12 rounded-2xl border-[#CFE5FB] bg-white text-sm font-extrabold text-primary shadow-none hover:border-primary/40 hover:bg-primary-soft/50"
                    onClick={() => out("/auth/login")}
                    type="button"
                    variant="outline"
                  >
                    <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Fazer login</span>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </PageShell>
        {navigationMarkup}
      </>
    );
  }

  return (
    <>
      <NotificationManager />
      <PageShell contentClassName={pageShellClassName} style={pageShellStyle}>
        {children}
      </PageShell>
      {navigationMarkup}
    </>
  );
};

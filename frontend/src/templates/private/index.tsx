"use client";

import {
  Bell,
  ChevronLeft,
  Heart,
  Home,
  LogIn,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import {
  COMMUNITY_FEED_SLUG,
  DEFAULT_COMMUNITY_FEED_HREF,
  LEGACY_COMMUNITY_FEED_HREF,
} from "@/utils/community";
import { recordAppNavigationPoint } from "@/utils/navigation-history";
import {
  getPsychologistPaidOnboardingRequirementPath,
  PSYCHOLOGIST_ONBOARDING_PATHS,
} from "@/utils/psychologist-onboarding";

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
const DEFAULT_RESTRICTED_AREA_COPY = {
  description:
    "Entre ou crie sua conta para acessar seu perfil, salvar preferências e continuar sua experiência na Lectum.",
  title: "Acesse sua conta",
};
const COMMUNITY_TOP_MENTORS_RESTRICTED_AREA_COPY = {
  ...DEFAULT_RESTRICTED_AREA_COPY,
  description:
    "Faça login para acessar o ranking dos principais mentores da comunidade e acompanhar quem mais contribui nas discussões.",
};

const RESTRICTED_AREA_COPY_BY_PATH = new Map<string, typeof DEFAULT_RESTRICTED_AREA_COPY>([
  ["/app/community/top-mentors", COMMUNITY_TOP_MENTORS_RESTRICTED_AREA_COPY],
  ["/community/top-mentors", COMMUNITY_TOP_MENTORS_RESTRICTED_AREA_COPY],
  [
    "/app/favorites",
    {
      description:
        "Crie uma conta gratuita para salvar psicólogos, posts e respostas que quiser consultar depois.",
      title: "Salve seus favoritos",
    },
  ],
  [
    "/app/notifications",
    {
      description:
        "Entre ou crie sua conta para acompanhar respostas, interações e atualizações das comunidades.",
      title: "Acompanhe suas notificações",
    },
  ],
  [
    "/app/profile",
    {
      description:
        "Crie sua conta gratuita para salvar suas preferências e continuar sua experiência na Lectum.",
      title: "Acesse sua conta",
    },
  ],
]);

const NotificationUnreadIndicator = () => (
  <span
    aria-hidden="true"
    className="-right-1 -top-1 absolute h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface"
  />
);

const fallbackNavigation: NavigationItem[] = [
  {
    href: DEFAULT_COMMUNITY_FEED_HREF,
    icon: Home,
    label: "Início",
    title: "Início",
  },
  {
    href: "/psychologists",
    icon: Search,
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
      href: DEFAULT_COMMUNITY_FEED_HREF,
      icon: Home,
      label: "Início",
      title: "Início",
    },
    {
      href: "/psychologists",
      icon: Search,
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
      href: DEFAULT_COMMUNITY_FEED_HREF,
      icon: Home,
      label: "Início",
      title: "Início",
    },
    {
      href: "/psychologists",
      icon: Search,
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

const isPathOrDescendant = (pathname: string, target: string) =>
  pathname === target || pathname.startsWith(`${target}/`);

const canStayDuringPaidOnboarding = (pathname: string, requiredPath: string) => {
  if (isPathOrDescendant(pathname, requiredPath)) return true;

  if (requiredPath === PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress) {
    return isPathOrDescendant(pathname, PSYCHOLOGIST_ONBOARDING_PATHS.checkout);
  }

  return PAID_ONBOARDING_MANAGEMENT_PATHS.has(pathname);
};

const getNavigationContextPathname = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  const segments = normalizedPathname.split("/").filter(Boolean);

  if (normalizedPathname === LEGACY_COMMUNITY_FEED_HREF) {
    return DEFAULT_COMMUNITY_FEED_HREF;
  }

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

    return `/community/${segments[2]}`;
  }

  return normalizedPathname;
};

const PRIMARY_DESKTOP_NAVIGATION_PATHS = new Set([
  "/psychologists",
  "/app/favorites",
  DEFAULT_COMMUNITY_FEED_HREF,
  "/app/notifications",
  "/app/profile",
]);

const PAID_ONBOARDING_MANAGEMENT_PATHS = new Set([
  "/app/professional/billing",
  "/app/professional/billing/card",
  "/app/professional/billing/plans",
  "/app/professional/billing/subscription",
  "/app/settings/account",
]);

const isPrimaryDesktopNavigationPath = (pathname: string) => {
  return PRIMARY_DESKTOP_NAVIGATION_PATHS.has(pathname);
};

const isDesktopActivePath = (pathname: string, item: NavigationItem) => {
  return isPrimaryDesktopNavigationPath(pathname) && pathname === item.href;
};

const MOBILE_NAVIGATION_ACTIVE_HREF_BY_PATH = new Map<string, string>([
  ["/psychologists", "/psychologists"],
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
    segments.length === 2 &&
    segments[0] === "community" &&
    !COMMUNITY_MAIN_ROUTE_RESERVED_SEGMENTS.has(segments[1])
  );
};

const isPsychologistProfileMobileNavigationPath = (pathname: string) => {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);

  return segments.length === 2 && segments[0] === "psychologists";
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
    return "/psychologists";
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
  navigationDimmed = false,
  navigationHidden = false,
  navigationTheme = "default",
  showHeader = true,
  showMobileNavigation = true,
  showNavigation,
}: PrivateTemplateProps) => {
  const pathname = usePathname();
  const router = useRouter();
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
  const restrictedAreaCopy =
    RESTRICTED_AREA_COPY_BY_PATH.get(normalizedPathname) ?? DEFAULT_RESTRICTED_AREA_COPY;
  const restrictedAreaReturnTo = normalizedPathname;
  const restrictedAreaSignupHref = `/auth/profile-selection?redirectTo=${encodeURIComponent(restrictedAreaReturnTo)}`;
  const restrictedAreaLoginHref = `/auth/login?redirectTo=${encodeURIComponent(restrictedAreaReturnTo)}`;

  const navigateToAuth = (href: string) => {
    if (hasToken || shouldShowSessionError) {
      out(href);
      return;
    }

    window.location.href = href;
  };

  useEffect(() => {
    recordAppNavigationPoint(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!hasToken || isSessionLoading || shouldShowSessionError) return;

    const requiredPath = getPsychologistPaidOnboardingRequirementPath(sessionUser);

    if (!requiredPath || canStayDuringPaidOnboarding(normalizedPathname, requiredPath)) return;

    router.replace(requiredPath);
  }, [hasToken, isSessionLoading, normalizedPathname, router, sessionUser, shouldShowSessionError]);

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
          aria-label="Ir para a página inicial da Lectum"
          className={cn(
            "group/brand relative flex min-w-0 items-center rounded-2xl transition-[opacity,transform,box-shadow] duration-200 ease-out hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            isDesktopSidebarCollapsed
              ? "h-12 w-12 justify-center"
              : "h-12 flex-1 justify-start overflow-hidden",
          )}
          href="/psychologists"
          title={isDesktopSidebarCollapsed ? "Lectum" : undefined}
        >
          <span
            aria-hidden={isDesktopSidebarCollapsed}
            className={cn(
              "flex min-w-0 items-center transition-[opacity,transform,filter] duration-200 ease-out",
              isDesktopSidebarCollapsed
                ? "pointer-events-none -translate-x-1 opacity-0 blur-[1px]"
                : "translate-x-0 opacity-100 blur-0",
            )}
          >
            <Logo className="w-[132px] shrink-0" />
          </span>
          <span
            aria-hidden={!isDesktopSidebarCollapsed}
            className={cn(
              "absolute inset-0 inline-grid place-items-center transition-[opacity,transform,filter] duration-200 ease-out",
              isDesktopSidebarCollapsed
                ? "scale-100 opacity-100 blur-0"
                : "pointer-events-none scale-95 opacity-0 blur-[1px]",
            )}
          >
            <span className="inline-grid h-11 w-11 place-items-center rounded-2xl text-primary">
              <LogoIcon className="h-[34px] w-[34px] shrink-0" />
            </span>
          </span>
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
                  {restrictedAreaCopy.title}
                </h1>
                <p className="mt-3 max-w-[360px] text-balance text-sm leading-6 text-muted sm:text-base">
                  {restrictedAreaCopy.description}
                </p>

                <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
                  <Button
                    className="h-12 rounded-2xl text-sm font-extrabold shadow-[0_14px_30px_rgba(47,141,235,0.22)]"
                    onClick={() => navigateToAuth(restrictedAreaSignupHref)}
                    type="button"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Criar conta grátis</span>
                  </Button>
                  <Button
                    className="h-12 rounded-2xl border-[#CFE5FB] bg-white text-sm font-extrabold text-primary shadow-none hover:border-primary/40 hover:bg-primary-soft/50"
                    onClick={() => navigateToAuth(restrictedAreaLoginHref)}
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

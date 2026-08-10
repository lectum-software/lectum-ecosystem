"use client";

import { ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/api/callers/auth";
import { useUnreadNotificationStatus } from "@/api/callers/notification";
import { RestrictedAreaState } from "@/components/auth/restricted-area-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Logo, LogoIcon } from "@/components/ui/logo";
import { PageShell } from "@/components/ui/page-shell";
import { useSignOut } from "@/hooks/cookies/signout";
import { getToken } from "@/hooks/cookies/token";
import { NotificationManager } from "@/hooks/notification";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import * as userActions from "@/store/modules/user/actions";
import { recordAppNavigationPoint } from "@/utils/navigation-history";
import { getPsychologistPaidOnboardingRequirementPath } from "@/utils/psychologist-onboarding";

import {
  canStayDuringPaidOnboarding,
  DEFAULT_RESTRICTED_AREA_COPY,
  getMobileNavigationActiveHref,
  getNavigation,
  getNavigationContextPathname,
  isDesktopActivePath,
  isPathOrDescendant,
  isPrimaryDesktopNavigationPath,
  NEED_RESET_PATH,
  NOTIFICATIONS_HREF,
  NotificationUnreadIndicator,
  normalizePathname,
  type PrivateTemplateProps,
  RESTRICTED_AREA_COPY_BY_PATH,
  shouldShowMobileNavigationForPath,
} from "./navigation";

import {
  readDesktopSidebarPreference,
  subscribeDesktopSidebarPreference,
  writeDesktopSidebarPreference,
} from "./sidebar-preference";

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

  const sessionUser = hasToken && !hidrate.isError ? (hidrate.data ?? storedUser) : null;
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
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const ticking = useRef(false);
  const navigationAwarePageShellClassName = cn(
    shouldRenderMobileNavigation
      ? "pb-[var(--lectum-mobile-bottom-nav-aware-padding)] sm:pb-[calc(var(--lectum-mobile-bottom-nav-height)_+_1.25rem)]"
      : undefined,
    shouldRenderDesktopSidebar
      ? cn(isDesktopSidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[240px]", "lg:pb-8")
      : undefined,
  );
  const pageShellClassName = cn(navigationAwarePageShellClassName, contentClassName);
  const mobileNavigationAwareFabBottom =
    shouldRenderMobileNavigation && isMobileNavigationRenderedVisible
      ? "calc(var(--lectum-mobile-bottom-nav-height) + 0.625rem)"
      : "var(--lectum-bottom-fixed-padding)";
  const mobileNavigationAwareFabBottomSm =
    shouldRenderMobileNavigation && isMobileNavigationRenderedVisible
      ? "calc(var(--lectum-mobile-bottom-nav-height) + 1.625rem)"
      : "var(--lectum-bottom-fixed-padding)";
  const pageShellStyle = {
    "--lectum-mobile-nav-aware-fab-bottom": mobileNavigationAwareFabBottom,
    "--lectum-mobile-nav-aware-fab-bottom-sm": mobileNavigationAwareFabBottomSm,
  } as CSSProperties;
  const isSessionLoading =
    hasToken && !sessionUser && (hidrate.isLoading || hidrate.isPending || hidrate.isFetching);
  const shouldShowSessionError = Boolean(hasToken && hidrate.isError);
  const restrictedAreaCopy =
    RESTRICTED_AREA_COPY_BY_PATH.get(normalizedPathname) ?? DEFAULT_RESTRICTED_AREA_COPY;
  const restrictedAreaReturnTo = normalizedPathname;
  const restrictedAreaSignupHref = `/auth/profile-selection?redirectTo=${encodeURIComponent(restrictedAreaReturnTo)}`;
  const restrictedAreaLoginHref = `/auth/login?redirectTo=${encodeURIComponent(restrictedAreaReturnTo)}`;
  const shouldRequirePasswordReset = Boolean(sessionUser?.need_reset);
  const isNeedResetPath = isPathOrDescendant(normalizedPathname, NEED_RESET_PATH);
  const shouldRedirectToNeedReset =
    hasToken &&
    !isSessionLoading &&
    !shouldShowSessionError &&
    shouldRequirePasswordReset &&
    !isNeedResetPath;

  const navigateToAuth = (href: string) => {
    if (hasToken || shouldShowSessionError) {
      void out(href);
      return;
    }

    window.location.href = href;
  };

  useEffect(() => {
    recordAppNavigationPoint(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!hasToken || isSessionLoading || shouldShowSessionError) return;
    if (sessionUser?.need_reset) return;

    const requiredPath = getPsychologistPaidOnboardingRequirementPath(sessionUser);

    if (!requiredPath || canStayDuringPaidOnboarding(normalizedPathname, requiredPath)) return;

    router.replace(requiredPath);
  }, [hasToken, isSessionLoading, normalizedPathname, router, sessionUser, shouldShowSessionError]);

  useEffect(() => {
    if (!shouldRedirectToNeedReset) return;

    const redirectTo =
      normalizedPathname && normalizedPathname !== "/"
        ? `?redirectTo=${encodeURIComponent(normalizedPathname)}`
        : "";

    router.replace(`${NEED_RESET_PATH}${redirectTo}`);
  }, [normalizedPathname, router, shouldRedirectToNeedReset]);

  useEffect(() => {
    if (!shouldAutoHideNavigation) return;

    const onScroll = () => {
      if (ticking.current) return;

      ticking.current = true;

      scrollAnimationFrameRef.current = requestAnimationFrame(() => {
        const currentY = window.scrollY;

        if (currentY <= 12) {
          setIsNavigationVisible(true);
          lastScrollY.current = currentY;
          ticking.current = false;
          scrollAnimationFrameRef.current = null;

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
        scrollAnimationFrameRef.current = null;
      });
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }
      ticking.current = false;
    };
  }, [shouldAutoHideNavigation]);

  const toggleDesktopSidebar = () => {
    const nextValue = !isDesktopSidebarCollapsed;

    writeDesktopSidebarPreference(navigationContextPathname, nextValue);
  };

  const bottomNavigationMarkup = shouldRenderMobileNavigation ? (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-[transform,opacity,filter] duration-200 ease-out sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[var(--lectum-card-radius)] lg:hidden",
        navigationDimmed ? "opacity-55 brightness-90 saturate-75" : "opacity-100",
        navigationTheme === "solidWhite"
          ? "border-t border-border bg-surface text-foreground shadow-lectum-soft dark:border-border dark:bg-surface dark:shadow-lectum-soft"
          : "border-t border-border bg-surface/95 text-foreground shadow-lectum-soft backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:border dark:shadow-lectum-soft",
      )}
      style={{
        minHeight: "var(--lectum-mobile-bottom-nav-height)",
        paddingBottom: "var(--lectum-bottom-fixed-padding)",
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
                  className="absolute -top-3 grid h-14 w-14 place-items-center rounded-full border-[5px] border-media-foreground bg-primary text-primary-foreground shadow-lectum-soft transition hover:-translate-y-px hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-surface dark:shadow-lectum-soft"
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
        className="absolute top-9 right-0 z-20 inline-grid h-6 w-6 translate-x-1/2 place-items-center rounded-full border border-border/70 bg-surface/95 text-muted opacity-75 shadow-lectum-soft transition-[background,color,opacity,transform,box-shadow] duration-200 ease-out hover:scale-[1.03] hover:bg-background hover:text-foreground hover:opacity-100 hover:shadow-lectum-soft focus-visible:bg-background focus-visible:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-95"
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
          href="/psicologos"
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
    const visibleCopy = shouldShowSessionError
      ? {
          description:
            "Não conseguimos confirmar sua sessão agora. Tente novamente sem perder seus dados ou entre de novo.",
          title: "Não foi possível validar sua sessão",
        }
      : restrictedAreaCopy;

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
          <RestrictedAreaState
            copy={visibleCopy}
            onLogin={() => navigateToAuth(restrictedAreaLoginHref)}
            onRetry={() => void hidrate.refetch()}
            onSignup={() => navigateToAuth(restrictedAreaSignupHref)}
            sessionUnavailable={shouldShowSessionError}
          />
        </PageShell>
        {navigationMarkup}
      </>
    );
  }

  if (shouldRedirectToNeedReset) {
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
          <LoadingState label="Preparando troca de senha obrigatória" />
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

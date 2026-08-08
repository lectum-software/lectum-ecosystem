"use client";

import { AlertTriangle, ChevronDown, ChevronLeft, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useMemo, useState } from "react";
import { useAdminModerationSummary } from "@/api/callers/moderation";
import { setSidebarCollapsed } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/providers/admin-auth";
import { adminNavItems } from "./nav";

type SidebarContentProps = {
  collapsed: boolean;
  onNavigate?: () => void;
  onRequestExpand?: () => void;
  premiumPilot?: boolean;
};

type ModerationSubmenuBadge = "compliance" | "conteudoSensivel" | "denuncias" | "operacionais";

const hrefPathname = (href: string) => href.split("?")[0].split("#")[0];

const isNavPathActive = (pathname: string, href: string) => {
  const hrefPath = hrefPathname(href);

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
};

const formatNavCount = (value: number) => (value > 99 ? "99+" : String(value));

const pendingCountLabel = (value: number) => `${value} ${value === 1 ? "pendência" : "pendências"}`;

const moderationSubmenuBadgeTone: Record<ModerationSubmenuBadge, "danger" | "warning"> = {
  compliance: "danger",
  conteudoSensivel: "warning",
  denuncias: "danger",
  operacionais: "warning",
};

const isPremiumPilotPath = (pathname: string) =>
  pathname === "/dashboard" ||
  pathname.startsWith("/dashboard/") ||
  pathname === "/psicologos" ||
  pathname.startsWith("/psicologos/") ||
  pathname === "/trafego" ||
  pathname.startsWith("/trafego/") ||
  pathname === "/comunidades" ||
  pathname.startsWith("/comunidades/") ||
  pathname === "/pacientes" ||
  pathname.startsWith("/pacientes/") ||
  pathname === "/financeiro" ||
  pathname.startsWith("/financeiro/") ||
  pathname === "/moderacao" ||
  pathname.startsWith("/moderacao/") ||
  pathname === "/notificacoes" ||
  pathname.startsWith("/notificacoes/") ||
  pathname === "/configuracoes" ||
  pathname.startsWith("/configuracoes/") ||
  pathname === "/settings" ||
  pathname.startsWith("/settings/");

const SidebarContent = ({
  collapsed,
  onNavigate,
  onRequestExpand,
  premiumPilot = false,
}: SidebarContentProps) => {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();
  const activeGroupHref = useMemo(
    () =>
      adminNavItems.find((item) => "children" in item && isNavPathActive(pathname, item.href))
        ?.href ?? null,
    [pathname],
  );
  const [openGroupOverride, setOpenGroupOverride] = useState<{
    pathname: string;
    href: string | null;
  } | null>(null);
  const openGroupHref =
    openGroupOverride?.pathname === pathname ? openGroupOverride.href : activeGroupHref;
  const moderationSummary = useAdminModerationSummary();
  const moderationPendingTotal =
    (moderationSummary.data?.pending_total ?? 0) +
    (moderationSummary.data?.operational_alerts?.counts.total ?? 0);
  const moderationUrgentTotal =
    (moderationSummary.data?.urgent_pending_total ?? 0) +
    (moderationSummary.data?.operational_alerts?.counts.urgent_total ?? 0);
  const hasModerationSummary = Boolean(moderationSummary.data);
  const moderationSubmenuPendingCounts: Record<ModerationSubmenuBadge, number> = {
    compliance: moderationSummary.data?.operational_alerts?.counts.compliance_total ?? 0,
    conteudoSensivel: moderationSummary.data?.pending_total ?? 0,
    denuncias: moderationSummary.data?.operational_alerts?.counts.pending_reports ?? 0,
    operacionais: moderationSummary.data?.operational_alerts?.counts.operational_total ?? 0,
  };
  const moderationTotalLabel = `${moderationPendingTotal} ${
    moderationPendingTotal === 1 ? "ação" : "ações"
  }`;
  const moderationUrgentLabel = `${moderationUrgentTotal} ${
    moderationUrgentTotal === 1 ? "ação urgente" : "ações urgentes"
  }`;
  const moderationBadgeTitle =
    moderationUrgentTotal > 0
      ? `${moderationUrgentLabel} de moderação; ${moderationTotalLabel} no total`
      : `${moderationTotalLabel} de moderação menos urgentes`;
  const getModerationSubmenuPendingCount = (badge?: string) => {
    if (!hasModerationSummary || !badge) return null;
    if (!(badge in moderationSubmenuPendingCounts)) return null;

    return moderationSubmenuPendingCounts[badge as ModerationSubmenuBadge];
  };
  const adminName = admin?.name || "Admin Lectum";
  const initials = useMemo(() => {
    const names = adminName.split(" ").filter(Boolean);
    return `${names[0]?.[0] || "A"}${names[1]?.[0] || "D"}`.toUpperCase();
  }, [adminName]);

  return (
    <div
      className={cn(
        "scrollbar-none flex h-full flex-col overflow-y-auto overscroll-contain bg-sidebar text-sidebar-foreground",
        premiumPilot && "bg-sidebar/95 backdrop-blur",
      )}
    >
      <div
        className={cn("flex h-20 shrink-0 items-center px-5", collapsed && "justify-center px-3")}
      >
        <div className={cn("min-w-0", collapsed && "text-center")}>
          <p
            className={cn(
              "truncate text-2xl font-black uppercase leading-none tracking-[0.12em] text-primary",
              collapsed && "text-lg tracking-[0.04em]",
            )}
          >
            {collapsed ? "L" : "LECTUM"}
          </p>
          <p
            className={cn(
              "mt-1 truncate text-xs font-bold text-sidebar-muted",
              collapsed && "sr-only",
            )}
          >
            Painel Administrativo
          </p>
        </div>
      </div>

      <nav aria-label="Menu administrativo" className="shrink-0 px-3 py-4">
        <div className="space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavPathActive(pathname, item.href);
            const showModerationBadge =
              "badge" in item && item.badge === "moderation" && moderationPendingTotal > 0;

            if ("children" in item) {
              const isOpen = openGroupHref === item.href;
              const groupId = `admin-nav-${item.href.replaceAll("/", "-")}`;

              return (
                <div key={item.href}>
                  <button
                    aria-controls={collapsed ? undefined : groupId}
                    aria-current={isActive ? "page" : undefined}
                    aria-expanded={collapsed ? undefined : isOpen}
                    className={cn(
                      "relative flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 text-left text-sm font-bold transition",
                      premiumPilot
                        ? "text-sidebar-muted hover:bg-sidebar-active hover:text-primary focus-visible:outline-primary"
                        : "text-sidebar-muted hover:bg-sidebar-active/45 hover:text-sidebar-foreground focus-visible:outline-sidebar-foreground",
                      isActive &&
                        (premiumPilot
                          ? "bg-sidebar-active text-primary shadow-control ring-1 ring-primary/10"
                          : "bg-sidebar-active text-sidebar-foreground shadow-admin-soft"),
                      collapsed && "justify-center px-2",
                    )}
                    onClick={() => {
                      if (collapsed) {
                        setOpenGroupOverride({ pathname, href: item.href });
                        onRequestExpand?.();
                        return;
                      }

                      setOpenGroupOverride((current) => {
                        const currentHref =
                          current?.pathname === pathname ? current.href : activeGroupHref;

                        return { pathname, href: currentHref === item.href ? null : item.href };
                      });
                    }}
                    title={collapsed ? item.label : undefined}
                    type="button"
                  >
                    <Icon aria-hidden className="h-5 w-5 shrink-0" />
                    <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>
                      {item.label}
                    </span>
                    {showModerationBadge ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "ml-auto inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-full px-2 text-[0.68rem] font-black shadow-admin-soft",
                          moderationUrgentTotal > 0
                            ? "bg-danger text-primary-foreground"
                            : "bg-warning-soft text-warning ring-1 ring-warning-border",
                          collapsed &&
                            "absolute -right-1 top-1 ml-0 h-5 min-w-5 gap-0 px-1 text-[0.62rem]",
                        )}
                        title={moderationBadgeTitle}
                      >
                        <AlertTriangle
                          aria-hidden="true"
                          className={cn("h-3.5 w-3.5 shrink-0", collapsed && "h-3 w-3")}
                        />
                        <span className={cn(collapsed && "sr-only")}>
                          {moderationPendingTotal > 99 ? "99+" : moderationPendingTotal}
                        </span>
                      </span>
                    ) : null}
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        isOpen && "rotate-180",
                        collapsed && "hidden",
                      )}
                    />
                    {showModerationBadge ? (
                      <span className="sr-only">{moderationBadgeTitle}</span>
                    ) : null}
                  </button>

                  {isOpen && !collapsed ? (
                    <div className="mt-1 space-y-1 pl-8" id={groupId}>
                      {item.children.map((child) => {
                        const childHrefPath = hrefPathname(child.href);
                        const childIsActive =
                          !child.href.includes("#") &&
                          (pathname === childHrefPath ||
                            (childHrefPath !== item.href &&
                              pathname.startsWith(`${childHrefPath}/`)));
                        const childPendingCount = getModerationSubmenuPendingCount(
                          "badge" in child ? child.badge : undefined,
                        );
                        const childBadge =
                          "badge" in child ? (child.badge as ModerationSubmenuBadge) : null;
                        const childBadgeTone = childBadge
                          ? moderationSubmenuBadgeTone[childBadge]
                          : null;
                        const childPendingTitle =
                          childPendingCount === null
                            ? null
                            : `${pendingCountLabel(childPendingCount)} em ${child.label}`;

                        return (
                          <Link
                            aria-current={childIsActive ? "page" : undefined}
                            className={cn(
                              "flex min-h-10 items-center gap-2 rounded-xl border-l px-3 pl-4 text-sm font-bold transition",
                              premiumPilot
                                ? "border-border text-sidebar-muted hover:bg-sidebar-active hover:text-primary focus-visible:outline-primary"
                                : "border-sidebar-foreground/10 text-sidebar-muted hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:outline-sidebar-foreground",
                              childIsActive &&
                                (premiumPilot
                                  ? "border-primary/30 bg-sidebar-active text-primary"
                                  : "bg-sidebar-foreground/10 text-sidebar-foreground"),
                            )}
                            href={child.href}
                            key={child.href}
                            onClick={() => {
                              setOpenGroupOverride({ pathname, href: item.href });
                              onNavigate?.();
                            }}
                          >
                            <span className="min-w-0 flex-1 truncate">{child.label}</span>
                            {childPendingCount !== null ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.66rem] font-black leading-none ring-1 transition",
                                    childBadgeTone === "danger" &&
                                      "bg-danger/10 text-danger ring-danger/20",
                                    childBadgeTone === "warning" &&
                                      "bg-warning/10 text-warning ring-warning/25",
                                  )}
                                  title={childPendingTitle ?? undefined}
                                >
                                  {formatNavCount(childPendingCount)}
                                </span>
                                {childPendingTitle ? (
                                  <span className="sr-only">{childPendingTitle}</span>
                                ) : null}
                              </>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition",
                  premiumPilot
                    ? "text-sidebar-muted hover:bg-sidebar-active hover:text-primary focus-visible:outline-primary"
                    : "text-sidebar-muted hover:bg-sidebar-active/45 hover:text-sidebar-foreground focus-visible:outline-sidebar-foreground",
                  isActive &&
                    (premiumPilot
                      ? "bg-sidebar-active text-primary shadow-control ring-1 ring-primary/10"
                      : "bg-sidebar-active text-sidebar-foreground shadow-admin-soft"),
                  collapsed && "justify-center px-2",
                )}
                href={item.href}
                key={item.href}
                onClick={() => {
                  setOpenGroupOverride({ pathname, href: null });
                  onNavigate?.();
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon aria-hidden className="h-5 w-5 shrink-0" />
                <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                {showModerationBadge ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "ml-auto inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-full px-2 text-[0.68rem] font-black shadow-admin-soft",
                      moderationUrgentTotal > 0
                        ? "bg-danger text-primary-foreground"
                        : "bg-warning-soft text-warning ring-1 ring-warning-border",
                      collapsed &&
                        "absolute -right-1 top-1 ml-0 h-5 min-w-5 gap-0 px-1 text-[0.62rem]",
                    )}
                    title={moderationBadgeTitle}
                  >
                    <AlertTriangle
                      aria-hidden="true"
                      className={cn("h-3.5 w-3.5 shrink-0", collapsed && "h-3 w-3")}
                    />
                    <span className={cn(collapsed && "sr-only")}>
                      {moderationPendingTotal > 99 ? "99+" : moderationPendingTotal}
                    </span>
                  </span>
                ) : null}
                {showModerationBadge ? (
                  <span className="sr-only">{moderationBadgeTitle}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div
        className={cn(
          "shrink-0 border-t p-3",
          premiumPilot ? "border-border" : "border-sidebar-foreground/10",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl px-2 py-3",
            collapsed && "justify-center",
          )}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
            {initials}
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
            <p className="truncate text-sm font-black text-sidebar-foreground">{adminName}</p>
            <p className="truncate text-xs text-sidebar-muted">Administrador</p>
          </div>
        </div>

        <button
          aria-label="Sair do painel administrativo"
          className={cn(
            "mt-2 flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold text-sidebar-muted transition",
            premiumPilot
              ? "hover:bg-sidebar-active hover:text-primary"
              : "hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground",
            collapsed && "justify-center px-2",
          )}
          onClick={() => void logout()}
          type="button"
        >
          <LogOut aria-hidden className="h-5 w-5" />
          <span className={cn(collapsed && "sr-only")}>Sair</span>
        </button>
      </div>
    </div>
  );
};

export const AdminShell = ({ children }: PropsWithChildren) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const premiumPilot = isPremiumPilotPath(pathname);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      setSidebarCollapsed(next);
      return next;
    });
  };
  const expandCollapsedSidebar = () => {
    setCollapsed(false);
    setSidebarCollapsed(false);
  };

  return (
    <div
      className={cn(
        "min-h-dvh max-w-full overflow-x-clip bg-background text-foreground",
        premiumPilot && "admin-premium-pilot",
      )}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r transition-[width] duration-200 lg:block",
          premiumPilot ? "border-border shadow-admin-soft" : "border-sidebar-foreground/10",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <button
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-pressed={!collapsed}
          className="absolute top-9 right-0 z-20 inline-grid h-6 w-6 translate-x-1/2 place-items-center rounded-full border border-border/70 bg-surface/95 text-muted opacity-75 shadow-control transition-[background,color,opacity,transform,box-shadow] duration-200 ease-out hover:scale-[1.03] hover:bg-background hover:text-foreground hover:opacity-100 hover:shadow-admin-soft focus-visible:bg-background focus-visible:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-95"
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          type="button"
        >
          <ChevronLeft
            aria-hidden="true"
            className={cn(
              "h-3 w-3 transition-transform duration-200 ease-out",
              collapsed ? "rotate-180" : "rotate-0",
            )}
            strokeWidth={2}
          />
        </button>
        <SidebarContent
          collapsed={collapsed}
          onRequestExpand={expandCollapsedSidebar}
          premiumPilot={premiumPilot}
        />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu administrativo"
            className="absolute inset-0 bg-overlay"
            onClick={() => setDrawerOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-[min(80vw,300px)] shadow-admin">
            <button
              aria-label="Fechar menu administrativo"
              className={cn(
                "absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full",
                premiumPilot
                  ? "border border-border bg-surface text-foreground"
                  : "bg-sidebar-foreground/10 text-sidebar-foreground",
              )}
              onClick={() => setDrawerOpen(false)}
              type="button"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
            <SidebarContent
              collapsed={false}
              onNavigate={() => setDrawerOpen(false)}
              premiumPilot={premiumPilot}
            />
          </aside>
        </div>
      ) : null}

      <div
        className={cn(
          "min-w-0 max-w-full overflow-x-clip transition-[padding] duration-200 lg:pl-64",
          collapsed && "lg:pl-20",
        )}
      >
        <main className="mx-auto w-full min-w-0 max-w-full overflow-x-clip px-4 py-5 sm:px-6 lg:px-8 lg:py-8 xl:max-w-[1440px]">
          <div className="mb-4 flex lg:hidden">
            <button
              aria-label="Abrir menu administrativo"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-control transition hover:border-border-strong"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              <Menu aria-hidden className="h-5 w-5" />
            </button>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
};

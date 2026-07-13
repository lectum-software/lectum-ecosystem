"use client";

import { ChevronDown, ChevronLeft, LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useMemo, useState } from "react";
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

const isNavPathActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const SidebarContent = ({
  collapsed,
  onNavigate,
  onRequestExpand,
  premiumPilot = false,
}: SidebarContentProps) => {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
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
        className={cn(
          "flex h-20 shrink-0 items-center gap-3 px-5",
          collapsed && "justify-center px-3",
        )}
      >
        <Image
          alt="Lectum"
          className={cn(collapsed && "hidden")}
          height={42}
          priority
          src="/logo-light.png"
          width={150}
        />
        <Image
          alt="Lectum"
          className={cn(!collapsed && "hidden")}
          height={36}
          priority
          src="/logo-icon.svg"
          width={36}
        />
      </div>

      <nav aria-label="Menu administrativo" className="shrink-0 px-3 py-4">
        <div className="space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavPathActive(pathname, item.href);

            if ("children" in item) {
              const isOpen = openGroups[item.href] ?? isActive;
              const groupId = `admin-nav-${item.href.replaceAll("/", "-")}`;

              return (
                <div key={item.href}>
                  <button
                    aria-controls={collapsed ? undefined : groupId}
                    aria-current={isActive ? "page" : undefined}
                    aria-expanded={collapsed ? undefined : isOpen}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition",
                      premiumPilot
                        ? "text-sidebar-muted hover:bg-sidebar-active hover:text-primary focus-visible:outline-primary"
                        : "text-sidebar-muted hover:bg-sidebar-active/45 hover:text-sidebar-foreground focus-visible:outline-white",
                      isActive &&
                        (premiumPilot
                          ? "bg-sidebar-active text-primary shadow-control ring-1 ring-primary/10"
                          : "bg-sidebar-active text-sidebar-foreground shadow-admin-soft"),
                      collapsed && "justify-center px-2",
                    )}
                    onClick={() => {
                      if (collapsed) {
                        setOpenGroups((current) => ({
                          ...current,
                          [item.href]: true,
                        }));
                        onRequestExpand?.();
                        return;
                      }

                      setOpenGroups((current) => ({
                        ...current,
                        [item.href]: !(current[item.href] ?? isActive),
                      }));
                    }}
                    title={collapsed ? item.label : undefined}
                    type="button"
                  >
                    <Icon aria-hidden className="h-5 w-5 shrink-0" />
                    <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>
                      {item.label}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        isOpen && "rotate-180",
                        collapsed && "hidden",
                      )}
                    />
                  </button>

                  {isOpen && !collapsed ? (
                    <div className="mt-1 space-y-1 pl-8" id={groupId}>
                      {item.children.map((child) => {
                        const childIsActive =
                          pathname === child.href ||
                          (child.href !== item.href && pathname.startsWith(`${child.href}/`));

                        return (
                          <Link
                            aria-current={childIsActive ? "page" : undefined}
                            className={cn(
                              "flex min-h-10 items-center rounded-xl border-l px-3 pl-4 text-sm font-bold transition",
                              premiumPilot
                                ? "border-border text-sidebar-muted hover:bg-sidebar-active hover:text-primary focus-visible:outline-primary"
                                : "border-white/10 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground focus-visible:outline-white",
                              childIsActive &&
                                (premiumPilot
                                  ? "border-primary/30 bg-sidebar-active text-primary"
                                  : "bg-white/10 text-sidebar-foreground"),
                            )}
                            href={child.href}
                            key={child.href}
                            onClick={onNavigate}
                          >
                            {child.label}
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
                  "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition",
                  premiumPilot
                    ? "text-sidebar-muted hover:bg-sidebar-active hover:text-primary focus-visible:outline-primary"
                    : "text-sidebar-muted hover:bg-sidebar-active/45 hover:text-sidebar-foreground focus-visible:outline-white",
                  isActive &&
                    (premiumPilot
                      ? "bg-sidebar-active text-primary shadow-control ring-1 ring-primary/10"
                      : "bg-sidebar-active text-sidebar-foreground shadow-admin-soft"),
                  collapsed && "justify-center px-2",
                )}
                href={item.href}
                key={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
              >
                <Icon aria-hidden className="h-5 w-5 shrink-0" />
                <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div
        className={cn("shrink-0 border-t p-3", premiumPilot ? "border-border" : "border-white/10")}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl px-2 py-3",
            collapsed && "justify-center",
          )}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-white">
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
              : "hover:bg-white/10 hover:text-sidebar-foreground",
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
  const premiumPilot = pathname === "/psicologos" || pathname.startsWith("/psicologos/");

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
        "min-h-dvh bg-background text-foreground",
        premiumPilot && "admin-premium-pilot",
      )}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r transition-[width] duration-200 lg:block",
          premiumPilot ? "border-border shadow-admin-soft" : "border-white/10",
          collapsed ? "w-20" : "w-60",
        )}
      >
        <button
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-pressed={!collapsed}
          className="absolute top-9 right-0 z-20 inline-grid h-6 w-6 translate-x-1/2 place-items-center rounded-full border border-border/70 bg-surface/95 text-muted opacity-75 shadow-[0_3px_10px_rgb(15_23_42_/_8%)] transition-[background,color,opacity,transform,box-shadow] duration-200 ease-out hover:scale-[1.03] hover:bg-background hover:text-foreground hover:opacity-100 hover:shadow-[0_6px_14px_rgb(15_23_42_/_10%)] focus-visible:bg-background focus-visible:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-95"
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
                  : "bg-white/10 text-white",
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

      <div className={cn("transition-[padding] duration-200 lg:pl-60", collapsed && "lg:pl-20")}>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
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

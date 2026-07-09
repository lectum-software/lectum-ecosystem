"use client";

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
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
  onToggle?: () => void;
};

const SidebarContent = ({ collapsed, onNavigate, onToggle }: SidebarContentProps) => {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();
  const adminName = admin?.name || "Admin Lectum";
  const initials = useMemo(() => {
    const names = adminName.split(" ").filter(Boolean);
    return `${names[0]?.[0] || "A"}${names[1]?.[0] || "D"}`.toUpperCase();
  }, [adminName]);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-20 items-center gap-3 px-5", collapsed && "justify-center px-3")}>
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

      <nav aria-label="Menu administrativo" className="flex-1 space-y-1 px-3 py-4">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition",
                "text-sidebar-muted hover:bg-sidebar-active/45 hover:text-sidebar-foreground focus-visible:outline-white",
                isActive && "bg-sidebar-active text-sidebar-foreground shadow-admin-soft",
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
      </nav>

      <div className="border-t border-white/10 p-3">
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
            "mt-2 flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold text-sidebar-muted transition hover:bg-white/10 hover:text-sidebar-foreground",
            collapsed && "justify-center px-2",
          )}
          onClick={() => void logout()}
          type="button"
        >
          <LogOut aria-hidden className="h-5 w-5" />
          <span className={cn(collapsed && "sr-only")}>Sair</span>
        </button>

        {onToggle ? (
          <button
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            className={cn(
              "mt-2 hidden h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold text-sidebar-muted transition hover:bg-white/10 hover:text-sidebar-foreground lg:flex",
              collapsed && "justify-center px-2",
            )}
            onClick={onToggle}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="h-5 w-5" />
            ) : (
              <PanelLeftClose aria-hidden className="h-5 w-5" />
            )}
            <span className={cn(collapsed && "sr-only")}>
              {collapsed ? "Expandir" : "Recolher"}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

export const AdminShell = ({ children }: PropsWithChildren) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { admin } = useAdminAuth();

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      setSidebarCollapsed(next);
      return next;
    });
  };

  const adminName = admin?.name || "Admin Lectum";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-white/10 transition-[width] duration-200 lg:block",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu administrativo"
            className="absolute inset-0 bg-overlay"
            onClick={() => setDrawerOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-[min(84vw,320px)] shadow-admin">
            <button
              aria-label="Fechar menu administrativo"
              className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
              onClick={() => setDrawerOpen(false)}
              type="button"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
            <SidebarContent collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className={cn("transition-[padding] duration-200 lg:pl-72", collapsed && "lg:pl-20")}>
        <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
            <div className="flex items-center gap-2">
              <button
                aria-label="Abrir menu administrativo"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-control transition hover:border-border-strong lg:hidden"
                onClick={() => setDrawerOpen(true)}
                type="button"
              >
                <Menu aria-hidden className="h-5 w-5" />
              </button>
              <button
                aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                className="hidden h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-3 text-sm font-bold text-muted shadow-control transition hover:border-border-strong hover:text-foreground lg:flex"
                onClick={toggleCollapsed}
                type="button"
              >
                {collapsed ? (
                  <ChevronRight aria-hidden className="h-4 w-4" />
                ) : (
                  <ChevronLeft aria-hidden className="h-4 w-4" />
                )}
                <span>{collapsed ? "Expandir" : "Recolher"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                aria-label="Abrir notificações administrativas"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-control transition hover:border-border-strong"
                type="button"
              >
                <Bell aria-hidden className="h-5 w-5" />
              </button>

              <button
                aria-label="Abrir perfil administrativo"
                className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-2 pr-3 text-sm font-black text-foreground shadow-control transition hover:border-border-strong"
                type="button"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-black text-white">
                  AD
                </span>
                <span className="hidden max-w-36 truncate sm:block">{adminName}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
};

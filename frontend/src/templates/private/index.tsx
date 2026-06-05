"use client";

import {
  Bell,
  Heart,
  Home,
  LogOut,
  type LucideIcon,
  Network,
  UserRound,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/api/callers/auth";
import type { user } from "@/api/generator/types";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { PageShell } from "@/components/ui/page-shell";
import { ThemeSwitch } from "@/components/ui/theme-switch";
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

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.split("@")[0] || "Lectum";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getRoleLabel = (role?: user["role"] | null) => {
  if (role === "psicologo") return "Psicólogo";
  if (role === "paciente") return "Paciente";

  return "Conta Lectum";
};

export const PrivateTemplate = ({ children, showHeader = true }: PrivateTemplateProps) => {
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
  const activeItem = navigation.find((item) => isActivePath(pathname, item));
  const pageTitle = activeItem?.title ?? "Lectum";
  const isSessionLoading = hasToken && !sessionUser && (hidrate.isLoading || hidrate.isPending);
  const shouldShowSessionError = Boolean(hasToken && hidrate.isError && !sessionUser);

  const header = showHeader ? (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-5">
        <Link
          aria-label="Ir para a área privada"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary"
          href="/app"
        >
          <Image alt="Lectum" height={32} priority src="/icon.png" width={32} />
        </Link>

        <div className="min-w-0 text-center sm:text-left">
          <h1 className="truncate text-base font-bold text-foreground sm:text-lg">{pageTitle}</h1>
          <p className="hidden text-xs text-muted sm:block">
            {sessionUser?.name?.trim() || sessionUser?.email
              ? `${sessionUser?.name?.trim() || sessionUser?.email} · ${getRoleLabel(
                  sessionUser?.role,
                )}`
              : "Sessão privada"}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <ThemeSwitch />
          <Link
            aria-label="Notificações"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
            href="/app/notifications"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>
          <span
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white sm:grid"
            title={sessionUser?.name || sessionUser?.email || "Usuário"}
          >
            {getInitials(sessionUser?.name, sessionUser?.email)}
          </span>
          <Button
            aria-label="Sair"
            className="h-10 px-3 sm:px-4"
            onClick={() => out("/auth/login")}
            type="button"
            variant="ghost"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  ) : null;

  if (isSessionLoading) {
    return (
      <>
        <NotificationManager />
        <PageShell contentClassName="grid min-h-[55vh] place-items-center pb-28" header={header}>
          <LoadingState label="Carregando sua sessão" />
        </PageShell>
      </>
    );
  }

  if (!hasToken || shouldShowSessionError) {
    return (
      <>
        <NotificationManager />
        <PageShell contentClassName="grid min-h-[55vh] place-items-center pb-28" header={header}>
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
      <PageShell contentClassName="pb-28 sm:pb-32" header={header}>
        {children}
      </PageShell>
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

"use client";

import { Bell, Heart, Home, Search, UserRound } from "lucide-react";
import type { ComponentType, PropsWithChildren, MouseEvent as ReactMouseEvent } from "react";
import type { user } from "@/api/generator/types";
import {
  COMMUNITY_FEED_SLUG,
  DEFAULT_COMMUNITY_FEED_HREF,
  LEGACY_COMMUNITY_FEED_HREF,
} from "@/utils/community";
import { PSYCHOLOGIST_ONBOARDING_PATHS } from "@/utils/psychologist-onboarding";

export type PrivateTemplateProps = PropsWithChildren<{
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

export type UserRole = NonNullable<user["role"]>;

export type NavigationIconProps = {
  "aria-hidden"?: boolean | "false" | "true";
  className?: string;
};

export type NavigationIcon = ComponentType<NavigationIconProps>;

export type NavigationItem = {
  href: string;
  icon: NavigationIcon;
  label: string;
  mobileIcon?: NavigationIcon;
  title: string;
};

export const NOTIFICATIONS_HREF = "/app/notificacoes";

export const NEED_RESET_PATH = "/app/conta/redefinir-senha";

export const DEFAULT_RESTRICTED_AREA_COPY = {
  description:
    "Entre ou crie sua conta para acessar seu perfil, salvar preferências e continuar sua experiência na Lectum.",
  title: "Acesse sua conta",
};

export const COMMUNITY_TOP_MENTORS_RESTRICTED_AREA_COPY = {
  ...DEFAULT_RESTRICTED_AREA_COPY,
  description:
    "Faça login para acessar o ranking dos principais mentores da comunidade e acompanhar quem mais contribui nas discussões.",
};

export const RESTRICTED_AREA_COPY_BY_PATH = new Map<string, typeof DEFAULT_RESTRICTED_AREA_COPY>([
  ["/app/comunidades/top-mentores", COMMUNITY_TOP_MENTORS_RESTRICTED_AREA_COPY],
  ["/comunidades/top-mentores", COMMUNITY_TOP_MENTORS_RESTRICTED_AREA_COPY],
  [
    "/app/favoritos",
    {
      description:
        "Crie uma conta gratuita para salvar psicólogos, posts e respostas que quiser consultar depois.",
      title: "Salve seus favoritos",
    },
  ],
  [
    "/app/notificacoes",
    {
      description:
        "Entre ou crie sua conta para acompanhar respostas, interações e atualizações das comunidades.",
      title: "Acompanhe suas notificações",
    },
  ],
  [
    "/app/perfil",
    {
      description:
        "Crie sua conta gratuita para salvar suas preferências e continuar sua experiência na Lectum.",
      title: "Acesse sua conta",
    },
  ],
]);

export const NotificationUnreadIndicator = () => (
  <span
    aria-hidden="true"
    className="-right-1 -top-1 absolute h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface"
  />
);

export const fallbackNavigation: NavigationItem[] = [
  {
    href: DEFAULT_COMMUNITY_FEED_HREF,
    icon: Home,
    label: "Início",
    title: "Início",
  },
  {
    href: "/psicologos",
    icon: Search,
    label: "Psicólogos",
    title: "Encontre seu psicólogo",
  },
  {
    href: "/app/favoritos",
    icon: Heart,
    label: "Favoritos",
    title: "Favoritos",
  },
  {
    href: "/app/notificacoes",
    icon: Bell,
    label: "Notificações",
    title: "Notificações",
  },
  {
    href: "/app/perfil",
    icon: UserRound,
    label: "Perfil",
    title: "Meu Perfil",
  },
];

export const navigationByRole: Record<
  Extract<UserRole, "paciente" | "psicologo">,
  NavigationItem[]
> = {
  paciente: [
    {
      href: DEFAULT_COMMUNITY_FEED_HREF,
      icon: Home,
      label: "Início",
      title: "Início",
    },
    {
      href: "/psicologos",
      icon: Search,
      label: "Psicólogos",
      title: "Encontre seu psicólogo",
    },
    {
      href: "/app/favoritos",
      icon: Heart,
      label: "Favoritos",
      title: "Favoritos",
    },
    {
      href: "/app/notificacoes",
      icon: Bell,
      label: "Notificações",
      title: "Notificações",
    },
    {
      href: "/app/perfil",
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
      href: "/psicologos",
      icon: Search,
      label: "Psicólogos",
      title: "Psicólogos",
    },
    {
      href: "/app/favoritos",
      icon: Heart,
      label: "Favoritos",
      title: "Favoritos",
    },
    {
      href: "/app/notificacoes",
      icon: Bell,
      label: "Notificações",
      title: "Notificações",
    },
    {
      href: "/app/perfil",
      icon: UserRound,
      label: "Perfil",
      title: "Meu Perfil",
    },
  ],
};

export const getNavigation = (role?: user["role"] | null) => {
  if (role === "paciente" || role === "psicologo") {
    return navigationByRole[role];
  }

  return fallbackNavigation;
};

export const normalizePathname = (pathname: string) => {
  if (pathname.length <= 1) return pathname;

  return pathname.replace(/\/+$/, "");
};

export const isPathOrDescendant = (pathname: string, target: string) =>
  pathname === target || pathname.startsWith(`${target}/`);

export const canStayDuringPaidOnboarding = (pathname: string, requiredPath: string) => {
  if (isPathOrDescendant(pathname, requiredPath)) return true;

  if (requiredPath === PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress) {
    return isPathOrDescendant(pathname, PSYCHOLOGIST_ONBOARDING_PATHS.checkout);
  }

  return PAID_ONBOARDING_MANAGEMENT_PATHS.has(pathname);
};

export const getNavigationContextPathname = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  const segments = normalizedPathname.split("/").filter(Boolean);

  if (normalizedPathname === LEGACY_COMMUNITY_FEED_HREF) {
    return DEFAULT_COMMUNITY_FEED_HREF;
  }

  if (
    segments.length === 5 &&
    segments[0] === "app" &&
    (segments[1] === "community" || segments[1] === "comunidades") &&
    (segments[3] === "post" || segments[3] === "publicacao") &&
    (segments[4] === "new" || segments[4] === "nova")
  ) {
    if (segments[2] === COMMUNITY_FEED_SLUG) {
      return DEFAULT_COMMUNITY_FEED_HREF;
    }

    return `/comunidades/${segments[2]}`;
  }

  return normalizedPathname;
};

export const PRIMARY_DESKTOP_NAVIGATION_PATHS = new Set([
  "/psicologos",
  "/app/favoritos",
  DEFAULT_COMMUNITY_FEED_HREF,
  "/app/notificacoes",
  "/app/perfil",
]);

export const PAID_ONBOARDING_MANAGEMENT_PATHS = new Set([
  "/app/profissional/assinatura",
  "/app/profissional/assinatura/cartao",
  "/app/profissional/assinatura/planos",
  "/app/profissional/assinatura/gerenciar",
  "/app/configuracoes/conta",
  NEED_RESET_PATH,
]);

export const isPrimaryDesktopNavigationPath = (pathname: string) => {
  return PRIMARY_DESKTOP_NAVIGATION_PATHS.has(pathname);
};

export const isDesktopActivePath = (pathname: string, item: NavigationItem) => {
  return isPrimaryDesktopNavigationPath(pathname) && pathname === item.href;
};

export const MOBILE_NAVIGATION_ACTIVE_HREF_BY_PATH = new Map<string, string>([
  ["/psicologos", "/psicologos"],
  ["/app/favoritos", "/app/favoritos"],
  [DEFAULT_COMMUNITY_FEED_HREF, DEFAULT_COMMUNITY_FEED_HREF],
  ["/app/notificacoes", "/app/notificacoes"],
  ["/app/perfil", "/app/perfil"],
]);

export const COMMUNITY_MAIN_ROUTE_RESERVED_SEGMENTS = new Set([
  COMMUNITY_FEED_SLUG,
  "publicacao",
  "post",
  "suggest",
  "top-mentors",
  "top-mentores",
]);

export const isCommunityMainMobileNavigationPath = (pathname: string) => {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);

  return (
    segments.length === 2 &&
    (segments[0] === "community" || segments[0] === "comunidades") &&
    !COMMUNITY_MAIN_ROUTE_RESERVED_SEGMENTS.has(segments[1])
  );
};

export const isPsychologistProfileMobileNavigationPath = (pathname: string) => {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);

  return segments.length === 2 && (segments[0] === "psychologists" || segments[0] === "psicologos");
};

export const shouldShowMobileNavigationForPath = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);

  return (
    MOBILE_NAVIGATION_ACTIVE_HREF_BY_PATH.has(normalizedPathname) ||
    isCommunityMainMobileNavigationPath(normalizedPathname) ||
    isPsychologistProfileMobileNavigationPath(normalizedPathname)
  );
};

export const getMobileNavigationActiveHref = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);

  if (isPsychologistProfileMobileNavigationPath(normalizedPathname)) {
    return "/psicologos";
  }

  return MOBILE_NAVIGATION_ACTIVE_HREF_BY_PATH.get(normalizedPathname) ?? null;
};

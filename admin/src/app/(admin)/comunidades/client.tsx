"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  type LucideIcon,
  MessageCircle,
  RefreshCw,
  Reply,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FocusEventHandler, type SVGProps, useCallback, useRef, useState } from "react";
import { useAdminCommunitiesDashboard } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunitiesDashboard,
  CommunitiesDashboardGlobalStatistics,
  CommunitiesDashboardHourlyActivityPoint,
  CommunitiesDashboardPopularPost,
  CommunitiesDashboardPostAuthor,
  CommunitiesDashboardQuery,
  CommunitiesDashboardRecentPost,
  CommunitiesDashboardStatisticsDailyPoint,
  CommunitiesDashboardTopCommunity,
} from "@/api/req/communities";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const MAX_COMMUNITY_DASHBOARD_DAYS = 3660;
type CommunityDashboardPeriodValue = NonNullable<CommunitiesDashboardQuery["period"]>;
type CommunityDashboardPeriodPreset = Exclude<CommunityDashboardPeriodValue, "custom">;

const COMMUNITY_DASHBOARD_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
] as const satisfies ReadonlyArray<{
  id: CommunityDashboardPeriodPreset;
  label: string;
}>;

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const publicMediaPathPrefixes = ["/public/files/", "/community/icons/"] as const;
type DashboardStatisticDailyKey = Exclude<keyof CommunitiesDashboardStatisticsDailyPoint, "date">;
type DashboardStatisticMetricId =
  | "active_patients"
  | "active_psychologists"
  | "downvotes"
  | "followers_patients"
  | "followers_psychologists"
  | "new_active_patients"
  | "new_active_psychologists"
  | "patient_comments"
  | "patient_posts"
  | "profile_accesses"
  | "psychologist_posts"
  | "reports"
  | "saves"
  | "unverified_psychologist_replies"
  | "upvotes"
  | "verified_psychologist_replies"
  | "whatsapp_clicks";

type DashboardStatisticMetricConfig = {
  color: string;
  description: string;
  icon: LucideIcon;
  id: DashboardStatisticMetricId;
  key: DashboardStatisticDailyKey;
  label: string;
  tone: keyof typeof dashboardStatisticToneClasses;
};

type DashboardStatisticMetricItem = DashboardStatisticMetricConfig & {
  changePercent: number | null;
  details?: Array<{ label: string; percentage: number; value: number }>;
  previousValue: number;
  value: number;
};

const dashboardStatisticToneClasses = {
  blue: "bg-blue-50 text-blue-600",
  gray: "bg-slate-100 text-slate-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-red-50 text-red-500",
  purple: "bg-primary-soft text-primary",
  yellow: "bg-amber-50 text-amber-600",
};

const DASHBOARD_STATISTIC_METRIC_AGGREGATIONS: Partial<
  Record<DashboardStatisticDailyKey, "last" | "sum">
> = {
  followers_patients: "last",
  followers_psychologists: "last",
};

const DASHBOARD_PEOPLE_STATISTICS_METRICS: DashboardStatisticMetricConfig[] = [
  {
    color: "#2f8cff",
    description: "Psicólogos únicos seguindo ao menos uma comunidade.",
    icon: UserRound,
    id: "followers_psychologists",
    key: "followers_psychologists",
    label: "Psicólogos seguidores",
    tone: "blue",
  },
  {
    color: "#12b76a",
    description: "Pacientes únicos seguindo ao menos uma comunidade.",
    icon: UsersRound,
    id: "followers_patients",
    key: "followers_patients",
    label: "Pacientes seguidores",
    tone: "green",
  },
  {
    color: "#f59e0b",
    description: "Psicólogos únicos com atividade real no período.",
    icon: UserRound,
    id: "active_psychologists",
    key: "active_psychologists",
    label: "Psicólogos ativos",
    tone: "yellow",
  },
  {
    color: "#ef4444",
    description: "Pacientes únicos com atividade real no período.",
    icon: UsersRound,
    id: "active_patients",
    key: "active_patients",
    label: "Pacientes ativos",
    tone: "pink",
  },
  {
    color: "#657094",
    description: "Pacientes cuja primeira atividade ocorreu no período.",
    icon: Users,
    id: "new_active_patients",
    key: "new_active_patients",
    label: "Novos pacientes ativos",
    tone: "gray",
  },
  {
    color: "#8aa0c6",
    description: "Psicólogos cuja primeira atividade ocorreu no período.",
    icon: UserRound,
    id: "new_active_psychologists",
    key: "new_active_psychologists",
    label: "Novos psicólogos ativos",
    tone: "gray",
  },
];

const DASHBOARD_CONTENT_STATISTICS_METRICS: DashboardStatisticMetricConfig[] = [
  {
    color: "#12b76a",
    description: "Posts publicados por pacientes em todas as comunidades.",
    icon: FileText,
    id: "patient_posts",
    key: "patient_posts",
    label: "Postagens de pacientes",
    tone: "green",
  },
  {
    color: "#2f8cff",
    description: "Posts publicados por psicólogos em todas as comunidades.",
    icon: FileText,
    id: "psychologist_posts",
    key: "psychologist_posts",
    label: "Postagens de psicólogos",
    tone: "blue",
  },
  {
    color: "#f59e0b",
    description: "Respostas de psicólogos verificados em posts.",
    icon: Reply,
    id: "verified_psychologist_replies",
    key: "verified_psychologist_replies",
    label: "Respostas de psicólogos verificados",
    tone: "yellow",
  },
  {
    color: "#ef4444",
    description: "Respostas de psicólogos ainda não verificados.",
    icon: Reply,
    id: "unverified_psychologist_replies",
    key: "unverified_psychologist_replies",
    label: "Respostas de psicólogos não verificados",
    tone: "pink",
  },
  {
    color: "#657094",
    description: "Comentários criados por pacientes no período.",
    icon: MessageCircle,
    id: "patient_comments",
    key: "patient_comments",
    label: "Comentários de pacientes",
    tone: "gray",
  },
  {
    color: "#8aa0c6",
    description: "Denúncias registradas contra posts ou comentários.",
    icon: AlertTriangle,
    id: "reports",
    key: "reports",
    label: "Denúncias",
    tone: "gray",
  },
  {
    color: "#0ea5e9",
    description: "Votos positivos em posts e respostas.",
    icon: ArrowUp,
    id: "upvotes",
    key: "upvotes",
    label: "Votos positivos",
    tone: "blue",
  },
  {
    color: "#f97316",
    description: "Votos negativos em posts e respostas.",
    icon: ArrowDown,
    id: "downvotes",
    key: "downvotes",
    label: "Votos negativos",
    tone: "orange",
  },
  {
    color: "#6f42ff",
    description: "Salvamentos de posts e respostas.",
    icon: Bookmark,
    id: "saves",
    key: "saves",
    label: "Salvamentos",
    tone: "purple",
  },
  {
    color: "#22c55e",
    description: "Cliques de WhatsApp originados em conteúdos das comunidades.",
    icon: MessageCircle,
    id: "whatsapp_clicks",
    key: "whatsapp_clicks",
    label: "Cliques WhatsApp",
    tone: "green",
  },
  {
    color: "#94a3b8",
    description: "Acessos a perfis de psicólogos relacionados às comunidades.",
    icon: Eye,
    id: "profile_accesses",
    key: "profile_accesses",
    label: "Acessos a perfis",
    tone: "gray",
  },
];

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};

const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

const getCommunityDashboardRangeForPeriod = (
  period: CommunityDashboardPeriodPreset,
): CommunitiesDashboardQuery => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

const buildCommunityDashboardPeriodQuery = (
  period: CommunityDashboardPeriodValue,
  range: CommunitiesDashboardQuery,
): CommunitiesDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatShortRange = (from: string, to: string) => {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${formatter.format(dateFromInput(from))} - ${formatter.format(dateFromInput(to))}`;
};

const formatSelectedPeriod = (
  period: Pick<AdminCommunitiesDashboard["period"], "from" | "to">,
  label: string,
) => `Período: ${label} · ${formatDate(period.from)} a ${formatDate(period.to)}`;

const getCommunityDashboardPeriodLabel = (period: CommunityDashboardPeriodValue) =>
  period === "custom"
    ? "Personalizado"
    : (COMMUNITY_DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period)?.label ??
      "Período selecionado");

const BlockPeriodLabel = ({ children }: { children: string }) => (
  <p className="mt-1 text-sm font-bold leading-6 text-muted">{children}</p>
);

type DashboardHourlyActivityMetricKey = "accesses" | "engagement" | "posts" | "replies" | "reports";

const dashboardHourlyActivityBreakdown: {
  className: string;
  key: DashboardHourlyActivityMetricKey;
  label: string;
}[] = [
  { className: "bg-primary", key: "accesses", label: "Acessos" },
  { className: "bg-success", key: "posts", label: "Posts" },
  { className: "bg-warning", key: "replies", label: "Respostas" },
  { className: "bg-muted", key: "engagement", label: "Interações" },
  { className: "bg-danger", key: "reports", label: "Denúncias" },
];

const safeDashboardCount = (value: number | null | undefined) => {
  const normalized = Number(value ?? 0);

  return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
};

const formatCountLabel = (value: number, singular: string, plural: string) =>
  `${numberFormatter.format(value)} ${value === 1 ? singular : plural}`;

const formatDashboardActivityHourRange = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const label = String(normalizedHour).padStart(2, "0");

  return `${label}:00 - ${label}:59`;
};

const normalizeDashboardHourlyActivityPoint = (
  point: Partial<CommunitiesDashboardHourlyActivityPoint> | undefined,
  hour: number,
): CommunitiesDashboardHourlyActivityPoint => {
  const accesses = safeDashboardCount(point?.accesses);
  const posts = safeDashboardCount(point?.posts);
  const replies = safeDashboardCount(point?.replies);
  const engagement = safeDashboardCount(point?.engagement);
  const reports = safeDashboardCount(point?.reports);
  const rawTotal = point?.total;
  const total =
    rawTotal === undefined || rawTotal === null
      ? accesses + posts + replies + engagement + reports
      : safeDashboardCount(rawTotal);

  return {
    accesses,
    engagement,
    hour,
    label: point?.label || `${String(hour).padStart(2, "0")}:00`,
    posts,
    replies,
    reports,
    total,
  };
};

const isPublicMediaPath = (pathname: string) =>
  publicMediaPathPrefixes.some((prefix) => pathname.startsWith(prefix));

const resolveAdminMediaUrl = (src?: string | null) => {
  const value = src?.trim();
  if (!value) return null;

  const apiBase = apiUrl.replace(/\/$/, "");

  try {
    const parsed = new URL(value, apiBase);
    if (isPublicMediaPath(parsed.pathname)) {
      return `${apiBase}${parsed.pathname}${parsed.search}`;
    }
    if (value.startsWith("http")) return value;
    return value.startsWith("/") ? value : `${apiBase}/${value}`;
  } catch {
    if (publicMediaPathPrefixes.some((prefix) => value.startsWith(prefix))) {
      return `${apiBase}${value}`;
    }
    return value.startsWith("/") || value.startsWith("http") ? value : null;
  }
};

const allowedRemoteImageHosts = () => {
  const hosts = new Set(["localhost", "127.0.0.1", "lh3.googleusercontent.com"]);

  for (const candidate of [
    apiUrl,
    ...(process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",") ?? []),
  ]) {
    const normalized = candidate.trim();
    if (!normalized) continue;

    try {
      const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
      if (url.hostname) hosts.add(url.hostname);
    } catch {
      // Entradas inválidas de env não devem quebrar a renderização administrativa.
    }
  }

  return hosts;
};

const canRenderImage = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;

  try {
    const url = new URL(resolved);

    return allowedRemoteImageHosts().has(url.hostname);
  } catch {
    return false;
  }
};

const renderableImageSrc = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);

  return resolved && canRenderImage(resolved) ? resolved : null;
};

const isAdminPublicMediaUrl = (src?: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;

  try {
    return isPublicMediaPath(new URL(resolved).pathname);
  } catch {
    return publicMediaPathPrefixes.some(
      (prefix) => resolved.startsWith(prefix) || resolved.includes(prefix),
    );
  }
};

const toPublicHref = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;

  return `${publicFrontendUrl.replace(/\/$/, "")}${path}`;
};

const communityPostPublicHref = (
  post: Pick<CommunitiesDashboardRecentPost, "community_slug" | "id">,
) => toPublicHref(`/community/${post.community_slug}/post/${post.id}`);

const communityPostAdminDetailHref = (
  post: Pick<CommunitiesDashboardRecentPost, "community_slug" | "id">,
) =>
  `/comunidades/${encodeURIComponent(post.community_slug)}/conteudo/post/${encodeURIComponent(
    post.id,
  )}`;

const communityPublicHref = (community: Pick<CommunitiesDashboardTopCommunity, "slug">) =>
  toPublicHref(`/community/${encodeURIComponent(community.slug)}`);

const communityAdminDetailHref = (community: Pick<CommunitiesDashboardTopCommunity, "slug">) =>
  `/comunidades/${encodeURIComponent(community.slug)}`;

const initials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AU";

const psychologistRoleLabel = (gender?: string | null) =>
  gender?.trim().toLowerCase() === "feminino" ? "Psicóloga" : "Psicólogo";

const dashboardAuthorRoleLabel = (author: CommunitiesDashboardPopularPost["author"]) =>
  author.role === "psicologo" ? psychologistRoleLabel(author.gender) : "Paciente";

const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0 text-primary", className)}
    fill="none"
    viewBox="0 0 30 28"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Perfil verificado</title>
    <path
      d="M10.3636 28L7.77273 23.7333L2.86364 22.6667L3.34091 17.7333L0 14L3.34091 10.2667L2.86364 5.33333L7.77273 4.26667L10.3636 0L15 1.93333L19.6364 0L22.2273 4.26667L27.1364 5.33333L26.6591 10.2667L30 14L26.6591 17.7333L27.1364 22.6667L22.2273 23.7333L19.6364 28L15 26.0667L10.3636 28ZM13.5682 18.7333L21.2727 11.2L19.3636 9.26667L13.5682 14.9333L10.6364 12.1333L8.72727 14L13.5682 18.7333Z"
      fill="currentColor"
    />
  </svg>
);

const DashboardPostAuthorIdentity = ({ author }: { author: CommunitiesDashboardPostAuthor }) => {
  const avatarSrc = renderableImageSrc(author.avatar);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-xs font-black text-primary">
        {avatarSrc ? (
          <Image
            alt={`Foto de perfil de ${author.name}`}
            className="object-cover"
            fill
            sizes="40px"
            src={avatarSrc}
            unoptimized={isAdminPublicMediaUrl(author.avatar)}
          />
        ) : (
          initials(author.name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate font-bold text-foreground">{author.name}</span>
          {author.verified ? <VerifiedBadgeIcon aria-label="Perfil verificado" /> : null}
        </div>
        <p className="truncate text-xs font-bold text-muted">{dashboardAuthorRoleLabel(author)}</p>
      </div>
    </div>
  );
};

const DashboardPostActions = ({
  layout,
  post,
}: {
  layout: "icons" | "labels";
  post: Pick<CommunitiesDashboardRecentPost, "community_slug" | "id" | "title">;
}) => {
  const publicHref = communityPostPublicHref(post);
  const adminHref = communityPostAdminDetailHref(post);
  const title = post.title.trim() || "Post sem título";

  if (layout === "icons") {
    return (
      <div className="inline-flex shrink-0 items-center justify-center gap-1.5">
        <Link
          aria-label={`Abrir post ${title} no site público`}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={publicHref}
          rel="noreferrer"
          target="_blank"
          title="Abrir público"
        >
          <Eye aria-hidden className="h-4 w-4" />
          <span className="sr-only">Abrir post {title} no site público</span>
        </Link>
        <Link
          aria-label={`Ver analytics do post ${title} no Admin`}
          className="grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-surface text-primary shadow-control transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={adminHref}
          title="Analytics"
        >
          <BarChart3 aria-hidden className="h-4 w-4" />
          <span className="sr-only">Ver analytics do post {title} no Admin</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs font-black">
      <Link
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        href={publicHref}
        rel="noreferrer"
        target="_blank"
      >
        <Eye aria-hidden className="h-3.5 w-3.5" />
        Abrir público
      </Link>
      <Link
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        href={adminHref}
      >
        <BarChart3 aria-hidden className="h-3.5 w-3.5" />
        Analytics
      </Link>
    </div>
  );
};

const TopCommunityActions = ({
  community,
  layout,
}: {
  community: Pick<CommunitiesDashboardTopCommunity, "name" | "slug">;
  layout: "icons" | "labels";
}) => {
  const publicHref = communityPublicHref(community);
  const detailHref = communityAdminDetailHref(community);

  if (layout === "icons") {
    return (
      <div className="inline-flex shrink-0 items-center justify-center gap-1.5">
        <Link
          aria-label={`Abrir comunidade ${community.name} no site público`}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={publicHref}
          rel="noreferrer"
          target="_blank"
          title="Abrir público"
        >
          <Eye aria-hidden className="h-4 w-4" />
          <span className="sr-only">Abrir comunidade {community.name} no site público</span>
        </Link>
        <Link
          aria-label={`Abrir detalhes administrativos de ${community.name}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-surface text-primary shadow-control transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={detailHref}
          title="Detalhes da comunidade"
        >
          <BarChart3 aria-hidden className="h-4 w-4" />
          <span className="sr-only">Abrir detalhes administrativos de {community.name}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs font-black">
      <Link
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        href={publicHref}
        rel="noreferrer"
        target="_blank"
      >
        <Eye aria-hidden className="h-3.5 w-3.5" />
        Abrir público
      </Link>
      <Link
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        href={detailHref}
      >
        <BarChart3 aria-hidden className="h-3.5 w-3.5" />
        Detalhes
      </Link>
    </div>
  );
};

const TopCommunityAvatar = ({
  community,
}: {
  community: Pick<CommunitiesDashboardTopCommunity, "avatar_url" | "name">;
}) => {
  const avatarSrc = renderableImageSrc(community.avatar_url);

  return (
    <span
      aria-hidden
      className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-primary-soft text-xs font-black text-primary"
    >
      {avatarSrc ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="36px"
          src={avatarSrc}
          unoptimized={isAdminPublicMediaUrl(community.avatar_url)}
        />
      ) : (
        initials(community.name)
      )}
    </span>
  );
};

const roundDashboardStatisticPercent = (value: number) => Math.round(value * 10) / 10;

const dashboardStatisticPercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundDashboardStatisticPercent(((current - previous) / previous) * 100);
};

const dashboardStatisticPercentage = (value: number, total: number) =>
  total <= 0 ? 0 : roundDashboardStatisticPercent((value / total) * 100);

const dashboardStatisticValue = (
  statistics: CommunitiesDashboardGlobalStatistics,
  id: DashboardStatisticMetricId,
) => {
  switch (id) {
    case "active_patients":
      return statistics.counters.active_users.patients;
    case "active_psychologists":
      return statistics.counters.active_users.psychologists;
    case "downvotes":
      return statistics.counters.content_engagement.downvotes;
    case "followers_patients":
      return statistics.counters.followers.patients;
    case "followers_psychologists":
      return statistics.counters.followers.psychologists;
    case "new_active_patients":
      return statistics.counters.new_active_users.patients;
    case "new_active_psychologists":
      return statistics.counters.new_active_users.psychologists;
    case "patient_comments":
      return statistics.counters.replies.patient_comments;
    case "patient_posts":
      return statistics.counters.posts.patients;
    case "profile_accesses":
      return statistics.counters.content_engagement.profile_accesses;
    case "psychologist_posts":
      return statistics.counters.posts.psychologists;
    case "reports":
      return statistics.counters.reports.total;
    case "saves":
      return statistics.counters.content_engagement.saves;
    case "unverified_psychologist_replies":
      return statistics.counters.replies.unverified_psychologists;
    case "upvotes":
      return statistics.counters.content_engagement.upvotes;
    case "verified_psychologist_replies":
      return statistics.counters.replies.verified_psychologists;
    case "whatsapp_clicks":
      return statistics.counters.content_engagement.whatsapp_clicks;
  }
};

const patientPostDetails = (statistics: CommunitiesDashboardGlobalStatistics) => {
  const anonymous = statistics.counters.anonymous_posts.total;
  const identified = Math.max(0, statistics.counters.posts.patients - anonymous);
  const total = statistics.counters.posts.patients;

  return [
    {
      label: "Anônimos",
      percentage: dashboardStatisticPercentage(anonymous, total),
      value: anonymous,
    },
    {
      label: "Identificados",
      percentage: dashboardStatisticPercentage(identified, total),
      value: identified,
    },
  ];
};

const buildDashboardStatisticMetricItems = (
  current: CommunitiesDashboardGlobalStatistics,
  previous: CommunitiesDashboardGlobalStatistics,
  configs: DashboardStatisticMetricConfig[],
): DashboardStatisticMetricItem[] =>
  configs.map((config) => {
    const value = dashboardStatisticValue(current, config.id);
    const previousValue = dashboardStatisticValue(previous, config.id);

    return {
      ...config,
      changePercent: dashboardStatisticPercentageChange(value, previousValue),
      details: config.id === "patient_posts" ? patientPostDetails(current) : undefined,
      previousValue,
      value,
    };
  });

const totalDashboardStatisticValue = (statistics: CommunitiesDashboardGlobalStatistics) =>
  statistics.charts.daily.reduce(
    (total, point) =>
      total +
      point.active_patients +
      point.active_psychologists +
      point.anonymous_posts +
      point.downvotes +
      point.followers_patients +
      point.followers_psychologists +
      point.new_active_patients +
      point.new_active_psychologists +
      point.patient_comments +
      point.patient_posts +
      point.profile_accesses +
      point.psychologist_posts +
      point.reports +
      point.saves +
      point.unverified_psychologist_replies +
      point.upvotes +
      point.verified_psychologist_replies +
      point.whatsapp_clicks,
    0,
  );

const isValidCustomRange = (range: CommunitiesDashboardQuery) => {
  if (!range.from || !range.to) return false;

  const from = dateFromInput(range.from);
  const to = dateFromInput(range.to);
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

  return from <= to && days <= MAX_COMMUNITY_DASHBOARD_DAYS;
};

const hasPeriodRecords = (summary: AdminCommunitiesDashboard) => {
  const hasCards = Object.values(summary.cards).some((card) => card.value > 0);
  const hasActivity = summary.activity_series.some((series) =>
    series.points.some((point) => point.value > 0),
  );
  const hasHourlyActivity = summary.global_statistics.current.charts.hourly_activity.some(
    (point) => point.total > 0,
  );

  return (
    hasCards ||
    hasActivity ||
    hasHourlyActivity ||
    totalDashboardStatisticValue(summary.global_statistics.current) > 0 ||
    summary.patient_posts_breakdown.total > 0 ||
    summary.recent_posts.total > 0 ||
    summary.popular_posts.total > 0 ||
    summary.top_communities.items.length > 0
  );
};

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn(
      "min-w-0 rounded-card border border-border bg-surface shadow-admin-soft",
      className,
    )}
  >
    {children}
  </section>
);

const LoadingGrid = () => (
  <div className="grid gap-5">
    {["people", "content"].map((key) => (
      <CardShell className="h-80 animate-pulse bg-surface-muted" key={key} />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar Comunidades</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const EmptyState = ({ period }: { period: AdminCommunitiesDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <UsersRound aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem atividade capturada</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhum post, comentário, denúncia ou atividade real foi encontrado entre{" "}
          {formatDate(period.from)} e {formatDate(period.to)}. Ajuste o período ou aguarde novas
          interações.
        </p>
      </div>
    </div>
  </CardShell>
);

const CommunitiesHeader = ({
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
}: {
  displayRange: CommunitiesDashboardQuery;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: FocusEventHandler<HTMLDivElement>;
  onPeriodChange: (period: CommunityDashboardPeriodPreset) => void;
  period: CommunityDashboardPeriodValue;
  rangeError: string | null;
}) => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Comunidades
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Dashboard de Comunidades
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
          Acompanhe a atividade e o engajamento das comunidades.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="communities-period">
          Período
          <span className="relative">
            <select
              className="h-11 min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="communities-period"
              onChange={(event) =>
                onPeriodChange(event.target.value as CommunityDashboardPeriodPreset)
              }
              value={period}
            >
              {period === "custom" ? (
                <option disabled hidden value="custom">
                  Personalizado
                </option>
              ) : null}
              {COMMUNITY_DASHBOARD_PERIOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
            />
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2" onBlur={onDateControlsBlur}>
          <label className="text-xs font-semibold text-muted">
            De
            <input
              className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
              max={displayRange.to}
              onChange={(event) => onDateChange("from", event.target.value)}
              type="date"
              value={displayRange.from ?? ""}
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Até
            <input
              className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
              min={displayRange.from}
              onChange={(event) => onDateChange("to", event.target.value)}
              type="date"
              value={displayRange.to ?? ""}
            />
          </label>
        </div>
        {period === "custom" && rangeError ? (
          <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
        ) : null}
      </div>
    </div>
  </section>
);

const DashboardStatisticCard = ({
  item,
  onToggle,
  previousLabel,
  selected,
}: {
  item: DashboardStatisticMetricItem;
  onToggle: (id: DashboardStatisticMetricId) => void;
  previousLabel: string;
  selected: boolean;
}) => {
  const Icon = item.icon;
  const formattedValue = numberFormatter.format(item.value);
  const detailTitle = item.details
    ?.map(
      (detail) =>
        `${detail.label}: ${numberFormatter.format(detail.value)} (${percentageFormatter.format(
          detail.percentage,
        )}%)`,
    )
    .join(". ");

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "h-full w-full min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={() => onToggle(item.id)}
      title={`${item.label}: ${formattedValue}. ${formatChange(
        item.changePercent,
      )} vs. ${previousLabel}. ${detailTitle ? `${detailTitle}. ` : ""}${
        selected ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          dashboardStatisticToneClasses[item.tone],
        )}
      >
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="mt-4 block min-w-0 max-w-full">
        <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
          {item.label}
        </span>
        <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
          {formattedValue}
        </span>
        <span className="mt-3 block text-xs leading-5">
          <span
            className={cn(
              "font-extrabold",
              item.changePercent === null
                ? "text-muted"
                : item.changePercent > 0
                  ? "text-success"
                  : item.changePercent < 0
                    ? "text-danger"
                    : "text-muted",
            )}
          >
            {formatChange(item.changePercent)}
          </span>
          <span className="ml-1 font-bold text-muted">vs. {previousLabel}</span>
        </span>

        {item.details?.length ? (
          <span className="mt-3 grid gap-1">
            {item.details.map((detail) => (
              <span
                className="flex items-center justify-between gap-2 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-extrabold leading-none text-muted"
                key={detail.label}
              >
                <span className="truncate">{detail.label}</span>
                <span className="shrink-0 text-foreground">
                  {`${numberFormatter.format(detail.value)} (${percentageFormatter.format(
                    detail.percentage,
                  )}%)`}
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{selected ? "visível no gráfico" : "oculto no gráfico"}</span>
    </button>
  );
};

const DashboardStatisticsMetricGrid = ({
  metrics,
  onToggleMetric,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (metricId: DashboardStatisticMetricId) => void;
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => (
  <fieldset className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
    <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
    {metrics.map((metric) => (
      <DashboardStatisticCard
        item={metric}
        key={metric.id}
        onToggle={onToggleMetric}
        previousLabel={previousLabel}
        selected={visibleMetricIds.includes(metric.id)}
      />
    ))}
  </fieldset>
);

const DashboardStatisticsMetricCarousel = ({
  metrics,
  onToggleMetric,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (metricId: DashboardStatisticMetricId) => void;
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollMetrics = useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(260, scroller.clientWidth * 0.82),
    });
  }, []);

  return (
    <fieldset className="mt-5 min-w-0">
      <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
      <div className="relative min-w-0 px-11 sm:px-12">
        <button
          aria-label={`Rolar contadores de ${title} para a esquerda`}
          className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollMetrics(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <div
          className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {metrics.map((metric) => (
            <div
              className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] lg:w-[calc((100%_-_1rem)/3)] 2xl:w-[calc((100%_-_2.5rem)/6)]"
              key={metric.id}
            >
              <DashboardStatisticCard
                item={metric}
                onToggle={onToggleMetric}
                previousLabel={previousLabel}
                selected={visibleMetricIds.includes(metric.id)}
              />
            </div>
          ))}
        </div>
        <button
          aria-label={`Rolar contadores de ${title} para a direita`}
          className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary/25 bg-primary-soft text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollMetrics(1)}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </fieldset>
  );
};

const DashboardStatisticsLineChart = ({
  items,
  points,
}: {
  items: DashboardStatisticMetricItem[];
  points: CommunitiesDashboardStatisticsDailyPoint[];
}) => {
  if (items.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador para visualizar a evolução.
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto real de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartWidth = 1120;
  const chartHeight = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const metricKeys = items.map((item) => item.key);
  const chartPoints = aggregateCalendarChartPoints(points, metricKeys, {
    dayThreshold: 45,
    metricAggregations: DASHBOARD_STATISTIC_METRIC_AGGREGATIONS,
  });
  const max = Math.max(
    1,
    ...items.flatMap((item) => chartPoints.map((point) => Number(point[item.key] ?? 0))),
  );
  const xFor = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? innerWidth / 2 : (index / (chartPoints.length - 1)) * innerWidth);
  const yFor = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    id: String(ratio),
    value: Math.round(max * ratio),
  }));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <div className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Evolução do período por contador selecionado"
          className="block h-auto w-full"
          height={chartHeight}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width={chartWidth}
        >
          <title>Evolução do período</title>
          {gridValues.map(({ id, value }) => {
            const y = yFor(value);

            return (
              <g key={`dashboard-statistics-grid-${id}`}>
                <line
                  className="stroke-border"
                  opacity="0.44"
                  strokeDasharray={value === 0 ? "0" : "4 6"}
                  strokeWidth="1"
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="fill-muted text-[10px] font-medium"
                  dominantBaseline="middle"
                  textAnchor="end"
                  x={padding.left - 8}
                  y={y}
                >
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}
          {items.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: xFor(index),
              y: yFor(Number(point[item.key] ?? 0)),
            }));
            const linePath = buildSmoothSvgPath(linePoints);

            return (
              <path
                d={linePath}
                fill="none"
                key={item.id}
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.05"
              />
            );
          })}
          {items.map((item) =>
            chartPoints.map((point, index) => {
              const value = Number(point[item.key] ?? 0);

              return (
                <circle
                  cx={xFor(index)}
                  cy={yFor(value)}
                  fill="#ffffff"
                  key={`${item.id}-${point.date}`}
                  opacity={index === chartPoints.length - 1 ? "1" : "0.72"}
                  r={index === chartPoints.length - 1 ? "3.1" : "2.1"}
                  stroke={item.color}
                  strokeWidth="1.45"
                >
                  <title>
                    {point.tooltipLabel} · {item.label}: {numberFormatter.format(value)}
                  </title>
                </circle>
              );
            }),
          )}
        </svg>
        <div
          className="mt-1 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${dateLabels.length}, 1fr)` }}
        >
          {dateLabels.map(({ date, label }) => (
            <span className="min-w-0 text-center text-[10px] font-bold text-subtle" key={date}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const DashboardStatisticsSection = ({
  counterLayout = "grid",
  metrics,
  onToggleMetric,
  points,
  periodLabel,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  counterLayout?: "carousel" | "grid";
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (id: DashboardStatisticMetricId) => void;
  periodLabel: string;
  points: CommunitiesDashboardStatisticsDailyPoint[];
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => {
  const visibleMetrics = metrics.filter((item) => visibleMetricIds.includes(item.id));

  return (
    <CardShell className="p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        <BlockPeriodLabel>{periodLabel}</BlockPeriodLabel>
      </div>
      {counterLayout === "grid" ? (
        <DashboardStatisticsMetricGrid
          metrics={metrics}
          onToggleMetric={onToggleMetric}
          previousLabel={previousLabel}
          title={title}
          visibleMetricIds={visibleMetricIds}
        />
      ) : (
        <DashboardStatisticsMetricCarousel
          metrics={metrics}
          onToggleMetric={onToggleMetric}
          previousLabel={previousLabel}
          title={title}
          visibleMetricIds={visibleMetricIds}
        />
      )}
      <DashboardStatisticsLineChart items={visibleMetrics} points={points} />
    </CardShell>
  );
};

const RecentPostsTable = ({ posts }: { posts: CommunitiesDashboardRecentPost[] }) => {
  return (
    <CardShell className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Postagens mais recentes</h2>
        </div>
        <span className="text-xs font-black text-primary">Ver todas</span>
      </div>

      {posts.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma postagem real encontrada em todo o período.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:hidden">
            {posts.map((post) => {
              const title = post.title.trim() || "Post sem título";

              return (
                <article
                  className="rounded-2xl border border-border bg-surface-muted p-4 transition hover:border-primary/30 hover:bg-primary-soft/40"
                  key={post.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">{title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {post.community_name} · {formatDateTime(post.created_at)}
                    </p>
                  </div>
                  <div className="mt-3">
                    <DashboardPostAuthorIdentity author={post.author} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                    <p className="rounded-xl bg-surface p-3">
                      <span className="block">Visualizações</span>
                      <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <Eye aria-hidden className="h-3.5 w-3.5 text-primary" />
                        {numberFormatter.format(post.views_count)}
                      </strong>
                    </p>
                    <p className="rounded-xl bg-surface p-3">
                      <span className="block">Comentários</span>
                      <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <MessageCircle aria-hidden className="h-3.5 w-3.5 text-primary" />
                        {numberFormatter.format(post.comments_count)}
                      </strong>
                    </p>
                  </div>
                  <div className="mt-3">
                    <DashboardPostActions layout="labels" post={post} />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-5 hidden min-w-0 overflow-hidden md:block">
            <table className="w-full max-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[28%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="text-xs text-muted">
                <tr>
                  <th className="border-b border-border py-3 pr-3 font-black">Título</th>
                  <th className="border-b border-border px-3 py-3 font-black">Autor</th>
                  <th className="border-b border-border px-3 py-3 text-center font-black">
                    Visualizações
                  </th>
                  <th className="border-b border-border px-3 py-3 text-center font-black">
                    Comentários
                  </th>
                  <th className="border-b border-border py-3 pl-3 text-right font-black">Ações</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const title = post.title.trim() || "Post sem título";

                  return (
                    <tr className="align-top transition hover:bg-surface-muted/50" key={post.id}>
                      <td className="min-w-0 border-b border-border align-top">
                        <div className="min-w-0 py-4 pr-3">
                          <p className="truncate font-black text-foreground">{title}</p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {post.community_name} · {formatDateTime(post.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="min-w-0 border-b border-border align-top">
                        <div className="block min-w-0 px-3 py-4">
                          <DashboardPostAuthorIdentity author={post.author} />
                        </div>
                      </td>
                      <td className="border-b border-border text-center align-top">
                        <div className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 font-black text-foreground">
                            <Eye aria-hidden className="h-4 w-4 text-primary" />
                            {numberFormatter.format(post.views_count)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border text-center align-top">
                        <div className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 font-black text-foreground">
                            <MessageCircle aria-hidden className="h-4 w-4 text-primary" />
                            {numberFormatter.format(post.comments_count)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border text-right align-top">
                        <div className="py-4 pl-3">
                          <DashboardPostActions layout="icons" post={post} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  );
};
const PopularPostsTable = ({ posts }: { posts: CommunitiesDashboardPopularPost[] }) => {
  return (
    <CardShell className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Posts mais populares</h2>
        </div>
        <span className="text-xs font-black text-primary">Ver todas</span>
      </div>

      {posts.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum post popular real encontrado em todo o período.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:hidden">
            {posts.map((post) => {
              const title = post.title.trim() || "Post sem título";

              return (
                <article
                  className="rounded-2xl border border-border bg-surface-muted p-4 transition hover:border-primary/30 hover:bg-primary-soft/40"
                  key={post.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">{title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {post.community_name} · {formatDateTime(post.created_at)}
                    </p>
                  </div>
                  <div className="mt-3">
                    <DashboardPostAuthorIdentity author={post.author} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                    <p className="rounded-xl bg-surface p-3">
                      <span className="block">Upvotes</span>
                      <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <ArrowUp aria-hidden className="h-3.5 w-3.5 text-primary" />
                        {numberFormatter.format(post.upvotes_count)}
                      </strong>
                    </p>
                    <p className="rounded-xl bg-surface p-3">
                      <span className="block">Comentários</span>
                      <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <MessageCircle aria-hidden className="h-3.5 w-3.5 text-primary" />
                        {numberFormatter.format(post.comments_count)}
                      </strong>
                    </p>
                  </div>
                  <div className="mt-3">
                    <DashboardPostActions layout="labels" post={post} />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-5 hidden min-w-0 overflow-hidden md:block">
            <table className="w-full max-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[28%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="text-xs text-muted">
                <tr>
                  <th className="border-b border-border py-3 pr-3 font-black">Título</th>
                  <th className="border-b border-border px-3 py-3 font-black">Autor</th>
                  <th className="border-b border-border px-3 py-3 text-center font-black">
                    Upvotes
                  </th>
                  <th className="border-b border-border px-3 py-3 text-center font-black">
                    Comentários
                  </th>
                  <th className="border-b border-border py-3 pl-3 text-right font-black">Ações</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const title = post.title.trim() || "Post sem título";

                  return (
                    <tr className="align-top transition hover:bg-surface-muted/50" key={post.id}>
                      <td className="min-w-0 border-b border-border align-top">
                        <div className="py-4 pr-3">
                          <p className="truncate font-black text-foreground">{title}</p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {post.community_name} · {formatDateTime(post.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="min-w-0 border-b border-border align-top">
                        <div className="block px-3 py-4">
                          <DashboardPostAuthorIdentity author={post.author} />
                        </div>
                      </td>
                      <td className="border-b border-border text-center align-top">
                        <div className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 font-black text-foreground">
                            <ArrowUp aria-hidden className="h-4 w-4 text-primary" />
                            {numberFormatter.format(post.upvotes_count)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border text-center align-top">
                        <div className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 font-black text-foreground">
                            <MessageCircle aria-hidden className="h-4 w-4 text-primary" />
                            {numberFormatter.format(post.comments_count)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border text-right align-top">
                        <div className="py-4 pl-3">
                          <DashboardPostActions layout="icons" post={post} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  );
};

const TopCommunitiesTable = ({
  communities,
}: {
  communities: CommunitiesDashboardTopCommunity[];
}) => (
  <div className="scroll-mt-6" id="lista-de-comunidades">
    <CardShell className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Principais comunidades</h2>
        </div>
        <Link
          className="text-xs font-black text-primary transition hover:text-primary-hover"
          href="/comunidades/lista"
        >
          Ver todas
        </Link>
      </div>

      {communities.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma comunidade real cadastrada foi encontrada.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:hidden">
            {communities.map((community) => (
              <article
                className="rounded-2xl border border-border bg-surface-muted p-4 transition hover:border-primary/30 hover:bg-primary-soft/40"
                key={community.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TopCommunityAvatar community={community} />
                    <div className="min-w-0">
                      <p className="truncate font-black text-foreground">{community.name}</p>
                      <p className="text-xs text-muted">
                        {community.activity_count} ações em todo o período
                      </p>
                    </div>
                  </div>
                  <TopCommunityActions community={community} layout="icons" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <p className="rounded-xl bg-surface p-3">
                    <span className="block text-muted">Seguidores</span>
                    <strong className="text-sm text-foreground">
                      {numberFormatter.format(community.members_count)}
                    </strong>
                  </p>
                  <p className="rounded-xl bg-surface p-3">
                    <span className="block text-muted">Posts</span>
                    <strong className="text-sm text-foreground">
                      {numberFormatter.format(community.posts_count)}
                    </strong>
                  </p>
                  <p className="rounded-xl bg-surface p-3">
                    <span className="block text-muted">Acessos</span>
                    <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                      <Eye aria-hidden className="h-3.5 w-3.5 text-primary" />
                      {numberFormatter.format(community.accesses_count)}
                    </strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 hidden min-w-0 overflow-hidden md:block">
            <table className="w-full max-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-[42%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="text-xs text-muted">
                <tr>
                  <th className="border-b border-border py-3 pr-3 font-black">Comunidade</th>
                  <th className="border-b border-border px-3 py-3 text-center font-black">
                    Seguidores
                  </th>
                  <th className="border-b border-border px-3 py-3 text-center font-black">Posts</th>
                  <th className="border-b border-border px-3 py-3 text-center font-black">
                    Acessos
                  </th>
                  <th className="border-b border-border py-3 pl-3 text-right font-black">Ações</th>
                </tr>
              </thead>
              <tbody>
                {communities.map((community) => (
                  <tr className="align-top transition hover:bg-surface-muted/50" key={community.id}>
                    <td className="border-b border-border py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <TopCommunityAvatar community={community} />
                        <div className="min-w-0">
                          <p className="truncate font-black text-foreground">{community.name}</p>
                          <p className="truncate text-xs text-muted">
                            {community.activity_count} ações em todo o período
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-border px-3 py-4 text-center font-black">
                      {numberFormatter.format(community.members_count)}
                    </td>
                    <td className="border-b border-border px-3 py-4 text-center font-black">
                      {numberFormatter.format(community.posts_count)}
                    </td>
                    <td className="border-b border-border px-3 py-4 text-center font-black">
                      <span className="inline-flex items-center gap-2">
                        <Eye aria-hidden className="h-4 w-4 text-primary" />
                        {numberFormatter.format(community.accesses_count)}
                      </span>
                    </td>
                    <td className="border-b border-border py-4 pl-3 text-right">
                      <TopCommunityActions community={community} layout="icons" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  </div>
);

const CommunitiesPeakActivityHoursCard = ({
  periodLabel,
  points,
}: {
  periodLabel: string;
  points: CommunitiesDashboardHourlyActivityPoint[];
}) => {
  const byHour = new Map(points.map((point) => [point.hour, point]));
  const normalizedPoints = Array.from({ length: 24 }, (_, hour) =>
    normalizeDashboardHourlyActivityPoint(byHour.get(hour), hour),
  );
  const totalActivity = normalizedPoints.reduce((total, point) => total + point.total, 0);
  const maxActivity = Math.max(1, ...normalizedPoints.map((point) => point.total));
  const topHours = [...normalizedPoints]
    .filter((point) => point.total > 0)
    .sort((left, right) => right.total - left.total || left.hour - right.hour)
    .slice(0, 3);

  return (
    <CardShell className="h-full p-5">
      <div>
        <h2 className="text-lg font-black text-foreground">Horários de maior atividade</h2>
        <BlockPeriodLabel>{periodLabel}</BlockPeriodLabel>
      </div>

      {totalActivity === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Nenhuma atividade real foi registrada por hora no período selecionado.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {topHours.map((point, index) => (
              <article
                className="min-w-0 rounded-2xl border border-border/80 bg-surface-muted p-4"
                key={point.hour}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wide text-primary">
                      #{index + 1} pico
                    </span>
                    <h3 className="mt-1 text-base font-black text-foreground">
                      {formatDashboardActivityHourRange(point.hour)}
                    </h3>
                  </div>
                  <strong className="text-2xl font-black text-foreground">
                    {numberFormatter.format(point.total)}
                  </strong>
                </div>
                <p className="mt-2 text-[11px] font-bold leading-5 text-muted">
                  {formatCountLabel(point.accesses, "acesso", "acessos")} |{" "}
                  {formatCountLabel(point.posts + point.replies, "conteúdo", "conteúdos")} |{" "}
                  {formatCountLabel(point.engagement, "interação", "interações")} |{" "}
                  {formatCountLabel(point.reports, "denúncia", "denúncias")}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-border/70 bg-surface p-3">
            <div
              aria-label="Distribuição geral de atividades das comunidades por hora"
              className="flex h-36 min-w-[520px] items-end gap-1"
              role="img"
            >
              {normalizedPoints.map((point) => {
                const barHeight =
                  point.total > 0 ? Math.max(8, (point.total / maxActivity) * 100) : 2;

                return (
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.hour}>
                    <div className="flex h-28 w-full items-end justify-center rounded-xl bg-surface-muted px-1">
                      <span
                        className="w-3 max-w-full rounded-t-full bg-primary"
                        style={{ height: `${barHeight}%` }}
                        title={`${point.label}: ${numberFormatter.format(point.total)} atividades`}
                      />
                    </div>
                    <span className="text-[10px] font-black text-subtle">
                      {String(point.hour).padStart(2, "0")}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {dashboardHourlyActivityBreakdown.map((metric) => {
              const value = normalizedPoints.reduce((total, point) => total + point[metric.key], 0);

              return (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-muted"
                  key={metric.key}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", metric.className)} />
                  {metric.label}: {numberFormatter.format(value)}
                </span>
              );
            })}
          </div>
        </>
      )}
    </CardShell>
  );
};

const DashboardContent = ({
  periodLabel,
  summary,
}: {
  periodLabel: string;
  summary: AdminCommunitiesDashboard;
}) => {
  const noRecords = !hasPeriodRecords(summary);
  const [visiblePeopleMetricIds, setVisiblePeopleMetricIds] = useState<
    DashboardStatisticMetricId[]
  >(() => DASHBOARD_PEOPLE_STATISTICS_METRICS.map((item) => item.id));
  const [visibleContentMetricIds, setVisibleContentMetricIds] = useState<
    DashboardStatisticMetricId[]
  >(() => DASHBOARD_CONTENT_STATISTICS_METRICS.map((item) => item.id));
  const previousLabel = formatShortRange(summary.period.previous_from, summary.period.previous_to);
  const peopleMetrics = buildDashboardStatisticMetricItems(
    summary.global_statistics.current,
    summary.global_statistics.previous,
    DASHBOARD_PEOPLE_STATISTICS_METRICS,
  );
  const contentMetrics = buildDashboardStatisticMetricItems(
    summary.global_statistics.current,
    summary.global_statistics.previous,
    DASHBOARD_CONTENT_STATISTICS_METRICS,
  );
  const togglePeopleMetric = (id: DashboardStatisticMetricId) => {
    setVisiblePeopleMetricIds((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((item) => item !== id)
          : current
        : [...current, id],
    );
  };
  const toggleContentMetric = (id: DashboardStatisticMetricId) => {
    setVisibleContentMetricIds((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((item) => item !== id)
          : current
        : [...current, id],
    );
  };

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      {noRecords ? <EmptyState period={summary.period} /> : null}

      <DashboardStatisticsSection
        counterLayout="grid"
        metrics={peopleMetrics}
        onToggleMetric={togglePeopleMetric}
        periodLabel={periodLabel}
        points={summary.global_statistics.current.charts.daily}
        previousLabel={previousLabel}
        title="Estatísticas de pessoas"
        visibleMetricIds={visiblePeopleMetricIds}
      />

      <DashboardStatisticsSection
        counterLayout="carousel"
        metrics={contentMetrics}
        onToggleMetric={toggleContentMetric}
        periodLabel={periodLabel}
        points={summary.global_statistics.current.charts.daily}
        previousLabel={previousLabel}
        title="Estatísticas de conteúdo"
        visibleMetricIds={visibleContentMetricIds}
      />

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <TopCommunitiesTable communities={summary.top_communities.items} />
        <CommunitiesPeakActivityHoursCard
          periodLabel={periodLabel}
          points={summary.global_statistics.current.charts.hourly_activity}
        />
      </div>

      <div className="min-w-0 space-y-5">
        <RecentPostsTable posts={summary.recent_posts.items} />
        <PopularPostsTable posts={summary.popular_posts.items} />
      </div>
    </div>
  );
};

export const AdminCommunitiesClient = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<CommunityDashboardPeriodValue>("week");
  const {
    appliedRange,
    applyRange,
    draftRange,
    handleDateChange: handleDraftDateChange,
    handleDateControlsBlur,
    rangeError,
  } = useDateRangeCommitOnBlur<CommunitiesDashboardQuery>({
    errorMessage:
      "Informe um período personalizado completo, com data inicial menor ou igual à final.",
    initialRange: () => getCommunityDashboardRangeForPeriod("week"),
    isValidRange: isValidCustomRange,
  });
  const validRange = selectedPeriod === "custom" ? isValidCustomRange(appliedRange) : true;
  const queryInput = buildCommunityDashboardPeriodQuery(selectedPeriod, appliedRange);
  const query = useAdminCommunitiesDashboard(queryInput, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const handlePeriodChange = (nextPeriod: CommunityDashboardPeriodPreset) => {
    setSelectedPeriod(nextPeriod);
    applyRange(getCommunityDashboardRangeForPeriod(nextPeriod));
  };
  const handleDateChange = (field: "from" | "to", value: string) => {
    setSelectedPeriod("custom");
    handleDraftDateChange(field, value);
  };

  return (
    <div className="min-w-0 overflow-x-hidden space-y-7">
      <CommunitiesHeader
        displayRange={draftRange}
        onDateChange={handleDateChange}
        onDateControlsBlur={handleDateControlsBlur}
        onPeriodChange={handlePeriodChange}
        period={selectedPeriod}
        rangeError={rangeError}
      />

      {!validRange ? (
        <ErrorState
          message="Selecione um período válido."
          onRetry={() => handlePeriodChange("week")}
        />
      ) : null}

      {validRange && query.isLoading ? <LoadingGrid /> : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <DashboardContent
          periodLabel={formatSelectedPeriod(
            query.data.period,
            getCommunityDashboardPeriodLabel(selectedPeriod),
          )}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};

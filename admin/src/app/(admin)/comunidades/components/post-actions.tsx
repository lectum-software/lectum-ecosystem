"use client";

import { BarChart3, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type {
  CommunitiesDashboardHourlyActivityPoint,
  CommunitiesDashboardPopularPost,
  CommunitiesDashboardPostAuthor,
  CommunitiesDashboardRecentPost,
  CommunitiesDashboardTopCommunity,
} from "@/api/req/communities";
import { VerifiedBadgeIcon } from "@/components/admin-icons";
import { isAdminPublicMediaUrl, renderableImageSrc } from "@/lib/admin-media";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";

import { numberFormatter } from "../modules/statistics-config";

export const BlockPeriodLabel = ({ children }: { children: string }) => (
  <p className="mt-1 text-sm font-medium leading-6 text-muted">{children}</p>
);

export type DashboardHourlyActivityMetricKey =
  | "accesses"
  | "engagement"
  | "posts"
  | "replies"
  | "reports";

export const dashboardHourlyActivityBreakdown: {
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

export const safeDashboardCount = (value: number | null | undefined) => {
  const normalized = Number(value ?? 0);

  return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
};

export const formatCountLabel = (value: number, singular: string, plural: string) =>
  `${numberFormatter.format(value)} ${value === 1 ? singular : plural}`;

export const formatDashboardActivityHourRange = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const label = String(normalizedHour).padStart(2, "0");

  return `${label}:00 - ${label}:59`;
};

export const normalizeDashboardHourlyActivityPoint = (
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

export const communityPostPublicHref = (
  post: Pick<CommunitiesDashboardRecentPost, "community_slug" | "id">,
) => toPublicFrontendHref(`/comunidades/${post.community_slug}/publicacao/${post.id}`);

export const communityPostAdminDetailHref = (
  post: Pick<CommunitiesDashboardRecentPost, "community_slug" | "id">,
) =>
  `/comunidades/${encodeURIComponent(post.community_slug)}/conteudo/post/${encodeURIComponent(
    post.id,
  )}`;

export const communityPublicHref = (community: Pick<CommunitiesDashboardTopCommunity, "slug">) =>
  toPublicFrontendHref(`/comunidades/${encodeURIComponent(community.slug)}`);

export const communityAdminDetailHref = (
  community: Pick<CommunitiesDashboardTopCommunity, "slug">,
) => `/comunidades/${encodeURIComponent(community.slug)}`;

export const initials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AU";

export const psychologistRoleLabel = (gender?: string | null) =>
  gender?.trim().toLowerCase() === "feminino" ? "Psicóloga" : "Psicólogo";

export const dashboardAuthorRoleLabel = (author: CommunitiesDashboardPopularPost["author"]) =>
  author.role === "psicologo" ? psychologistRoleLabel(author.gender) : "Paciente";

export const DashboardPostAuthorIdentity = ({
  author,
}: {
  author: CommunitiesDashboardPostAuthor;
}) => {
  const avatarSrc = renderableImageSrc(author.avatar);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-xs font-semibold text-primary">
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
          <span className="min-w-0 truncate font-medium text-foreground">{author.name}</span>
          {author.verified ? <VerifiedBadgeIcon aria-label="Perfil verificado" /> : null}
        </div>
        <p className="truncate text-xs font-medium text-muted">
          {dashboardAuthorRoleLabel(author)}
        </p>
      </div>
    </div>
  );
};

export const DashboardPostActions = ({
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
    <div className="flex flex-wrap gap-2 text-xs font-semibold">
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
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-primary-foreground transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        href={adminHref}
      >
        <BarChart3 aria-hidden className="h-3.5 w-3.5" />
        Analytics
      </Link>
    </div>
  );
};

export const TopCommunityActions = ({
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
    <div className="flex flex-wrap gap-2 text-xs font-semibold">
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
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-primary-foreground transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        href={detailHref}
      >
        <BarChart3 aria-hidden className="h-3.5 w-3.5" />
        Detalhes
      </Link>
    </div>
  );
};

export const TopCommunityAvatar = ({
  community,
}: {
  community: Pick<CommunitiesDashboardTopCommunity, "avatar_url" | "name">;
}) => {
  const avatarSrc = renderableImageSrc(community.avatar_url);

  return (
    <span
      aria-hidden
      className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-primary-soft text-xs font-semibold text-primary"
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

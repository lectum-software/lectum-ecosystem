"use client";

import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Eye,
  FileText,
  type LucideIcon,
  MessageCircle,
  Newspaper,
  Reply,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAdminCommunityContent, useAdminCommunityStatistics } from "@/api/callers/communities";
import type {
  AdminCommunityContentItem,
  AdminCommunityContentQuery,
  AdminCommunityDetail,
  AdminCommunityPopularPost,
  AdminCommunityStatisticsQuery,
  AdminCommunityUrgentPendingReport,
} from "@/api/req/communities";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";

import {
  type CommunityTab,
  cardClass,
  formatCountLabel,
  formatDateTime,
  numberFormatter,
  SummaryBlockTitle,
} from "../modules/detail-support";

import {
  formatCommunityStatisticPercent,
  safeCommunityStatisticCount,
} from "../modules/statistics-support";

import { AuthorIdentity, ContentAuthorIdentity } from "./content-card";

import { QueryStatus } from "./content-controls";
import { adminContentDetailHref } from "./content-shared";

export type CommunityHighlightCounterItem = {
  icon: LucideIcon;
  id: string;
  label: string;
  value: number;
};

export const buildCommunityHighlightCounterItems = (
  detail: AdminCommunityDetail,
): CommunityHighlightCounterItem[] => [
  {
    icon: Eye,
    id: "accesses",
    label: "Acessos",
    value: detail.highlight_counters.accesses_count,
  },
  {
    icon: FileText,
    id: "patient_posts",
    label: "Posts de pacientes",
    value: detail.highlight_counters.patient_posts_count,
  },
  {
    icon: Newspaper,
    id: "psychologist_posts",
    label: "Posts de Psicólogos",
    value: detail.highlight_counters.psychologist_posts_count,
  },
  {
    icon: Reply,
    id: "psychologist_replies",
    label: "Respostas de psicólogos",
    value: detail.highlight_counters.psychologist_replies_count,
  },
  {
    icon: MessageCircle,
    id: "patient_comments",
    label: "Comentários de pacientes",
    value: detail.highlight_counters.patient_comments_count,
  },
  {
    icon: AlertTriangle,
    id: "reports",
    label: "Denúncias",
    value: detail.highlight_counters.reports_count,
  },
];

export const CommunityHighlightCounterCard = ({
  item,
}: {
  item: CommunityHighlightCounterItem;
}) => (
  <div className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
      <item.icon aria-hidden className="h-5 w-5" />
    </span>
    <p className="mt-4 text-sm font-extrabold text-muted">{item.label}</p>
    <p className="mt-2 text-3xl font-extrabold text-foreground">
      {numberFormatter.format(safeCommunityStatisticCount(item.value))}
    </p>
  </div>
);

export const CommunityHighlightCounters = ({ detail }: { detail: AdminCommunityDetail }) => {
  const items = buildCommunityHighlightCounterItems(detail);

  return (
    <section aria-labelledby="community-highlight-counters-title">
      <h2 className="sr-only" id="community-highlight-counters-title">
        Contadores de destaque da comunidade
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {items.map((item) => (
          <CommunityHighlightCounterCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
};

export const latestCommunityPostsQuery = {
  limit: 10,
  page: 1,
  period: "all",
  sort: "recent",
  status: "published",
  type: "all",
} as const satisfies AdminCommunityContentQuery;

export const latestCommunityPostSkeletonKeys = ["first", "second", "third", "fourth"] as const;

export const latestPostTitle = (item: AdminCommunityContentItem) => {
  const title = item.title?.trim();
  if (title) return title;

  const excerptText = item.excerpt.trim();
  if (excerptText) return excerptText;

  return "Post sem título";
};

export const LatestCommunityPostRow = ({
  item,
  slug,
}: {
  item: AdminCommunityContentItem;
  slug: string;
}) => {
  const title = latestPostTitle(item);
  const postHref = toPublicFrontendHref(item.public_url);
  const detailHref = adminContentDetailHref(slug, item);

  return (
    <tr className="group align-top transition hover:bg-surface-muted/50">
      <td className="border-b border-border">
        <Link
          aria-label={`Abrir post ${title}`}
          className="block py-4 pr-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={postHref}
          rel="noreferrer"
          target="_blank"
        >
          <span className="block line-clamp-2 font-black text-foreground group-hover:text-primary">
            {title}
          </span>
          <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-muted">
            <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
          </span>
        </Link>
        <Link
          className="mb-3 inline-flex text-xs font-black text-primary hover:underline"
          href={detailHref}
        >
          Ver detalhe Admin
        </Link>
      </td>
      <td className="border-b border-border">
        <Link
          aria-label={`Abrir post ${title}`}
          className="block px-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={postHref}
          rel="noreferrer"
          target="_blank"
        >
          <ContentAuthorIdentity item={item} />
        </Link>
      </td>
      <td className="border-b border-border text-center font-black text-foreground">
        <Link
          aria-label={`Abrir post ${title}`}
          className="block px-2 py-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={postHref}
          rel="noreferrer"
          target="_blank"
        >
          {numberFormatter.format(item.metrics.views_count)}
        </Link>
      </td>
      <td className="border-b border-border text-center font-black text-foreground">
        <Link
          aria-label={`Abrir post ${title}`}
          className="block px-2 py-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={postHref}
          rel="noreferrer"
          target="_blank"
        >
          {numberFormatter.format(item.metrics.comments_count)}
        </Link>
      </td>
    </tr>
  );
};

export const LatestCommunityPostsTable = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 overflow-hidden">
    <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
      <colgroup>
        <col className="w-[42%]" />
        <col className="w-[34%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
      </colgroup>
      <thead className="text-xs text-muted">
        <tr>
          <th className="border-b border-border py-3 pr-4 font-black">Post</th>
          <th className="border-b border-border px-3 py-3 font-black">Autor</th>
          <th className="border-b border-border px-2 py-3 text-center font-black">Visualizações</th>
          <th className="border-b border-border px-2 py-3 text-center font-black">Comentários</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const LatestCommunityPostsSection = ({
  pathname,
  slug,
}: {
  pathname: string;
  slug: string;
}) => {
  const result = useAdminCommunityContent(slug, latestCommunityPostsQuery);
  const latestPosts = useMemo(
    () => (result.data?.data ?? []).filter((item) => item.type === "post").slice(0, 4),
    [result.data?.data],
  );

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SummaryBlockTitle icon={Newspaper} title="Últimos posts" />
        <Link
          className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-primary/20 bg-transparent px-3.5 text-xs font-black text-primary transition hover:border-primary/35 hover:bg-primary-soft"
          href={latestCommunityPostsContentHref(pathname)}
        >
          Ver todos
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>

      {result.isLoading ? (
        <LatestCommunityPostsTable>
          {latestCommunityPostSkeletonKeys.map((key) => (
            <tr className="animate-pulse" key={key}>
              <td className="border-b border-border py-4 pr-4">
                <span className="block h-4 w-3/4 rounded-full bg-surface-muted" />
                <span className="mt-2 block h-3 w-28 rounded-full bg-surface-muted" />
              </td>
              <td className="border-b border-border px-3 py-4">
                <span className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-surface-muted" />
                  <span className="h-8 w-36 rounded-full bg-surface-muted" />
                </span>
              </td>
              <td className="border-b border-border px-2 py-4">
                <span className="mx-auto block h-3 w-10 rounded-full bg-surface-muted" />
              </td>
              <td className="border-b border-border px-2 py-4">
                <span className="mx-auto block h-3 w-10 rounded-full bg-surface-muted" />
              </td>
            </tr>
          ))}
        </LatestCommunityPostsTable>
      ) : null}

      {result.isError ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Não foi possível carregar os últimos posts agora.
        </p>
      ) : null}

      {!result.isLoading && !result.isError && latestPosts.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Nenhum post publicado foi encontrado nesta comunidade.
        </p>
      ) : null}

      {latestPosts.length > 0 ? (
        <LatestCommunityPostsTable>
          {latestPosts.map((item) => (
            <LatestCommunityPostRow item={item} key={item.content_id} slug={slug} />
          ))}
        </LatestCommunityPostsTable>
      ) : null}
    </section>
  );
};

export const communityTabHref = (pathname: string, tab: CommunityTab) =>
  tab === "geral" ? pathname : `${pathname}?tab=${tab}`;

export const latestCommunityPostsContentHref = (pathname: string) => {
  const params = new URLSearchParams({
    contentPeriod: "all",
    contentSort: "recent",
    contentType: "posts",
    tab: "conteudo",
  });

  return `${pathname}?${params.toString()}`;
};

export const PopularPostRow = ({
  communitySlug,
  post,
}: {
  communitySlug: string;
  post: AdminCommunityPopularPost;
}) => {
  const postHref = toPublicFrontendHref(`/comunidades/${communitySlug}/publicacao/${post.id}`);
  const title = post.title.trim() || "Post sem título";

  return (
    <tr className="group align-top transition hover:bg-surface-muted/50">
      <td className="border-b border-border">
        <Link
          aria-label={`Abrir post ${title}`}
          className="block py-4 pr-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={postHref}
          rel="noreferrer"
          target="_blank"
        >
          <span className="block line-clamp-2 font-black text-foreground group-hover:text-primary">
            {title}
          </span>
          <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-muted">
            <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <time dateTime={post.created_at}>{formatDateTime(post.created_at)}</time>
          </span>
        </Link>
      </td>
      <td className="border-b border-border">
        <Link
          aria-label={`Abrir post ${title}`}
          className="block px-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={postHref}
          rel="noreferrer"
          target="_blank"
        >
          <AuthorIdentity author={post.author} />
        </Link>
      </td>
      <td className="border-b border-border text-center font-black text-foreground">
        <Link
          aria-label={`Abrir post ${title}`}
          className="block px-2 py-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={postHref}
          rel="noreferrer"
          target="_blank"
        >
          {numberFormatter.format(post.upvotes_count)}
        </Link>
      </td>
      <td className="border-b border-border text-center font-black text-foreground">
        <Link
          aria-label={`Abrir post ${title}`}
          className="block px-2 py-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={postHref}
          rel="noreferrer"
          target="_blank"
        >
          {numberFormatter.format(post.comments_count)}
        </Link>
      </td>
    </tr>
  );
};

export const pendingCommunityReportPrimaryText = (report: AdminCommunityUrgentPendingReport) => {
  if (report.content.type === "comment") {
    return report.content.excerpt.trim() || "Comentário sem texto disponível.";
  }

  return report.content.title?.trim() || "Post denunciado";
};

export const PendingCommunityReportCard = ({
  pathname,
  report,
}: {
  pathname: string;
  report: AdminCommunityUrgentPendingReport;
}) => {
  const primaryText = pendingCommunityReportPrimaryText(report);

  return (
    <Link
      aria-label={`Abrir aba Denúncias para revisar denúncia pendente: ${primaryText}`}
      className="group block rounded-2xl border border-danger/30 bg-danger/5 p-4 transition hover:border-danger/50 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25"
      href={communityTabHref(pathname, "denuncias")}
    >
      <article className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-muted">
                {report.content.content_kind_label}
              </span>
              {!report.content.available ? (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-black text-warning">
                  Conteúdo indisponível
                </span>
              ) : null}
            </div>
            {report.content.type === "comment" ? (
              <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-muted">
                {primaryText}
              </p>
            ) : (
              <h3 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-foreground group-hover:text-danger">
                {primaryText}
              </h3>
            )}
            {!report.content.available && report.content.unavailable_reason ? (
              <p className="mt-2 text-[11px] font-bold text-warning">
                {report.content.unavailable_reason}
              </p>
            ) : null}
          </div>
        </div>
        <ChevronRight
          aria-hidden
          className="hidden h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-danger sm:mt-7 sm:block"
        />
      </article>
    </Link>
  );
};

export const UrgentThingsSection = ({
  detail,
  pathname,
}: {
  detail: AdminCommunityDetail;
  pathname: string;
}) => {
  const pendingReports = detail.urgent_summary.pending_reports ?? [];
  const pendingReportsCount = detail.urgent_summary.pending_reports_count;

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <SummaryBlockTitle icon={AlertTriangle} title="Denúncias pendentes" />
        {pendingReportsCount > 0 ? (
          <span className="inline-flex w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-black text-danger">
            <AlertTriangle aria-hidden className="h-4 w-4 shrink-0" />
            {formatCountLabel(pendingReportsCount, "denúncia", "denúncias")}
          </span>
        ) : null}
      </div>
      {pendingReports.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {pendingReports.map((report) => (
            <PendingCommunityReportCard key={report.id} pathname={pathname} report={report} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-border bg-surface-muted p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-muted">
              <AlertTriangle aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-foreground">Sem denúncias pendentes</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-muted">
                Nenhuma denúncia ainda precisa de decisão nesta comunidade.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export const toCoverageCount = (value: number | null | undefined) => {
  const count = Number(value ?? 0);

  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
};

export const CommunityCoverageSummaryCard = ({
  pathname,
  slug,
}: {
  pathname: string;
  slug: string;
}) => {
  const statisticsQuery = useMemo<AdminCommunityStatisticsQuery>(() => ({ period: "all" }), []);
  const result = useAdminCommunityStatistics(slug, statisticsQuery);
  const coverage = result.data?.counters.care_coverage;
  const totalPatientPosts = toCoverageCount(
    coverage?.patient_posts_verified_response_breakdown?.total?.total ??
      result.data?.counters.posts.patients,
  );
  const respondedByVerified = Math.min(
    totalPatientPosts,
    toCoverageCount(coverage?.patient_posts_responded_by_verified_psychologists),
  );
  const awaitingCoverage = Math.min(
    totalPatientPosts,
    coverage
      ? toCoverageCount(coverage.patient_posts_awaiting_verified_psychologist_response)
      : Math.max(0, totalPatientPosts - respondedByVerified),
  );
  const coverageRate = totalPatientPosts > 0 ? (respondedByVerified / totalPatientPosts) * 100 : 0;
  const hasAwaitingCoverage = awaitingCoverage > 0;

  return (
    <section aria-busy={result.isLoading || result.isFetching} className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <SummaryBlockTitle icon={MessageCircle} title="Cobertura da comunidade" />
        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-black text-primary">
          Todo o período
        </span>
      </div>

      {result.isLoading ? (
        <div className="mt-4 space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
          <div className="h-2 animate-pulse rounded-full bg-surface-muted" />
        </div>
      ) : null}

      {result.isError ? (
        <div className="mt-4">
          <QueryStatus error={result.error} loading={false} onRetry={() => void result.refetch()} />
        </div>
      ) : null}

      {!result.isLoading && !result.isError ? (
        <>
          <div
            className={cn(
              "mt-4 rounded-2xl border p-4",
              hasAwaitingCoverage
                ? "border-warning/25 bg-warning/10"
                : "border-success/25 bg-success/10",
            )}
          >
            <p
              className={cn(
                "text-xs font-black uppercase tracking-[0.12em]",
                hasAwaitingCoverage ? "text-warning" : "text-success",
              )}
            >
              {hasAwaitingCoverage ? "Sem cobertura" : "Cobertura em dia"}
            </p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-foreground">
              <span className="text-4xl font-black leading-none">
                {numberFormatter.format(awaitingCoverage)}
              </span>
              <span className="text-sm font-black">
                {awaitingCoverage === 1 ? "post sem cobertura" : "posts sem cobertura"}
              </span>
            </p>
          </div>

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  hasAwaitingCoverage ? "bg-warning" : "bg-success",
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, coverageRate))}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-muted">
              <span>Taxa de cobertura</span>
              <span>{formatCommunityStatisticPercent(coverageRate)}</span>
            </div>
          </div>

          <Link
            className="mt-4 inline-flex h-9 w-fit items-center gap-2 rounded-full border border-primary/20 bg-transparent px-3.5 text-xs font-black text-primary transition hover:border-primary/35 hover:bg-primary-soft"
            href={communityTabHref(pathname, "estatisticas")}
          >
            Ver cobertura completa
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </>
      ) : null}
    </section>
  );
};

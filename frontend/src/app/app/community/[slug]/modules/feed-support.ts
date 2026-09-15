import { ArrowUp, Clock, Flame, MessageCircle } from "lucide-react";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { CommunityFeedScope, CommunityPost } from "@/api/generator/types/community";
import type { VoteValue } from "@/components/community/vote-action-button";
import { cn } from "@/lib/utils";

export const PAGE_LIMIT = 12;

export const COMMUNITY_POST_SORTS = [
  { icon: Flame, label: "Em destaque", value: "featured" },
  { icon: Clock, label: "Novos", value: "new" },
  { icon: MessageCircle, label: "Mais comentados", period: true, value: "commented" },
  { icon: ArrowUp, label: "Mais úteis", period: true, value: "voted" },
] as const;

export type CommunityPostSort = (typeof COMMUNITY_POST_SORTS)[number]["value"];

export type CommunityPostSortPeriod = "week" | "month" | "year" | "all";

export type CommunityPostSortWithPeriod = Extract<CommunityPostSort, "commented" | "voted">;

export type CommunityPostSelectedPeriods = Partial<
  Record<CommunityPostSortWithPeriod, CommunityPostSortPeriod>
>;

export const COMMUNITY_POST_SORT_PERIODS: Array<{
  label: string;
  value: CommunityPostSortPeriod;
}> = [
  { label: "Esta semana", value: "week" },
  { label: "Este mês", value: "month" },
  { label: "Este ano", value: "year" },
  { label: "Desde sempre", value: "all" },
];

export const getCommunityPostSortPeriodShortLabel = (value: CommunityPostSortPeriod) => {
  const labels: Record<CommunityPostSortPeriod, string> = {
    all: "Sempre",
    month: "Mês",
    week: "Semana",
    year: "Ano",
  };

  return labels[value];
};

export const communityPostSortChipClassName = (active: boolean) =>
  cn(
    "group inline-flex h-8 min-h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold leading-none tracking-[-0.01em] shadow-none transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.99]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
    active
      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/95 dark:border-primary dark:bg-primary dark:text-primary-foreground"
      : "border-border bg-surface text-muted hover:border-border hover:bg-surface-muted hover:text-foreground dark:border-border dark:bg-surface/70 dark:text-muted dark:hover:bg-surface-muted/70 dark:hover:text-foreground",
  );

export const FEED_SCOPE_OPTIONS: Array<{ label: string; value: CommunityFeedScope }> = [
  { label: "Todas as comunidades", value: "all" },
  { label: "Comunidades que sigo", value: "following" },
];

export const feedHeaderControlClassName = (active: boolean) =>
  cn(
    "group inline-flex h-11 w-11 items-center justify-center rounded-[18px] border shadow-lectum-soft transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    active
      ? "border-primary/45 bg-primary-soft text-primary shadow-lectum-soft"
      : "border-border bg-background text-muted hover:border-primary/35 hover:bg-primary-soft/60 hover:text-primary",
  );

export const feedHeaderDropdownPanelClassName =
  "absolute top-[3.625rem] z-40 overflow-hidden rounded-[22px] border border-border bg-surface p-1.5 shadow-lectum-soft dark:bg-surface";

export const feedHeaderMenuItemClassName = (active?: boolean) =>
  cn(
    "flex w-full items-center justify-between gap-2 rounded-[17px] px-3 py-2.5 text-left text-sm transition-[background-color,color] duration-200",
    active
      ? "bg-primary-soft text-primary"
      : "text-muted hover:bg-surface-muted hover:text-foreground",
  );

export type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

export type ApiError = Error & {
  data?: ApiErrorData;
};

export type VoteSnapshot = {
  currentVote: VoteValue;
  downvotes: number;
  postId: string;
  upvotes: number;
};

export type SaveSnapshot = {
  saved: boolean;
  saves: number;
};

export const resolveFeedError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Este recorte do feed não foi encontrado ou não está disponível.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar o feed da comunidade.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar o feed da comunidade agora.";
};

export const resolveCommunityDetailError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Comunidade não encontrada ou indisponível.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar esta comunidade.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar a comunidade agora.";
};

export const formatCompactCount = (value: number, singular: string, plural: string) => {
  const label = value === 1 ? singular : plural;

  return `${value.toLocaleString("pt-BR")} ${label}`;
};

export const resolveVoteSnapshot = (snapshot: VoteSnapshot, value: 1 | -1): VoteSnapshot => {
  const nextVote = snapshot.currentVote === value ? null : value;
  const upDelta = (nextVote === 1 ? 1 : 0) - (snapshot.currentVote === 1 ? 1 : 0);
  const downDelta = (nextVote === -1 ? 1 : 0) - (snapshot.currentVote === -1 ? 1 : 0);

  return {
    ...snapshot,
    currentVote: nextVote,
    downvotes: Math.max(0, snapshot.downvotes + downDelta),
    upvotes: Math.max(0, snapshot.upvotes + upDelta),
  };
};

export const communityDetailHref = (communitySlug: string) => `/comunidades/${communitySlug}`;

export const communityCreatePostHref = (communitySlug: string) =>
  `/app/comunidades/${communitySlug}/publicacao/nova`;

export const communityPostDetailHref = (post: CommunityPost) =>
  `/comunidades/${post.community.slug}/publicacao/${post.id}`;

export const isPostCardInteractiveTarget = (target: EventTarget | null) => {
  const targetElement =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

  if (!targetElement) return false;

  return Boolean(
    targetElement.closest(
      [
        "a",
        "button",
        "input",
        "textarea",
        "select",
        "video",
        "audio",
        "[role='button']",
        "[role='menu']",
        "[role='menuitem']",
        "[role='dialog']",
        "[aria-modal='true']",
        "[data-comment-collapse-ignore='true']",
        "[data-community-action-bar]",
        "[data-post-card-ignore-click]",
        "[data-post-card-menu]",
        "[data-reply-open-trigger]",
      ].join(","),
    ),
  );
};

export const flattenCommunityPostPages = (pages?: Array<{ data: CommunityPost[] }>) => {
  const seen = new Set<string>();
  const posts: CommunityPost[] = [];

  for (const page of pages ?? []) {
    for (const post of page.data) {
      if (seen.has(post.id)) continue;

      seen.add(post.id);
      posts.push(post);
    }
  }

  return posts;
};

export const comparePostDates = (a: CommunityPost, b: CommunityPost) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

export const fallbackCommunityPeriodMetrics = (
  value: number,
): Record<CommunityPostSortPeriod, number> => ({
  week: value,
  month: value,
  year: value,
  all: value,
});

export const communityPostSortMetrics = (post: CommunityPost) =>
  post.sort_metrics ?? {
    comments: fallbackCommunityPeriodMetrics(post.replies_count),
    upvotes: fallbackCommunityPeriodMetrics(post.upvotes_count),
    psychologist_replies_count: post.highlighted_professional_reply ? 1 : 0,
    top_mentor_replies_count: post.highlighted_professional_reply?.author.featured_badge ? 1 : 0,
    shares_count: 0,
    penalty: 0,
  };

export const communityPostMetricForPeriod = (
  post: CommunityPost,
  metric: "comments" | "upvotes",
  period: CommunityPostSortPeriod,
) => {
  return communityPostSortMetrics(post)[metric][period] ?? 0;
};

export const communityFeaturedScore = (post: CommunityPost, now: number) => {
  const metrics = communityPostSortMetrics(post);
  const createdAt = new Date(post.created_at).getTime();
  const hoursSincePublication = Number.isNaN(createdAt)
    ? 0
    : Math.max(0, (now - createdAt) / 3_600_000);
  const highlightScore =
    metrics.upvotes.all * 3 +
    metrics.comments.all * 5 +
    metrics.psychologist_replies_count * 15 +
    metrics.top_mentor_replies_count * 25 +
    metrics.shares_count * 4 -
    metrics.penalty;

  return highlightScore / (hoursSincePublication + 2) ** 0.5;
};

export const sortCommunityPostsByMetric = (
  posts: CommunityPost[],
  metric: "comments" | "upvotes",
  period: CommunityPostSortPeriod,
) => {
  const secondaryMetric = metric === "comments" ? "upvotes" : "comments";

  return posts.sort((a, b) => {
    const metricDiff =
      communityPostMetricForPeriod(b, metric, period) -
      communityPostMetricForPeriod(a, metric, period);
    if (metricDiff !== 0) return metricDiff;

    const secondaryMetricDiff =
      communityPostMetricForPeriod(b, secondaryMetric, period) -
      communityPostMetricForPeriod(a, secondaryMetric, period);
    if (secondaryMetricDiff !== 0) return secondaryMetricDiff;

    return comparePostDates(a, b);
  });
};

export const sortCommunityPosts = (
  posts: CommunityPost[],
  sort: CommunityPostSort,
  periods: CommunityPostSelectedPeriods,
) => {
  const items = posts.filter((post) => post.status !== "removido");

  if (sort === "new") {
    return items.sort(comparePostDates);
  }

  if (sort === "commented") {
    return sortCommunityPostsByMetric(items, "comments", periods.commented ?? "all");
  }

  if (sort === "voted") {
    return sortCommunityPostsByMetric(items, "upvotes", periods.voted ?? "all");
  }

  const now = Date.now();

  return items.sort((a, b) => {
    const aScore = communityFeaturedScore(a, now);
    const bScore = communityFeaturedScore(b, now);

    if (bScore !== aScore) return bScore - aScore;

    return comparePostDates(a, b);
  });
};

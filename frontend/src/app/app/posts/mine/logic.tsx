"use client";

import { BadgeCheck, ChevronLeft, CornerUpLeft, FileText, Reply } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useInfiniteMyPosts,
  useMyPosts,
  useSaveReply,
  useSharePost,
  useShareReply,
  useVotePost,
} from "@/api/callers/posts";
import type { PostListPost, UserPostListItem, UserPostsType } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { PostOwnerActionMenu } from "@/components/community/post-owner-action-menu";
import { ReplyOwnerActionMenu } from "@/components/community/reply-owner-action-menu";
import { LectumShareVideoModal } from "@/components/share/lectum-share-video-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import {
  createLectumShareLinkTarget,
  createLectumSharePostMediaTarget,
  createLectumShareVideoTarget,
  type LectumShareChannel,
  type LectumShareVideoTarget,
} from "@/utils/lectum-share-target";

const PAGE_LIMIT = 10;

type FilterTabValue = Extract<UserPostsType, "posts" | "replies">;

type FilterTabCounts = Partial<Record<FilterTabValue, number>>;

const focusedReplyHref = (post: PostListPost, replyId: string) =>
  `/community/${post.community.slug}/post/${post.id}?focusReplyId=${encodeURIComponent(replyId)}#reply-${replyId}`;

const isReplyCardInteractiveTarget = (target: EventTarget | null) => {
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

type InteractionCopy = {
  contextLabel: string;
  emptyDescription: string;
  emptyTitle: string;
  filterAriaLabel: string;
  loadingLabel: string;
  plural: string;
  screenTitle: string;
  shareLinkSubject: string;
  singular: string;
  singularTitle: string;
  updatingLabel: string;
};

const getInteractionCopy = (isPsychologist: boolean): InteractionCopy =>
  isPsychologist
    ? {
        contextLabel: "Respondido em",
        emptyDescription:
          "Quando você responder em conversas da comunidade, suas respostas aparecerão aqui.",
        emptyTitle: "Nenhuma resposta sua por enquanto",
        filterAriaLabel: "Filtrar meus posts e respostas",
        loadingLabel: "Carregando seus posts e respostas",
        plural: "Respostas",
        screenTitle: "Meus posts e respostas",
        shareLinkSubject: "da resposta",
        singular: "resposta",
        singularTitle: "Resposta",
        updatingLabel: "Atualizando suas respostas",
      }
    : {
        contextLabel: "Comentado em",
        emptyDescription:
          "Quando você comentar em conversas da comunidade, seus comentários aparecerão aqui.",
        emptyTitle: "Nenhum comentário seu por enquanto",
        filterAriaLabel: "Filtrar meus posts e comentários",
        loadingLabel: "Carregando seus posts e comentários",
        plural: "Comentários",
        screenTitle: "Meus posts e comentários",
        shareLinkSubject: "do comentário",
        singular: "comentário",
        singularTitle: "Comentário",
        updatingLabel: "Atualizando seus comentários",
      };

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolvePostsError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar seus posts.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar seus posts agora.";
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const minutes = Math.floor(diffInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} h`;
  if (days < 7) return `há ${days} d`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const FilterTabs = ({
  counts,
  disabled,
  interactionCopy,
  onChange,
  value,
}: {
  counts?: FilterTabCounts;
  disabled?: boolean;
  interactionCopy: InteractionCopy;
  onChange: (value: UserPostsType) => void;
  value: UserPostsType;
}) => {
  const tabs = [
    { icon: FileText, label: "Posts", value: "posts" as const },
    { icon: CornerUpLeft, label: interactionCopy.plural, value: "replies" as const },
  ];

  return (
    <nav
      aria-label={interactionCopy.filterAriaLabel}
      className="overflow-hidden rounded-[24px] border border-[#E7EEF7] bg-white/95 px-3 py-4 dark:border-border dark:bg-surface sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5" role="tablist">
        {tabs.map((item, index) => {
          const active = item.value === value;
          const count = counts?.[item.value];
          const formattedCount = typeof count === "number" ? count.toLocaleString("pt-BR") : "...";
          const Icon = item.icon;

          return (
            <Fragment key={item.value}>
              {index > 0 ? (
                <span
                  className="hidden h-5 w-px bg-[#E5ECF3] dark:bg-border sm:block"
                  aria-hidden="true"
                />
              ) : null}
              <button
                aria-selected={active}
                className={cn(
                  "inline-flex min-w-0 items-center gap-2 rounded-full px-2 py-1.5 text-[13px] font-bold leading-none transition-[background-color,color,opacity] disabled:opacity-65",
                  active
                    ? "text-primary"
                    : "text-[#64748B] hover:bg-[#F8FBFF] hover:text-[#182033] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground",
                )}
                disabled={disabled}
                onClick={() => onChange(item.value)}
                role="tab"
                type="button"
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-[#64748B] dark:text-muted",
                  )}
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap">
                  <strong
                    className={cn(
                      "font-extrabold",
                      active ? "text-primary" : "text-[#182033] dark:text-foreground",
                    )}
                  >
                    {formattedCount}
                  </strong>{" "}
                  {item.label}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
};

const MyPostsHeader = ({ interactionCopy }: { interactionCopy: InteractionCopy }) => (
  <header className="rounded-[26px] border border-[#E6EAF0] bg-white px-4 py-3.5 shadow-[0_14px_34px_rgba(15,23,42,0.045)] dark:border-border dark:bg-surface sm:px-5 sm:py-4">
    <div className="grid min-h-9 grid-cols-[36px_1fr_36px] items-center gap-2">
      <Link
        aria-label="Voltar para perfil"
        className="inline-flex h-9 w-9 items-center justify-center justify-self-start rounded-full border border-[#DDE7F2] bg-white text-[#334155] shadow-[0_6px_14px_rgba(15,23,42,0.045)] transition hover:-translate-x-0.5 hover:border-[#C8DDF3] hover:bg-[#F8FBFF] hover:text-[#173F72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F8DEB]/35 dark:border-border dark:bg-surface dark:text-foreground"
        href="/app/profile"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Link>
      <h1 className="min-w-0 truncate text-center text-[16px] font-extrabold leading-tight tracking-[-0.025em] text-[#182033] dark:text-foreground sm:text-[17px]">
        {interactionCopy.screenTitle}
      </h1>
      <span aria-hidden="true" />
    </div>
  </header>
);

const ProfessionalAnsweredBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border border-primary/10 bg-primary-soft/70 px-2.5 text-[10px] font-black tracking-[-0.01em] text-primary",
      className,
    )}
  >
    Respondido por psicólogo verificado
    <BadgeCheck className="h-3.5 w-3.5 fill-primary text-white" aria-hidden="true" />
  </span>
);

const ReplyItemCard = ({
  interactionCopy,
  item,
  onChanged,
  onShare,
}: {
  interactionCopy: InteractionCopy;
  item: UserPostListItem;
  onChanged?: () => void;
  onShare: (post: PostListPost, replyId: string) => void;
}) => {
  const router = useRouter();
  const reply = item.reply;
  const voteMutation = useVotePost(item.post.id);
  const saveMutation = useSaveReply(item.post.id, reply?.id ?? "");
  const [voteOverride, setVoteOverride] = useState<{
    currentVote: 1 | -1 | null;
    downvotes: number;
    replyId: string;
    upvotes: number;
  } | null>(null);
  const [saveOverride, setSaveOverride] = useState<{
    replyId: string;
    saves: number;
    saved: boolean;
  } | null>(null);

  if (!reply) return null;

  const replyHref = focusedReplyHref(item.post, reply.id);
  const isDirectPostComment = !reply.parent_reply_id;
  const hasReplyMedia = Boolean(reply.media_url && reply.media_type);
  const hasReplyText = Boolean(reply.content.trim());
  const hasVerifiedProfessionalReply = Boolean(reply.has_verified_professional_reply);
  const isPsychologistReply = reply.author.role === "psicologo";
  const voteState =
    voteOverride?.replyId === reply.id
      ? voteOverride
      : {
          currentVote: reply.current_user_vote,
          downvotes: reply.downvotes_count,
          upvotes: reply.upvotes_count,
        };
  const saveState =
    saveOverride?.replyId === reply.id
      ? saveOverride
      : {
          replyId: reply.id,
          saves: reply.saves_count,
          saved: reply.saved,
        };

  const handleVote = (value: 1 | -1) => {
    const previousVoteOverride = voteOverride;
    const nextVote = voteState.currentVote === value ? null : value;
    const upDelta = (nextVote === 1 ? 1 : 0) - (voteState.currentVote === 1 ? 1 : 0);
    const downDelta = (nextVote === -1 ? 1 : 0) - (voteState.currentVote === -1 ? 1 : 0);

    setVoteOverride({
      currentVote: nextVote,
      downvotes: Math.max(0, voteState.downvotes + downDelta),
      replyId: reply.id,
      upvotes: Math.max(0, voteState.upvotes + upDelta),
    });

    voteMutation.mutate(
      { replyId: reply.id, value },
      {
        onError: () => setVoteOverride(previousVoteOverride),
        onSuccess: (data) => {
          if (data.target_type !== "reply" || data.reply_id !== reply.id) return;

          setVoteOverride({
            currentVote: data.value,
            downvotes: Math.max(0, data.downvotes_count ?? voteState.downvotes + downDelta),
            replyId: reply.id,
            upvotes: Math.max(0, data.upvotes_count),
          });
        },
      },
    );
  };

  const handleToggleSave = () => {
    const previousSaveOverride = saveOverride;
    const nextSaved = !saveState.saved;
    const nextSaves = Math.max(0, saveState.saves + (nextSaved ? 1 : -1));

    setSaveOverride({
      replyId: reply.id,
      saves: nextSaves,
      saved: nextSaved,
    });

    saveMutation.mutate(saveState.saved, {
      onError: () => setSaveOverride(previousSaveOverride),
      onSuccess: (data) => {
        if (data.target_type !== "reply" || data.reply_id !== reply.id) return;

        setSaveOverride({
          replyId: reply.id,
          saves: data.saves_count ?? nextSaves,
          saved: data.saved,
        });
      },
    });
  };
  const openReply = () => router.push(replyHref);
  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isReplyCardInteractiveTarget(event.target)
    ) {
      return;
    }

    openReply();
  };
  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || isReplyCardInteractiveTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openReply();
  };

  return (
    <article
      aria-label={`Abrir ${interactionCopy.singular} em ${item.post.title}`}
      className="relative grid gap-4 rounded-[24px] border border-border/80 bg-surface p-4 text-inherit shadow-[var(--lectum-shadow-soft)] transition hover:border-border/90 hover:bg-surface-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={-1}
    >
      <div className="relative z-20 flex min-w-0 items-center gap-2 text-[11px] font-semibold tracking-[-0.01em] text-muted">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Reply className="h-3.5 w-3.5 shrink-0 text-muted/80" aria-hidden="true" />
          <span className="shrink-0">{interactionCopy.contextLabel}</span>
          <Link
            className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-extrabold text-[#475569] no-underline hover:text-[#475569] hover:no-underline dark:text-muted dark:hover:text-muted"
            href={`/community/${item.post.community.slug}`}
          >
            {item.post.community.name}
          </Link>
          <span className="shrink-0 text-muted" aria-hidden="true">
            &bull;
          </span>
          <span className="shrink-0 text-muted">{formatRelativeTime(reply.created_at)}</span>
        </div>
        <ReplyOwnerActionMenu
          className="-mr-1"
          onDeleted={onChanged}
          onUpdated={onChanged}
          post={item.post}
          reply={reply}
        />
      </div>

      {reply.parent_content || isDirectPostComment ? (
        <blockquote className="relative z-10 overflow-hidden rounded-[20px] border border-primary/10 bg-[linear-gradient(135deg,rgb(239_246_255_/_78%),rgb(248_250_252_/_92%))] px-4 py-3.5 pl-5 shadow-[inset_0_1px_0_rgb(255_255_255_/_70%)]">
          <span
            className="absolute top-3 bottom-3 left-2 w-0.5 rounded-full bg-primary/45"
            aria-hidden="true"
          />
          {reply.parent_content ? (
            <p className="line-clamp-2 text-xs font-medium leading-5 text-muted">
              &ldquo;{reply.parent_content}&rdquo;
            </p>
          ) : (
            <p className="line-clamp-2 text-xs font-black leading-5 text-foreground">
              {item.post.title}
            </p>
          )}
        </blockquote>
      ) : null}

      <div className="relative z-10 grid gap-2">
        {reply.title ? <h2 className="text-lg font-black text-foreground">{reply.title}</h2> : null}
        {hasReplyText ? (
          <p className="whitespace-pre-line text-sm leading-6 text-foreground">{reply.content}</p>
        ) : null}
        {hasReplyMedia ? (
          <div data-post-card-ignore-click="true">
            <CommunityMediaBlock
              alt={reply.title ?? `Mídia da ${interactionCopy.singular}`}
              className={cn(hasReplyText ? "mt-1" : undefined)}
              mediaType={reply.media_type}
              mediaUrl={reply.media_url}
              roundedClassName="rounded-[18px]"
              variant="reply"
            />
          </div>
        ) : null}
      </div>

      {hasVerifiedProfessionalReply ? (
        <ProfessionalAnsweredBadge className="relative z-10 w-fit" />
      ) : null}

      <CommunityActionBar
        className="relative z-20 border-border/80 border-t pt-3"
        comments={{
          count: reply.replies_received_count,
          href: replyHref,
          label: interactionCopy.plural,
        }}
        currentVote={voteState.currentVote}
        disabled={voteMutation.isPending}
        downvotesCount={isPsychologistReply ? voteState.downvotes : undefined}
        onVote={handleVote}
        save={{
          active: saveState.saved,
          count: saveState.saves,
          disabled: saveMutation.isPending,
          label: saveState.saved ? "Remover dos salvos" : "Salvar",
          onClick: handleToggleSave,
        }}
        share={{
          count: isPsychologistReply ? 0 : undefined,
          label: `Compartilhar ${interactionCopy.singular}`,
          onClick: () => onShare(item.post, reply.id),
        }}
        showUpvoteText={false}
        upvotesCount={voteState.upvotes}
        voteLabel={`Marcar ${interactionCopy.singular} como útil`}
        votePresentation="inline"
      />
    </article>
  );
};

const flattenUserPostPages = (pages?: Array<{ data: UserPostListItem[] }>) => {
  const seen = new Set<string>();
  const items: UserPostListItem[] = [];

  for (const page of pages ?? []) {
    for (const item of page.data) {
      if (seen.has(item.id)) continue;

      seen.add(item.id);
      items.push(item);
    }
  }

  return items;
};

const InfiniteMyPostsLoader = ({
  hasNextPage,
  isLoading,
  label,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isLoading: boolean;
  label: string;
  onLoadMore: () => void;
}) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isLoading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "520px 0px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, isLoading, onLoadMore]);

  if (!hasNextPage && !isLoading) return null;

  return (
    <div className="grid min-h-10 place-items-center py-2" ref={sentinelRef}>
      {isLoading ? (
        <LoadingState label={label} />
      ) : (
        <span className="sr-only">Carregar mais automaticamente</span>
      )}
    </div>
  );
};

export const MyPostsLogic = () => {
  const sessionUser = useAppSelector((state) => state.user);
  const [type, setType] = useState<UserPostsType>("posts");
  const [shareFeedback, setShareFeedback] = useState<"interaction" | "post" | null>(null);
  const [shareVideoTarget, setShareVideoTarget] = useState<LectumShareVideoTarget | null>(null);
  const query = useMemo(() => ({ limit: PAGE_LIMIT, type }), [type]);
  const postsCountQueryParams = useMemo(() => ({ limit: 1, page: 1, type: "posts" as const }), []);
  const repliesCountQueryParams = useMemo(
    () => ({ limit: 1, page: 1, type: "replies" as const }),
    [],
  );
  const postsQuery = useInfiniteMyPosts(query);
  const sharePostMutation = useSharePost();
  const shareReplyMutation = useShareReply();
  const { fetchNextPage } = postsQuery;
  const postsCountQuery = useMyPosts(postsCountQueryParams, type !== "posts");
  const repliesCountQuery = useMyPosts(repliesCountQueryParams, type !== "replies");
  const items = useMemo(
    () => flattenUserPostPages(postsQuery.data?.pages),
    [postsQuery.data?.pages],
  );
  const firstPage = postsQuery.data?.pages[0];
  const errorMessage = postsQuery.isError ? resolvePostsError(postsQuery.error) : null;
  const isPsychologist = sessionUser?.role === "psicologo";
  const interactionCopy = getInteractionCopy(isPsychologist);
  const tabCounts = useMemo<FilterTabCounts>(
    () => ({
      posts:
        type === "posts"
          ? (firstPage?.count ?? postsCountQuery.data?.count)
          : postsCountQuery.data?.count,
      replies:
        type === "replies"
          ? (firstPage?.count ?? repliesCountQuery.data?.count)
          : repliesCountQuery.data?.count,
    }),
    [firstPage?.count, postsCountQuery.data?.count, repliesCountQuery.data?.count, type],
  );

  const sharePost = async (post: PostListPost, replyId?: string) => {
    if (typeof window === "undefined") return;

    const replyTarget = replyId
      ? items.find((item) => item.reply?.id === replyId && item.post.id === post.id)?.reply
      : null;
    const socialTarget = replyTarget
      ? createLectumShareVideoTarget(post, replyTarget, {
          parentContent: replyTarget.parent_content ?? null,
        })
      : createLectumSharePostMediaTarget(post);

    if (socialTarget) {
      setShareVideoTarget(socialTarget);
      return;
    }

    const relativeUrl = replyId
      ? focusedReplyHref(post, replyId)
      : `/community/${post.community.slug}/post/${post.id}`;
    setShareVideoTarget(
      createLectumShareLinkTarget(post, {
        relativeUrl,
        replyId: replyId ?? null,
        title: replyId ? `${interactionCopy.singularTitle} na Lectum` : post.title,
      }),
    );
  };

  const handleShareVideoShared = (channel: LectumShareChannel) => {
    if (!shareVideoTarget) return;

    if (shareVideoTarget.replyId) {
      shareReplyMutation.mutate({
        postId: shareVideoTarget.postId,
        replyId: shareVideoTarget.replyId,
        body: { channel },
      });
    } else {
      sharePostMutation.mutate({ id: shareVideoTarget.postId, body: { channel } });
    }
    setShareFeedback(shareVideoTarget.replyId ? "interaction" : "post");
    window.setTimeout(() => setShareFeedback(null), 2400);
  };

  const handleFilterChange = (value: UserPostsType) => {
    setType(value);
  };

  const handlePostDeleted = () => {
    void postsQuery.refetch();
  };

  const handleReplyChanged = () => {
    void postsQuery.refetch();
  };

  const loadMoreItems = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      desktopSidebarDefaultCollapsed
      showMobileNavigation={false}
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 py-5 sm:max-w-xl md:py-8 lg:max-w-3xl">
        <MyPostsHeader interactionCopy={interactionCopy} />

        <div className="grid gap-4 pt-4">
          <FilterTabs
            counts={tabCounts}
            disabled={postsQuery.isFetching}
            interactionCopy={interactionCopy}
            onChange={handleFilterChange}
            value={type}
          />

          {postsQuery.isLoading || postsQuery.isPending ? (
            <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <LoadingState
                label={type === "posts" ? "Carregando seus posts" : interactionCopy.loadingLabel}
              />
            </div>
          ) : null}

          {errorMessage ? (
            <InlineAlert title="Não foi possível carregar" variant="error">
              {errorMessage}
            </InlineAlert>
          ) : null}

          {shareFeedback ? (
            <InlineAlert title="Link preparado" variant="success">
              Link {shareFeedback === "interaction" ? interactionCopy.shareLinkSubject : "do post"}{" "}
              copiado ou enviado para compartilhamento.
            </InlineAlert>
          ) : null}

          {!postsQuery.isLoading && !postsQuery.isPending && !errorMessage && items.length === 0 ? (
            <EmptyState
              action={
                <Button asChild className="rounded-full px-5">
                  <Link href={DEFAULT_COMMUNITY_FEED_HREF}>
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Explorar feed
                  </Link>
                </Button>
              }
              className="border-solid px-6 py-12 shadow-[var(--lectum-shadow-soft)]"
              description={
                type === "posts"
                  ? "Quando você publicar nas comunidades, seus posts aparecerão aqui."
                  : interactionCopy.emptyDescription
              }
              icon={FileText}
              title={type === "posts" ? "Nenhum post seu por enquanto" : interactionCopy.emptyTitle}
            />
          ) : null}

          {items.length > 0 ? (
            <div className="grid gap-4">
              {items.map((item) =>
                item.type === "reply" ? (
                  <ReplyItemCard
                    interactionCopy={interactionCopy}
                    item={item}
                    key={item.id}
                    onChanged={handleReplyChanged}
                    onShare={sharePost}
                  />
                ) : (
                  <CommunityPostCard
                    actionBarShowUpvoteText={false}
                    actionBarVoteLabel="Marcar post como útil"
                    actionBarVotePresentation="inline"
                    communityContextTone="muted"
                    communityHeaderIncludesTime
                    desktopPlainLinks
                    headerExtra={
                      <div className="flex shrink-0 items-center gap-2">
                        {item.post.highlighted_professional_reply ? (
                          <ProfessionalAnsweredBadge className="hidden sm:inline-flex" />
                        ) : null}
                        <PostOwnerActionMenu
                          className="-mr-1"
                          onDeleted={handlePostDeleted}
                          post={item.post}
                        />
                      </div>
                    }
                    hoverTone="neutral"
                    interactiveActions
                    key={item.id}
                    onShare={sharePost}
                    openPostOnCardClick
                    post={item.post}
                    showAuthorHeader={false}
                    showProfessionalEngagementCounters
                    showWhatsappCta={false}
                  />
                ),
              )}
            </div>
          ) : null}

          {postsQuery.isFetching && !postsQuery.isFetchingNextPage && !postsQuery.isLoading ? (
            <LoadingState
              label={type === "posts" ? "Atualizando seus posts" : interactionCopy.updatingLabel}
            />
          ) : null}

          <InfiniteMyPostsLoader
            hasNextPage={Boolean(postsQuery.hasNextPage)}
            isLoading={postsQuery.isFetchingNextPage}
            label={
              type === "posts"
                ? "Carregando mais posts"
                : `Carregando mais ${interactionCopy.plural.toLowerCase()}`
            }
            onLoadMore={loadMoreItems}
          />
        </div>
      </section>
      <LectumShareVideoModal
        onClose={() => setShareVideoTarget(null)}
        onShared={handleShareVideoShared}
        target={shareVideoTarget}
      />
    </PrivateTemplate>
  );
};

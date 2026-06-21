"use client";

import { BadgeCheck, ChevronLeft, ChevronRight, FileText, Reply } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useMemo,
  useState,
} from "react";
import { useMyPosts, useSaveReply, useVotePost } from "@/api/callers/posts";
import type { PostListPost, UserPostListItem, UserPostsType } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";

const PAGE_LIMIT = 10;

const focusedReplyHref = (post: PostListPost, replyId: string) =>
  `/app/community/${post.community.slug}/post/${post.id}?focusReplyId=${encodeURIComponent(replyId)}#reply-${replyId}`;

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
  disabled,
  interactionCopy,
  onChange,
  value,
}: {
  disabled?: boolean;
  interactionCopy: InteractionCopy;
  onChange: (value: UserPostsType) => void;
  value: UserPostsType;
}) => (
  <nav
    aria-label={interactionCopy.filterAriaLabel}
    className="overflow-x-auto pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <div className="inline-flex min-w-max rounded-full border border-border/80 bg-surface/80 p-1.5 backdrop-blur">
      {[
        { label: "Posts", value: "posts" as const },
        { label: interactionCopy.plural, value: "replies" as const },
      ].map((item) => {
        const active = item.value === value;

        return (
          <button
            aria-pressed={active}
            className={cn(
              "min-h-10 rounded-full px-5 text-sm font-extrabold tracking-[-0.01em] transition disabled:opacity-70",
              active
                ? "bg-primary text-white"
                : "text-muted hover:bg-surface-muted hover:text-foreground",
            )}
            disabled={disabled}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>
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
  onShare,
}: {
  interactionCopy: InteractionCopy;
  item: UserPostListItem;
  onShare: (post: PostListPost, replyId: string) => void;
}) => {
  const router = useRouter();
  const reply = item.reply;
  const voteMutation = useVotePost(item.post.id);
  const saveMutation = useSaveReply(item.post.id, reply?.id ?? "");
  const [voteOverride, setVoteOverride] = useState<{
    currentVote: 1 | -1 | null;
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
  const hasVerifiedProfessionalReply = Boolean(reply.has_verified_professional_reply);
  const voteState =
    voteOverride?.replyId === reply.id
      ? voteOverride
      : {
          currentVote: reply.current_user_vote,
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

    setVoteOverride({
      currentVote: nextVote,
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
    if (isReplyCardInteractiveTarget(event.target)) return;

    openReply();
  };
  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (isReplyCardInteractiveTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openReply();
  };

  return (
    <article
      aria-label={`Abrir ${interactionCopy.singular} em ${item.post.title}`}
      className="relative grid gap-4 rounded-[24px] border border-border/80 bg-surface p-4 text-inherit shadow-[var(--lectum-shadow-soft)] transition hover:border-primary/18 hover:bg-primary-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={-1}
    >
      <div className="relative z-10 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-muted">
        <Reply className="h-3.5 w-3.5 shrink-0 text-muted/80" aria-hidden="true" />
        <span className="shrink-0">{interactionCopy.contextLabel}</span>
        <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-extrabold text-[#475569] dark:text-muted">
          {item.post.community.name}
        </span>
        <span className="ml-auto shrink-0">{formatRelativeTime(reply.created_at)}</span>
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
        <p className="whitespace-pre-line text-sm leading-6 text-foreground">{reply.content}</p>
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
        onVote={handleVote}
        save={{
          active: saveState.saved,
          count: saveState.saves,
          disabled: saveMutation.isPending,
          label: saveState.saved ? "Remover dos salvos" : "Salvar",
          onClick: handleToggleSave,
        }}
        share={{
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

const Pagination = ({
  ariaLabel,
  currentPage,
  disabled,
  onPageChange,
  pages,
}: {
  ariaLabel: string;
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pages: number;
}) => {
  if (pages <= 1) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface p-3"
    >
      <Button
        disabled={currentPage <= 1 || disabled}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
        variant="outline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Anterior
      </Button>
      <span className="text-sm font-bold text-muted">
        {currentPage} de {pages}
      </span>
      <Button
        disabled={currentPage >= pages || disabled}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
        variant="outline"
      >
        Próxima
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
};

export const MyPostsLogic = () => {
  const sessionUser = useAppSelector((state) => state.user);
  const [type, setType] = useState<UserPostsType>("posts");
  const [page, setPage] = useState(1);
  const [shareFeedback, setShareFeedback] = useState<"interaction" | "post" | null>(null);
  const query = useMemo(() => ({ page, limit: PAGE_LIMIT, type }), [page, type]);
  const postsQuery = useMyPosts(query);
  const items = postsQuery.data?.data ?? [];
  const errorMessage = postsQuery.isError ? resolvePostsError(postsQuery.error) : null;
  const isPsychologist = sessionUser?.role === "psicologo";
  const interactionCopy = getInteractionCopy(isPsychologist);

  const sharePost = async (post: PostListPost, replyId?: string) => {
    if (typeof window === "undefined") return;

    const relativeUrl = replyId
      ? focusedReplyHref(post, replyId)
      : `/app/community/${post.community.slug}/post/${post.id}`;
    const url = `${window.location.origin}${relativeUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: replyId ? `${interactionCopy.singularTitle} na Lectum` : post.title,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(replyId ? "interaction" : "post");
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const handleFilterChange = (value: UserPostsType) => {
    setType(value);
    setPage(1);
  };

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      desktopSidebarDefaultCollapsed
      showMobileNavigation={false}
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 py-5 sm:max-w-xl md:py-8 lg:max-w-3xl">
        <AppPageHeader
          backHref="/app/profile"
          backLabel="Voltar para perfil"
          className="mb-4"
          title={interactionCopy.screenTitle}
        />

        <FilterTabs
          disabled={postsQuery.isFetching}
          interactionCopy={interactionCopy}
          onChange={handleFilterChange}
          value={type}
        />

        <div className="grid gap-4 py-2">
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
                    onShare={sharePost}
                  />
                ) : (
                  <CommunityPostCard
                    actionBarShowUpvoteText={false}
                    actionBarVoteLabel="Marcar post como útil"
                    actionBarVotePresentation="inline"
                    communityContextTone="muted"
                    communityHeaderIncludesTime
                    headerExtra={
                      item.post.highlighted_professional_reply ? (
                        <ProfessionalAnsweredBadge className="ml-auto" />
                      ) : undefined
                    }
                    interactiveActions
                    key={item.id}
                    onShare={sharePost}
                    post={item.post}
                    showAuthorHeader={false}
                  />
                ),
              )}
            </div>
          ) : null}

          {postsQuery.isFetching && !postsQuery.isLoading ? (
            <LoadingState
              label={type === "posts" ? "Atualizando seus posts" : interactionCopy.updatingLabel}
            />
          ) : null}

          <Pagination
            ariaLabel={`Paginação de ${interactionCopy.screenTitle.toLowerCase()}`}
            currentPage={page}
            disabled={postsQuery.isFetching}
            onPageChange={setPage}
            pages={postsQuery.data?.pages ?? 0}
          />
        </div>
      </section>
    </PrivateTemplate>
  );
};

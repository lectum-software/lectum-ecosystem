"use client";

import { BadgeCheck, ChevronLeft, ChevronRight, FileText, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMyPosts, useSaveReply, useVotePost } from "@/api/callers/posts";
import type { PostListPost, UserPostListItem, UserPostsType } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { SecondaryPageHeader } from "@/components/ui/secondary-page-header";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";

const PAGE_LIMIT = 10;

const FILTERS: Array<{ label: string; value: UserPostsType }> = [
  { label: "Posts", value: "posts" },
  { label: "Comentários", value: "replies" },
];

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
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: UserPostsType) => void;
  value: UserPostsType;
}) => (
  <nav
    aria-label="Filtrar meus posts e comentários"
    className="overflow-x-auto pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <div className="inline-flex min-w-max rounded-full border border-border/80 bg-surface/80 p-1.5 backdrop-blur">
      {FILTERS.map((item) => {
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
  item,
  onShare,
}: {
  item: UserPostListItem;
  onShare: (post: PostListPost, replyId: string) => void;
}) => {
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

  const replyHref = `/app/community/${item.post.community.slug}/post/${item.post.id}?focusReplyId=${encodeURIComponent(reply.id)}#reply-${reply.id}`;
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

  return (
    <article className="relative grid gap-4 rounded-[24px] border border-border/80 bg-surface p-4 text-inherit shadow-[var(--lectum-shadow-soft)] transition hover:border-primary/18 hover:bg-primary-soft/20">
      <Link
        aria-label={`Abrir comentário em ${item.post.title}`}
        className="absolute inset-0 z-0 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        href={replyHref}
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-muted">
        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted/80" aria-hidden="true" />
        <span className="shrink-0">Comentado em</span>
        <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-extrabold text-[#475569] dark:text-muted">
          {item.post.community.name}
        </span>
        <span className="ml-auto shrink-0">{formatRelativeTime(reply.created_at)}</span>
      </div>

      {reply.parent_content || isDirectPostComment ? (
        <blockquote className="pointer-events-none relative z-10 overflow-hidden rounded-[20px] border border-primary/10 bg-[linear-gradient(135deg,rgb(239_246_255_/_78%),rgb(248_250_252_/_92%))] px-4 py-3.5 pl-5 shadow-[inset_0_1px_0_rgb(255_255_255_/_70%)]">
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

      <div className="pointer-events-none relative z-10 grid gap-2">
        {reply.title ? <h2 className="text-lg font-black text-foreground">{reply.title}</h2> : null}
        <p className="whitespace-pre-line text-sm leading-6 text-foreground">{reply.content}</p>
      </div>

      {hasVerifiedProfessionalReply ? (
        <ProfessionalAnsweredBadge className="pointer-events-none relative z-10 w-fit" />
      ) : null}

      <CommunityActionBar
        className="relative z-20 border-border/80 border-t pt-3"
        comments={{
          count: reply.replies_received_count,
          href: replyHref,
          label: "Respostas",
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
          label: "Compartilhar comentário",
          onClick: () => onShare(item.post, reply.id),
        }}
        showUpvoteText={false}
        upvotesCount={voteState.upvotes}
        voteLabel="Marcar comentário como útil"
        votePresentation="inline"
      />
    </article>
  );
};

const Pagination = ({
  currentPage,
  disabled,
  onPageChange,
  pages,
}: {
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pages: number;
}) => {
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Paginação dos meus posts"
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
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const query = useMemo(() => ({ page, limit: PAGE_LIMIT, type }), [page, type]);
  const postsQuery = useMyPosts(query);
  const items = postsQuery.data?.data ?? [];
  const errorMessage = postsQuery.isError ? resolvePostsError(postsQuery.error) : null;
  const isPsychologist = sessionUser?.role === "psicologo";

  const sharePost = async (post: PostListPost, replyId?: string) => {
    if (typeof window === "undefined") return;

    const relativeUrl = replyId
      ? `/app/community/${post.community.slug}/post/${post.id}?focusReplyId=${encodeURIComponent(replyId)}#reply-${replyId}`
      : `/app/community/${post.community.slug}/post/${post.id}`;
    const url = `${window.location.origin}${relativeUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: replyId ? "Comentário na Lectum" : post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(replyId ?? post.id);
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
        <SecondaryPageHeader
          backHref="/app/profile"
          backLabel="Voltar para perfil"
          className="mb-4"
          title="Meus posts e comentários"
        />

        <FilterTabs disabled={postsQuery.isFetching} onChange={handleFilterChange} value={type} />

        <div className="grid gap-4 py-2">
          {postsQuery.isLoading || postsQuery.isPending ? (
            <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <LoadingState
                label={isPsychologist ? "Carregando contribuições" : "Carregando seus posts"}
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
              Link do post copiado ou enviado para compartilhamento.
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
                  : "Quando você comentar em conversas da comunidade, seus comentários aparecerão aqui."
              }
              icon={FileText}
              title={
                type === "posts"
                  ? "Nenhum post seu por enquanto"
                  : "Nenhum comentário seu por enquanto"
              }
            />
          ) : null}

          {items.length > 0 ? (
            <div className="grid gap-4">
              {items.map((item) =>
                item.type === "reply" ? (
                  <ReplyItemCard item={item} key={item.id} onShare={sharePost} />
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
            <LoadingState label="Atualizando posts" />
          ) : null}

          <Pagination
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

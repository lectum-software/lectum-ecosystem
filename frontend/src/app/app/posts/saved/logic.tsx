"use client";

import { Bookmark, ChevronLeft, ChevronRight, Reply } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useSavedPosts,
  useUnsavePostFromList,
  useUnsaveReplyFromList,
  useVotePost,
} from "@/api/callers/posts";
import type { PostListPost, UserPostListItem } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { SecondaryPageHeader } from "@/components/ui/secondary-page-header";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PAGE_LIMIT = 10;

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
    return "Sua sessão precisa estar ativa para visualizar itens salvos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar seus itens salvos agora.";
};

const formatSavedAt = (value: string | null) => {
  if (!value) return "Salvo";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Salvo";

  return `Salvo em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date)}`;
};

const savedReplyHref = (post: PostListPost, replyId: string) =>
  `/app/community/${post.community.slug}/post/${post.id}?focusReplyId=${replyId}#reply-${replyId}`;

const SavedReplyMedia = ({
  mediaType,
  mediaUrl,
  title,
}: {
  mediaType: string | null;
  mediaUrl: string | null;
  title: string;
}) => {
  if (!mediaUrl) return null;

  const resolvedUrl = resolvePublicMediaUrl(mediaUrl);
  if (!resolvedUrl) return null;

  if (mediaType === "video") {
    return (
      <VerticalVideoPlayer
        className="mx-auto w-full max-w-[390px] rounded-[22px]"
        src={resolvedUrl}
        title={title}
      />
    );
  }

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-border bg-surface-muted">
      <Image
        alt={title}
        className="object-cover"
        fill
        sizes="(max-width: 430px) calc(100vw - 64px), 520px"
        src={resolvedUrl}
        unoptimized={isPublicMediaUrl(mediaUrl)}
      />
    </div>
  );
};

const SavedReplyCard = ({
  item,
  onRemove,
  onShare,
  removePending,
}: {
  item: UserPostListItem;
  onRemove: (postId: string, replyId: string) => void;
  onShare: (post: PostListPost, replyId?: string) => void;
  removePending?: boolean;
}) => {
  const reply = item.reply;
  const voteMutation = useVotePost(item.post.id);
  const [voteOverride, setVoteOverride] = useState<{
    currentVote: 1 | -1 | null;
    replyId: string;
    upvotes: number;
  } | null>(null);

  if (!reply) return null;

  const voteState =
    voteOverride?.replyId === reply.id
      ? voteOverride
      : {
          currentVote: reply.current_user_vote,
          upvotes: reply.upvotes_count,
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
        onError: () => {
          setVoteOverride(previousVoteOverride);
        },
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

  const replyLink = savedReplyHref(item.post, reply.id);
  const hasProfessionalWhatsapp = Boolean(reply.author.whatsapp_url);

  return (
    <article className="grid gap-4 rounded-[22px] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-muted">
        <Reply className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="shrink-0">Resposta salva em</span>
        <Link
          className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-black text-foreground underline-offset-4 hover:text-primary hover:underline"
          href={`/app/community/${item.post.community.slug}/post/${item.post.id}`}
        >
          {item.post.community.name}
        </Link>
        <span className="ml-auto shrink-0">{formatSavedAt(item.saved_at)}</span>
      </div>

      {reply.parent_content ? (
        <blockquote className="rounded-2xl border-primary border-l-4 bg-surface-muted px-4 py-3 text-xs leading-5 text-muted">
          “{reply.parent_content}”
        </blockquote>
      ) : null}

      <p className="whitespace-pre-line text-sm leading-6 text-foreground">{reply.content}</p>

      <SavedReplyMedia
        mediaType={reply.media_type}
        mediaUrl={reply.media_url}
        title={reply.title ?? "Mídia da resposta salva"}
      />

      {hasProfessionalWhatsapp ? (
        <PsychologistWhatsAppRedirectButton
          className="mx-auto flex h-11 w-full max-w-[390px] items-center justify-center gap-2 rounded-2xl border border-success bg-transparent text-sm font-bold text-success shadow-none transition hover:bg-success/10 active:scale-[0.99]"
          psychologist={{
            avatar: reply.author.avatar,
            crp: reply.author.crp,
            id: reply.author.id,
            name: reply.author.name,
            typeLabel: reply.author.type_label,
            whatsappUrl: reply.author.whatsapp_url,
          }}
        >
          <WhatsAppIcon className="h-5 w-5 text-success" aria-hidden="true" />
          Chamar no WhatsApp
        </PsychologistWhatsAppRedirectButton>
      ) : null}

      <CommunityActionBar
        className="border-border border-t pt-3"
        comments={{
          count: reply.replies_received_count,
          href: replyLink,
          label: "Respostas",
        }}
        currentVote={voteState.currentVote}
        disabled={voteMutation.isPending}
        onVote={handleVote}
        save={{
          active: true,
          disabled: removePending,
          label: "Remover dos salvos",
          onClick: () => onRemove(item.post.id, reply.id),
        }}
        share={{
          label: "Compartilhar resposta",
          onClick: () => onShare(item.post, reply.id),
        }}
        showUpvoteText={false}
        upvotesCount={voteState.upvotes}
        voteLabel="Marcar resposta como útil"
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
      aria-label="Paginação dos salvos"
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

export const SavedPostsLogic = () => {
  const [page, setPage] = useState(1);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [removedFeedback, setRemovedFeedback] = useState<string | null>(null);
  const query = useMemo(() => ({ page, limit: PAGE_LIMIT }), [page]);
  const postsQuery = useSavedPosts(query);
  const unsavePostMutation = useUnsavePostFromList({
    onSuccess: () => {
      setRemovedFeedback("Post removido dos salvos.");
      window.setTimeout(() => setRemovedFeedback(null), 2400);
    },
  });
  const unsaveReplyMutation = useUnsaveReplyFromList({
    onSuccess: () => {
      setRemovedFeedback("Resposta removida dos salvos.");
      window.setTimeout(() => setRemovedFeedback(null), 2400);
    },
  });
  const items = postsQuery.data?.data ?? [];
  const errorMessage = postsQuery.isError ? resolvePostsError(postsQuery.error) : null;

  const sharePost = async (post: PostListPost, replyId?: string) => {
    if (typeof window === "undefined") return;

    const relativeUrl = replyId
      ? savedReplyHref(post, replyId)
      : `/app/community/${post.community.slug}/post/${post.id}`;
    const url = `${window.location.origin}${relativeUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: replyId ? "Resposta salva na Lectum" : post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(post.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-5 sm:max-w-2xl md:py-8 lg:max-w-3xl">
        <SecondaryPageHeader
          backHref="/app/profile"
          backLabel="Voltar para perfil"
          className="mb-4"
          title="Salvos"
        />

        <div className="grid gap-4">
          {postsQuery.isLoading || postsQuery.isPending ? (
            <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <LoadingState label="Carregando salvos reais" />
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

          {removedFeedback ? (
            <InlineAlert title="Salvos atualizados" variant="success">
              {removedFeedback}
            </InlineAlert>
          ) : null}

          {unsavePostMutation.isError || unsaveReplyMutation.isError ? (
            <InlineAlert title="Não foi possível remover" variant="error">
              O item continua salvo. Tente novamente em alguns instantes.
            </InlineAlert>
          ) : null}

          {!postsQuery.isLoading && !postsQuery.isPending && !errorMessage && items.length === 0 ? (
            <EmptyState
              action={
                <Button asChild>
                  <Link href={DEFAULT_COMMUNITY_FEED_HREF}>
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                    Explorar posts
                  </Link>
                </Button>
              }
              description="Quando você salvar posts ou respostas reais nas comunidades, eles aparecerão aqui."
              icon={Bookmark}
              title="Nenhum item salvo"
            />
          ) : null}

          {items.length > 0 ? (
            <div className="grid gap-4">
              {items.map((item) =>
                item.type === "reply" ? (
                  <SavedReplyCard
                    item={item}
                    key={item.id}
                    onRemove={(postId, replyId) => unsaveReplyMutation.mutate({ postId, replyId })}
                    onShare={sharePost}
                    removePending={unsaveReplyMutation.isPending}
                  />
                ) : (
                  <CommunityPostCard
                    headerExtra={
                      <span className="ml-auto shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-primary">
                        {formatSavedAt(item.saved_at)}
                      </span>
                    }
                    key={item.id}
                    interactiveActions
                    onShare={sharePost}
                    post={item.post}
                    saveActionOverride={{
                      active: true,
                      count: item.post.saves_count,
                      disabled: unsavePostMutation.isPending,
                      label: "Remover dos salvos",
                      onClick: () => unsavePostMutation.mutate(item.post.id),
                    }}
                    showHighlightedProfessionalReply={false}
                  />
                ),
              )}
            </div>
          ) : null}

          {postsQuery.isFetching && !postsQuery.isLoading ? (
            <LoadingState label="Atualizando salvos" />
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

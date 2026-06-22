"use client";

import { BadgeCheck, Bookmark, ChevronLeft, ChevronRight, Reply } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useMemo,
  useState,
} from "react";
import {
  useSavedPosts,
  useUnsavePostFromList,
  useUnsaveReplyFromList,
  useVotePost,
} from "@/api/callers/posts";
import type { CommunityAuthor } from "@/api/generator/types/community";
import type { PostListPost, UserPostListItem } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { MentorBadge } from "@/components/community/mentor-badge";
import {
  PsychologistWhatsAppButtonContent,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
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

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatAuthorMeta = (author: CommunityAuthor, createdAt: string) => {
  const relativeTime = formatRelativeTime(createdAt);

  if (author.role !== "psicologo" || !author.type_label) return relativeTime;

  return `${author.type_label} • ${relativeTime}`;
};

const savedReplyHref = (post: PostListPost, replyId: string) =>
  `/app/community/${post.community.slug}/post/${post.id}?focusReplyId=${encodeURIComponent(replyId)}#reply-${replyId}`;

const isSavedCardInteractiveTarget = (target: EventTarget | null) => {
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

const SavedReplyAuthorAvatar = ({ author, href }: { author: CommunityAuthor; href?: string }) => {
  const avatarSrc = resolvePublicMediaUrl(author.avatar);
  const avatarNode = (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-background">
      {avatarSrc ? (
        <Image
          alt={author.name}
          className="object-cover"
          fill
          sizes="36px"
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(author.avatar)}
        />
      ) : (
        getInitials(author.name)
      )}
    </span>
  );

  if (!href) return avatarNode;

  return (
    <Link
      aria-label={`Abrir perfil de ${author.name}`}
      className="shrink-0 cursor-pointer rounded-full no-underline transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]"
      href={href}
    >
      {avatarNode}
    </Link>
  );
};

const SavedReplyAuthorHeader = ({
  author,
  createdAt,
}: {
  author: CommunityAuthor;
  createdAt: string;
}) => {
  const isPsychologist = author.role === "psicologo";
  const profileHref = isPsychologist ? `/app/psychologist/${author.id}` : undefined;

  return (
    <div className="flex items-start gap-3">
      <SavedReplyAuthorAvatar author={author} href={profileHref} />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 items-center gap-x-2 gap-y-1">
          <div className="flex min-w-0 items-center gap-[5px]">
            {profileHref ? (
              <Link
                className="min-w-0 truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                href={profileHref}
              >
                {author.name}
              </Link>
            ) : (
              <h2 className="min-w-0 truncate text-sm font-black text-foreground">{author.name}</h2>
            )}
            {author.verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white" aria-hidden />
            ) : null}
          </div>
          <MentorBadge badge={author.featured_badge} href={profileHref} />
        </div>
        {profileHref ? (
          <Link
            className="w-fit text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
            href={profileHref}
          >
            <time dateTime={createdAt}>{formatAuthorMeta(author, createdAt)}</time>
          </Link>
        ) : (
          <p className="text-[11px] font-semibold text-muted">
            <time dateTime={createdAt}>{formatAuthorMeta(author, createdAt)}</time>
          </p>
        )}
      </div>
    </div>
  );
};

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
  const router = useRouter();
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
  const openSavedReply = () => router.push(replyLink);
  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isSavedCardInteractiveTarget(event.target)
    ) {
      return;
    }

    openSavedReply();
  };
  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || isSavedCardInteractiveTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openSavedReply();
  };

  return (
    <article
      className="w-full overflow-hidden rounded-[22px] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] transition hover:border-primary/20 hover:bg-primary-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={-1}
    >
      <div className="mb-4 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-muted">
        <Reply className="h-3.5 w-3.5 shrink-0 text-muted/80" aria-hidden="true" />
        <span className="shrink-0">Respondido em</span>
        <Link
          className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-extrabold text-[#475569] underline-offset-4 hover:text-primary hover:underline dark:text-muted md:no-underline md:hover:text-[#475569] md:hover:no-underline dark:md:hover:text-muted"
          href={`/app/community/${item.post.community.slug}`}
        >
          {item.post.community.name}
        </Link>
      </div>

      <div className="mb-3">
        <SavedReplyAuthorHeader author={reply.author} createdAt={reply.created_at} />
      </div>

      <div className="grid gap-2">
        <p className="whitespace-pre-line text-sm leading-6 text-foreground">{reply.content}</p>
      </div>

      <div className="mt-4 grid gap-4">
        <SavedReplyMedia
          mediaType={reply.media_type}
          mediaUrl={reply.media_url}
          title={reply.title ?? "Mídia da resposta salva"}
        />

        {hasProfessionalWhatsapp ? (
          <PsychologistWhatsAppRedirectButton
            className="mx-auto flex h-11 w-full min-w-0 max-w-[390px] items-center justify-center gap-2 rounded-2xl border border-success bg-transparent px-3 text-sm font-bold text-success shadow-none transition hover:bg-success/10 active:scale-[0.99]"
            psychologist={{
              avatar: reply.author.avatar,
              crp: reply.author.crp,
              id: reply.author.id,
              name: reply.author.name,
              typeLabel: reply.author.type_label,
              whatsappUrl: reply.author.whatsapp_url,
            }}
          >
            <PsychologistWhatsAppButtonContent />
          </PsychologistWhatsAppRedirectButton>
        ) : null}
      </div>

      <CommunityActionBar
        className="mt-4 border-border border-t pt-3"
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
          count: reply.saves_count,
          onClick: () => onRemove(item.post.id, reply.id),
        }}
        share={{
          label: "Compartilhar resposta",
          onClick: () => onShare(item.post, reply.id),
        }}
        upvotesCount={voteState.upvotes}
        voteLabel="Marcar resposta como útil"
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
        <AppPageHeader
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
                    communityContextTone="muted"
                    desktopPlainLinks
                    key={item.id}
                    interactiveActions
                    onShare={sharePost}
                    openPostOnCardClick
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

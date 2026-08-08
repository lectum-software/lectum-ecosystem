"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSavePost, useVotePost } from "@/api/callers/posts";
import type { CommunityPost } from "@/api/generator/types/community";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityFollowToggle } from "@/components/community/community-follow-toggle";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { InlineExpandableText } from "@/components/community/inline-expandable-text";
import { PostMediaCarousel } from "@/components/community/post-media-carousel";
import { PostMutedBadge } from "@/components/community/post-muted-badge";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { LoadingState } from "@/components/ui/loading-state";
import {
  formatCommunityPostTime as formatPostTimeLabel,
  getCommunityAuthorDisplayName,
} from "@/utils/community-display";

import {
  communityDetailHref,
  communityPostDetailHref,
  isPostCardInteractiveTarget,
  resolveVoteSnapshot,
  type SaveSnapshot,
  type VoteSnapshot,
} from "../modules/feed-support";

import { AuthorAvatar, AuthorIdentityLine } from "./feed-controls";

export const PostMedia = ({ footer, post }: { footer?: ReactNode; post: CommunityPost }) => {
  const imageMediaItems = (post.media_items ?? []).filter((item) => item.media_type === "image");
  const shouldShowCarousel = imageMediaItems.length > 1;

  if (shouldShowCarousel) {
    return (
      <PostMediaCarousel
        alt={post.title}
        footer={footer}
        frameVariant="post"
        items={imageMediaItems}
      />
    );
  }

  const singleMediaItem = imageMediaItems.length === 1 ? imageMediaItems[0] : null;
  const displayMediaUrl = singleMediaItem?.media_url ?? post.media_url;
  const displayMediaType = singleMediaItem?.media_type ?? post.media_type;

  return (
    <CommunityMediaBlock
      alt={post.title}
      analyticsTarget={
        displayMediaType === "video" ? { targetId: post.id, targetType: "post" } : undefined
      }
      footer={footer}
      mediaType={displayMediaType}
      mediaUrl={displayMediaUrl}
      variant="post"
    />
  );
};

export const ProfessionalReplyMedia = ({
  footer,
  reply,
}: {
  footer?: ReactNode;
  reply: NonNullable<CommunityPost["highlighted_professional_reply"]>;
}) => {
  if (!reply.media_url) return null;

  return (
    <CommunityMediaBlock
      alt="Mídia da resposta profissional"
      analyticsTarget={
        reply.media_type === "video" ? { targetId: reply.id, targetType: "reply" } : undefined
      }
      footer={footer}
      mediaType={reply.media_type}
      mediaUrl={reply.media_url}
      roundedClassName="rounded-[18px]"
      variant="reply"
    />
  );
};

export const ProfessionalReplyPreview = ({ post }: { post: CommunityPost }) => {
  const reply = post.highlighted_professional_reply;
  const [replyExpanded, setReplyExpanded] = useState(false);
  const postHref = communityPostDetailHref(post);
  const isPatientAuthoredPost = post.author.role === "paciente";

  if (!reply || !isPatientAuthoredPost) return null;

  const profileHref = `/psicologos/${reply.author.id}`;
  const replyWhatsappCta = reply.author.whatsapp_url ? (
    <CommunityWhatsAppCta
      attached={Boolean(reply.media_url)}
      psychologist={toCommunityWhatsAppIdentity(reply.author)}
      stopPropagation
      trackingContext={{
        pageKind: "community_post",
        path: postHref,
        targetId: reply.id,
        targetType: "post_reply",
      }}
    />
  ) : null;

  return (
    <div className="relative grid min-w-0 cursor-pointer grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-2xl border border-border bg-surface-muted p-3 dark:border-primary/20 dark:bg-primary/5">
      <Link
        aria-label={`Abrir post ${post.title}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl"
        href={postHref}
      />
      <div className="pointer-events-none flex justify-center pt-1" aria-hidden="true">
        <span className="h-full min-h-24 w-px rounded-full bg-surface-muted dark:bg-primary/25" />
      </div>
      <div className="pointer-events-none relative z-10 min-w-0">
        <div className="flex min-w-0 items-start gap-2.5">
          <AuthorAvatar
            author={reply.author}
            href={profileHref}
            onClick={(event) => event.stopPropagation()}
            size="lg"
          />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <AuthorIdentityLine
              badge={reply.author.featured_badge}
              href={profileHref}
              name={getCommunityAuthorDisplayName(reply.author)}
              onClick={(event) => event.stopPropagation()}
              verified={reply.author.verified}
            />
            <Link
              className="pointer-events-auto min-w-0 cursor-pointer truncate text-[11px] font-semibold text-muted"
              href={profileHref}
              onClick={(event) => event.stopPropagation()}
            >
              {reply.author.type_label} <span aria-hidden="true">•</span>{" "}
              <time dateTime={reply.created_at}>
                {formatPostTimeLabel(reply.created_at, reply.edited_at)}
              </time>{" "}
              <span aria-hidden="true">•</span> {reply.upvotes_count.toLocaleString("pt-BR")}{" "}
              upvotes
            </Link>
          </div>
        </div>
        <div className="mt-2">
          <InlineExpandableText
            className="text-sm leading-6 text-muted dark:text-muted"
            expanded={replyExpanded}
            onToggle={(event) => {
              event.stopPropagation();
              setReplyExpanded((current) => !current);
            }}
            text={reply.content}
          />
        </div>
        {reply.media_url ? (
          <div className="pointer-events-auto mt-3">
            <ProfessionalReplyMedia footer={replyWhatsappCta} reply={reply} />
          </div>
        ) : replyWhatsappCta ? (
          <div className="pointer-events-auto mt-3">{replyWhatsappCta}</div>
        ) : null}
      </div>
    </div>
  );
};

export const PostCard = ({
  post,
  onShare,
  showCommunityHeader = true,
}: {
  post: CommunityPost;
  onShare: (post: CommunityPost) => void;
  showCommunityHeader?: boolean;
}) => {
  const router = useRouter();
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;
  const [voteSnapshot, setVoteSnapshot] = useState<VoteSnapshot>({
    currentVote: post.current_user_vote,
    downvotes: post.downvotes_count,
    postId: post.id,
    upvotes: post.upvotes_count,
  });
  const [saveSnapshot, setSaveSnapshot] = useState<SaveSnapshot>({
    saved: post.saved,
    saves: post.saves_count,
  });
  const voteMutation = useVotePost(post.id);
  const saveMutation = useSavePost(post.id);
  const conversion = useProgressiveConversion();
  const postDetailHref = communityPostDetailHref(post);
  const hasPostMedia = Boolean(post.media_url || (post.media_items ?? []).length > 0);
  const psychologistProfileHref = isPsychologistPost ? `/psicologos/${post.author.id}` : undefined;
  const authorWhatsappCta =
    isPsychologistPost && post.author.whatsapp_url ? (
      <CommunityWhatsAppCta
        attached={hasPostMedia}
        psychologist={toCommunityWhatsAppIdentity(post.author)}
        stopPropagation
        trackingContext={{
          pageKind: "community_post",
          path: postDetailHref,
          targetId: post.id,
          targetType: "community_post",
        }}
      />
    ) : null;

  const handleVote = (value: 1 | -1) => {
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_voto", {
        intent: {
          payload: {
            postId: post.id,
            value,
          },
          type: "vote_post",
        },
      });
      return;
    }

    const previousSnapshot = voteSnapshot;
    const optimisticSnapshot = resolveVoteSnapshot(voteSnapshot, value);

    setVoteSnapshot(optimisticSnapshot);
    voteMutation.mutate(
      { value },
      {
        onError: () => {
          setVoteSnapshot(previousSnapshot);
        },
        onSuccess: (data) => {
          if (data.target_type !== "post") return;

          setVoteSnapshot({
            currentVote: data.value,
            downvotes: data.downvotes_count ?? optimisticSnapshot.downvotes,
            postId: post.id,
            upvotes: data.upvotes_count,
          });
        },
      },
    );
  };

  const handleToggleSave = useCallback(() => {
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_salvar", {
        intent: {
          payload: {
            postId: post.id,
          },
          type: "save_post",
        },
      });
      return;
    }

    const previousSnapshot = saveSnapshot;
    const nextSaved = !previousSnapshot.saved;
    const optimisticSnapshot = {
      saved: nextSaved,
      saves: Math.max(0, previousSnapshot.saves + (nextSaved ? 1 : -1)),
    };

    setSaveSnapshot(optimisticSnapshot);
    saveMutation.mutate(previousSnapshot.saved, {
      onError: () => {
        setSaveSnapshot(previousSnapshot);
      },
      onSuccess: (data) => {
        setSaveSnapshot({
          saved: data.saved,
          saves: data.saves_count ?? optimisticSnapshot.saves,
        });
      },
    });
  }, [conversion, post.id, saveMutation, saveSnapshot]);

  useEffect(() => {
    if (!conversion.isAuthenticated || saveSnapshot.saved) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "save_post" && String(candidate.payload?.postId ?? "") === post.id,
    );

    if (!intent) return;

    window.setTimeout(handleToggleSave, 0);
  }, [conversion, handleToggleSave, post.id, saveSnapshot.saved]);

  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isPostCardInteractiveTarget(event.target)
    ) {
      return;
    }

    router.push(postDetailHref);
  };
  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || isPostCardInteractiveTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    router.push(postDetailHref);
  };

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-[22px] border border-border bg-surface p-4 shadow-lectum-soft transition hover:border-primary/20 hover:bg-primary-soft/20 dark:border-border dark:bg-surface"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      {showCommunityHeader ? (
        <div className="mb-3 flex min-w-0 items-center gap-1 text-[11px] font-semibold text-subtle">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="shrink-0">Postado em</span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link
              className="block min-w-0 cursor-pointer truncate font-black text-muted"
              href={communityDetailHref(post.community.slug)}
            >
              {post.community.name}
            </Link>
            <CommunityFollowToggle
              className="shrink-0"
              initialFollowing={Boolean(post.community.following)}
              slug={post.community.slug}
            />
          </div>
          {post.muted_by_current_user ? <PostMutedBadge className="shrink-0" /> : null}
        </div>
      ) : null}

      {showCommunityHeader ? (
        <div className="mb-3 h-px w-full bg-surface-muted dark:bg-border/70" aria-hidden="true" />
      ) : null}

      <div className="mb-3 flex items-start gap-3">
        <AuthorAvatar
          anonymous={isAnonymousPatient}
          author={post.author}
          href={psychologistProfileHref}
        />
        <div className="grid min-w-0 flex-1 gap-1">
          <AuthorIdentityLine
            badge={post.author.featured_badge ?? post.featured_badge}
            href={psychologistProfileHref}
            name={getCommunityAuthorDisplayName(post.author)}
            verified={post.author.verified}
          />
          {psychologistProfileHref ? (
            <Link
              className="w-fit cursor-pointer text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
              href={psychologistProfileHref}
            >
              {post.author.type_label} <span aria-hidden="true">&bull;</span>{" "}
              {formatPostTimeLabel(post.created_at, post.edited_at)}
            </Link>
          ) : (
            <p className="text-[11px] font-semibold text-muted">
              {formatPostTimeLabel(post.created_at, post.edited_at)}
            </p>
          )}
        </div>
        {!showCommunityHeader && post.muted_by_current_user ? (
          <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
            <PostMutedBadge />
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Link
          className="cursor-pointer text-[1.32rem] font-black leading-[1.18] tracking-[-0.02em] text-foreground dark:text-foreground"
          href={postDetailHref}
        >
          {post.title}
        </Link>
        <InlineExpandableText
          className="text-sm leading-6 text-muted dark:text-muted"
          expanded={false}
          href={postDetailHref}
          text={post.content}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <PostMedia footer={hasPostMedia ? authorWhatsappCta : undefined} post={post} />
        <ProfessionalReplyPreview post={post} />
        {hasPostMedia ? null : authorWhatsappCta}
      </div>

      <CommunityActionBar
        className="mt-4 border-border border-t pt-3 dark:border-border"
        comments={{
          count: post.replies_count,
          href: postDetailHref,
          label: "Comentar no post",
        }}
        currentVote={voteSnapshot.currentVote}
        disabled={voteMutation.isPending}
        onVote={handleVote}
        save={{
          active: saveSnapshot.saved,
          count: saveSnapshot.saves,
          disabled: saveMutation.isPending,
          label: saveSnapshot.saved ? "Remover dos salvos" : "Salvar post",
          onClick: handleToggleSave,
        }}
        share={{
          label: `Compartilhar post: ${post.title}`,
          onClick: () => onShare(post),
        }}
        upvotesCount={voteSnapshot.upvotes}
      />
    </article>
  );
};

export const InfinitePostLoader = ({
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
        <span className="sr-only">Carregar mais posts automaticamente</span>
      )}
    </div>
  );
};

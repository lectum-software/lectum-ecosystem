"use client";

import { Reply } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useState,
} from "react";
import { useSaveReply, useVotePost } from "@/api/callers/posts";
import type { PostListPost, UserPostListItem } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import { ReplyOwnerActionMenu } from "@/components/community/reply-owner-action-menu";
import { cn } from "@/lib/utils";
import { formatCommunityRelativeTime as formatRelativeTime } from "@/utils/community-display";

import {
  focusedReplyHref,
  type InteractionCopy,
  isReplyCardInteractiveTarget,
} from "../modules/support";

import { ProfessionalAnsweredBadge } from "./header";

export const ReplyItemCard = ({
  interactionCopy,
  item,
  onChanged,
  onShare,
  showProfessionalAnsweredBadge,
}: {
  interactionCopy: InteractionCopy;
  item: UserPostListItem;
  onChanged?: () => void;
  onShare: (post: PostListPost, replyId: string) => void;
  showProfessionalAnsweredBadge: boolean;
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
  const hasReplyMedia = Boolean(reply.media_url && reply.media_type);
  const hasReplyText = Boolean(reply.content.trim());
  const hasVerifiedProfessionalReply =
    showProfessionalAnsweredBadge && Boolean(reply.has_verified_professional_reply);
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
  const openReplyLabel = `Abrir ${interactionCopy.singular} no post ${item.post.title}`;

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
  const isReplyToComment = Boolean(reply.parent_reply_id);
  const originPostExcerpt = item.post.content.trim() || "Sem texto.";
  const originCommentExcerpt = reply.parent_content?.trim() || "Comentário sem texto.";
  const originPreview = isReplyToComment
    ? {
        excerpt: originCommentExcerpt,
        label: "COMENTÁRIO DE ORIGEM",
        title: null,
      }
    : {
        excerpt: originPostExcerpt,
        label: "POST DE ORIGEM",
        title: item.post.title,
      };

  return (
    <article
      aria-label={openReplyLabel}
      className="relative grid cursor-pointer gap-4 rounded-[24px] border border-border/80 bg-surface p-4 text-inherit shadow-[var(--lectum-shadow-soft)] transition hover:border-border/90 hover:bg-surface-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={-1}
    >
      <div className="relative z-20 flex min-w-0 items-center gap-2 text-[11px] font-semibold tracking-[-0.01em] text-muted">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Reply className="h-3.5 w-3.5 shrink-0 text-muted/80" aria-hidden="true" />
          <span className="shrink-0">{interactionCopy.contextLabel}</span>
          <Link
            className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-extrabold text-muted no-underline hover:text-muted hover:no-underline dark:text-muted dark:hover:text-muted"
            href={`/comunidades/${item.post.community.slug}`}
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

      <Link
        aria-label={openReplyLabel}
        className="relative z-10 grid gap-4 text-inherit no-underline outline-none hover:text-inherit hover:no-underline focus-visible:rounded-[20px] focus-visible:ring-2 focus-visible:ring-primary/25"
        href={replyHref}
      >
        <blockquote className="overflow-hidden rounded-2xl border border-primary/10 bg-primary-soft/40 px-4 py-3">
          <p className="text-[11px] font-black tracking-[0.08em] text-primary">
            {originPreview.label}
          </p>
          {originPreview.title ? (
            <p className="mt-1 line-clamp-1 text-xs font-black text-foreground">
              {originPreview.title}
            </p>
          ) : null}
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted">
            {originPreview.excerpt}
          </p>
        </blockquote>

        {reply.title || hasReplyText ? (
          <div className="grid gap-2">
            {reply.title ? (
              <h2 className="text-lg font-black text-foreground">{reply.title}</h2>
            ) : null}
            {hasReplyText ? (
              <p className="whitespace-pre-line text-sm leading-6 text-foreground">
                {reply.content}
              </p>
            ) : null}
          </div>
        ) : null}
      </Link>

      {hasReplyMedia ? (
        <div
          className="relative z-10"
          data-post-card-ignore-click={reply.media_type === "video" ? "true" : undefined}
        >
          <CommunityMediaBlock
            alt={reply.title ?? `Mídia da ${interactionCopy.singular}`}
            analyticsTarget={
              reply.media_type === "video" ? { targetId: reply.id, targetType: "reply" } : undefined
            }
            className={cn(hasReplyText ? "mt-1" : undefined)}
            mediaType={reply.media_type}
            mediaUrl={reply.media_url}
            roundedClassName="rounded-[18px]"
            thumbnailUrl={reply.thumbnail_url}
            variant="reply"
          />
        </div>
      ) : null}

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

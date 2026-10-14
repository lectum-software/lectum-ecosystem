"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useSaveReply, useVotePost } from "@/api/callers/posts";
import type { PostListPost, UserPostListItem } from "@/api/generator/types/posts";
import { AuthorIdentityLine } from "@/app/app/community/[slug]/components/feed-controls";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import { AuthorAvatar } from "@/components/community/community-post-card-author";
import { OriginLink } from "@/components/community/reply-origin-link";
import { ReplyOwnerActionMenu } from "@/components/community/reply-owner-action-menu";
import {
  canShowSocialVideoPreviewAction,
  createSocialVideoPreviewOverlayAction,
} from "@/components/community/social-video-preview-action";
import { useInteractionSnapshot } from "@/components/community/use-interaction-snapshot";
import { useAppSelector } from "@/hooks/redux";
import { useLectumShareDownloadDialog } from "@/hooks/use-lectum-share-download-dialog";
import { cn } from "@/lib/utils";
import {
  formatCommunityRelativeTime as formatRelativeTime,
  getCommunityAuthorDisplayName,
} from "@/utils/community-display";
import { createLectumShareVideoDownloadTarget } from "@/utils/lectum-share-target";
import {
  focusedReplyHref,
  type InteractionCopy,
  isReplyCardInteractiveTarget,
} from "../modules/support";
import { WhatsappMetric } from "./whatsapp-metric";

export const ReplyItemCard = ({
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
  const currentUser = useAppSelector((state) => state.user);
  const { isDownloadingShareVideo, lectumDownloadDialog, openLectumDownloadDialog } =
    useLectumShareDownloadDialog();
  const reply = item.reply;
  const voteMutation = useVotePost(item.post.id);
  const saveMutation = useSaveReply(item.post.id, reply?.id ?? "");
  const interactionScope = `${currentUser?.id ?? "guest"}:${item.post.id}:${reply?.id ?? ""}`;
  const { snapshot: voteState, begin: beginVote } = useInteractionSnapshot(interactionScope, {
    currentVote: reply?.current_user_vote ?? null,
    downvotes: reply?.downvotes_count ?? 0,
    upvotes: reply?.upvotes_count ?? 0,
  });
  const { snapshot: saveState, begin: beginSave } = useInteractionSnapshot(interactionScope, {
    saves: reply?.saves_count ?? 0,
    saved: reply?.saved ?? false,
  });

  if (!reply) return null;

  const replyHref = focusedReplyHref(item.post, reply.id);
  const replySocialTarget = canShowSocialVideoPreviewAction({
    author: reply.author,
    currentUser,
    mediaType: reply.media_type,
    mediaUrl: reply.media_url,
  })
    ? createLectumShareVideoDownloadTarget(item.post, reply, {
        parentContent: reply.parent_content,
        relativeUrl: replyHref,
      })
    : null;
  const replyOverlayAction = createSocialVideoPreviewOverlayAction({
    disabled: isDownloadingShareVideo,
    onOpen: openLectumDownloadDialog,
    target: replySocialTarget,
  });
  const hasReplyMedia = Boolean(reply.media_url && reply.media_type);
  const hasReplyText = Boolean(reply.content.trim());
  const isPsychologistReply = reply.author.role === "psicologo";
  const openReplyLabel = `Abrir ${interactionCopy.singular} no post ${item.post.title}`;

  const handleVote = (value: 1 | -1) => {
    const nextVote = voteState.currentVote === value ? null : value;
    const upDelta = (nextVote === 1 ? 1 : 0) - (voteState.currentVote === 1 ? 1 : 0);
    const downDelta = (nextVote === -1 ? 1 : 0) - (voteState.currentVote === -1 ? 1 : 0);

    const operation = beginVote({
      currentVote: nextVote,
      downvotes: Math.max(0, voteState.downvotes + downDelta),
      upvotes: Math.max(0, voteState.upvotes + upDelta),
    });

    voteMutation.mutate(
      { replyId: reply.id, value },
      {
        onError: operation.onError,
        onSuccess: (data) => {
          if (
            data.target_type !== "reply" ||
            data.post_id !== item.post.id ||
            data.reply_id !== reply.id
          ) {
            operation.onError();
            return;
          }

          operation.onSuccess({
            currentVote: data.value,
            downvotes: Math.max(0, data.downvotes_count ?? voteState.downvotes + downDelta),
            upvotes: Math.max(0, data.upvotes_count),
          });
        },
      },
    );
  };

  const handleToggleSave = () => {
    const nextSaved = !saveState.saved;
    const nextSaves = Math.max(0, saveState.saves + (nextSaved ? 1 : -1));

    const operation = beginSave({
      saves: nextSaves,
      saved: nextSaved,
    });

    saveMutation.mutate(saveState.saved, {
      onError: operation.onError,
      onSuccess: (data) => {
        if (
          data.target_type !== "reply" ||
          data.post_id !== item.post.id ||
          data.reply_id !== reply.id
        ) {
          operation.onError();
          return;
        }

        operation.onSuccess({
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
      aria-label={openReplyLabel}
      className="relative grid cursor-pointer gap-4 rounded-[24px] border border-border/80 bg-surface p-4 text-inherit shadow-[var(--lectum-shadow-soft)] transition hover:border-border/90 hover:bg-surface-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={-1}
    >
      <OriginLink item={item} />

      <div className="relative z-30 flex min-w-0 items-start gap-3">
        <AuthorAvatar
          anonymous={
            item.post.anonymous &&
            reply.author.role !== "psicologo" &&
            reply.author.id === item.post.author.id
          }
          avatar={reply.author.avatar}
          name={getCommunityAuthorDisplayName(reply.author)}
          href={isPsychologistReply ? `/psicologos/${reply.author.id}` : undefined}
        />
        <div className="grid min-w-0 flex-1 gap-1">
          <AuthorIdentityLine
            name={getCommunityAuthorDisplayName(reply.author)}
            href={isPsychologistReply ? `/psicologos/${reply.author.id}` : undefined}
            community={item.post.community}
            verified={reply.author.verified}
          />
          <p className="text-[11px] font-medium leading-tight text-muted">
            {isPsychologistReply ? `${reply.author.type_label} · ` : ""}
            {formatRelativeTime(reply.created_at)}
            {reply.edited_at ? " · editado" : ""}
          </p>
        </div>
        <ReplyOwnerActionMenu
          className="-mt-2 -mr-1"
          onDeleted={onChanged}
          onUpdated={onChanged}
          post={item.post}
          reply={reply}
        />
      </div>

      {reply.title || hasReplyText ? (
        <Link
          aria-label={openReplyLabel}
          className="relative z-10 grid gap-4 text-inherit no-underline outline-none hover:text-inherit hover:no-underline focus-visible:rounded-[20px] focus-visible:ring-2 focus-visible:ring-primary/25"
          href={replyHref}
        >
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
      ) : null}

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
            overlayAction={replyOverlayAction}
            roundedClassName="rounded-[18px]"
            thumbnailUrl={reply.thumbnail_url}
            variant="reply"
          />
        </div>
      ) : null}

      <CommunityActionBar
        beforeSaveSlot={
          <WhatsappMetric count={item.whatsapp_clicks_count} isPsychologist={isPsychologistReply} />
        }
        className="relative z-20 border-t border-border/80 pt-3"
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
      {lectumDownloadDialog}
    </article>
  );
};

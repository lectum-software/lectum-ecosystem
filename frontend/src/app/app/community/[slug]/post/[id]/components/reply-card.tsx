"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { type MouseEventHandler, type RefObject, useEffect, useState } from "react";
import { useSaveReply } from "@/api/callers/posts";
import type { PostReply } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { FeedFavoriteButton } from "@/components/community/feed-favorite-button";
import { InlineExpandableText } from "@/components/community/inline-expandable-text";
import { MentorAuthorMeta } from "@/components/community/mentor-author-meta";
import { ReplyEditModal } from "@/components/community/reply-edit-modal";
import {
  canShowSocialVideoPreviewAction,
  createSocialVideoPreviewOverlayAction,
} from "@/components/community/social-video-preview-action";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useAppSelector } from "@/hooks/redux";
import type { CommunityVideoUploadOperation } from "@/hooks/use-community-video-upload";
import { useLectumShareDownloadDialog } from "@/hooks/use-lectum-share-download-dialog";
import { cn } from "@/lib/utils";
import {
  formatCommunityPostTime as formatMentorPostTime,
  getCommunityAuthorDisplayName,
} from "@/utils/community-display";
import { createLectumShareVideoDownloadTarget } from "@/utils/lectum-share-target";
import {
  getNextReplyBranchVisibleCount,
  resolveReplyBranchAction,
} from "@/utils/reply-branch-disclosure";
import {
  createFocusedReplyRelativeUrl,
  findReplyInTree,
  formatReplyAuthorMeta,
  MAX_REPLY_TREE_DEPTH,
  type ReplyMediaPermission,
  type ReplyTargetMap,
  stopReplyTreeCollapsePropagation,
} from "../modules/reply-support";
import type { ReplyComposerForm } from "../use-form";

import { AuthorAvatar } from "./post-content";
import { ReplyComposer } from "./reply-composer";
import { ReplyOverflowMenu } from "./reply-overflow-menu";

export { ReplyOverflowMenu } from "./reply-overflow-menu";

export const ReplyVoteBar = ({
  currentVote,
  disabled,
  onReply,
  onShare,
  onToggleSave,
  onVote,
  reply,
  savePending,
}: {
  currentVote: 1 | -1 | null;
  disabled?: boolean;
  onReply: () => void;
  onShare: () => void;
  onToggleSave: MouseEventHandler<HTMLButtonElement>;
  onVote: (value: 1 | -1) => void;
  reply: PostReply;
  savePending?: boolean;
}) => {
  const handleToggleSave: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onToggleSave(event);
  };

  const handleShare = () => {
    onShare();
  };

  return (
    <CommunityActionBar
      className="mt-3"
      beforeSaveSlot={
        reply.author.role === "psicologo" && reply.author.whatsapp_url && !reply.media_url ? (
          <CommunityWhatsAppCta
            size="xs"
            psychologist={toCommunityWhatsAppIdentity(reply.author)}
            stopPropagation
            trackingContext={{
              pageKind: "community_post",
              targetId: reply.id,
              targetType: "post_reply",
            }}
          />
        ) : null
      }
      currentVote={currentVote}
      disabled={disabled}
      onVote={onVote}
      reply={{
        iconOnly: true,
        label: "Responder",
        onClick: onReply,
      }}
      save={{
        active: reply.saved,
        disabled: savePending,
        label: reply.saved ? "Remover dos salvos" : "Salvar coment\u00e1rio",
        onClick: handleToggleSave,
      }}
      secondaryActionsPlacement="inline"
      share={{
        label: "Compartilhar coment\u00e1rio",
        onClick: handleShare,
      }}
      showUpvoteText={false}
      size="xs"
      spacing="relaxed"
      upvotesCount={reply.upvotes_count}
      voteLabel="Marcar resposta como útil"
      votePresentation="inline"
    />
  );
};

export const ReplyCard = ({
  activeInlineReplyFormRef,
  currentUserId,
  deleteReplyPending,
  depth = 0,
  enableCommunityAutoplay = true,
  inlineReplyTargets,
  mediaPermission,
  onCancelInlineReplyTarget,
  onInlineReplyDraftChange,
  onDeleteReply,
  onReply,
  onReportReply,
  onShare,
  onSubmitReply,
  onVote,
  focusReplyId,
  maxInlineDepth = MAX_REPLY_TREE_DEPTH,
  postId,
  postSourceText,
  professionalThread,
  reply,
  replyApiError,
  replyComposerTargetId,
  replyDisabled,
  threadHrefBase,
  votePending,
}: {
  activeInlineReplyFormRef?: RefObject<HTMLElement | null>;
  currentUserId?: string | null;
  deleteReplyPending?: boolean;
  depth?: number;
  enableCommunityAutoplay?: boolean;
  inlineReplyTargets: ReplyTargetMap;
  mediaPermission: ReplyMediaPermission;
  onCancelInlineReplyTarget: (replyId: string) => void;
  onInlineReplyDraftChange?: (hasDraft: boolean) => void;
  onDeleteReply: (reply: PostReply) => void;
  onReply: (reply: PostReply) => void;
  onReportReply: (reply: PostReply, trigger: HTMLButtonElement | null) => void;
  onShare: (reply: PostReply) => void;
  onSubmitReply: (
    values: ReplyComposerForm,
    parentReplyId: string,
    mediaFile?: File | null,
    videoUploadOperation?: CommunityVideoUploadOperation,
  ) => Promise<void> | void;
  focusReplyId?: string | null;
  maxInlineDepth?: number;
  onVote: (replyId: string, value: 1 | -1) => void;
  postId: string;
  postSourceText: string;
  professionalThread?: boolean;
  reply: PostReply;
  replyApiError?: string | null;
  replyComposerTargetId?: string | null;
  replyDisabled?: boolean;
  threadHrefBase?: string;
  votePending?: boolean;
}) => {
  const currentUser = useAppSelector((state) => state.user);
  const { isDownloadingShareVideo, lectumDownloadDialog, openLectumDownloadDialog } =
    useLectumShareDownloadDialog();
  const isProfessional = reply.author.role === "psicologo";
  const isVerifiedProfessional = isProfessional && reply.author.verified;
  const authorDisplayName = getCommunityAuthorDisplayName(reply.author);
  const isOwnReply = Boolean(currentUserId && reply.author.id === currentUserId);
  const highlightedProfessionalThread = professionalThread ?? isVerifiedProfessional;
  const saveReplyMutation = useSaveReply(postId, reply.id);
  const conversion = useProgressiveConversion();
  const psychologistProfileHref = isProfessional ? `/psicologos/${reply.author.id}` : null;
  const inlineReplyTarget = inlineReplyTargets[reply.id] ?? null;
  const isReplyComposerOpen = Boolean(inlineReplyTarget);
  const isComposerReplyTarget = isReplyComposerOpen || replyComposerTargetId === reply.id;
  const [contentExpanded, setContentExpanded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [visibleChildCount, setVisibleChildCount] = useState(0);
  const visualMaxDepth =
    maxInlineDepth < 0 ? MAX_REPLY_TREE_DEPTH : Math.min(maxInlineDepth, MAX_REPLY_TREE_DEPTH);
  const totalRepliesCount = reply.replies_count ?? reply.replies.length;
  const hasFocusedDescendant = Boolean(
    focusReplyId && focusReplyId !== reply.id && findReplyInTree(reply.replies, focusReplyId),
  );
  const canRenderChildren = depth < visualMaxDepth || hasFocusedDescendant;
  const loadedChildren = canRenderChildren ? reply.replies : [];
  const effectiveVisibleChildCount = hasFocusedDescendant
    ? loadedChildren.length
    : Math.min(visibleChildCount, loadedChildren.length);
  const visibleChildren = loadedChildren.slice(0, effectiveVisibleChildCount);
  const branchAction = hasFocusedDescendant
    ? null
    : resolveReplyBranchAction(effectiveVisibleChildCount, totalRepliesCount);
  const canRevealLoadedChildren = effectiveVisibleChildCount < loadedChildren.length;
  const threadHref = threadHrefBase ? `${threadHrefBase}/${reply.id}` : null;
  const replyRelativeUrl = createFocusedReplyRelativeUrl(threadHrefBase, reply.id);
  const hasTreeContinuation = visibleChildren.length > 0;
  const hasBranchConnector = hasTreeContinuation || Boolean(branchAction);
  const avatarSize = depth > 0 ? "xs" : isProfessional ? "reply" : "sm";
  const hasReplyMedia = Boolean(reply.media_url);
  const isNestedReply = depth > 0;

  const branchActionLabel = branchAction
    ? branchAction.kind === "collapse"
      ? "Ocultar respostas"
      : `${branchAction.kind === "more" ? "Ver mais " : "Ver "}${branchAction.count} ${
          branchAction.count === 1 ? "resposta" : "respostas"
        }`
    : null;

  const updateVisibleBranch = () => {
    if (!branchAction) return;

    if (branchAction.kind === "collapse") {
      setVisibleChildCount(0);
      return;
    }

    setVisibleChildCount((current) =>
      getNextReplyBranchVisibleCount(current, loadedChildren.length),
    );
  };

  const toggleSaveReply: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();

    if (!conversion.isAuthenticated) {
      event.preventDefault();
      conversion.requestConversion("trigger_salvar", {
        intent: {
          payload: {
            postId,
            replyId: reply.id,
          },
          type: "save_reply",
        },
      });
      return;
    }

    saveReplyMutation.mutate(reply.saved);
  };

  useEffect(() => {
    if (!conversion.isAuthenticated || reply.saved) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "save_reply" &&
        String(candidate.payload?.postId ?? "") === postId &&
        String(candidate.payload?.replyId ?? "") === reply.id,
    );

    if (!intent) return;

    saveReplyMutation.mutate(reply.saved);
  }, [conversion, postId, reply.id, reply.saved, saveReplyMutation]);

  const replyWhatsappCta =
    isProfessional && reply.author.whatsapp_url ? (
      <CommunityWhatsAppCta
        attached={hasReplyMedia}
        psychologist={toCommunityWhatsAppIdentity(reply.author)}
        stopPropagation
        trackingContext={{
          pageKind: "community_post",
          targetId: reply.id,
          targetType: "post_reply",
        }}
      />
    ) : null;
  const replySocialTarget = canShowSocialVideoPreviewAction({
    author: reply.author,
    currentUser,
    mediaType: reply.media_type,
    mediaUrl: reply.media_url,
  })
    ? createLectumShareVideoDownloadTarget(
        {
          id: postId,
          title: postSourceText,
        },
        reply,
        {
          parentContent: reply.parent_content,
          relativeUrl: replyRelativeUrl,
        },
      )
    : null;
  const replyOverlayAction = createSocialVideoPreviewOverlayAction({
    disabled: isDownloadingShareVideo,
    onOpen: openLectumDownloadDialog,
    target: replySocialTarget,
  });

  return (
    <article
      className="relative rounded-[20px] py-0.5 text-foreground dark:text-foreground"
      id={`reply-${reply.id}`}
    >
      {hasBranchConnector ? (
        <span
          className={cn(
            "pointer-events-none absolute bottom-0 z-0 w-[1.5px] -translate-x-1/2 rounded-full bg-border-strong",
            isNestedReply ? "top-8 left-3" : "top-10 left-4 sm:left-[1.125rem]",
          )}
          aria-hidden="true"
        />
      ) : null}

      <div
        className={cn(
          "grid rounded-[20px] transition-[background-color,box-shadow] duration-500",
          isNestedReply
            ? "grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2"
            : "grid-cols-[2rem_minmax(0,1fr)] gap-x-2.5 sm:grid-cols-[2.25rem_minmax(0,1fr)]",
          isComposerReplyTarget ? "bg-primary-soft/70 ring-1 ring-primary/20" : undefined,
        )}
        id={`reply-focus-${reply.id}`}
      >
        <div className="relative flex justify-center">
          <AuthorAvatar
            anonymous={Boolean(reply.author.anonymous)}
            author={reply.author}
            href={psychologistProfileHref ?? undefined}
            onProfileClick={psychologistProfileHref ? stopReplyTreeCollapsePropagation : undefined}
            size={avatarSize}
          />
        </div>

        <div className="min-w-0 rounded-[18px] px-0.5 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="grid min-w-0 flex-1 gap-0.5">
              <div className="flex min-w-0 items-center gap-x-2">
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  {isProfessional ? (
                    <Link
                      className={cn(
                        "min-w-0 truncate leading-tight text-inherit no-underline hover:text-inherit hover:no-underline",
                        isNestedReply ? "text-xs font-bold" : "text-sm font-black",
                      )}
                      href={`/psicologos/${reply.author.id}`}
                      onClick={stopReplyTreeCollapsePropagation}
                    >
                      {authorDisplayName}
                    </Link>
                  ) : (
                    <h3
                      className={cn(
                        "min-w-0 truncate leading-tight",
                        isNestedReply ? "text-xs font-bold" : "text-sm font-black",
                      )}
                    >
                      {authorDisplayName}
                    </h3>
                  )}
                  {reply.author.verified ? (
                    <VerifiedBadgeIcon
                      className={cn("shrink-0", isNestedReply ? "h-2.5 w-2.5" : "h-3 w-3")}
                      aria-label="Perfil verificado"
                    />
                  ) : null}
                  {isProfessional ? (
                    <span className="ml-1 flex h-0 w-[66px] shrink-0 items-center justify-start">
                      <FeedFavoriteButton
                        author={reply.author}
                        heartClassName={isNestedReply ? "h-2.5 w-2.5" : "h-3 w-3"}
                      />
                    </span>
                  ) : null}
                </div>
              </div>
              {psychologistProfileHref ? (
                <Link
                  className={cn(
                    "w-fit cursor-pointer font-semibold leading-tight text-muted no-underline hover:text-muted hover:no-underline",
                    isNestedReply ? "text-[10px]" : "text-[11px]",
                  )}
                  href={psychologistProfileHref}
                  onClick={stopReplyTreeCollapsePropagation}
                >
                  <MentorAuthorMeta
                    authorId={reply.author.role === "psicologo" ? reply.author.id : undefined}
                    badge={reply.author.featured_badge}
                    typeLabel={reply.author.type_label}
                    date={`${reply.is_post_author ? "Autor • " : ""}${formatMentorPostTime(reply.created_at, reply.edited_at)}`}
                  >
                    {formatReplyAuthorMeta(
                      reply.author,
                      reply.created_at,
                      reply.edited_at,
                      reply.is_post_author,
                    )}
                  </MentorAuthorMeta>
                </Link>
              ) : (
                <p
                  className={cn(
                    "font-semibold leading-tight text-muted",
                    isNestedReply ? "text-[10px]" : "text-[11px]",
                  )}
                >
                  <MentorAuthorMeta
                    authorId={reply.author.role === "psicologo" ? reply.author.id : undefined}
                    badge={reply.author.featured_badge}
                    typeLabel={reply.author.type_label}
                    date={`${reply.is_post_author ? "Autor • " : ""}${formatMentorPostTime(reply.created_at, reply.edited_at)}`}
                  >
                    {formatReplyAuthorMeta(
                      reply.author,
                      reply.created_at,
                      reply.edited_at,
                      reply.is_post_author,
                    )}
                  </MentorAuthorMeta>
                </p>
              )}
            </div>
            <ReplyOverflowMenu
              postId={postId}
              deletePending={deleteReplyPending}
              isOwnReply={isOwnReply}
              onDelete={() => onDeleteReply(reply)}
              onEdit={() => setEditModalOpen(true)}
              onReport={(trigger) => onReportReply(reply, trigger)}
              reply={reply}
            />
          </div>

          <div>
            <InlineExpandableText
              className="mt-2 text-sm leading-6 text-muted dark:text-muted"
              expanded={contentExpanded}
              maxLines={4}
              onToggle={() => setContentExpanded((current) => !current)}
              text={reply.content}
            />
          </div>
          <div data-comment-collapse-ignore="true">
            <CommunityMediaBlock
              alt="Mídia da resposta"
              analyticsTarget={
                reply.media_type === "video"
                  ? { targetId: reply.id, targetType: "reply" }
                  : undefined
              }
              className="mt-3"
              enableCommunityAutoplay={enableCommunityAutoplay}
              footer={hasReplyMedia ? replyWhatsappCta : undefined}
              mediaType={reply.media_type}
              mediaUrl={reply.media_url}
              overlayAction={replyOverlayAction}
              roundedClassName="rounded-[18px]"
              thumbnailUrl={reply.thumbnail_url}
              variant="reply"
            />
          </div>

          <div data-comment-collapse-ignore="true">
            <ReplyVoteBar
              currentVote={reply.current_user_vote}
              disabled={votePending}
              onReply={() => onReply(reply)}
              onShare={() => onShare(reply)}
              onToggleSave={toggleSaveReply}
              onVote={(value) => onVote(reply.id, value)}
              reply={reply}
              savePending={saveReplyMutation.isPending}
            />
          </div>

          {isOwnReply && editModalOpen ? (
            <ReplyEditModal
              onClose={() => setEditModalOpen(false)}
              open={editModalOpen}
              postId={postId}
              reply={reply}
            />
          ) : null}

          {isReplyComposerOpen ? (
            <div data-comment-collapse-ignore="true">
              <ReplyComposer
                apiError={replyApiError}
                disabled={replyDisabled}
                formRef={activeInlineReplyFormRef}
                mediaPermission={mediaPermission}
                onCancelContext={() => onCancelInlineReplyTarget(reply.id)}
                onDraftStateChange={onInlineReplyDraftChange}
                onSubmit={(values, mediaFile, videoUploadOperation) =>
                  onSubmitReply(values, reply.id, mediaFile, videoUploadOperation)
                }
                replyTarget={inlineReplyTarget}
                variant="inline"
                autoFocus
              />
            </div>
          ) : null}
        </div>
      </div>

      {visibleChildren.length > 0 ? (
        <div
          className={cn(
            "relative z-10 mt-3 grid gap-4",
            isNestedReply ? "ml-3 pl-[18px]" : "ml-4 pl-[18px] sm:ml-[18px] sm:pl-[22px]",
          )}
          id={`reply-children-${reply.id}`}
        >
          {visibleChildren.map((child) => (
            <div className="relative" key={child.id}>
              <svg
                className={cn(
                  "pointer-events-none absolute -top-0.5 z-0 h-[22px] overflow-visible text-border-strong",
                  isNestedReply
                    ? "-left-[18px] w-[18px]"
                    : "-left-[18px] w-[18px] sm:-left-[22px] sm:w-[22px]",
                )}
                aria-hidden="true"
                focusable="false"
                viewBox="0 -2 22 22"
              >
                <path
                  d="M0 -2 V10 C0 14.4 3.6 18 8 18 H22"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <ReplyCard
                activeInlineReplyFormRef={activeInlineReplyFormRef}
                currentUserId={currentUserId}
                deleteReplyPending={deleteReplyPending}
                depth={depth + 1}
                enableCommunityAutoplay={enableCommunityAutoplay}
                inlineReplyTargets={inlineReplyTargets}
                focusReplyId={focusReplyId}
                maxInlineDepth={maxInlineDepth}
                mediaPermission={mediaPermission}
                onCancelInlineReplyTarget={onCancelInlineReplyTarget}
                onInlineReplyDraftChange={onInlineReplyDraftChange}
                onDeleteReply={onDeleteReply}
                onReply={onReply}
                onReportReply={onReportReply}
                onShare={onShare}
                onSubmitReply={onSubmitReply}
                onVote={onVote}
                postId={postId}
                postSourceText={postSourceText}
                professionalThread={highlightedProfessionalThread}
                reply={child}
                replyApiError={replyApiError}
                replyComposerTargetId={replyComposerTargetId}
                replyDisabled={replyDisabled}
                threadHrefBase={threadHrefBase}
                votePending={votePending}
              />
            </div>
          ))}
        </div>
      ) : null}

      {branchAction &&
      branchActionLabel &&
      (branchAction.kind === "collapse" || canRevealLoadedChildren || threadHref) ? (
        <div
          className={cn(
            "relative z-10 mt-2 min-h-5",
            isNestedReply ? "ml-3 pl-[8px]" : "ml-4 pl-[8px] sm:ml-[18px]",
          )}
          data-comment-collapse-ignore="true"
        >
          <svg
            className="pointer-events-none absolute top-0 left-0 h-5 w-1.5 overflow-visible text-border-strong"
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 6 20"
          >
            <path
              d="M0 0 V10 C0 14 3 15 6 18"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {branchAction.kind !== "collapse" && !canRevealLoadedChildren && threadHref ? (
            <Link
              aria-label={`${branchActionLabel} desta conversa`}
              className="inline-flex w-fit items-center gap-0.5 rounded-full px-0.5 py-0.5 text-[10px] font-bold leading-none text-muted no-underline transition hover:bg-surface-muted hover:text-foreground hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              href={threadHref}
              onClick={stopReplyTreeCollapsePropagation}
            >
              <span>{branchActionLabel}</span>
              <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />
            </Link>
          ) : (
            <button
              aria-controls={loadedChildren.length > 0 ? `reply-children-${reply.id}` : undefined}
              aria-expanded={effectiveVisibleChildCount > 0}
              aria-label={`${branchActionLabel} desta conversa`}
              className={cn(
                "inline-flex w-fit items-center gap-0.5 rounded-full px-0.5 py-0.5 !text-[10px] !font-bold !leading-none text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.98]",
              )}
              onClick={(event) => {
                event.stopPropagation();
                updateVisibleBranch();
              }}
              type="button"
            >
              <span>{branchActionLabel}</span>
              {branchAction.kind === "collapse" ? (
                <ChevronUp className="h-2.5 w-2.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      ) : null}
      {lectumDownloadDialog}
    </article>
  );
};

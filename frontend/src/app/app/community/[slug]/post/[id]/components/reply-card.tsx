"use client";

import Link from "next/link";
import {
  type MouseEventHandler,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
import { TestimonialInvitation } from "@/components/reviews/testimonials-sheet";
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
  getReplyBranchVisibleCount,
  type ReplyBranchVisibility,
  resolveReplyBranchAction,
} from "@/utils/reply-branch-disclosure";
import { hasInlineReplySecondaryActions } from "@/utils/reply-tree-layout";
import type { ReplyBranchSnapshot } from "@/utils/reply-tree-return-memory";
import {
  createFocusedReplyRelativeUrl,
  findReplyInTree,
  formatReplyAuthorMeta,
  MAX_REPLY_TREE_DEPTH,
  type ReplyMediaPermission,
  type ReplyTargetMap,
  restoreCollapsedReplyFocus,
  stopReplyTreeCollapsePropagation,
} from "../modules/reply-support";
import type { ReplyComposerForm } from "../use-form";

import { AuthorAvatar } from "./post-content";
import { ReplyBranchFooter } from "./reply-branch-footer";
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
  const inlineSecondaryActions = hasInlineReplySecondaryActions(reply);
  return (
    <CommunityActionBar
      className="mt-3 overflow-x-auto [&>div:last-child:empty]:hidden"
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
      secondaryActionsPlacement="inline"
      save={
        inlineSecondaryActions
          ? { active: reply.saved, disabled: savePending, onClick: onToggleSave }
          : undefined
      }
      share={inlineSecondaryActions ? { onClick: onShare } : undefined}
      showUpvoteText={false}
      size="xs"
      spacing="default"
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
  onOpenThread,
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
  restoredBranches,
  suppressFocusExpansion = false,
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
  onOpenThread?: (replyId: string) => void;
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
  restoredBranches?: Record<string, ReplyBranchSnapshot>;
  suppressFocusExpansion?: boolean;
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
  const [contentExpanded, setContentExpanded] = useState(
    restoredBranches?.[reply.id]?.contentExpanded ?? false,
  );
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [branchVisibility, setBranchVisibility] = useState<ReplyBranchVisibility | null>(() => {
    const saved = restoredBranches?.[reply.id];
    return saved ? { count: saved.count, focusReplyId: focusReplyId ?? null } : null;
  });
  const [collapsedFocusId, setCollapsedFocusId] = useState<string | null>();
  const restoreRootFocus = useRef(false);
  const articleRef = useRef<HTMLElement>(null);
  const suppressDescendantFocus =
    suppressFocusExpansion || collapsedFocusId === (focusReplyId ?? null);
  useLayoutEffect(() => {
    if (!restoreRootFocus.current || branchVisibility?.count !== 0) return;
    restoreRootFocus.current = false;
    const article = articleRef.current;
    const sheetScroller = article?.closest<HTMLElement>("[data-content-video-comment-branch]");
    if (article && sheetScroller) {
      article
        .querySelector<HTMLElement>(`[id="reply-focus-${CSS.escape(reply.id)}"]`)
        ?.focus({ preventScroll: true });
      sheetScroller.scrollTop +=
        article.getBoundingClientRect().top - sheetScroller.getBoundingClientRect().top - 16;
      return;
    }
    restoreCollapsedReplyFocus(reply.id);
  }, [branchVisibility, reply.id]);
  const visualMaxDepth =
    maxInlineDepth < 0 ? MAX_REPLY_TREE_DEPTH : Math.min(maxInlineDepth, MAX_REPLY_TREE_DEPTH);
  const totalRepliesCount = reply.replies_count ?? reply.replies.length;
  const hasFocusedDescendant = Boolean(
    focusReplyId && focusReplyId !== reply.id && findReplyInTree(reply.replies, focusReplyId),
  );
  const canRenderChildren = depth < visualMaxDepth;
  const loadedChildren = canRenderChildren ? reply.replies : [];
  const effectiveVisibleChildCount = getReplyBranchVisibleCount(
    branchVisibility,
    focusReplyId ?? null,
    hasFocusedDescendant,
    loadedChildren.length,
    suppressFocusExpansion,
  );
  const visibleChildren = loadedChildren.slice(0, effectiveVisibleChildCount);
  const branchAction = resolveReplyBranchAction(effectiveVisibleChildCount, totalRepliesCount);
  const canRevealLoadedChildren = effectiveVisibleChildCount < loadedChildren.length;
  const threadHref = threadHrefBase ? `${threadHrefBase}/${reply.id}` : null;
  const replyRelativeUrl = createFocusedReplyRelativeUrl(threadHrefBase, reply.id);
  const hasTreeContinuation = visibleChildren.length > 0;
  const showBranchAction = Boolean(
    branchAction && branchAction.kind !== "collapse" && (canRevealLoadedChildren || threadHref),
  );
  const canCollapseTree = depth === 0 && hasTreeContinuation;
  const hasBranchFooter = showBranchAction || canCollapseTree;
  const hasBranchConnector = hasTreeContinuation || hasBranchFooter;
  const avatarSize = depth > 0 ? "xs" : isProfessional ? "reply" : "sm";
  const hasReplyMedia = Boolean(reply.media_url);
  const isNestedReply = depth > 0;

  const updateVisibleBranch = () => {
    setBranchVisibility({
      focusReplyId: focusReplyId ?? null,
      count: getNextReplyBranchVisibleCount(effectiveVisibleChildCount, loadedChildren.length),
    });
  };
  const collapseTree = () => {
    if (!canCollapseTree) return;
    restoreRootFocus.current = true;
    setCollapsedFocusId(focusReplyId ?? null);
    setBranchVisibility({ focusReplyId: focusReplyId ?? null, count: 0 });
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
      ref={articleRef}
      className="relative rounded-[20px] py-0.5 text-foreground dark:text-foreground"
      id={`reply-${reply.id}`}
      data-reply-branch-id={reply.id}
      data-reply-visible-count={effectiveVisibleChildCount}
      data-reply-content-expanded={contentExpanded}
    >
      {hasBranchConnector ? (
        <span
          className={cn(
            "pointer-events-none absolute z-0",
            // One border draws both the stem and its terminal curve without a seam.
            hasBranchFooter
              ? "bottom-[11.25px] w-[9px] -translate-x-[0.75px] rounded-bl-[8px] border-b-[1.5px] border-l-[1.5px] border-border-strong"
              : "bottom-0 -translate-x-[0.75px] border-l-[1.5px] border-border-strong",
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
        tabIndex={depth === 0 ? -1 : undefined}
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
                    <span className="ml-1 flex h-0 w-[66px] shrink-0 items-center justify-start feed-favorite-slot">
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
              secondaryActions={
                hasInlineReplySecondaryActions(reply)
                  ? undefined
                  : {
                      saved: reply.saved,
                      savePending: saveReplyMutation.isPending,
                      onToggleSave: toggleSaveReply,
                      onShare: () => onShare(reply),
                    }
              }
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
            {isProfessional && reply.author.id && hasReplyMedia && reply.media_type === "video" ? (
              <TestimonialInvitation
                psychologistId={reply.author.id}
                className="mt-3 max-w-full rounded-full"
              />
            ) : null}
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
              <span
                className={cn(
                  "pointer-events-none absolute top-0 z-0 h-[12.75px] rounded-bl-[8px] border-b-[1.5px] border-l-[1.5px] border-border-strong",
                  isNestedReply
                    ? "-left-[18.75px] w-[18.75px]"
                    : "-left-[18.75px] w-[18.75px] sm:-left-[22.75px] sm:w-[22.75px]",
                )}
                aria-hidden="true"
              />
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
                onOpenThread={onOpenThread}
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
                restoredBranches={collapsedFocusId === undefined ? restoredBranches : undefined}
                suppressFocusExpansion={suppressDescendantFocus}
                threadHrefBase={threadHrefBase}
                votePending={votePending}
              />
            </div>
          ))}
        </div>
      ) : null}

      <ReplyBranchFooter
        action={branchAction}
        canCollapseTree={canCollapseTree}
        canRevealLoadedChildren={canRevealLoadedChildren}
        descendantsCount={reply.descendants_count}
        depth={depth}
        onCollapse={collapseTree}
        onExpand={updateVisibleBranch}
        onOpenThread={onOpenThread ? () => onOpenThread(reply.id) : undefined}
        replyId={reply.id}
        threadHref={threadHref}
        visibleCount={effectiveVisibleChildCount}
      />
      {lectumDownloadDialog}
    </article>
  );
};

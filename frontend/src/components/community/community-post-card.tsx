"use client";

import { Reply } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSavePost, useSaveReply, useVotePost } from "@/api/callers/posts";
import { useContentAttentionTracking } from "@/components/analytics/content-attention-tracker";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { FeedFavoriteButton } from "@/components/community/feed-favorite-button";
import { InlineExpandableText } from "@/components/community/inline-expandable-text";
import { MentorAuthorMeta } from "@/components/community/mentor-author-meta";
import { PostMediaCarousel } from "@/components/community/post-media-carousel";
import { PostMutedBadge } from "@/components/community/post-muted-badge";
import { ProfileReplyQuestion } from "@/components/community/profile-reply-question";
import { ProfileReplyVideoQuestion } from "@/components/community/profile-reply-video-question";
import {
  canShowSocialVideoPreviewAction,
  createSocialVideoPreviewOverlayAction,
} from "@/components/community/social-video-preview-action";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useAppSelector } from "@/hooks/redux";
import { useLectumShareDownloadDialog } from "@/hooks/use-lectum-share-download-dialog";
import { cn } from "@/lib/utils";
import {
  formatCommunityPostTime as formatPostTimeLabel,
  formatCommunityRelativeTime as formatRelativeTime,
  getCommunityAuthorDisplayName,
} from "@/utils/community-display";
import {
  createLectumSharePostVideoDownloadTarget,
  createLectumShareVideoDownloadTarget,
} from "@/utils/lectum-share-target";
import { AuthorAvatar } from "./community-post-card-author";
import { ProfessionalReplyPreview } from "./community-post-card-reply-preview";
import {
  type CommunityPostCardProps,
  isPostCardInteractiveTarget,
  type PostWithOptionalSortMetrics,
  type ProfileContributionPost,
  postDetailHref,
  publicationInteractionData,
} from "./community-post-card-support";

export const CommunityPostCard = ({
  actionBarShowUpvoteText = true,
  actionBarVoteLabel = "Marcar como útil",
  actionBarVotePresentation = "cluster",
  communityContextTone = "default",
  communityHeaderIncludesTime = false,
  desktopPlainLinks = false,
  footerExtra,
  headerExtra,
  hoverTone = "primary",
  interactiveActions = false,
  onShare,
  openPostOnCardClick = true,
  post,
  presentation = "default",
  profilePublicationMode = false,
  saveActionOverride,
  showAuthorHeader = true,
  showCommunityHeader = true,
  showHighlightedProfessionalReply = true,
  showProfessionalEngagementCounters = false,
  showWhatsappCta = true,
  statusBadge,
}: CommunityPostCardProps) => {
  const router = useRouter();
  const currentUser = useAppSelector((state) => state.user);
  const { isDownloadingShareVideo, lectumDownloadDialog, openLectumDownloadDialog } =
    useLectumShareDownloadDialog();
  const contributionType = (post as ProfileContributionPost).contribution_type;
  const primaryReply =
    profilePublicationMode && contributionType === "reply"
      ? post.highlighted_professional_reply
      : null;
  const displayAuthor = primaryReply?.author ?? post.author;
  const displayAuthorName = getCommunityAuthorDisplayName(displayAuthor);
  const displayCreatedAt = primaryReply?.created_at ?? post.created_at;
  const displayEditedAt = primaryReply ? primaryReply.edited_at : post.edited_at;
  const displayTimeLabel = formatPostTimeLabel(displayCreatedAt, displayEditedAt);
  const displayRelativeTime = formatRelativeTime(displayCreatedAt);
  const displayWasEdited = Boolean(displayEditedAt);
  const displayTitle = primaryReply ? null : post.title;
  const displayContent = primaryReply?.content ?? post.content;
  const showDisplayText = !primaryReply || Boolean(displayContent.trim());
  const postImageMediaItems = primaryReply
    ? []
    : (post.media_items ?? []).filter((item) => item.media_type === "image");
  const singlePostMediaItem = postImageMediaItems.length === 1 ? postImageMediaItems[0] : null;
  const displayMediaType =
    primaryReply?.media_type ?? singlePostMediaItem?.media_type ?? post.media_type;
  const displayMediaUrl =
    primaryReply?.media_url ?? singlePostMediaItem?.media_url ?? post.media_url;
  const showProfileVideoQuestion = Boolean(
    primaryReply && displayMediaType === "video" && displayMediaUrl,
  );
  const displayThumbnailUrl =
    primaryReply?.thumbnail_url ?? singlePostMediaItem?.thumbnail_url ?? post.thumbnail_url;
  const displayMediaAnalyticsTarget =
    displayMediaType === "video"
      ? ({
          targetId: primaryReply?.id ?? post.id,
          targetType: primaryReply ? "reply" : "post",
        } as const)
      : undefined;
  const shouldShowPostCarousel = !primaryReply && postImageMediaItems.length > 1;
  const displayFeaturedBadge =
    primaryReply?.author.featured_badge ?? displayAuthor.featured_badge ?? post.featured_badge;
  const isOriginalPostByPatient = post.author.role === "paciente";
  const highlightedProfessionalReply =
    primaryReply || !showHighlightedProfessionalReply || !isOriginalPostByPatient
      ? null
      : post.highlighted_professional_reply;
  const isReplyContribution = contributionType === "reply";
  const focusedReplyId =
    profilePublicationMode && isReplyContribution ? (primaryReply?.id ?? undefined) : undefined;
  const communityContextLabel = isReplyContribution ? "Respondido em" : "Postado em";
  const usesMutedCommunityContext = communityContextTone === "muted";
  const hasSecondaryHeaderActions = Boolean(post.muted_by_current_user || statusBadge);
  const shouldCompactProfileReplyMedia =
    profilePublicationMode && isReplyContribution && Boolean(primaryReply);
  const isPsychologistPost = displayAuthor.role === "psicologo";
  const isAnonymousPatient = !primaryReply && !isPsychologistPost && post.anonymous;
  const psychologistProfileHref = isPsychologistPost
    ? `/psicologos/${displayAuthor.id}`
    : undefined;
  const whatsappTrackingTarget =
    isReplyContribution && primaryReply
      ? { targetId: primaryReply.id, targetType: "post_reply" }
      : { targetId: post.id, targetType: "community_post" };
  const attentionTrackingTarget = isPsychologistPost
    ? ({
        targetId: isReplyContribution && primaryReply ? primaryReply.id : post.id,
        targetType: isReplyContribution && primaryReply ? "reply" : "post",
      } as const)
    : null;
  const setAttentionElement = useContentAttentionTracking(attentionTrackingTarget);
  const authorWhatsappCta =
    showWhatsappCta && isPsychologistPost && displayAuthor.whatsapp_url ? (
      <CommunityWhatsAppCta
        attached={Boolean(shouldShowPostCarousel || displayMediaUrl)}
        psychologist={toCommunityWhatsAppIdentity(displayAuthor)}
        stopPropagation
        trackingContext={{
          pageKind: "community_post",
          path: postDetailHref(post, focusedReplyId),
          ...whatsappTrackingTarget,
        }}
      />
    ) : null;
  const voteMutation = useVotePost(post.id);
  const savePostMutation = useSavePost(post.id);
  const saveReplyMutation = useSaveReply(post.id, primaryReply?.id ?? "");
  const saveMutation = primaryReply ? saveReplyMutation : savePostMutation;
  const interactionId = `${currentUser?.id ?? "guest"}:${post.id}:${primaryReply?.id ?? "post"}`;
  const interactionData = publicationInteractionData(post, primaryReply);
  const conversion = useProgressiveConversion();
  const [contentExpanded, setContentExpanded] = useState(false);
  const [voteOverride, setVoteOverride] = useState<{
    currentVote: 1 | -1 | null;
    downvotes: number;
    postId: string;
    upvotes: number;
  } | null>(null);
  const [saveOverride, setSaveOverride] = useState<{
    postId: string;
    saved: boolean;
    saves: number;
  } | null>(null);
  const voteSnapshot =
    voteOverride?.postId === interactionId
      ? voteOverride
      : {
          currentVote: interactionData.currentVote,
          downvotes: interactionData.downvotes,
          upvotes: interactionData.upvotes,
        };
  const saveSnapshot =
    saveOverride?.postId === interactionId
      ? saveOverride
      : {
          saved: interactionData.saved,
          saves: interactionData.saves,
        };
  const handleVote = (value: 1 | -1) => {
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_voto", {
        intent: {
          payload: {
            postId: post.id,
            ...(primaryReply ? { replyId: primaryReply.id } : {}),
            value,
          },
          type: primaryReply ? "vote_reply" : "vote_post",
        },
      });
      return;
    }

    const previousOverride = voteOverride;
    const nextVote = voteSnapshot.currentVote === value ? null : value;
    const upDelta = (nextVote === 1 ? 1 : 0) - (voteSnapshot.currentVote === 1 ? 1 : 0);
    const downDelta = (nextVote === -1 ? 1 : 0) - (voteSnapshot.currentVote === -1 ? 1 : 0);
    const optimisticSnapshot = {
      currentVote: nextVote,
      downvotes: Math.max(0, voteSnapshot.downvotes + downDelta),
      postId: interactionId,
      upvotes: Math.max(0, voteSnapshot.upvotes + upDelta),
    };

    setVoteOverride(optimisticSnapshot);
    voteMutation.mutate(
      { value, ...(primaryReply ? { replyId: primaryReply.id } : {}) },
      {
        onError: () => {
          setVoteOverride(previousOverride);
        },
        onSuccess: (data) => {
          if (data.target_type !== (primaryReply ? "reply" : "post")) return;

          setVoteOverride({
            currentVote: data.value,
            downvotes: Math.max(0, data.downvotes_count ?? optimisticSnapshot.downvotes),
            postId: interactionId,
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
            ...(primaryReply ? { replyId: primaryReply.id } : {}),
          },
          type: primaryReply ? "save_reply" : "save_post",
        },
      });
      return;
    }

    const previousOverride = saveOverride;
    const nextSaved = !saveSnapshot.saved;
    const optimisticSnapshot = {
      postId: interactionId,
      saved: nextSaved,
      saves: Math.max(0, saveSnapshot.saves + (nextSaved ? 1 : -1)),
    };

    setSaveOverride(optimisticSnapshot);
    saveMutation.mutate(saveSnapshot.saved, {
      onError: () => {
        setSaveOverride(previousOverride);
      },
      onSuccess: (data) => {
        setSaveOverride({
          postId: interactionId,
          saved: data.saved,
          saves: data.saves_count ?? optimisticSnapshot.saves,
        });
      },
    });
  }, [
    conversion,
    post.id,
    primaryReply,
    interactionId,
    saveMutation,
    saveOverride,
    saveSnapshot.saved,
    saveSnapshot.saves,
  ]);

  useEffect(() => {
    if (!conversion.isAuthenticated || saveSnapshot.saved) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === (primaryReply ? "save_reply" : "save_post") &&
        String(candidate.payload?.postId ?? "") === post.id &&
        (!primaryReply || String(candidate.payload?.replyId ?? "") === primaryReply.id),
    );

    if (!intent) return;

    window.setTimeout(handleToggleSave, 0);
  }, [conversion, handleToggleSave, post.id, primaryReply, saveSnapshot.saved]);

  const saveAction = saveActionOverride ?? {
    active: saveSnapshot.saved,
    count: saveSnapshot.saves,
    disabled: saveMutation.isPending,
    label: saveSnapshot.saved ? "Remover dos salvos" : "Salvar",
    onClick: interactiveActions ? handleToggleSave : undefined,
  };
  const shouldShowProfessionalEngagementCounters =
    showProfessionalEngagementCounters && isPsychologistPost;
  const shareCount = shouldShowProfessionalEngagementCounters
    ? ((post as PostWithOptionalSortMetrics).sort_metrics?.shares_count ?? 0)
    : undefined;
  const postHref = postDetailHref(post, focusedReplyId);
  const displayMediaSocialTarget = canShowSocialVideoPreviewAction({
    author: displayAuthor,
    currentUser,
    mediaType: displayMediaType,
    mediaUrl: displayMediaUrl,
  })
    ? primaryReply
      ? createLectumShareVideoDownloadTarget(post, primaryReply, {
          parentContent: primaryReply.parent_content,
          relativeUrl: postHref,
        })
      : createLectumSharePostVideoDownloadTarget(post, { relativeUrl: postHref })
    : null;
  const displayMediaOverlayAction = createSocialVideoPreviewOverlayAction({
    disabled: isDownloadingShareVideo,
    onOpen: openLectumDownloadDialog,
    target: displayMediaSocialTarget,
  });
  const highlightedReplyHref = highlightedProfessionalReply
    ? postDetailHref(post, highlightedProfessionalReply.id)
    : postHref;
  const highlightedReplySocialTarget =
    highlightedProfessionalReply &&
    canShowSocialVideoPreviewAction({
      author: highlightedProfessionalReply.author,
      currentUser,
      mediaType: highlightedProfessionalReply.media_type,
      mediaUrl: highlightedProfessionalReply.media_url,
    })
      ? createLectumShareVideoDownloadTarget(post, highlightedProfessionalReply, {
          parentContent: highlightedProfessionalReply.parent_content,
          relativeUrl: highlightedReplyHref,
        })
      : null;
  const highlightedReplyOverlayAction = createSocialVideoPreviewOverlayAction({
    disabled: isDownloadingShareVideo,
    onOpen: openLectumDownloadDialog,
    target: highlightedReplySocialTarget,
  });
  const isFeedPresentation = presentation === "feed";
  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (
      !openPostOnCardClick ||
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

    router.push(postHref);
  };
  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (
      !openPostOnCardClick ||
      event.defaultPrevented ||
      isPostCardInteractiveTarget(event.target)
    ) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    router.push(postHref);
  };

  return (
    <article
      className={cn(
        isFeedPresentation
          ? "w-full cursor-pointer overflow-hidden rounded-[22px] border border-border bg-surface p-4 shadow-lectum-soft transition hover:border-primary/20 hover:bg-primary-soft/20 dark:border-border dark:bg-surface"
          : "w-full overflow-hidden rounded-[22px] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] transition",
        !isFeedPresentation &&
          (hoverTone === "primary"
            ? "hover:border-primary/20 hover:bg-primary-soft/20"
            : "hover:border-border/90 hover:bg-surface-muted/45"),
        openPostOnCardClick &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:cursor-pointer",
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      ref={setAttentionElement}
      tabIndex={openPostOnCardClick ? -1 : undefined}
    >
      {showCommunityHeader ? (
        <div
          className={cn(
            "mb-3 flex min-w-0 items-center text-[11px] font-semibold",
            isFeedPresentation ? "gap-1 text-subtle" : "gap-2 tracking-[-0.01em] text-muted",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center",
              isFeedPresentation ? "gap-1.5" : "gap-1",
            )}
          >
            {isReplyContribution ? (
              <Reply
                className={cn("h-3.5 w-3.5 shrink-0", usesMutedCommunityContext && "text-muted/80")}
                aria-hidden="true"
              />
            ) : null}
            <span className="shrink-0">{communityContextLabel}</span>
            <Link
              className={cn(
                isFeedPresentation
                  ? "block min-w-0 cursor-pointer truncate font-black text-muted"
                  : "block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-black underline-offset-4 hover:text-primary hover:underline",
                !isFeedPresentation && !communityHeaderIncludesTime && "flex-1",
                !isFeedPresentation &&
                  (profilePublicationMode || usesMutedCommunityContext
                    ? "text-muted dark:text-muted"
                    : "text-foreground"),
                !isFeedPresentation &&
                  desktopPlainLinks &&
                  (profilePublicationMode || usesMutedCommunityContext
                    ? "md:no-underline md:hover:text-muted md:hover:no-underline dark:md:hover:text-muted"
                    : "md:no-underline md:hover:text-foreground md:hover:no-underline"),
              )}
              href={`/comunidades/${post.community.slug}`}
            >
              {post.community.name}
            </Link>
            {!isFeedPresentation && communityHeaderIncludesTime ? (
              <>
                <span className="shrink-0 text-muted" aria-hidden="true">
                  &bull;
                </span>
                <span className="shrink-0 text-muted">{displayTimeLabel}</span>
              </>
            ) : null}
          </div>
          {post.muted_by_current_user ? <PostMutedBadge className="shrink-0" /> : null}
          {statusBadge}
          {headerExtra}
        </div>
      ) : hasSecondaryHeaderActions ? (
        <div className="mb-3 flex items-center justify-end gap-2">
          {post.muted_by_current_user ? <PostMutedBadge /> : null}
          {statusBadge}
        </div>
      ) : null}

      {showCommunityHeader && showAuthorHeader ? (
        <div className="mb-3 h-px w-full bg-surface-muted dark:bg-border/70" aria-hidden="true" />
      ) : null}

      {primaryReply && !showProfileVideoQuestion ? (
        <ProfileReplyQuestion content={post.content} key={post.id} title={post.title} />
      ) : null}

      {showAuthorHeader ? (
        <div
          className={cn(
            "flex items-start gap-3",
            primaryReply ? (showDisplayText ? "mb-2" : "mb-0") : "mb-3",
          )}
        >
          <AuthorAvatar
            anonymous={isAnonymousPatient}
            avatar={displayAuthor.avatar}
            href={psychologistProfileHref}
            name={displayAuthorName}
          />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <div
              className={cn(
                "flex min-w-0 items-center gap-x-2 gap-y-1",
                profilePublicationMode ? "flex-nowrap" : "flex-wrap",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-1">
                {psychologistProfileHref ? (
                  <Link
                    className="min-w-0 truncate text-sm font-black leading-tight text-foreground no-underline transition hover:text-foreground hover:no-underline"
                    href={psychologistProfileHref}
                  >
                    {displayAuthorName}
                  </Link>
                ) : (
                  <h2 className="min-w-0 truncate text-sm font-black leading-tight text-foreground">
                    {displayAuthorName}
                  </h2>
                )}
                {displayAuthor.verified ? (
                  <VerifiedBadgeIcon className="h-3 w-3 shrink-0" aria-label="Perfil verificado" />
                ) : null}
                {isPsychologistPost ? (
                  <span className="ml-1 flex h-0 w-[66px] shrink-0 items-center justify-start">
                    <FeedFavoriteButton author={displayAuthor} />
                  </span>
                ) : null}
              </div>
            </div>
            {psychologistProfileHref ? (
              <Link
                className="w-fit text-[11px] font-medium leading-[1.15] text-muted no-underline transition hover:text-muted hover:no-underline"
                href={psychologistProfileHref}
              >
                <MentorAuthorMeta
                  authorId={displayAuthor.role === "psicologo" ? displayAuthor.id : undefined}
                  community={post.community}
                  badge={displayFeaturedBadge}
                  typeLabel={displayAuthor.type_label}
                  date={
                    <>
                      {displayRelativeTime}
                      {displayWasEdited ? " • editado" : ""}
                    </>
                  }
                >
                  {displayAuthor.type_label} <span aria-hidden="true">&bull;</span>{" "}
                  {displayRelativeTime}
                  {displayWasEdited ? (
                    <>
                      {" "}
                      <span aria-hidden="true">&bull;</span>{" "}
                      <span className="font-extrabold text-muted">editado</span>
                    </>
                  ) : null}
                </MentorAuthorMeta>
              </Link>
            ) : (
              <p className="text-[11px] font-medium leading-[1.15] text-muted">
                {displayTimeLabel}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {showDisplayText ? (
        <div className="grid gap-2">
          {displayTitle ? (
            <Link
              className={cn(
                "cursor-pointer text-[1.32rem] font-black leading-[1.18] tracking-[-0.02em] text-foreground no-underline transition hover:text-foreground hover:no-underline",
                isFeedPresentation && "text-foreground dark:text-foreground",
                profilePublicationMode && "line-clamp-2 text-[1.08rem] leading-[1.22]",
                desktopPlainLinks &&
                  "md:no-underline md:hover:text-foreground md:hover:no-underline",
              )}
              href={postHref}
            >
              {displayTitle}
            </Link>
          ) : null}
          {profilePublicationMode ? (
            <InlineExpandableText
              className="text-sm leading-6 text-muted"
              expanded={contentExpanded}
              onToggle={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setContentExpanded((current) => !current);
              }}
              text={displayContent}
            />
          ) : (
            <InlineExpandableText
              className={cn(
                "text-sm leading-6",
                isFeedPresentation ? "text-muted dark:text-muted" : "text-muted",
              )}
              expanded={false}
              href={postHref}
              text={displayContent}
            />
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "grid",
          primaryReply ? "mt-3" : "mt-4",
          isFeedPresentation ? "gap-3" : "gap-4",
        )}
      >
        {shouldShowPostCarousel ? (
          <PostMediaCarousel
            alt={displayTitle ?? "Mídia da publicação"}
            footer={authorWhatsappCta}
            items={postImageMediaItems}
          />
        ) : (
          <CommunityMediaBlock
            alt={displayTitle ?? "Mídia da publicação"}
            analyticsTarget={displayMediaAnalyticsTarget}
            enableCommunityAutoplay={profilePublicationMode}
            footer={authorWhatsappCta && displayMediaUrl ? authorWhatsappCta : undefined}
            mediaType={displayMediaType}
            mediaUrl={displayMediaUrl}
            overlayAction={displayMediaOverlayAction}
            thumbnailUrl={displayThumbnailUrl}
            variant={shouldCompactProfileReplyMedia ? "reply" : "post"}
            videoOverlay={
              showProfileVideoQuestion ? (
                <ProfileReplyVideoQuestion title={post.title} />
              ) : undefined
            }
          />
        )}
        <ProfessionalReplyPreview
          community={post.community}
          overlayAction={highlightedReplyOverlayAction}
          postHref={postHref}
          presentation={isFeedPresentation ? "feed" : "default"}
          profilePublicationMode={profilePublicationMode}
          reply={highlightedProfessionalReply}
          showWhatsappCta={showWhatsappCta}
        />
        {shouldShowPostCarousel || displayMediaUrl ? null : authorWhatsappCta}
      </div>

      <CommunityActionBar
        className={
          primaryReply
            ? "mt-2 sm:mt-3"
            : cn(
                "mt-4 border-t pt-3",
                isFeedPresentation ? "border-border dark:border-border" : "border-border",
              )
        }
        comments={{
          count: primaryReply ? undefined : interactionData.comments,
          href: primaryReply
            ? `/comunidades/${post.community.slug}/publicacao/${post.id}/resposta/${primaryReply.id}`
            : postHref,
          label: primaryReply
            ? "Comentários da resposta"
            : isFeedPresentation
              ? "Comentar no post"
              : "Comentários",
        }}
        currentVote={voteSnapshot.currentVote}
        disabled={voteMutation.isPending}
        downvotesCount={
          !primaryReply && shouldShowProfessionalEngagementCounters
            ? voteSnapshot.downvotes
            : undefined
        }
        endSlot={footerExtra}
        onVote={interactiveActions ? handleVote : undefined}
        save={{
          active: saveAction.active,
          count: primaryReply ? undefined : saveAction.count,
          disabled: saveAction.disabled,
          label: saveAction.label,
          onClick: saveAction.onClick,
        }}
        secondaryActionsPlacement={primaryReply ? "inline" : "trailing"}
        share={{
          count: primaryReply ? undefined : shareCount,
          label: primaryReply
            ? "Compartilhar resposta"
            : isFeedPresentation
              ? `Compartilhar post: ${post.title}`
              : displayTitle
                ? `Compartilhar ${displayTitle}`
                : "Compartilhar publicação",
          onClick: () => onShare(post),
        }}
        showUpvoteText={primaryReply ? false : actionBarShowUpvoteText}
        size={primaryReply ? "xs" : "sm"}
        upvotesCount={voteSnapshot.upvotes}
        voteLabel={primaryReply ? "Marcar resposta como útil" : actionBarVoteLabel}
        votePresentation={primaryReply ? "inline" : actionBarVotePresentation}
      />
      {lectumDownloadDialog}
    </article>
  );
};

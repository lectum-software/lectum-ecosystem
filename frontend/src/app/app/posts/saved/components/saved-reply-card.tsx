"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { useVotePost } from "@/api/callers/posts";
import type { CommunityAuthor } from "@/api/generator/types/community";
import type { PostListPost, UserPostListItem } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import {
  CommunityMediaBlock,
  type CommunityMediaOverlayAction,
} from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { MentorAuthorMeta } from "@/components/community/mentor-author-meta";
import { OriginalPostCommunityLink } from "@/components/community/original-post-community-link";
import { ProfileReplyQuestion } from "@/components/community/profile-reply-question";
import { ProfileReplyVideoQuestion } from "@/components/community/profile-reply-video-question";
import {
  canShowSocialVideoPreviewAction,
  createSocialVideoPreviewOverlayAction,
} from "@/components/community/social-video-preview-action";
import { useInteractionSnapshot } from "@/components/community/use-interaction-snapshot";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useAppSelector } from "@/hooks/redux";
import { useLectumShareDownloadDialog } from "@/hooks/use-lectum-share-download-dialog";
import { cn } from "@/lib/utils";
import {
  formatCommunityPostTime as formatMentorPostTime,
  getCommunityInitials as getInitials,
} from "@/utils/community-display";
import { createLectumShareVideoDownloadTarget } from "@/utils/lectum-share-target";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

import { formatAuthorMeta, isSavedCardInteractiveTarget, savedReplyHref } from "../modules/support";

export const SavedReplyAuthorAvatar = ({
  author,
  href,
}: {
  author: CommunityAuthor;
  href?: string;
}) => {
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

export const SavedReplyAuthorHeader = ({
  community,
  author,
  createdAt,
}: {
  author: CommunityAuthor;
  community: { slug: string; name: string; category: string | null };
  createdAt: string;
}) => {
  const isPsychologist = author.role === "psicologo";
  const profileHref = isPsychologist ? `/psicologos/${author.id}` : undefined;

  return (
    <div className="flex items-start gap-3">
      <SavedReplyAuthorAvatar author={author} href={profileHref} />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 items-center gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {profileHref ? (
              <Link
                className="min-w-[4ch] truncate text-sm font-black leading-tight text-foreground no-underline transition hover:text-foreground hover:no-underline"
                href={profileHref}
              >
                {author.name}
              </Link>
            ) : (
              <h2 className="min-w-[4ch] truncate text-sm font-black leading-tight text-foreground">
                {author.name}
              </h2>
            )}
            {author.verified ? (
              <VerifiedBadgeIcon className="h-3 w-3 shrink-0" aria-label="Perfil verificado" />
            ) : null}
            <OriginalPostCommunityLink community={community} />
          </div>
        </div>
        {profileHref ? (
          <Link
            className="w-fit text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
            href={profileHref}
          >
            <MentorAuthorMeta
              authorId={author.role === "psicologo" ? author.id : undefined}
              community={community}
              badge={author.featured_badge}
              typeLabel={author.type_label}
              date={formatMentorPostTime(createdAt)}
            >
              <time dateTime={createdAt}>{formatAuthorMeta(author, createdAt)}</time>
            </MentorAuthorMeta>
          </Link>
        ) : (
          <p className="text-[11px] font-semibold text-muted">
            <MentorAuthorMeta
              authorId={author.role === "psicologo" ? author.id : undefined}
              community={community}
              badge={author.featured_badge}
              typeLabel={author.type_label}
              date={formatMentorPostTime(createdAt)}
            >
              <time dateTime={createdAt}>{formatAuthorMeta(author, createdAt)}</time>
            </MentorAuthorMeta>
          </p>
        )}
      </div>
    </div>
  );
};

export const SavedReplyMedia = ({
  footer,
  mediaType,
  mediaUrl,
  overlayAction,
  replyId,
  thumbnailUrl,
  title,
  videoOverlay,
}: {
  footer?: ReactNode;
  mediaType: string | null;
  mediaUrl: string | null;
  overlayAction?: CommunityMediaOverlayAction;
  replyId: string;
  thumbnailUrl?: string | null;
  title: string;
  videoOverlay?: ReactNode;
}) => {
  if (!mediaUrl) return null;

  return (
    <CommunityMediaBlock
      alt={title}
      analyticsTarget={
        mediaType === "video" ? { targetId: replyId, targetType: "reply" } : undefined
      }
      footer={footer}
      mediaType={mediaType}
      mediaUrl={mediaUrl}
      overlayAction={overlayAction}
      thumbnailUrl={thumbnailUrl}
      variant="reply"
      videoOverlay={videoOverlay}
    />
  );
};

export const SavedReplyCard = ({
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
  const currentUser = useAppSelector((state) => state.user);
  const { isDownloadingShareVideo, lectumDownloadDialog, openLectumDownloadDialog } =
    useLectumShareDownloadDialog();
  const reply = item.reply;
  const voteMutation = useVotePost(item.post.id);
  const interactionScope = `${currentUser?.id ?? "guest"}:${item.post.id}:${reply?.id ?? ""}`;
  const { snapshot: voteState, begin: beginVote } = useInteractionSnapshot(interactionScope, {
    currentVote: reply?.current_user_vote ?? null,
    downvotes: reply?.downvotes_count ?? 0,
    upvotes: reply?.upvotes_count ?? 0,
  });

  if (!reply) return null;

  const isProfessionalReply = reply.author.role === "psicologo";
  const showProfessionalVideoQuestion = Boolean(
    isProfessionalReply && reply.media_type === "video" && reply.media_url,
  );
  const showReplyContent = Boolean(reply.content.trim());

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

  const replyLink = savedReplyHref(item.post, reply.id);
  const replySocialTarget = canShowSocialVideoPreviewAction({
    author: reply.author,
    currentUser,
    mediaType: reply.media_type,
    mediaUrl: reply.media_url,
  })
    ? createLectumShareVideoDownloadTarget(item.post, reply, {
        parentContent: reply.parent_content,
        relativeUrl: replyLink,
      })
    : null;
  const replyOverlayAction = createSocialVideoPreviewOverlayAction({
    disabled: isDownloadingShareVideo,
    onOpen: openLectumDownloadDialog,
    target: replySocialTarget,
  });
  const hasProfessionalWhatsapp = Boolean(reply.author.whatsapp_url);
  const professionalWhatsappCta = hasProfessionalWhatsapp ? (
    <CommunityWhatsAppCta
      attached={Boolean(reply.media_url)}
      psychologist={toCommunityWhatsAppIdentity(reply.author)}
      stopPropagation
      trackingContext={{
        pageKind: "community_post",
        path: replyLink,
        targetId: reply.id,
        targetType: "post_reply",
      }}
    />
  ) : null;
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
      {isProfessionalReply && !showProfessionalVideoQuestion ? (
        <ProfileReplyQuestion content={item.post.content} title={item.post.title} />
      ) : null}

      <div className={cn(isProfessionalReply ? (showReplyContent ? "mb-2" : "mb-0") : "mb-3")}>
        <SavedReplyAuthorHeader
          community={item.post.community}
          author={reply.author}
          createdAt={reply.created_at}
        />
      </div>

      {showReplyContent ? (
        <div className="grid gap-2">
          <p className="whitespace-pre-line text-sm leading-6 text-foreground">{reply.content}</p>
        </div>
      ) : null}

      <div className={cn("grid gap-4", isProfessionalReply ? "mt-3" : "mt-4")}>
        <SavedReplyMedia
          footer={reply.media_url ? professionalWhatsappCta : undefined}
          mediaType={reply.media_type}
          mediaUrl={reply.media_url}
          overlayAction={replyOverlayAction}
          replyId={reply.id}
          thumbnailUrl={reply.thumbnail_url}
          title={reply.title ?? "Mídia da resposta salva"}
          videoOverlay={
            showProfessionalVideoQuestion ? (
              <ProfileReplyVideoQuestion title={item.post.title} />
            ) : undefined
          }
        />

        {reply.media_url ? null : professionalWhatsappCta}
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
      {lectumDownloadDialog}
    </article>
  );
};

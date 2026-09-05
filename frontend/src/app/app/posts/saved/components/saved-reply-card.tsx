"use client";

import { BadgeCheck, Reply } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useState,
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
import { MentorBadge } from "@/components/community/mentor-badge";
import {
  canShowSocialVideoPreviewAction,
  createSocialVideoPreviewOverlayAction,
} from "@/components/community/social-video-preview-action";
import { useAppSelector } from "@/hooks/redux";
import { useLectumShareDownloadDialog } from "@/hooks/use-lectum-share-download-dialog";
import { getCommunityInitials as getInitials } from "@/utils/community-display";
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
  author,
  createdAt,
}: {
  author: CommunityAuthor;
  createdAt: string;
}) => {
  const isPsychologist = author.role === "psicologo";
  const profileHref = isPsychologist ? `/psicologos/${author.id}` : undefined;

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
              <BadgeCheck
                className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                aria-hidden
              />
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

export const SavedReplyMedia = ({
  footer,
  mediaType,
  mediaUrl,
  overlayAction,
  replyId,
  thumbnailUrl,
  title,
}: {
  footer?: ReactNode;
  mediaType: string | null;
  mediaUrl: string | null;
  overlayAction?: CommunityMediaOverlayAction;
  replyId: string;
  thumbnailUrl?: string | null;
  title: string;
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
      <div className="mb-3 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-muted">
        <Reply className="h-3.5 w-3.5 shrink-0 text-muted/80" aria-hidden="true" />
        <span className="shrink-0">Respondido em</span>
        <Link
          className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-extrabold text-muted underline-offset-4 hover:text-primary hover:underline dark:text-muted md:no-underline md:hover:text-muted md:hover:no-underline dark:md:hover:text-muted"
          href={`/comunidades/${item.post.community.slug}`}
        >
          {item.post.community.name}
        </Link>
      </div>

      <div className="mb-3 h-px w-full bg-surface-muted dark:bg-border/70" aria-hidden="true" />

      <div className="mb-3">
        <SavedReplyAuthorHeader author={reply.author} createdAt={reply.created_at} />
      </div>

      <div className="grid gap-2">
        <p className="whitespace-pre-line text-sm leading-6 text-foreground">{reply.content}</p>
      </div>

      <div className="mt-4 grid gap-4">
        <SavedReplyMedia
          footer={reply.media_url ? professionalWhatsappCta : undefined}
          mediaType={reply.media_type}
          mediaUrl={reply.media_url}
          overlayAction={replyOverlayAction}
          replyId={reply.id}
          thumbnailUrl={reply.thumbnail_url}
          title={reply.title ?? "Mídia da resposta salva"}
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

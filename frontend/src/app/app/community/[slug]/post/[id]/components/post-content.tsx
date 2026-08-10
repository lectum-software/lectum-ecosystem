"use client";

import { ArrowLeft, BadgeCheck, FileText, Flag, MoreVertical, UserX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  type MouseEventHandler,
  type KeyboardEvent as ReactKeyboardEvent,
  useState,
} from "react";
import type { PostDetail, PostReply } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityFollowToggle } from "@/components/community/community-follow-toggle";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { InlineExpandableText } from "@/components/community/inline-expandable-text";
import { MentorBadge } from "@/components/community/mentor-badge";
import { PostMediaCarousel } from "@/components/community/post-media-carousel";
import { PostMutedBadge } from "@/components/community/post-muted-badge";
import { PostOwnerActionMenu } from "@/components/community/post-owner-action-menu";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  formatCommunityPostTime as formatPostTimeLabel,
  getCommunityAuthorDisplayName,
  getCommunityInitials as getInitials,
} from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { isReplyTreeInteractiveTarget } from "../modules/reply-support";

export const AuthorAvatar = ({
  anonymous,
  author,
  href,
  onProfileClick,
  size = "md",
}: {
  anonymous?: boolean;
  author: PostDetail["author"] | PostReply["author"];
  href?: string;
  onProfileClick?: MouseEventHandler<HTMLAnchorElement>;
  size?: "sm" | "md" | "reply";
}) => {
  const sizeClass = size === "sm" ? "h-8 w-8" : size === "reply" ? "h-9 w-9" : "h-10 w-10";
  const imageSize = size === "sm" ? "32px" : size === "reply" ? "36px" : "40px";

  if (anonymous) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-surface-muted text-subtle ring-2 ring-border dark:bg-surface-muted dark:text-muted dark:ring-border",
          sizeClass,
        )}
      >
        <UserX className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(author.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(author.avatar);
  const displayName = getCommunityAuthorDisplayName(author);

  const avatar = (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-media-foreground dark:ring-background",
        sizeClass,
      )}
    >
      {avatarSrc ? (
        <Image
          alt={displayName}
          className="object-cover"
          fill
          sizes={imageSize}
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(displayName)
      )}
    </span>
  );

  if (!href) return avatar;

  return (
    <Link
      aria-label={`Abrir perfil de ${displayName}`}
      className="shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      href={href}
      onClick={onProfileClick}
    >
      {avatar}
    </Link>
  );
};

export const PostHeader = ({
  onBack,
  onDeleted,
  onReport,
  post,
}: {
  onBack: () => void;
  onDeleted: () => void;
  onReport: () => void;
  post: PostDetail;
}) => {
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;
  const psychologistProfileHref = isPsychologistPost ? `/psicologos/${post.author.id}` : undefined;
  const authorDisplayName = getCommunityAuthorDisplayName(post.author);
  const currentUserId = useAppSelector((state) => state.user?.id);
  const isOwnPost = Boolean(currentUserId && post.author.id === currentUserId);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="grid gap-4 px-5 pt-4 pb-3">
      <div className="-mx-5 flex items-center justify-between gap-3 border-border border-b px-5 pb-3 dark:border-border">
        <Button
          aria-label="Voltar"
          className="h-10 w-10 rounded-full p-0"
          onClick={onBack}
          type="button"
          variant="ghost"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Voltar</span>
        </Button>
        <h1 className="text-base font-black text-foreground dark:text-foreground">Post</h1>
        {isOwnPost ? (
          <PostOwnerActionMenu onDeleted={onDeleted} post={post} />
        ) : (
          <div className="relative">
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Mais opções"
              className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface-muted"
              onClick={() => setMenuOpen((current) => !current)}
              type="button"
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>

            {menuOpen ? (
              <div
                className="absolute top-11 right-0 z-20 w-52 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 text-sm shadow-lectum-soft dark:border-border dark:bg-surface"
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
                  onClick={() => {
                    setMenuOpen(false);
                    onReport();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  Denunciar post
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-2 text-[11px] font-semibold text-muted">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="shrink-0">Postado em</span>
        <Link
          className="block min-w-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap font-bold text-muted no-underline hover:text-muted hover:no-underline dark:text-muted dark:hover:text-muted"
          href={`/comunidades/${post.community.slug}`}
        >
          {post.community.name}
        </Link>
        <CommunityFollowToggle
          className="ml-1"
          initialFollowing={Boolean(post.community.following)}
          slug={post.community.slug}
        />
        {post.muted_by_current_user ? <PostMutedBadge className="ml-1" /> : null}
      </div>

      <div className="flex items-start gap-3">
        <AuthorAvatar
          anonymous={isAnonymousPatient}
          author={post.author}
          href={psychologistProfileHref}
        />
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex min-w-0 items-center gap-x-2">
            <div className="flex min-w-0 items-center gap-[5px]">
              {psychologistProfileHref ? (
                <Link
                  className="truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                  href={psychologistProfileHref}
                >
                  {authorDisplayName}
                </Link>
              ) : (
                <h2 className="truncate text-sm font-black text-foreground">{authorDisplayName}</h2>
              )}
              {post.author.verified ? (
                <BadgeCheck
                  className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <MentorBadge
              badge={post.author.featured_badge ?? post.featured_badge}
              href={psychologistProfileHref}
            />
          </div>
          {psychologistProfileHref ? (
            <Link
              className="w-fit text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
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
      </div>
    </header>
  );
};

export const PostBody = ({ post }: { post: PostDetail }) => {
  const [contentExpanded, setContentExpanded] = useState(false);
  const showAuthorWhatsapp = post.author.role === "psicologo" && Boolean(post.author.whatsapp_url);
  const postImageMediaItems = (post.media_items ?? []).filter(
    (item) => item.media_type === "image",
  );
  const singlePostMediaItem = postImageMediaItems.length === 1 ? postImageMediaItems[0] : null;
  const displayMediaType = singlePostMediaItem?.media_type ?? post.media_type;
  const displayMediaUrl = singlePostMediaItem?.media_url ?? post.media_url;
  const displayThumbnailUrl = singlePostMediaItem?.thumbnail_url ?? post.thumbnail_url;
  const shouldShowPostCarousel = postImageMediaItems.length > 1;
  const authorWhatsappCta = showAuthorWhatsapp ? (
    <CommunityWhatsAppCta
      attached={Boolean(shouldShowPostCarousel || displayMediaUrl)}
      psychologist={toCommunityWhatsAppIdentity(post.author)}
      stopPropagation
      trackingContext={{
        pageKind: "community_post",
        path: `/comunidades/${post.community.slug}/publicacao/${post.id}`,
        targetId: post.id,
        targetType: "community_post",
      }}
    />
  ) : null;

  return (
    <div className="grid gap-3 px-5 py-4">
      <h2 className="text-[1.45rem] font-black leading-[1.16] tracking-[-0.03em] text-foreground dark:text-foreground">
        {post.title}
      </h2>
      <InlineExpandableText
        className="text-sm leading-6 text-muted dark:text-muted"
        expanded={contentExpanded}
        maxLines={4}
        onToggle={() => setContentExpanded((current) => !current)}
        text={post.content}
      />
      {shouldShowPostCarousel ? (
        <PostMediaCarousel
          alt={post.title}
          footer={authorWhatsappCta}
          frameVariant="detail"
          items={postImageMediaItems}
        />
      ) : (
        <CommunityMediaBlock
          alt={post.title}
          analyticsTarget={
            displayMediaType === "video" ? { targetId: post.id, targetType: "post" } : undefined
          }
          className="mt-3"
          footer={authorWhatsappCta && displayMediaUrl ? authorWhatsappCta : undefined}
          mediaType={displayMediaType}
          mediaUrl={displayMediaUrl}
          thumbnailUrl={displayThumbnailUrl}
          variant="detail"
        />
      )}
      {shouldShowPostCarousel || displayMediaUrl ? null : authorWhatsappCta}
    </div>
  );
};

export const ThreadOriginalPostCard = ({ post }: { post: PostDetail }) => {
  const router = useRouter();
  const [contentExpanded, setContentExpanded] = useState(false);
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;
  const psychologistProfileHref = isPsychologistPost ? `/psicologos/${post.author.id}` : undefined;
  const authorDisplayName = getCommunityAuthorDisplayName(post.author);
  const postHref = `/comunidades/${post.community.slug}/publicacao/${post.id}`;
  const postImageMediaItems = (post.media_items ?? []).filter(
    (item) => item.media_type === "image",
  );
  const singlePostMediaItem = postImageMediaItems.length === 1 ? postImageMediaItems[0] : null;
  const displayMediaType = singlePostMediaItem?.media_type ?? post.media_type;
  const displayMediaUrl = singlePostMediaItem?.media_url ?? post.media_url;
  const displayThumbnailUrl = singlePostMediaItem?.thumbnail_url ?? post.thumbnail_url;
  const shouldShowPostCarousel = postImageMediaItems.length > 1;
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isReplyTreeInteractiveTarget(event.target, event.currentTarget)
    ) {
      return;
    }

    router.push(postHref);
  };
  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || isReplyTreeInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    router.push(postHref);
  };

  return (
    <article
      className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-lectum-soft transition hover:border-primary/20 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 dark:border-border dark:bg-surface dark:hover:bg-surface md:cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={-1}
    >
      <div className="flex min-w-0 items-center gap-1.5 border-border border-b px-4 py-3 text-[11px] font-semibold text-muted dark:border-border">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="shrink-0">Post original</span>
        <span aria-hidden="true">•</span>
        <Link
          className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold text-muted no-underline hover:text-muted hover:no-underline dark:text-muted dark:hover:text-muted"
          href={`/comunidades/${post.community.slug}`}
        >
          {post.community.name}
        </Link>
      </div>

      <div className="grid gap-3 p-4">
        <div className="flex items-start gap-3">
          <AuthorAvatar
            anonymous={isAnonymousPatient}
            author={post.author}
            href={psychologistProfileHref}
            size="sm"
          />
          <div className="grid min-w-0 flex-1 gap-1">
            <div className="flex min-w-0 items-center gap-x-2">
              <div className="flex min-w-0 items-center gap-[5px]">
                {psychologistProfileHref ? (
                  <Link
                    className="truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                    href={psychologistProfileHref}
                  >
                    {authorDisplayName}
                  </Link>
                ) : (
                  <h2 className="truncate text-sm font-black text-foreground">
                    {authorDisplayName}
                  </h2>
                )}
                {post.author.verified ? (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <MentorBadge
                badge={post.author.featured_badge ?? post.featured_badge}
                href={psychologistProfileHref}
              />
            </div>
            <p className="text-[11px] font-semibold text-muted">
              {isPsychologistPost && post.author.type_label ? `${post.author.type_label} • ` : ""}
              {formatPostTimeLabel(post.created_at, post.edited_at)}
            </p>
          </div>
        </div>

        <h2 className="line-clamp-2 text-[1.1rem] font-black leading-[1.18] tracking-[-0.03em] text-foreground dark:text-foreground">
          {post.title}
        </h2>
        <InlineExpandableText
          className="text-sm leading-6 text-muted dark:text-muted"
          expanded={contentExpanded}
          maxLines={4}
          onToggle={() => setContentExpanded((current) => !current)}
          text={post.content}
        />
        {shouldShowPostCarousel ? (
          <PostMediaCarousel
            alt={post.title}
            frameVariant="reply"
            items={postImageMediaItems}
            roundedClassName="rounded-[18px]"
          />
        ) : (
          <CommunityMediaBlock
            alt={post.title}
            analyticsTarget={
              displayMediaType === "video" ? { targetId: post.id, targetType: "post" } : undefined
            }
            className="mt-3"
            mediaType={displayMediaType}
            mediaUrl={displayMediaUrl}
            roundedClassName="rounded-[18px]"
            thumbnailUrl={displayThumbnailUrl}
            variant="reply"
          />
        )}
      </div>
    </article>
  );
};

export const PostVoteBar = ({
  currentVote,
  disabled,
  onFocusCommentComposer,
  replyTipTarget,
  onShare,
  onToggleSave,
  onVote,
  post,
}: {
  currentVote: 1 | -1 | null;
  disabled?: boolean;
  onFocusCommentComposer: () => void;
  replyTipTarget?: string;
  onShare: () => void;
  onToggleSave: () => void;
  onVote: (value: 1 | -1) => void;
  post: PostDetail;
}) => (
  <CommunityActionBar
    className="border-border border-t px-4 py-2.5 dark:border-border sm:py-3"
    comments={{
      count: post.replies_count,
      label: "Comentar no post",
      onClick: onFocusCommentComposer,
      tipTarget: replyTipTarget,
    }}
    currentVote={currentVote}
    disabled={disabled}
    onVote={onVote}
    save={{
      active: post.saved,
      count: post.saves_count,
      disabled,
      label: post.saved ? "Remover dos salvos" : "Salvar post",
      onClick: onToggleSave,
    }}
    share={{
      label: `Compartilhar ${post.title}`,
      onClick: onShare,
    }}
    upvotesCount={post.upvotes_count}
  />
);

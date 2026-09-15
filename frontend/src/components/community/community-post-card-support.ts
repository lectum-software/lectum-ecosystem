import type { MouseEventHandler, ReactNode } from "react";
import type { PostListPost } from "@/api/generator/types/posts";

export type CommunityPostCardProps = {
  actionBarShowUpvoteText?: boolean;
  actionBarVoteLabel?: string;
  actionBarVotePresentation?: "cluster" | "inline";
  communityContextTone?: "default" | "muted";
  communityHeaderIncludesTime?: boolean;
  hoverTone?: "primary" | "neutral";
  desktopPlainLinks?: boolean;
  footerExtra?: ReactNode;
  headerExtra?: ReactNode;
  interactiveActions?: boolean;
  onShare: (post: PostListPost) => void;
  openPostOnCardClick?: boolean;
  post: PostListPost;
  presentation?: "default" | "feed";
  profilePublicationMode?: boolean;
  saveActionOverride?: {
    active?: boolean;
    count?: number;
    disabled?: boolean;
    label?: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  };
  showAuthorHeader?: boolean;
  showCommunityHeader?: boolean;
  showHighlightedProfessionalReply?: boolean;
  showProfessionalEngagementCounters?: boolean;
  showWhatsappCta?: boolean;
  statusBadge?: ReactNode;
};

export type ProfileContributionPost = PostListPost & {
  contribution_type?: "post" | "reply";
};

export type PostWithOptionalSortMetrics = PostListPost & {
  sort_metrics?: {
    shares_count?: number | null;
  };
};

export const postDetailHref = (post: PostListPost, focusReplyId?: string) => {
  const baseHref = `/comunidades/${post.community.slug}/publicacao/${post.id}`;

  if (!focusReplyId) return baseHref;

  return `${baseHref}?focusReplyId=${encodeURIComponent(focusReplyId)}#reply-${focusReplyId}`;
};

export const isPostCardInteractiveTarget = (target: EventTarget | null) => {
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

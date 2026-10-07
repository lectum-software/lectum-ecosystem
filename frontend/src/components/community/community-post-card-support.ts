import type { KeyboardEvent, MouseEvent, MouseEventHandler, ReactNode } from "react";
import type { PostListPost, PostProfessionalReply } from "@/api/generator/types/posts";

export const publicationInteractionData = (
  post: PostListPost,
  reply?: PostProfessionalReply | null,
) => {
  const target = reply ?? post;
  return {
    currentVote: target.current_user_vote ?? null,
    downvotes: target.downvotes_count ?? 0,
    upvotes: target.upvotes_count,
    saved: target.saved,
    saves: target.saves_count ?? 0,
    comments: target.replies_count ?? 0,
  };
};

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
        "dialog",
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

export const createPostCardNavigation = (enabled: boolean, navigate: () => void) => ({
  handleCardClick(event: MouseEvent<HTMLElement>) {
    if (
      !enabled ||
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
    navigate();
  },
  handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!enabled || event.defaultPrevented || isPostCardInteractiveTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navigate();
  },
});

"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  ChevronDown,
  ChevronUp,
  FileText,
  Flag,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Send,
  Share2,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type MouseEventHandler,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount } from "@/api/callers/account";
import {
  useCreatePostReply,
  useDeleteReply,
  usePostDetail,
  usePostReplies,
  usePostRepliesPages,
  usePostReplyThread,
  useReportPost,
  useReportReply,
  useSavePost,
  useSaveReply,
  useSharePost,
  useShareReply,
  useUploadPostReplyMedia,
  useVotePost,
} from "@/api/callers/posts";
import type { PostDetail, PostReply } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityFollowToggle } from "@/components/community/community-follow-toggle";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { MentorBadge } from "@/components/community/mentor-badge";
import { PostMediaCarousel } from "@/components/community/post-media-carousel";
import { PostMutedBadge } from "@/components/community/post-muted-badge";
import { PostOwnerActionMenu } from "@/components/community/post-owner-action-menu";
import { ReplyEditModal } from "@/components/community/reply-edit-modal";
import {
  detectReplyMediaOrientation,
  mediaTypeFromFile,
  ReplyMediaAttachmentControl,
  type SelectedReplyMedia,
} from "@/components/community/reply-media-attachment-control";
import { components } from "@/components/controllers";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { ActionableCoachMark } from "@/components/onboarding/actionable-coach-mark";
import { LectumShareVideoModal } from "@/components/share/lectum-share-video-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";
import {
  createLectumShareLinkTarget,
  createLectumSharePostMediaTarget,
  createLectumShareVideoTarget,
  findPostReplyInTree,
  type LectumShareChannel,
  type LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { navigateBackWithFallback } from "@/utils/navigation-history";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import {
  type PostReportForm,
  type ReplyComposerForm,
  toCreatePostReplyPayload,
  toPostReportPayload,
  usePostReportForm,
  useReplyComposerForm,
} from "./use-form";

const REPLIES_LIMIT = 8;
const MAX_REPLY_TREE_DEPTH = 4;

const createReplyPageRange = (page: number) =>
  Array.from({ length: Math.max(1, page) }, (_, index) => index + 1);

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type ReplyTarget = {
  id: string;
  name: string;
} | null;

type ReplyTargetItem = NonNullable<ReplyTarget>;
type ReplyTargetMap = Record<string, ReplyTargetItem>;
const EMPTY_REPLY_TARGETS: ReplyTargetMap = {};

type ReportTarget = { type: "post" } | { reply: PostReply; type: "reply" } | null;

type ReplyMediaPermission = {
  canAttach: boolean;
  reason: string;
  showControl: boolean;
};

const DETAIL_INLINE_TEXT_MAX_LINES = 4;
const DETAIL_INLINE_TEXT_MORE_LABEL = "... ver mais";
const DETAIL_INLINE_TEXT_LESS_LABEL = "ver menos";
const COMMENT_GUIDANCE_MESSAGE = "Comente com respeito e empatia, mesmo quando discordar.";
const POST_DETAIL_MOBILE_QUERY = "(max-width: 639px)";
const POST_REPLY_CANCEL_DRAG_THRESHOLD = 56;
const PSYCHOLOGIST_COMMUNITY_REPLY_TIP_SELECTOR =
  '[data-psychologist-tip-target="community-reply"]';
const FOCUSED_REPLY_HIGHLIGHT_CLASSES = ["lectum-reply-focus-pulse"] as const;
const FOCUSED_REPLY_HIGHLIGHT_DURATION_MS = 3200;
const FOCUSED_REPLY_RETRY_ATTEMPTS = 30;
const REPLY_DRAFT_DISCARD_CONFIRMATION = "Você tem uma resposta em rascunho. Deseja descartá-la?";

const confirmDiscardReplyDraft = () =>
  typeof window === "undefined" || window.confirm(REPLY_DRAFT_DISCARD_CONFIRMATION);

const useIsPostDetailMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(POST_DETAIL_MOBILE_QUERY);
    const updateMatch = () => setIsMobile(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);

    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, []);

  return isMobile;
};

const InlineExpandableText = ({
  className,
  expanded,
  onToggle,
  text,
}: {
  className?: string;
  expanded: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  text: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [preview, setPreview] = useState(text);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const containerNode = containerRef.current;
    const measureNode = measureRef.current;

    if (!containerNode || !measureNode) return;

    let animationFrame = 0;
    let cancelled = false;

    const lineHeightPx = () => {
      const styles = window.getComputedStyle(measureNode);
      const parsedLineHeight = Number.parseFloat(styles.lineHeight);

      if (Number.isFinite(parsedLineHeight)) return parsedLineHeight;

      const parsedFontSize = Number.parseFloat(styles.fontSize);
      return Number.isFinite(parsedFontSize) ? parsedFontSize * 1.5 : 24;
    };

    const fitsWithinMaxLines = (value: string) => {
      measureNode.textContent = value;

      return measureNode.scrollHeight <= lineHeightPx() * DETAIL_INLINE_TEXT_MAX_LINES + 1;
    };

    const measure = () => {
      if (cancelled) return;

      const availableWidth = containerNode.getBoundingClientRect().width;
      const normalizedText = text.trimEnd();

      if (availableWidth <= 0 || normalizedText.length === 0) {
        setPreview(text);
        setTruncated(false);
        return;
      }

      measureNode.style.width = `${availableWidth}px`;

      if (fitsWithinMaxLines(normalizedText)) {
        setPreview(text);
        setTruncated(false);
        return;
      }

      let low = 0;
      let high = normalizedText.length;
      let bestPreview = "";

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const candidatePreview = normalizedText.slice(0, middle).trimEnd();
        const candidate = `${candidatePreview} ${DETAIL_INLINE_TEXT_MORE_LABEL}`;

        if (fitsWithinMaxLines(candidate)) {
          bestPreview = candidatePreview;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      setPreview(bestPreview || normalizedText.slice(0, 1));
      setTruncated(true);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(containerNode);

    if ("fonts" in document) {
      void document.fonts.ready.then(scheduleMeasure);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [text]);

  return (
    <div className="relative min-w-0 max-w-full" ref={containerRef}>
      <p className={cn("whitespace-pre-line", className)}>
        {expanded || !truncated ? text : preview}
        {truncated ? (
          <>
            {" "}
            <button
              className="pointer-events-auto inline cursor-pointer rounded-none border-0 bg-transparent p-0 align-baseline font-[inherit] text-[#64748B]/80 [font-size:inherit] [line-height:inherit] dark:text-muted/80"
              onClick={onToggle}
              type="button"
            >
              {expanded ? DETAIL_INLINE_TEXT_LESS_LABEL : DETAIL_INLINE_TEXT_MORE_LABEL}
            </button>
          </>
        ) : null}
      </p>
      <p
        aria-hidden="true"
        className={cn(
          "pointer-events-none invisible absolute inset-x-0 top-0 whitespace-pre-line",
          className,
        )}
        ref={measureRef}
      />
    </div>
  );
};

const useReplyMediaPermission = (): ReplyMediaPermission => {
  const user = useAppSelector((state) => state.user);
  return getCommunityMediaPermission(user);
};

const useReplyFocusHighlight = (replyId?: string | null, pending = false) => {
  const lastFocusedReplyIdRef = useRef<string | null>(null);

  const resetReplyFocusHighlight = useCallback(() => {
    lastFocusedReplyIdRef.current = null;
  }, []);

  useEffect(() => {
    if (!replyId || pending) return;
    if (lastFocusedReplyIdRef.current === replyId) return;

    let retryTimer: number | null = null;
    let highlightTimer: number | null = null;
    let highlightedTarget: HTMLElement | null = null;
    let previousTargetTabIndex: string | null = null;
    let attempts = 0;

    const focusReply = () => {
      const target = document.getElementById(`reply-${replyId}`);
      if (!target) {
        if (attempts < FOCUSED_REPLY_RETRY_ATTEMPTS) {
          attempts += 1;
          retryTimer = window.setTimeout(focusReply, 100);
        }
        return;
      }

      lastFocusedReplyIdRef.current = replyId;
      highlightedTarget = target;
      previousTargetTabIndex = target.getAttribute("tabindex");
      if (previousTargetTabIndex === null) {
        target.setAttribute("tabindex", "-1");
      }
      target.classList.remove(...FOCUSED_REPLY_HIGHLIGHT_CLASSES);
      void target.offsetWidth;
      target.classList.add(...FOCUSED_REPLY_HIGHLIGHT_CLASSES);
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: "smooth", block: "center" });

      highlightTimer = window.setTimeout(() => {
        target.classList.remove(...FOCUSED_REPLY_HIGHLIGHT_CLASSES);
        if (previousTargetTabIndex === null) {
          target.removeAttribute("tabindex");
        } else {
          target.setAttribute("tabindex", previousTargetTabIndex);
        }
        highlightedTarget = null;
      }, FOCUSED_REPLY_HIGHLIGHT_DURATION_MS);
    };

    focusReply();

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      if (highlightTimer) window.clearTimeout(highlightTimer);
      if (highlightedTarget) {
        highlightedTarget.classList.remove(...FOCUSED_REPLY_HIGHLIGHT_CLASSES);
        if (previousTargetTabIndex === null) {
          highlightedTarget.removeAttribute("tabindex");
        } else {
          highlightedTarget.setAttribute("tabindex", previousTargetTabIndex);
        }
      }
    };
  }, [pending, replyId]);

  return resetReplyFocusHighlight;
};

const resolvePostError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Este post não foi encontrado ou não está mais disponível.";
  }

  if (normalized.includes("sess") || normalized.includes("token")) {
    return "Sua sessão precisa estar ativa para visualizar a discussão.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar este post agora.";
};

const resolveReplyError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");

  return rawMessage || "Não foi possível publicar sua resposta agora.";
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const minutes = Math.floor(diffInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} h`;
  if (days < 7) return `há ${days} d`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const formatPostTimeLabel = (createdAt: string, editedAt?: string | null) => {
  const relativeTime = formatRelativeTime(createdAt);

  return editedAt ? `${relativeTime} · editado` : relativeTime;
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getCommunityAuthorDisplayName = (
  author: Pick<PostDetail["author"] | PostReply["author"], "name" | "role">,
) =>
  author.role === "psicologo"
    ? normalizeProfessionalDisplayName(author.name) || author.name
    : author.name;

const isVerifiedProfessionalReply = (reply: PostReply) =>
  reply.author.role === "psicologo" && reply.author.verified;

const formatReplyAuthorMeta = (
  author: PostReply["author"],
  createdAt: string,
  editedAt?: string | null,
  isPostAuthor = false,
) => {
  const relativeTime = formatRelativeTime(createdAt);
  const timeLabel = editedAt ? `${relativeTime} · editado` : relativeTime;

  if (isPostAuthor) return `Autor · ${timeLabel}`;
  if (author.role !== "psicologo") return timeLabel;

  return `${author.type_label} • ${timeLabel}`;
};

const mentorBadgePosition = (badge?: string | null) => {
  const match = badge?.match(/#(\d+)/);
  if (!match?.[1]) return Number.POSITIVE_INFINITY;

  return Number(match[1]);
};

const newestReplyFirst = (a: PostReply, b: PostReply) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const REPLY_DOWNVOTE_RANKING_WEIGHT = 0.6;

const replyVoteRankingScore = (reply: PostReply) =>
  reply.upvotes_count - reply.downvotes_count * REPLY_DOWNVOTE_RANKING_WEIGHT;

const compareReplySiblingsByRelevance = (a: PostReply, b: PostReply) => {
  const voteScoreDiff = replyVoteRankingScore(b) - replyVoteRankingScore(a);
  if (voteScoreDiff !== 0) return voteScoreDiff;

  const aBadgePosition = mentorBadgePosition(a.author.featured_badge);
  const bBadgePosition = mentorBadgePosition(b.author.featured_badge);
  const hasBadgeTieBreaker = Number.isFinite(aBadgePosition) || Number.isFinite(bBadgePosition);

  if (hasBadgeTieBreaker && aBadgePosition !== bBadgePosition) {
    return aBadgePosition - bBadgePosition;
  }

  const recencyDiff = newestReplyFirst(a, b);
  if (recencyDiff !== 0) return recencyDiff;

  return b.id.localeCompare(a.id);
};

const compareProfessionalReplies = (a: PostReply, b: PostReply) => {
  return compareReplySiblingsByRelevance(a, b);
};

const orderReplyChildrenByRelevance = (replies: PostReply[]): PostReply[] => {
  return replies
    .map((reply) => ({
      ...reply,
      replies: orderReplyChildrenByRelevance(reply.replies),
    }))
    .sort(compareReplySiblingsByRelevance);
};

const orderRepliesForProfessionalPriority = (replies: PostReply[]): PostReply[] => {
  const withOrderedChildren = replies.map((reply) => ({
    ...reply,
    replies: orderReplyChildrenByRelevance(reply.replies),
  }));
  const pinnedProfessional = [...withOrderedChildren]
    .filter(isVerifiedProfessionalReply)
    .sort(compareProfessionalReplies)[0];
  const remainingReplies = withOrderedChildren
    .filter((reply) => reply.id !== pinnedProfessional?.id)
    .sort(compareReplySiblingsByRelevance);

  return pinnedProfessional ? [pinnedProfessional, ...remainingReplies] : remainingReplies;
};

const countReplyTreeDescendants = (reply: PostReply): number => {
  const loadedDescendants = reply.replies.reduce(
    (total, child) => total + 1 + countReplyTreeDescendants(child),
    0,
  );
  const expectedDirectReplies = reply.replies_count ?? reply.replies.length;
  const notHydratedDirectReplies = Math.max(0, expectedDirectReplies - reply.replies.length);

  return loadedDescendants + notHydratedDirectReplies;
};

const findReplyInTree = (replies: PostReply[], replyId: string): PostReply | null => {
  for (const reply of replies) {
    if (reply.id === replyId) return reply;

    const child = findReplyInTree(reply.replies, replyId);
    if (child) return child;
  }

  return null;
};

const isReplyTreeInteractiveTarget = (target: EventTarget | null, currentTarget: HTMLElement) => {
  const targetElement =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

  if (!targetElement) return false;

  const closestInteractiveTarget = targetElement.closest(
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
  );

  return Boolean(closestInteractiveTarget && closestInteractiveTarget !== currentTarget);
};

const stopReplyTreeCollapsePropagation: MouseEventHandler<HTMLElement> = (event) => {
  event.stopPropagation();
};

const AuthorAvatar = ({
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
          "grid shrink-0 place-items-center rounded-full bg-[#F1F5F9] text-[#94A3B8] ring-2 ring-[#E2E8F0] dark:bg-surface-muted dark:text-muted dark:ring-border",
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
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-white dark:ring-background",
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

const PostHeader = ({
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
  const psychologistProfileHref = isPsychologistPost
    ? `/psychologists/${post.author.id}`
    : undefined;
  const authorDisplayName = getCommunityAuthorDisplayName(post.author);
  const currentUserId = useAppSelector((state) => state.user?.id);
  const isOwnPost = Boolean(currentUserId && post.author.id === currentUserId);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="grid gap-4 px-5 pt-4 pb-3">
      <div className="-mx-5 flex items-center justify-between gap-3 border-[#EDF1F5] border-b px-5 pb-3 dark:border-border">
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
        <h1 className="text-base font-black text-[#182033] dark:text-foreground">Post</h1>
        {isOwnPost ? (
          <PostOwnerActionMenu onDeleted={onDeleted} post={post} />
        ) : (
          <div className="relative">
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Mais opções"
              className="grid h-10 w-10 place-items-center rounded-full text-[#64748B] transition hover:bg-surface-muted"
              onClick={() => setMenuOpen((current) => !current)}
              type="button"
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>

            {menuOpen ? (
              <div
                className="absolute top-11 right-0 z-20 w-52 overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white p-1.5 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-border dark:bg-surface"
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#182033] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
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
          className="block min-w-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap font-bold text-[#64748B] no-underline hover:text-[#64748B] hover:no-underline dark:text-muted dark:hover:text-muted"
          href={`/community/${post.community.slug}`}
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
                  className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
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

const PostBody = ({ post }: { post: PostDetail }) => {
  const [contentExpanded, setContentExpanded] = useState(false);
  const showAuthorWhatsapp = post.author.role === "psicologo" && Boolean(post.author.whatsapp_url);
  const postImageMediaItems = (post.media_items ?? []).filter(
    (item) => item.media_type === "image",
  );
  const singlePostMediaItem = postImageMediaItems.length === 1 ? postImageMediaItems[0] : null;
  const displayMediaType = singlePostMediaItem?.media_type ?? post.media_type;
  const displayMediaUrl = singlePostMediaItem?.media_url ?? post.media_url;
  const shouldShowPostCarousel = postImageMediaItems.length > 1;
  const authorWhatsappCta = showAuthorWhatsapp ? (
    <CommunityWhatsAppCta
      attached={Boolean(shouldShowPostCarousel || displayMediaUrl)}
      psychologist={toCommunityWhatsAppIdentity(post.author)}
      stopPropagation
    />
  ) : null;

  return (
    <div className="grid gap-3 px-5 py-4">
      <h2 className="text-[1.45rem] font-black leading-[1.16] tracking-[-0.03em] text-[#182033] dark:text-foreground">
        {post.title}
      </h2>
      <InlineExpandableText
        className="text-sm leading-6 text-[#475569] dark:text-muted"
        expanded={contentExpanded}
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
          className="mt-3"
          footer={authorWhatsappCta && displayMediaUrl ? authorWhatsappCta : undefined}
          mediaType={displayMediaType}
          mediaUrl={displayMediaUrl}
          variant="detail"
        />
      )}
      {shouldShowPostCarousel || displayMediaUrl ? null : authorWhatsappCta}
    </div>
  );
};

const ThreadOriginalPostCard = ({ post }: { post: PostDetail }) => {
  const router = useRouter();
  const [contentExpanded, setContentExpanded] = useState(false);
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;
  const psychologistProfileHref = isPsychologistPost
    ? `/psychologists/${post.author.id}`
    : undefined;
  const authorDisplayName = getCommunityAuthorDisplayName(post.author);
  const postHref = `/community/${post.community.slug}/post/${post.id}`;
  const postImageMediaItems = (post.media_items ?? []).filter(
    (item) => item.media_type === "image",
  );
  const singlePostMediaItem = postImageMediaItems.length === 1 ? postImageMediaItems[0] : null;
  const displayMediaType = singlePostMediaItem?.media_type ?? post.media_type;
  const displayMediaUrl = singlePostMediaItem?.media_url ?? post.media_url;
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
      className="overflow-hidden rounded-[24px] border border-[#EDF1F5] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition hover:border-primary/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 dark:border-border dark:bg-surface dark:hover:bg-surface md:cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={-1}
    >
      <div className="flex min-w-0 items-center gap-1.5 border-[#EDF1F5] border-b px-4 py-3 text-[11px] font-semibold text-muted dark:border-border">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="shrink-0">Post original</span>
        <span aria-hidden="true">•</span>
        <Link
          className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold text-[#64748B] no-underline hover:text-[#64748B] hover:no-underline dark:text-muted dark:hover:text-muted"
          href={`/community/${post.community.slug}`}
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
                    className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
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

        <h2 className="line-clamp-2 text-[1.1rem] font-black leading-[1.18] tracking-[-0.03em] text-[#182033] dark:text-foreground">
          {post.title}
        </h2>
        <InlineExpandableText
          className="text-sm leading-6 text-[#475569] dark:text-muted"
          expanded={contentExpanded}
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
            className="mt-3"
            mediaType={displayMediaType}
            mediaUrl={displayMediaUrl}
            roundedClassName="rounded-[18px]"
            variant="reply"
          />
        )}
      </div>
    </article>
  );
};

const PostVoteBar = ({
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
    className="border-[#EDF1F5] border-t px-4 py-2.5 dark:border-border sm:py-3"
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

type ReplyOverflowMenuProps = {
  deletePending?: boolean;
  isOwnReply: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
  onShare: () => void;
  onToggleSave: MouseEventHandler<HTMLButtonElement>;
  reply: PostReply;
  savePending?: boolean;
};

const ReplyOverflowMenu = ({
  deletePending,
  isOwnReply,
  onDelete,
  onEdit,
  onReport,
  onShare,
  onToggleSave,
  reply,
  savePending,
}: ReplyOverflowMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative shrink-0" data-comment-collapse-ignore="true">
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Mais ações da resposta"
        className="grid h-7 w-7 place-items-center rounded-full text-[#64748B] transition hover:bg-surface-muted hover:text-[#182033] active:scale-[0.97] dark:text-muted dark:hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((current) => !current);
        }}
        type="button"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 bottom-8 z-[120] w-56 overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white p-1.5 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-border dark:bg-surface"
          role="menu"
        >
          {isOwnReply ? (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#182033] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                onEdit();
              }}
              role="menuitem"
              type="button"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </button>
          ) : null}

          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#182033] disabled:cursor-not-allowed disabled:opacity-60 dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
            disabled={savePending}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
              onToggleSave(event);
            }}
            role="menuitem"
            type="button"
          >
            <Bookmark
              className={cn("h-4 w-4", reply.saved && "fill-current text-primary")}
              aria-hidden="true"
            />
            {reply.saved ? "Remover dos salvos" : "Salvar"}
          </button>

          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#182033] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
              onShare();
            }}
            role="menuitem"
            type="button"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartilhar
          </button>

          {isOwnReply ? (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-danger transition hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deletePending}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
              role="menuitem"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Excluir
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#182033] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                onReport();
              }}
              role="menuitem"
              type="button"
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
              Denunciar
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

const ReplyVoteBar = ({
  currentVote,
  deletePending,
  disabled,
  isOwnReply,
  onDelete,
  onEdit,
  onReply,
  onReport,
  onShare,
  onToggleSave,
  onVote,
  reply,
  savePending,
}: {
  currentVote: 1 | -1 | null;
  deletePending?: boolean;
  disabled?: boolean;
  isOwnReply: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onReply: () => void;
  onReport: () => void;
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
      className="mt-2 sm:mt-3"
      currentVote={currentVote}
      disabled={disabled}
      onVote={onVote}
      reply={{
        label: "Responder",
        onClick: onReply,
        textOnly: true,
      }}
      endSlot={
        <ReplyOverflowMenu
          deletePending={deletePending}
          isOwnReply={isOwnReply}
          onDelete={onDelete}
          onEdit={onEdit}
          onReport={onReport}
          onShare={handleShare}
          onToggleSave={handleToggleSave}
          reply={reply}
          savePending={savePending}
        />
      }
      endSlotAlignment="inline"
      showUpvoteText={false}
      size="xs"
      upvotesCount={reply.upvotes_count}
      voteLabel="Marcar resposta como útil"
      votePresentation="inline"
    />
  );
};

const ReplyCard = ({
  activeInlineReplyFormRef,
  currentUserId,
  deleteReplyPending,
  depth = 0,
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
  professionalThread,
  reply,
  replyApiError,
  replyDisabled,
  threadHrefBase,
  votePending,
}: {
  activeInlineReplyFormRef?: RefObject<HTMLFormElement | null>;
  currentUserId?: string | null;
  deleteReplyPending?: boolean;
  depth?: number;
  inlineReplyTargets: ReplyTargetMap;
  mediaPermission: ReplyMediaPermission;
  onCancelInlineReplyTarget: (replyId: string) => void;
  onInlineReplyDraftChange?: (hasDraft: boolean) => void;
  onDeleteReply: (reply: PostReply) => void;
  onReply: (reply: PostReply) => void;
  onReportReply: (reply: PostReply) => void;
  onShare: (reply: PostReply) => void;
  onSubmitReply: (
    values: ReplyComposerForm,
    parentReplyId: string,
    mediaFile?: File | null,
  ) => Promise<void> | void;
  focusReplyId?: string | null;
  maxInlineDepth?: number;
  onVote: (replyId: string, value: 1 | -1) => void;
  postId: string;
  professionalThread?: boolean;
  reply: PostReply;
  replyApiError?: string | null;
  replyDisabled?: boolean;
  threadHrefBase?: string;
  votePending?: boolean;
}) => {
  const isProfessional = reply.author.role === "psicologo";
  const isVerifiedProfessional = isProfessional && reply.author.verified;
  const authorDisplayName = getCommunityAuthorDisplayName(reply.author);
  const isOwnReply = Boolean(currentUserId && reply.author.id === currentUserId);
  const highlightedProfessionalThread = professionalThread ?? isVerifiedProfessional;
  const saveReplyMutation = useSaveReply(postId, reply.id);
  const conversion = useProgressiveConversion();
  const psychologistProfileHref = isProfessional ? `/psychologists/${reply.author.id}` : null;
  const inlineReplyTarget = inlineReplyTargets[reply.id] ?? null;
  const isReplyComposerOpen = Boolean(inlineReplyTarget);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const visualMaxDepth =
    maxInlineDepth < 0 ? MAX_REPLY_TREE_DEPTH : Math.min(maxInlineDepth, MAX_REPLY_TREE_DEPTH);
  const totalRepliesCount = reply.replies_count ?? reply.replies.length;
  const hasFocusedDescendant = Boolean(
    focusReplyId && focusReplyId !== reply.id && findReplyInTree(reply.replies, focusReplyId),
  );
  const canRenderChildren = depth < visualMaxDepth || hasFocusedDescendant;
  const visibleChildren = canRenderChildren ? reply.replies : [];
  const hiddenRepliesCount = Math.max(0, totalRepliesCount - visibleChildren.length);
  const collapsedRepliesCount = useMemo(() => countReplyTreeDescendants(reply), [reply]);
  const canCollapseRootTree = depth === 0 && collapsedRepliesCount > 0;
  const canToggleRootTree = canCollapseRootTree && !hasFocusedDescendant;
  const threadHref = threadHrefBase ? `${threadHrefBase}/${reply.id}` : null;
  const childrenHiddenByCollapse = canCollapseRootTree && treeCollapsed && !hasFocusedDescendant;

  const hasTreeContinuation =
    !childrenHiddenByCollapse && (visibleChildren.length > 0 || hiddenRepliesCount > 0);
  const avatarSize = isProfessional ? "reply" : "sm";
  const hasReplyMedia = Boolean(reply.media_url);

  const toggleRootTreeCollapse = () => {
    setTreeCollapsed((current) => !current);
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
      />
    ) : null;

  return (
    <article
      className="relative rounded-[20px] py-0.5 text-[#182033] transition-[background-color,box-shadow] duration-500 dark:text-foreground"
      id={`reply-${reply.id}`}
    >
      {hasTreeContinuation ? (
        <span
          className="pointer-events-none absolute top-10 bottom-0 left-4 z-0 w-0.5 -translate-x-1/2 rounded-full bg-border-strong sm:left-[1.125rem]"
          aria-hidden="true"
        />
      ) : null}

      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2.5 rounded-[20px] transition-colors sm:grid-cols-[2.25rem_minmax(0,1fr)]">
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
            <div className="grid min-w-0 gap-1">
              <div className="flex min-w-0 items-center gap-x-2">
                <div className="flex min-w-0 items-center gap-[5px]">
                  {isProfessional ? (
                    <Link
                      className="truncate text-sm font-black text-inherit no-underline hover:text-inherit hover:no-underline"
                      href={`/psychologists/${reply.author.id}`}
                      onClick={stopReplyTreeCollapsePropagation}
                    >
                      {authorDisplayName}
                    </Link>
                  ) : (
                    <h3 className="truncate text-sm font-black">{authorDisplayName}</h3>
                  )}
                  {reply.author.verified ? (
                    <BadgeCheck
                      className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <MentorBadge
                  badge={reply.author.featured_badge}
                  href={psychologistProfileHref ?? undefined}
                  onClick={psychologistProfileHref ? stopReplyTreeCollapsePropagation : undefined}
                />
              </div>
              {psychologistProfileHref ? (
                <Link
                  className="w-fit cursor-pointer text-[11px] font-semibold text-muted no-underline hover:text-muted hover:no-underline"
                  href={psychologistProfileHref}
                  onClick={stopReplyTreeCollapsePropagation}
                >
                  {formatReplyAuthorMeta(
                    reply.author,
                    reply.created_at,
                    reply.edited_at,
                    reply.is_post_author,
                  )}
                </Link>
              ) : (
                <p className="text-[11px] font-semibold text-muted">
                  {formatReplyAuthorMeta(
                    reply.author,
                    reply.created_at,
                    reply.edited_at,
                    reply.is_post_author,
                  )}
                </p>
              )}
            </div>
          </div>

          <div>
            <InlineExpandableText
              className="mt-2 text-sm leading-6 text-[#475569] dark:text-muted"
              expanded={contentExpanded}
              onToggle={() => setContentExpanded((current) => !current)}
              text={reply.content}
            />
          </div>
          <div data-comment-collapse-ignore="true">
            <CommunityMediaBlock
              alt="Mídia da resposta"
              className="mt-3"
              footer={hasReplyMedia ? replyWhatsappCta : undefined}
              mediaType={reply.media_type}
              mediaUrl={reply.media_url}
              roundedClassName="rounded-[18px]"
              variant="reply"
            />
          </div>

          {replyWhatsappCta && !hasReplyMedia ? (
            <div className="mt-2" data-comment-collapse-ignore="true">
              {replyWhatsappCta}
            </div>
          ) : null}

          <div data-comment-collapse-ignore="true">
            <ReplyVoteBar
              currentVote={reply.current_user_vote}
              deletePending={deleteReplyPending}
              disabled={votePending}
              isOwnReply={isOwnReply}
              onDelete={() => onDeleteReply(reply)}
              onEdit={() => setEditModalOpen(true)}
              onReply={() => onReply(reply)}
              onReport={() => onReportReply(reply)}
              onShare={() => onShare(reply)}
              onToggleSave={toggleSaveReply}
              onVote={(value) => onVote(reply.id, value)}
              reply={reply}
              savePending={saveReplyMutation.isPending}
            />
          </div>

          {canToggleRootTree ? (
            <div className="mt-1" data-comment-collapse-ignore="true">
              <button
                aria-controls={hasTreeContinuation ? `reply-children-${reply.id}` : undefined}
                aria-expanded={!childrenHiddenByCollapse}
                aria-label={
                  childrenHiddenByCollapse
                    ? `Ver ${collapsedRepliesCount} ${
                        collapsedRepliesCount === 1 ? "resposta" : "respostas"
                      } desta conversa`
                    : "Ocultar respostas desta conversa"
                }
                className="inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#334155] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.98] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleRootTreeCollapse();
                }}
                type="button"
              >
                {childrenHiddenByCollapse ? (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                )}
                <span className="whitespace-nowrap text-[12px] font-semibold leading-none tracking-[-0.01em]">
                  {childrenHiddenByCollapse
                    ? `Ver respostas (${collapsedRepliesCount})`
                    : "Ocultar respostas"}
                </span>
              </button>
            </div>
          ) : null}

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
                onSubmit={(values, mediaFile) => onSubmitReply(values, reply.id, mediaFile)}
                replyTarget={inlineReplyTarget}
                variant="inline"
                autoFocus
              />
            </div>
          ) : null}
        </div>
      </div>

      {hasTreeContinuation ? (
        <div
          className="relative z-10 mt-2 ml-4 grid gap-3 pl-[18px] sm:ml-[18px] sm:pl-[22px]"
          id={`reply-children-${reply.id}`}
        >
          {visibleChildren.map((child) => (
            <div className="relative" key={child.id}>
              <svg
                className="pointer-events-none absolute top-0 -left-[18px] z-0 h-5 w-[18px] overflow-visible text-border-strong sm:-left-[22px] sm:w-[22px]"
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 22 20"
              >
                <path
                  d="M0 0 V10 C0 14.4 3.6 18 8 18 H22"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.25}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <ReplyCard
                activeInlineReplyFormRef={activeInlineReplyFormRef}
                currentUserId={currentUserId}
                deleteReplyPending={deleteReplyPending}
                depth={depth + 1}
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
                professionalThread={highlightedProfessionalThread}
                reply={child}
                replyApiError={replyApiError}
                replyDisabled={replyDisabled}
                threadHrefBase={threadHrefBase}
                votePending={votePending}
              />
            </div>
          ))}
          {hiddenRepliesCount > 0 && threadHref ? (
            <Link
              className="group inline-flex w-fit items-center gap-2 rounded-full py-1 pr-2 text-[11px] font-black text-primary no-underline transition hover:text-primary hover:no-underline"
              data-comment-collapse-ignore="true"
              href={threadHref}
              onClick={stopReplyTreeCollapsePropagation}
            >
              <span
                className="h-px w-5 rounded-full bg-[#CBD5E1] transition group-hover:bg-primary/45 dark:bg-border"
                aria-hidden="true"
              />
              <span>
                Ver mais {hiddenRepliesCount} {hiddenRepliesCount === 1 ? "resposta" : "respostas"}
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

const ReplyComposer = ({
  apiError,
  autoFocus = false,
  disabled,
  formRef,
  mediaPermission,
  onCancelContext,
  onDraftStateChange,
  onSubmit,
  replyToName,
  replyTarget,
  variant = "main",
}: {
  apiError?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
  mediaPermission: ReplyMediaPermission;
  onCancelContext?: () => void;
  onDraftStateChange?: (hasDraft: boolean) => void;
  onSubmit: (values: ReplyComposerForm, mediaFile?: File | null) => Promise<void> | void;
  replyToName?: string | null;
  replyTarget: ReplyTarget;
  variant?: "inline" | "main";
}) => {
  const form = useReplyComposerForm(replyTarget?.name ?? replyToName);
  const { formProps, hook } = form;
  const [composerActive, setComposerActive] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [draggingToCancel, setDraggingToCancel] = useState(false);
  const [mediaPickerActive, setMediaPickerActive] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedReplyMedia | null>(null);
  const localFormRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedMediaPreviewUrlRef = useRef<string | null>(null);
  const mediaPickerActiveRef = useRef(false);
  const cancelDragRef = useRef<{
    dragging: boolean;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const resolvedFormRef = formRef ?? localFormRef;
  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    if (!hook.formState.isSubmitted) return null;

    return Object.values(hook.formState.errors)[0]?.message?.toString() ?? null;
  }, [apiError, hook.formState.errors, hook.formState.isSubmitted]);
  const content = hook.watch("content");
  const draft = String(content ?? "").trim();
  const hasDraft = draft.length > 0;
  const hasDiscardableDraft = hasDraft || Boolean(selectedMedia);
  const ready = hasDraft || Boolean(selectedMedia);
  const FieldComponent = components[formProps.fields[0].field];
  const isInline = variant === "inline";
  const shouldShowMediaControls =
    Boolean(selectedMedia) || mediaPickerActive || (composerActive && mediaPermission.showControl);
  const shouldShowGuidance =
    composerActive || hasDraft || Boolean(selectedMedia) || mediaPickerActive;
  const autoFocusTargetId = replyTarget?.id ?? "main";
  const shouldShowCancelAction = composerActive;
  const cancelLabel = replyTarget || replyToName ? "Cancelar resposta" : "Cancelar comentário";

  const revokeSelectedMediaPreview = useCallback(() => {
    if (!selectedMediaPreviewUrlRef.current) return;

    URL.revokeObjectURL(selectedMediaPreviewUrlRef.current);
    selectedMediaPreviewUrlRef.current = null;
  }, []);

  const clearSelectedMedia = useCallback(() => {
    revokeSelectedMediaPreview();
    setSelectedMedia(null);
  }, [revokeSelectedMediaPreview]);

  const beginMediaPickerInteraction = useCallback(() => {
    mediaPickerActiveRef.current = true;
    setMediaPickerActive(true);
    setComposerActive(true);
  }, []);

  const endMediaPickerInteraction = useCallback(() => {
    mediaPickerActiveRef.current = false;
    setMediaPickerActive(false);
  }, []);

  const focusComposerInput = useCallback(() => {
    window.setTimeout(() => {
      const inputNode = resolvedFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      inputNode?.focus({ preventScroll: true });
    }, 0);
  }, [resolvedFormRef]);

  const resetCancelDrag = () => {
    cancelDragRef.current = null;
    setDragOffset(0);
    setDraggingToCancel(false);
  };

  const cancelComposer = () => {
    if (hasDiscardableDraft && !confirmDiscardReplyDraft()) return;

    const activeElement = document.activeElement;
    const inputNode = resolvedFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");

    inputNode?.blur();
    if (activeElement instanceof HTMLElement && resolvedFormRef.current?.contains(activeElement)) {
      activeElement.blur();
    }

    hook.reset({ content: "" });
    clearSelectedMedia();
    endMediaPickerInteraction();
    setComposerActive(false);
    resetCancelDrag();
    onDraftStateChange?.(false);
    onCancelContext?.();
  };

  const canUseMobileCancelGesture = () =>
    composerActive &&
    !disabled &&
    typeof window !== "undefined" &&
    window.matchMedia(POST_DETAIL_MOBILE_QUERY).matches;

  useEffect(() => {
    if (!autoFocus || !autoFocusTargetId) return;

    const timer = window.setTimeout(() => {
      const inputNode = resolvedFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      inputNode?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocus, autoFocusTargetId, resolvedFormRef]);

  useEffect(() => {
    onDraftStateChange?.(hasDiscardableDraft);
  }, [hasDiscardableDraft, onDraftStateChange]);

  useEffect(() => {
    return () => revokeSelectedMediaPreview();
  }, [revokeSelectedMediaPreview]);

  useEffect(() => {
    if (!mediaPickerActive) return;

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        endMediaPickerInteraction();
        focusComposerInput();
      }, 250);
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [endMediaPickerInteraction, focusComposerInput, mediaPickerActive]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !mediaPermission.canAttach) {
      endMediaPickerInteraction();
      return;
    }

    revokeSelectedMediaPreview();
    const previewUrl = URL.createObjectURL(file);
    const type = mediaTypeFromFile(file);
    selectedMediaPreviewUrlRef.current = previewUrl;
    setSelectedMedia({
      file,
      orientation: undefined,
      previewUrl,
      type,
    });
    void detectReplyMediaOrientation(previewUrl, type).then((orientation) => {
      setSelectedMedia((current) =>
        current?.previewUrl === previewUrl ? { ...current, orientation } : current,
      );
    });
    hook.clearErrors("content");
    endMediaPickerInteraction();
    setComposerActive(true);
    focusComposerInput();
  };

  const handleCancelPointerDown = (event: ReactPointerEvent<HTMLFormElement>) => {
    if (event.pointerType !== "touch" || !canUseMobileCancelGesture()) return;

    cancelDragRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleCancelPointerMove = (event: ReactPointerEvent<HTMLFormElement>) => {
    const gesture = cancelDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (!gesture.dragging) {
      if (deltaY < 10 || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return;

      gesture.dragging = true;
      setDraggingToCancel(true);

      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (gesture.dragging) {
      event.preventDefault();
      setDragOffset(Math.min(96, Math.max(0, deltaY * 0.72)));
    }
  };

  const handleCancelPointerEnd = (event: ReactPointerEvent<HTMLFormElement>) => {
    const gesture = cancelDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const shouldCancel =
      gesture.dragging && event.clientY - gesture.startY >= POST_REPLY_CANCEL_DRAG_THRESHOLD;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (shouldCancel) {
      cancelComposer();
      return;
    }

    resetCancelDrag();
  };

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    void hook.handleSubmit(async (values) => {
      if (!String(values.content ?? "").trim() && !selectedMedia) {
        hook.setError("content", {
          message: "Escreva um comentário ou anexe uma mídia.",
          type: "manual",
        });
        return;
      }

      try {
        await onSubmit(values, selectedMedia?.file ?? null);
        hook.reset({ content: "" });
        clearSelectedMedia();
        endMediaPickerInteraction();
        setComposerActive(false);
        onDraftStateChange?.(false);
      } catch {
        // O estado de erro é tratado pela mutation para manter o campo preenchido.
      }
    })(event);
  };

  return (
    <form
      className={cn(
        "grid gap-2 border-[#DDE6F0] bg-white/95 p-3 dark:border-border dark:bg-surface/95",
        composerActive && "max-sm:touch-none",
        draggingToCancel ? "transition-none" : "transition-transform duration-200 ease-out",
        isInline
          ? "mt-3 rounded-[20px] border shadow-none"
          : "fixed inset-x-0 bottom-0 z-40 border-t pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_-16px_44px_rgba(15,23,42,0.14)] backdrop-blur-md sm:static sm:rounded-[22px] sm:border sm:bg-white sm:pb-3 sm:shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:backdrop-blur-0 dark:sm:bg-surface",
      )}
      noValidate
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        if (mediaPickerActiveRef.current) return;
        setComposerActive(false);
        resetCancelDrag();
      }}
      onFocusCapture={() => setComposerActive(true)}
      onPointerCancel={handleCancelPointerEnd}
      onPointerDown={handleCancelPointerDown}
      onPointerMove={handleCancelPointerMove}
      onPointerUp={handleCancelPointerEnd}
      onSubmit={handleComposerSubmit}
      ref={resolvedFormRef}
      style={dragOffset > 0 ? { transform: `translate3d(0, ${dragOffset}px, 0)` } : undefined}
    >
      {shouldShowGuidance ? (
        <p className="rounded-[14px] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold leading-5 text-[#64748B] dark:bg-surface-muted dark:text-muted">
          {COMMENT_GUIDANCE_MESSAGE}
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <FieldComponent control={hook.control} {...formProps.fields[0]} />
        </div>
        {shouldShowCancelAction ? (
          <Button
            aria-label={cancelLabel}
            className="h-9 w-9 shrink-0 rounded-full border border-[#E5EAF0] bg-white p-0 text-[#64748B] shadow-none transition hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-[#182033] dark:border-border dark:bg-surface dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
            disabled={disabled}
            onClick={cancelComposer}
            type="button"
            variant="ghost"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        <Button
          aria-label="Enviar resposta"
          className="h-11 w-11 shrink-0 rounded-full bg-[#308CE8] p-0 text-white shadow-[0_10px_20px_rgba(48,140,232,0.24)] hover:bg-[#2579CF] disabled:bg-[#EEF5FC] disabled:text-[#94A3B8] disabled:opacity-100 disabled:shadow-none"
          disabled={disabled || !ready}
          type="submit"
        >
          {disabled && ready ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {shouldShowMediaControls ? (
        <ReplyMediaAttachmentControl
          disabled={disabled}
          fileInputRef={fileInputRef}
          isUploading={disabled && Boolean(selectedMedia)}
          mediaPermission={mediaPermission}
          onAfterAction={() => setComposerActive(true)}
          onMediaChange={handleMediaChange}
          onOpenDialog={beginMediaPickerInteraction}
          onRemoveSelected={clearSelectedMedia}
          selectedMedia={selectedMedia}
        />
      ) : null}

      {visibleError ? (
        <InlineAlert title="Não foi possível responder" variant="error">
          {visibleError}
        </InlineAlert>
      ) : null}
    </form>
  );
};

const PostReportModal = ({
  apiError,
  disabled,
  onClose,
  onSubmit,
  open,
  subject,
  title,
}: {
  apiError?: string | null;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: (values: PostReportForm) => Promise<void> | void;
  open: boolean;
  subject: string;
  title: string;
}) => {
  const form = usePostReportForm();
  const { Form: ReportForm, formProps, hook } = form;
  const resetReportForm = hook.reset;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    resetReportForm({ description: "", reason: "spam" });
  }, [open, resetReportForm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-[#0F172A]/55 px-4 py-6 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-report-title"
    >
      <div className="w-full max-w-[430px] rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-border dark:bg-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-black tracking-[0.12em] text-[#64748B] uppercase">
              Moderação Lectum
            </p>
            <h2
              className="text-xl font-black tracking-[-0.03em] text-[#182033]"
              id="post-report-title"
            >
              {title}
            </h2>
            <p className="line-clamp-2 text-sm leading-5 text-[#64748B]">{subject}</p>
          </div>
          <button
            aria-label="Fechar denúncia"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F8FAFC] text-[#64748B] transition hover:bg-[#EDF4FF] hover:text-[#182033]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ReportForm
          className="mt-5 grid gap-3"
          fields={formProps.fields}
          hook={hook}
          onSubmit={hook.handleSubmit(async (values) => {
            try {
              await onSubmit(values);
            } catch {
              // A mutation exibe a mensagem no modal sem fechar o fluxo.
            }
          })}
        >
          {apiError ? (
            <InlineAlert title="Não foi possível enviar" variant="error">
              {apiError}
            </InlineAlert>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              className="h-10 rounded-full px-4"
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="h-10 rounded-full bg-[#308CE8] px-5 font-black hover:bg-[#2579CF]"
              disabled={disabled}
              type="submit"
            >
              {disabled ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Enviar denúncia
            </Button>
          </div>
        </ReportForm>
      </div>
    </div>
  );
};

const RepliesList = ({
  activeInlineReplyFormRef,
  currentUserId,
  deleteReplyPending,
  errorMessage,
  inlineReplyTargets,
  loading,
  maxInlineDepth = MAX_REPLY_TREE_DEPTH,
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
  postId,
  replies,
  replyApiError,
  replyDisabled,
  showSectionTitle = true,
  threadHrefBase,
  votePending,
}: {
  activeInlineReplyFormRef?: RefObject<HTMLFormElement | null>;
  currentUserId?: string | null;
  deleteReplyPending?: boolean;
  errorMessage?: string | null;
  inlineReplyTargets: ReplyTargetMap;
  loading?: boolean;
  maxInlineDepth?: number;
  mediaPermission: ReplyMediaPermission;
  onCancelInlineReplyTarget: (replyId: string) => void;
  onInlineReplyDraftChange?: (hasDraft: boolean) => void;
  onDeleteReply: (reply: PostReply) => void;
  onReply: (reply: PostReply) => void;
  onReportReply: (reply: PostReply) => void;
  onShare: (reply: PostReply) => void;
  onSubmitReply: (
    values: ReplyComposerForm,
    parentReplyId: string,
    mediaFile?: File | null,
  ) => Promise<void> | void;
  onVote: (replyId: string, value: 1 | -1) => void;
  focusReplyId?: string | null;
  postId: string;
  replies: PostReply[];
  replyApiError?: string | null;
  replyDisabled?: boolean;
  showSectionTitle?: boolean;
  threadHrefBase?: string;
  votePending?: boolean;
}) => {
  const orderedReplies = useMemo(() => orderRepliesForProfessionalPriority(replies), [replies]);

  return (
    <section className="grid gap-4" id="discussao">
      {showSectionTitle ? (
        <div className="px-0.5">
          <h2 className="text-sm font-black tracking-[0.08em] text-[#64748B] uppercase">
            Discussão
          </h2>
        </div>
      ) : null}

      {loading ? (
        <div className="grid min-h-[220px] place-items-center rounded-[22px] border border-border bg-white shadow-[var(--lectum-shadow-soft)] dark:bg-surface">
          <LoadingState label="Carregando respostas" />
        </div>
      ) : null}

      {errorMessage ? (
        <InlineAlert title="Respostas indisponíveis" variant="error">
          {errorMessage}
        </InlineAlert>
      ) : null}

      {!loading && !errorMessage && replies.length === 0 ? (
        <EmptyState
          description="Ainda não há respostas neste post. Seja a primeira pessoa a participar da conversa."
          icon={MessageCircle}
          title="Sem respostas por enquanto"
        />
      ) : null}

      {orderedReplies.length > 0 ? (
        <div className="grid gap-3">
          {orderedReplies.map((reply) => {
            const professionalTree = isVerifiedProfessionalReply(reply);

            return (
              <div
                className="rounded-[22px] border border-[#EDF1F5] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.035)] dark:border-border dark:bg-surface"
                key={reply.id}
              >
                <ReplyCard
                  activeInlineReplyFormRef={activeInlineReplyFormRef}
                  currentUserId={currentUserId}
                  deleteReplyPending={deleteReplyPending}
                  focusReplyId={focusReplyId}
                  inlineReplyTargets={inlineReplyTargets}
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
                  professionalThread={professionalTree}
                  reply={reply}
                  replyApiError={replyApiError}
                  replyDisabled={replyDisabled}
                  threadHrefBase={threadHrefBase}
                  votePending={votePending}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export const PostDetailLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const postId = typeof params.id === "string" ? params.id : "";
  const focusReplyIdFromUrl = searchParams.get("focusReplyId")?.trim() || null;
  const isMobile = useIsPostDetailMobile();
  const currentUser = useAppSelector((state) => state.user);
  const currentUserId = currentUser?.id ?? null;
  const isPsychologistUser = currentUser?.role === "psicologo";
  const accountTips = useAccount({
    enableSecurity: false,
    enableTips: isPsychologistUser,
  });
  const conversion = useProgressiveConversion();
  const [loadedReplyPages, setLoadedReplyPages] = useState(() => createReplyPageRange(1));
  const [activeFocusReplyId, setActiveFocusReplyId] = useState<string | null>(focusReplyIdFromUrl);
  const [focusLookupReplyId, setFocusLookupReplyId] = useState<string | null>(focusReplyIdFromUrl);
  const [mobileReplyTarget, setMobileReplyTarget] = useState<ReplyTarget>(null);
  const [desktopReplyTargets, setDesktopReplyTargets] = useState<ReplyTargetMap>({});
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteReplyError, setDeleteReplyError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [shareVideoTarget, setShareVideoTarget] = useState<LectumShareVideoTarget | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const inlineReplyFormRef = useRef<HTMLFormElement | null>(null);
  const inlineReplyHasDraftRef = useRef(false);
  const hasShownPsychologistReplyTipThisVisitRef = useRef(false);
  const hasPersistedPsychologistReplyTipSeenRef = useRef(false);
  const loadMoreRepliesRef = useRef<HTMLDivElement | null>(null);
  const [showPsychologistReplyTip, setShowPsychologistReplyTip] = useState(false);
  const mediaPermission = useReplyMediaPermission();
  const postQuery = usePostDetail(postId);
  const replyPageQueries = usePostRepliesPages(
    postId,
    loadedReplyPages.map((page) => ({ page, limit: REPLIES_LIMIT })),
    Boolean(postQuery.data),
  );
  const focusReplyLookupQuery = usePostReplies(
    postId,
    { focusReplyId: focusLookupReplyId ?? undefined, page: 1, limit: REPLIES_LIMIT },
    Boolean(postQuery.data && focusLookupReplyId),
  );
  const voteMutation = useVotePost(postId);
  const saveMutation = useSavePost(postId);
  const sharePostMutation = useSharePost();
  const shareReplyMutation = useShareReply();
  const createReplyMutation = useCreatePostReply({
    onSuccess: () => setReplyError(null),
    onError: (error) => setReplyError(resolveReplyError(error)),
  });
  const uploadReplyMediaMutation = useUploadPostReplyMedia({
    onError: (error) => setReplyError(resolveReplyError(error)),
  });
  const reportMutation = useReportPost({
    onSuccess: () => {
      setReportError(null);
      setReportTarget(null);
    },
    onError: (error) => setReportError(resolveReplyError(error)),
  });
  const reportReplyMutation = useReportReply({
    onSuccess: () => {
      setReportError(null);
      setReportTarget(null);
    },
    onError: (error) => setReportError(resolveReplyError(error)),
  });
  const deleteReplyMutation = useDeleteReply({
    onSuccess: () => setDeleteReplyError(null),
    onError: (error) => setDeleteReplyError(resolveReplyError(error)),
  });
  const post = postQuery.data?.post;
  const replies = useMemo(() => {
    const seenReplyIds = new Set<string>();
    const loadedReplies: PostReply[] = [];

    for (const query of replyPageQueries) {
      for (const reply of query.data?.data ?? []) {
        if (seenReplyIds.has(reply.id)) continue;

        seenReplyIds.add(reply.id);
        loadedReplies.push(reply);
      }
    }

    return loadedReplies;
  }, [replyPageQueries]);
  const totalReplyPages = Math.max(
    0,
    focusReplyLookupQuery.data?.pages ?? 0,
    ...replyPageQueries.map((query) => query.data?.pages ?? 0),
  );
  const highestLoadedReplyPage = loadedReplyPages[loadedReplyPages.length - 1] ?? 1;
  const isRepliesFetching =
    focusReplyLookupQuery.isFetching || replyPageQueries.some((query) => query.isFetching);
  const isInitialRepliesLoading =
    replies.length === 0 && replyPageQueries.some((query) => query.isLoading || query.isPending);
  const hasMoreReplies = totalReplyPages > 0 && highestLoadedReplyPage < totalReplyPages;
  const canLoadMoreReplies = hasMoreReplies && !isRepliesFetching;
  const isLoadingMoreReplies = replies.length > 0 && isRepliesFetching;
  const repliesQueryError = replyPageQueries.find((query) => query.isError)?.error;
  const postError = postQuery.isError ? resolvePostError(postQuery.error) : null;
  const repliesError = repliesQueryError ? resolvePostError(repliesQueryError) : null;
  const hasDesktopReplyTargets = !isMobile && Object.keys(desktopReplyTargets).length > 0;
  const activeMobileReplyTarget = isMobile ? mobileReplyTarget : null;
  const visibleInlineReplyTargets = isMobile ? EMPTY_REPLY_TARGETS : desktopReplyTargets;
  const isPatientAuthoredPost = post?.author.role === "paciente";
  const canShowPsychologistReplyTip =
    isPsychologistUser &&
    Boolean(isPatientAuthoredPost) &&
    accountTips.onboardingTips.isSuccess &&
    !accountTips.onboardingTips.data?.has_seen_psychologist_reply_tip;
  const shouldExposePsychologistReplyTipTarget =
    canShowPsychologistReplyTip || showPsychologistReplyTip;
  const resetReplyFocusHighlight = useReplyFocusHighlight(
    activeFocusReplyId,
    isRepliesFetching || Boolean(focusLookupReplyId),
  );

  useEffect(() => {
    if (!postId) return;

    const syncTimer = window.setTimeout(() => {
      resetReplyFocusHighlight();
      setLoadedReplyPages(createReplyPageRange(1));
      setFocusLookupReplyId(focusReplyIdFromUrl);
      setActiveFocusReplyId(focusReplyIdFromUrl);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [focusReplyIdFromUrl, postId, resetReplyFocusHighlight]);

  useEffect(() => {
    if (!focusLookupReplyId || !focusReplyLookupQuery.data?.page) return;

    const focusPage = focusReplyLookupQuery.data.page;
    const syncTimer = window.setTimeout(() => {
      setLoadedReplyPages((currentPages) => {
        if (focusPage <= (currentPages[currentPages.length - 1] ?? 1)) {
          return currentPages;
        }

        return createReplyPageRange(focusPage);
      });
      setFocusLookupReplyId(null);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [focusLookupReplyId, focusReplyLookupQuery.data?.page]);

  const requestNextRepliesPage = useCallback(() => {
    setLoadedReplyPages((currentPages) => {
      const currentLastPage = currentPages[currentPages.length - 1] ?? 1;
      if (totalReplyPages > 0 && currentLastPage >= totalReplyPages) return currentPages;

      const nextPage = currentLastPage + 1;
      if (currentPages.includes(nextPage)) return currentPages;

      return [...currentPages, nextPage];
    });
  }, [totalReplyPages]);

  useEffect(() => {
    const target = loadMoreRepliesRef.current;
    if (!target || !canLoadMoreReplies) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        requestNextRepliesPage();
      },
      {
        rootMargin: "360px 0px 520px",
        threshold: 0.01,
      },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [canLoadMoreReplies, requestNextRepliesPage]);

  const persistPsychologistReplyTipSeen = useCallback(() => {
    if (
      !accountTips.userId ||
      hasPersistedPsychologistReplyTipSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_psychologist_reply_tip ||
      accountTips.updateOnboardingTips.isPending
    ) {
      return;
    }

    hasPersistedPsychologistReplyTipSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_psychologist_reply_tip: true,
      },
      {
        onError: () => {
          hasPersistedPsychologistReplyTipSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_psychologist_reply_tip,
    accountTips.updateOnboardingTips,
    accountTips.userId,
  ]);

  useEffect(() => {
    hasShownPsychologistReplyTipThisVisitRef.current = false;
    hasPersistedPsychologistReplyTipSeenRef.current = false;

    const frame = window.requestAnimationFrame(() => setShowPsychologistReplyTip(false));

    if (!accountTips.userId) {
      return () => window.cancelAnimationFrame(frame);
    }

    return () => window.cancelAnimationFrame(frame);
  }, [accountTips.userId]);

  const sharePost = async () => {
    if (!post || typeof window === "undefined") return;

    setShareVideoTarget(
      createLectumSharePostMediaTarget(post) ?? createLectumShareLinkTarget(post),
    );
  };

  const shareReply = async (reply: PostReply) => {
    if (!post || typeof window === "undefined") return;

    const parentReply = findPostReplyInTree(replies, reply.parent_reply_id);
    const videoTarget = createLectumShareVideoTarget(post, reply, {
      parentContent: parentReply?.content ?? null,
    });

    if (videoTarget) {
      setShareVideoTarget(videoTarget);
      return;
    }

    setShareVideoTarget(
      createLectumShareLinkTarget(post, {
        relativeUrl: `/community/${post.community.slug}/post/${post.id}#reply-${reply.id}`,
        replyId: reply.id,
        text: reply.content,
        title: "Resposta na Lectum",
      }),
    );
  };

  const handleShareVideoShared = (channel: LectumShareChannel) => {
    if (!shareVideoTarget) return;

    if (shareVideoTarget.replyId) {
      shareReplyMutation.mutate({
        postId: shareVideoTarget.postId,
        replyId: shareVideoTarget.replyId,
        body: { channel },
      });
    } else {
      sharePostMutation.mutate({ id: shareVideoTarget.postId, body: { channel } });
    }
    setShareFeedback(shareVideoTarget.replyId ?? "post");
    window.setTimeout(() => setShareFeedback(null), 2400);
  };

  const setInlineReplyDraftState = useCallback((hasDraft: boolean) => {
    inlineReplyHasDraftRef.current = hasDraft;
  }, []);

  const closeDesktopReplyTarget = useCallback(() => {
    inlineReplyHasDraftRef.current = false;
    setReplyError(null);
    setDesktopReplyTargets({});
  }, []);

  const requestCloseDesktopReplyTarget = useCallback(() => {
    if (isMobile || Object.keys(desktopReplyTargets).length === 0) return true;
    if (inlineReplyHasDraftRef.current && !confirmDiscardReplyDraft()) return false;

    closeDesktopReplyTarget();
    return true;
  }, [closeDesktopReplyTarget, desktopReplyTargets, isMobile]);

  const focusMainComposer = useCallback(() => {
    setReplyError(null);
    if (isPsychologistUser && isPatientAuthoredPost) {
      hasShownPsychologistReplyTipThisVisitRef.current = true;
      persistPsychologistReplyTipSeen();
      setShowPsychologistReplyTip(false);
    }
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_comentar", {
        intent: {
          payload: {
            postId,
          },
          type: "comment_post",
        },
      });
      return;
    }

    setMobileReplyTarget(null);

    window.setTimeout(() => {
      const composerNode = composerRef.current;
      const inputNode = composerNode?.querySelector<HTMLTextAreaElement>("textarea");

      if (!isMobile) {
        composerNode?.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      inputNode?.focus({ preventScroll: true });
    }, 0);
  }, [
    conversion,
    isMobile,
    isPatientAuthoredPost,
    isPsychologistUser,
    persistPsychologistReplyTipSeen,
    postId,
  ]);

  const handleReplyTarget = useCallback(
    (reply: PostReply) => {
      setReplyError(null);
      if (!conversion.isAuthenticated) {
        conversion.requestConversion("trigger_comentar", {
          intent: {
            payload: {
              postId,
              replyId: reply.id,
            },
            type: "reply_comment",
          },
        });
        return;
      }

      const target = { id: reply.id, name: getCommunityAuthorDisplayName(reply.author) };

      if (isMobile) {
        setMobileReplyTarget(target);

        window.setTimeout(() => {
          const inputNode = composerRef.current?.querySelector<HTMLTextAreaElement>("textarea");
          inputNode?.focus({ preventScroll: true });
        }, 0);

        return;
      }

      if (desktopReplyTargets[reply.id]) {
        window.setTimeout(() => {
          const inputNode =
            inlineReplyFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");
          inputNode?.focus({ preventScroll: true });
        }, 0);
        return;
      }

      if (!requestCloseDesktopReplyTarget()) return;

      inlineReplyHasDraftRef.current = false;
      setDesktopReplyTargets({ [reply.id]: target });
    },
    [conversion, desktopReplyTargets, isMobile, postId, requestCloseDesktopReplyTarget],
  );

  const submitReply = async (
    values: ReplyComposerForm,
    parentReplyId?: string | null,
    mediaFile?: File | null,
  ) => {
    if (!post) return;
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_comentar", {
        intent: {
          payload: {
            postId: post.id,
            replyId: parentReplyId ?? null,
          },
          type: parentReplyId ? "reply_comment" : "comment_post",
        },
      });
      return;
    }

    setReplyError(null);
    const media = mediaFile
      ? await uploadReplyMediaMutation.mutateAsync({
          file: mediaFile,
          id: post.id,
        })
      : null;

    const createdReply = await createReplyMutation.mutateAsync({
      id: post.id,
      body: toCreatePostReplyPayload(
        values,
        parentReplyId,
        media
          ? {
              mediaType: media.media_type,
              mediaUrl: media.media_url,
            }
          : null,
      ),
    });

    resetReplyFocusHighlight();
    setActiveFocusReplyId(createdReply.id);
    setFocusLookupReplyId(createdReply.id);

    if (parentReplyId) {
      closeDesktopReplyTarget();
      setMobileReplyTarget((currentTarget) =>
        currentTarget?.id === parentReplyId ? null : currentTarget,
      );
    } else {
      setMobileReplyTarget(null);
    }
  };

  useEffect(() => {
    if (isMobile || Object.keys(desktopReplyTargets).length === 0) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (inlineReplyFormRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-reply-open-trigger="true"]')) {
        return;
      }

      requestCloseDesktopReplyTarget();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [desktopReplyTargets, isMobile, requestCloseDesktopReplyTarget]);

  useEffect(() => {
    if (!canShowPsychologistReplyTip) return;
    if (hasShownPsychologistReplyTipThisVisitRef.current) return;
    if (!post) return;

    const timeout = window.setTimeout(() => {
      if (hasShownPsychologistReplyTipThisVisitRef.current) return;
      if (!document.querySelector(PSYCHOLOGIST_COMMUNITY_REPLY_TIP_SELECTOR)) return;

      hasShownPsychologistReplyTipThisVisitRef.current = true;
      setShowPsychologistReplyTip(true);
      persistPsychologistReplyTipSeen();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [canShowPsychologistReplyTip, persistPsychologistReplyTipSeen, post]);

  const handleTogglePostSave = () => {
    if (!post) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_salvar", {
        intent: {
          payload: {
            postId: post.id,
          },
          type: "save_post",
        },
      });
      return;
    }

    saveMutation.mutate(post.saved);
  };

  const handleVotePost = (value: 1 | -1) => {
    if (!post) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_voto", {
        intent: {
          payload: {
            postId: post.id,
            value,
          },
          type: "vote_post",
        },
      });
      return;
    }

    voteMutation.mutate({ value });
  };

  const handleVoteReply = (replyId: string, value: 1 | -1) => {
    if (!post) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_voto", {
        intent: {
          payload: {
            postId: post.id,
            replyId,
            value,
          },
          type: "vote_reply",
        },
      });
      return;
    }

    voteMutation.mutate({ replyId, value });
  };

  useEffect(() => {
    if (!conversion.isAuthenticated || !post) return;

    const intent = conversion.consumePendingIntent((candidate) => {
      if (String(candidate.payload?.postId ?? "") !== post.id) return false;
      if (candidate.type === "comment_post") return true;
      if (candidate.type === "save_post" && !post.saved) return true;
      if (candidate.type !== "reply_comment") return false;

      const replyId = String(candidate.payload?.replyId ?? "");

      return Boolean(replyId && findReplyInTree(replies, replyId));
    });

    if (!intent) return;

    if (intent.type === "comment_post") {
      window.setTimeout(focusMainComposer, 0);
      return;
    }

    if (intent.type === "save_post") {
      saveMutation.mutate(post.saved);
      return;
    }

    if (intent.type === "reply_comment") {
      const replyId = String(intent.payload?.replyId ?? "");
      const reply = findReplyInTree(replies, replyId);

      if (reply) {
        window.setTimeout(() => handleReplyTarget(reply), 0);
      }
    }
  }, [conversion, focusMainComposer, handleReplyTarget, post, replies, saveMutation]);

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      {showPsychologistReplyTip ? (
        <ActionableCoachMark
          onDismiss={() => setShowPsychologistReplyTip(false)}
          placement="bottom"
          targetSelector={PSYCHOLOGIST_COMMUNITY_REPLY_TIP_SELECTOR}
          title="Responda dúvidas da comunidade"
        >
          <p>
            Responder pacientes é o principal foco dos psicólogos na Lectum. Cada resposta mostra
            sua forma de cuidado, cria confiança e aumenta a chance de um contato qualificado.
          </p>
        </ActionableCoachMark>
      ) : null}

      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background pb-6 text-[#182033] dark:text-foreground sm:max-w-2xl lg:max-w-3xl">
        {postQuery.isLoading || postQuery.isPending ? (
          <div className="grid min-h-[70vh] place-items-center px-5">
            <LoadingState label="Carregando post" />
          </div>
        ) : null}

        {postError ? (
          <div className="px-5 pt-6">
            <EmptyState
              action={
                <Button asChild variant="outline">
                  <Link href={DEFAULT_COMMUNITY_FEED_HREF}>Voltar ao feed</Link>
                </Button>
              }
              description={postError}
              icon={MessageCircle}
              title="Post indisponível"
            />
          </div>
        ) : null}

        {post ? (
          <>
            <article className="overflow-hidden bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] dark:bg-surface sm:mt-4 sm:rounded-[26px] sm:border sm:border-border">
              <PostHeader
                onBack={() => navigateBackWithFallback(router, `/community/${post.community.slug}`)}
                onDeleted={() => router.replace(`/community/${post.community.slug}`)}
                onReport={() => {
                  setReportError(null);
                  setReportTarget({ type: "post" });
                }}
                post={post}
              />
              <PostBody post={post} />
              <PostVoteBar
                currentVote={post.current_user_vote}
                disabled={voteMutation.isPending || saveMutation.isPending}
                onFocusCommentComposer={focusMainComposer}
                replyTipTarget={
                  shouldExposePsychologistReplyTipTarget ? "community-reply" : undefined
                }
                onShare={sharePost}
                onToggleSave={handleTogglePostSave}
                onVote={handleVotePost}
                post={post}
              />
            </article>

            <div className="grid gap-4 px-5 pt-4 pb-36 sm:px-0 sm:pb-6">
              {shareFeedback ? (
                <InlineAlert title="Link preparado" variant="success">
                  Link copiado ou enviado para compartilhamento.
                </InlineAlert>
              ) : null}

              {voteMutation.isError || saveMutation.isError ? (
                <InlineAlert title="Interação não atualizada" variant="error">
                  A ação foi desfeita localmente. Tente novamente em alguns instantes.
                </InlineAlert>
              ) : null}

              {deleteReplyError ? (
                <InlineAlert title="Comentário não excluído" variant="error">
                  {deleteReplyError}
                </InlineAlert>
              ) : null}

              <ReplyComposer
                apiError={!isMobile && hasDesktopReplyTargets ? null : replyError}
                autoFocus={Boolean(activeMobileReplyTarget)}
                disabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
                formRef={composerRef}
                mediaPermission={mediaPermission}
                onCancelContext={() => {
                  setReplyError(null);
                  setMobileReplyTarget(null);
                }}
                onSubmit={(values, mediaFile) =>
                  submitReply(values, activeMobileReplyTarget?.id ?? null, mediaFile)
                }
                replyTarget={activeMobileReplyTarget}
              />

              <RepliesList
                activeInlineReplyFormRef={inlineReplyFormRef}
                currentUserId={currentUserId}
                deleteReplyPending={deleteReplyMutation.isPending}
                errorMessage={repliesError}
                focusReplyId={activeFocusReplyId}
                inlineReplyTargets={visibleInlineReplyTargets}
                loading={isInitialRepliesLoading}
                mediaPermission={mediaPermission}
                onCancelInlineReplyTarget={closeDesktopReplyTarget}
                onInlineReplyDraftChange={setInlineReplyDraftState}
                onDeleteReply={(reply) =>
                  deleteReplyMutation.mutate({ postId: post.id, replyId: reply.id })
                }
                onReply={handleReplyTarget}
                onReportReply={(reply) => {
                  setReportError(null);
                  setReportTarget({ reply, type: "reply" });
                }}
                onShare={shareReply}
                onSubmitReply={(values, parentReplyId, mediaFile) =>
                  submitReply(values, parentReplyId, mediaFile)
                }
                onVote={handleVoteReply}
                postId={post.id}
                replies={replies}
                replyApiError={replyError}
                replyDisabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
                threadHrefBase={`/community/${post.community.slug}/post/${post.id}/thread`}
                votePending={voteMutation.isPending}
              />

              {hasMoreReplies || isLoadingMoreReplies ? (
                <div
                  aria-live="polite"
                  className="grid min-h-10 place-items-center px-4 py-2 text-xs font-semibold text-muted"
                  ref={loadMoreRepliesRef}
                >
                  {isLoadingMoreReplies ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Carregando mais respostas
                    </span>
                  ) : (
                    <span className="sr-only">Continue rolando para carregar mais respostas.</span>
                  )}
                </div>
              ) : null}
            </div>

            <PostReportModal
              apiError={reportError}
              disabled={reportMutation.isPending || reportReplyMutation.isPending}
              onClose={() => setReportTarget(null)}
              onSubmit={async (values) => {
                if (!post) return;

                setReportError(null);
                if (reportTarget?.type === "reply") {
                  await reportReplyMutation.mutateAsync({
                    body: toPostReportPayload(values),
                    id: post.id,
                    replyId: reportTarget.reply.id,
                  });
                  return;
                }

                await reportMutation.mutateAsync({
                  body: toPostReportPayload(values),
                  id: post.id,
                });
              }}
              open={Boolean(reportTarget)}
              subject={reportTarget?.type === "reply" ? reportTarget.reply.content : post.title}
              title={reportTarget?.type === "reply" ? "Denunciar comentário" : "Denunciar post"}
            />
          </>
        ) : null}
      </section>
      <LectumShareVideoModal
        onClose={() => setShareVideoTarget(null)}
        onShared={handleShareVideoShared}
        target={shareVideoTarget}
      />
    </PrivateTemplate>
  );
};

export const PostReplyThreadLogic = () => {
  const router = useRouter();
  const params = useParams<{ id: string; replyId: string; slug: string }>();
  const postId = typeof params.id === "string" ? params.id : "";
  const replyId = typeof params.replyId === "string" ? params.replyId : "";
  const communitySlug = typeof params.slug === "string" ? params.slug : "";
  const isMobile = useIsPostDetailMobile();
  const currentUserId = useAppSelector((state) => state.user?.id ?? null);
  const conversion = useProgressiveConversion();
  const [activeFocusReplyId, setActiveFocusReplyId] = useState<string | null>(null);
  const [mobileReplyTarget, setMobileReplyTarget] = useState<ReplyTarget>(null);
  const [desktopReplyTargets, setDesktopReplyTargets] = useState<ReplyTargetMap>({});
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteReplyError, setDeleteReplyError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [shareVideoTarget, setShareVideoTarget] = useState<LectumShareVideoTarget | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const inlineReplyFormRef = useRef<HTMLFormElement | null>(null);
  const inlineReplyHasDraftRef = useRef(false);
  const mediaPermission = useReplyMediaPermission();
  const postQuery = usePostDetail(postId);
  const threadQuery = usePostReplyThread(postId, replyId, Boolean(postId && replyId));
  const voteMutation = useVotePost(postId);
  const shareReplyMutation = useShareReply();
  const createReplyMutation = useCreatePostReply({
    onSuccess: () => setReplyError(null),
    onError: (error) => setReplyError(resolveReplyError(error)),
  });
  const uploadReplyMediaMutation = useUploadPostReplyMedia({
    onError: (error) => setReplyError(resolveReplyError(error)),
  });
  const reportReplyMutation = useReportReply({
    onSuccess: () => {
      setReportError(null);
      setReportTarget(null);
    },
    onError: (error) => setReportError(resolveReplyError(error)),
  });
  const deleteReplyMutation = useDeleteReply({
    onSuccess: () => setDeleteReplyError(null),
    onError: (error) => setDeleteReplyError(resolveReplyError(error)),
  });
  const post = postQuery.data?.post;
  const rootReply = threadQuery.data?.reply;
  const threadBackFallbackHref = post
    ? `/community/${post.community.slug}`
    : communitySlug
      ? `/community/${communitySlug}`
      : DEFAULT_COMMUNITY_FEED_HREF;
  const postError = postQuery.isError ? resolvePostError(postQuery.error) : null;
  const threadError = threadQuery.isError ? resolvePostError(threadQuery.error) : null;
  const activeMobileReplyTarget = isMobile ? mobileReplyTarget : null;
  const visibleInlineReplyTargets = isMobile ? EMPTY_REPLY_TARGETS : desktopReplyTargets;
  const resetReplyFocusHighlight = useReplyFocusHighlight(
    activeFocusReplyId,
    threadQuery.isFetching,
  );

  const shareReply = async (reply: PostReply) => {
    if (!post || typeof window === "undefined") return;

    const parentReply = rootReply ? findPostReplyInTree([rootReply], reply.parent_reply_id) : null;
    const videoTarget = createLectumShareVideoTarget(post, reply, {
      parentContent: parentReply?.content ?? null,
    });

    if (videoTarget) {
      setShareVideoTarget(videoTarget);
      return;
    }

    const threadRootId = rootReply?.id ?? reply.id;
    setShareVideoTarget(
      createLectumShareLinkTarget(post, {
        relativeUrl: `/community/${post.community.slug}/post/${post.id}/thread/${threadRootId}#reply-${reply.id}`,
        replyId: reply.id,
        text: reply.content,
        title: "Resposta na Lectum",
      }),
    );
  };

  const handleShareVideoShared = (channel: LectumShareChannel) => {
    if (!shareVideoTarget) return;

    if (!shareVideoTarget.replyId) return;

    shareReplyMutation.mutate({
      postId: shareVideoTarget.postId,
      replyId: shareVideoTarget.replyId,
      body: { channel },
    });
    setShareFeedback(shareVideoTarget.replyId);
    window.setTimeout(() => setShareFeedback(null), 2400);
  };

  const setInlineReplyDraftState = useCallback((hasDraft: boolean) => {
    inlineReplyHasDraftRef.current = hasDraft;
  }, []);

  const closeDesktopReplyTarget = useCallback(() => {
    inlineReplyHasDraftRef.current = false;
    setReplyError(null);
    setDesktopReplyTargets({});
  }, []);

  const requestCloseDesktopReplyTarget = useCallback(() => {
    if (isMobile || Object.keys(desktopReplyTargets).length === 0) return true;
    if (inlineReplyHasDraftRef.current && !confirmDiscardReplyDraft()) return false;

    closeDesktopReplyTarget();
    return true;
  }, [closeDesktopReplyTarget, desktopReplyTargets, isMobile]);

  const handleReplyTarget = useCallback(
    (reply: PostReply) => {
      setReplyError(null);
      if (!conversion.isAuthenticated) {
        conversion.requestConversion("trigger_comentar", {
          intent: {
            payload: {
              postId,
              replyId: reply.id,
            },
            type: "reply_comment",
          },
        });
        return;
      }

      const target = { id: reply.id, name: getCommunityAuthorDisplayName(reply.author) };

      if (isMobile) {
        setMobileReplyTarget(target);
        window.setTimeout(() => {
          const inputNode = composerRef.current?.querySelector<HTMLTextAreaElement>("textarea");
          inputNode?.focus({ preventScroll: true });
        }, 0);
        return;
      }

      if (desktopReplyTargets[reply.id]) {
        window.setTimeout(() => {
          const inputNode =
            inlineReplyFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");
          inputNode?.focus({ preventScroll: true });
        }, 0);
        return;
      }

      if (!requestCloseDesktopReplyTarget()) return;

      inlineReplyHasDraftRef.current = false;
      setDesktopReplyTargets({ [reply.id]: target });
    },
    [conversion, desktopReplyTargets, isMobile, postId, requestCloseDesktopReplyTarget],
  );

  const submitReply = async (
    values: ReplyComposerForm,
    parentReplyId?: string | null,
    mediaFile?: File | null,
  ) => {
    if (!post || !rootReply) return;
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_comentar", {
        intent: {
          payload: {
            postId: post.id,
            replyId: parentReplyId ?? rootReply.id,
          },
          type: "reply_comment",
        },
      });
      return;
    }

    setReplyError(null);
    const media = mediaFile
      ? await uploadReplyMediaMutation.mutateAsync({
          file: mediaFile,
          id: post.id,
        })
      : null;

    const createdReply = await createReplyMutation.mutateAsync({
      id: post.id,
      body: toCreatePostReplyPayload(
        values,
        parentReplyId ?? rootReply.id,
        media
          ? {
              mediaType: media.media_type,
              mediaUrl: media.media_url,
            }
          : null,
      ),
    });

    resetReplyFocusHighlight();
    setActiveFocusReplyId(createdReply.id);

    if (parentReplyId) {
      closeDesktopReplyTarget();
    }

    setMobileReplyTarget(null);
  };

  useEffect(() => {
    if (isMobile || Object.keys(desktopReplyTargets).length === 0) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (inlineReplyFormRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-reply-open-trigger="true"]')) {
        return;
      }

      requestCloseDesktopReplyTarget();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [desktopReplyTargets, isMobile, requestCloseDesktopReplyTarget]);

  const handleVoteThreadReply = (targetReplyId: string, value: 1 | -1) => {
    if (!post) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_voto", {
        intent: {
          payload: {
            postId: post.id,
            replyId: targetReplyId,
            value,
          },
          type: "vote_reply",
        },
      });
      return;
    }

    voteMutation.mutate({ replyId: targetReplyId, value });
  };

  useEffect(() => {
    if (!conversion.isAuthenticated || !post || !rootReply) return;

    const intent = conversion.consumePendingIntent((candidate) => {
      if (candidate.type !== "reply_comment") return false;
      if (String(candidate.payload?.postId ?? "") !== post.id) return false;

      const targetReplyId = String(candidate.payload?.replyId ?? "");

      return Boolean(targetReplyId && findReplyInTree([rootReply], targetReplyId));
    });

    if (!intent) return;

    const targetReplyId = String(intent.payload?.replyId ?? "");
    const reply = findReplyInTree([rootReply], targetReplyId);

    if (reply) {
      window.setTimeout(() => handleReplyTarget(reply), 0);
    }
  }, [conversion, handleReplyTarget, post, rootReply]);

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background pb-6 text-[#182033] dark:text-foreground sm:max-w-2xl lg:max-w-3xl">
        <div className="px-5 pt-4 pb-2 sm:px-0 sm:pt-5 sm:pb-3">
          <div className="grid min-h-[58px] grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
            <Button
              aria-label="Voltar"
              className="h-10 w-10 rounded-full border border-[#DDE7F2] bg-white/70 p-0 text-[#475569] shadow-[0_6px_16px_rgba(15,23,42,0.045)] transition hover:border-primary/30 hover:bg-white hover:text-[#182033] dark:border-border dark:bg-surface-muted/60 dark:text-muted dark:hover:text-foreground"
              onClick={() => navigateBackWithFallback(router, threadBackFallbackHref)}
              type="button"
              variant="ghost"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Voltar</span>
            </Button>

            <div className="grid min-w-0 justify-items-center gap-1.5 py-1 text-center">
              <p className="text-[15px] font-black leading-[1.2] tracking-[-0.02em] text-[#182033] dark:text-foreground">
                Respostas
              </p>
              <p className="max-w-full text-[11px] font-semibold leading-[1.45] text-[#64748B] dark:text-muted">
                Continuação da conversa
              </p>
            </div>

            <span className="h-10 w-10" aria-hidden="true" />
          </div>
        </div>

        {postQuery.isLoading || threadQuery.isLoading ? (
          <div className="grid min-h-[70vh] place-items-center px-5">
            <LoadingState label="Carregando respostas" />
          </div>
        ) : null}

        {postError || threadError ? (
          <div className="px-5 pt-6">
            <EmptyState
              action={
                <Button asChild variant="outline">
                  <Link
                    href={
                      post
                        ? `/community/${post.community.slug}/post/${post.id}`
                        : DEFAULT_COMMUNITY_FEED_HREF
                    }
                  >
                    Voltar ao post
                  </Link>
                </Button>
              }
              description={postError || threadError || "Não foi possível carregar esta árvore."}
              icon={MessageCircle}
              title="Árvore indisponível"
            />
          </div>
        ) : null}

        {post && rootReply ? (
          <div className="grid gap-4 px-5 pt-4 pb-36 sm:px-0 sm:pb-6">
            <ThreadOriginalPostCard post={post} />

            {shareFeedback ? (
              <InlineAlert title="Link preparado" variant="success">
                Link copiado ou enviado para compartilhamento.
              </InlineAlert>
            ) : null}

            {deleteReplyError ? (
              <InlineAlert title="Comentário não excluído" variant="error">
                {deleteReplyError}
              </InlineAlert>
            ) : null}

            <RepliesList
              activeInlineReplyFormRef={inlineReplyFormRef}
              currentUserId={currentUserId}
              deleteReplyPending={deleteReplyMutation.isPending}
              errorMessage={null}
              focusReplyId={activeFocusReplyId}
              inlineReplyTargets={visibleInlineReplyTargets}
              loading={false}
              mediaPermission={mediaPermission}
              onCancelInlineReplyTarget={closeDesktopReplyTarget}
              onInlineReplyDraftChange={setInlineReplyDraftState}
              onDeleteReply={(reply) =>
                deleteReplyMutation.mutate({ postId: post.id, replyId: reply.id })
              }
              onReply={handleReplyTarget}
              onReportReply={(reply) => {
                setReportError(null);
                setReportTarget({ reply, type: "reply" });
              }}
              onShare={shareReply}
              onSubmitReply={(values, parentReplyId, mediaFile) =>
                submitReply(values, parentReplyId, mediaFile)
              }
              onVote={handleVoteThreadReply}
              postId={post.id}
              replies={[rootReply]}
              replyApiError={replyError}
              replyDisabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
              showSectionTitle={false}
              threadHrefBase={`/community/${post.community.slug}/post/${post.id}/thread`}
              votePending={voteMutation.isPending}
            />

            <ReplyComposer
              apiError={isMobile ? replyError : null}
              autoFocus={Boolean(activeMobileReplyTarget)}
              disabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
              formRef={composerRef}
              mediaPermission={mediaPermission}
              onCancelContext={() => {
                setReplyError(null);
                setMobileReplyTarget(null);
              }}
              onSubmit={(values, mediaFile) =>
                submitReply(values, activeMobileReplyTarget?.id ?? rootReply.id, mediaFile)
              }
              replyToName={getCommunityAuthorDisplayName(rootReply.author)}
              replyTarget={activeMobileReplyTarget}
            />

            <PostReportModal
              apiError={reportError}
              disabled={reportReplyMutation.isPending}
              onClose={() => setReportTarget(null)}
              onSubmit={async (values) => {
                if (!post || reportTarget?.type !== "reply") return;

                setReportError(null);
                await reportReplyMutation.mutateAsync({
                  body: toPostReportPayload(values),
                  id: post.id,
                  replyId: reportTarget.reply.id,
                });
              }}
              open={reportTarget?.type === "reply"}
              subject={reportTarget?.type === "reply" ? reportTarget.reply.content : ""}
              title="Denunciar comentário"
            />
          </div>
        ) : null}
      </section>
      <LectumShareVideoModal
        onClose={() => setShareVideoTarget(null)}
        onShared={handleShareVideoShared}
        target={shareVideoTarget}
      />
    </PrivateTemplate>
  );
};

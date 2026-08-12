import { type MouseEventHandler, useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorStatus, getSafeApiErrorMessage } from "@/api/errors";
import type { PostReply } from "@/api/generator/types/posts";
import { useAppSelector } from "@/hooks/redux";
import { formatCommunityRelativeTime as formatRelativeTime } from "@/utils/community-display";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";
import {
  COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE,
  resolveMediaUploadError,
} from "@/utils/media-upload-error";

export const REPLIES_LIMIT = 8;

// Depth starts at 0 for the direct comment, so 3 renders 4 visual layers.
export const MAX_REPLY_TREE_DEPTH = 3;

export const createReplyPageRange = (page: number) =>
  Array.from({ length: Math.max(1, page) }, (_, index) => index + 1);

export const mergeUniqueReplies = (
  replyPages: ReadonlyArray<ReadonlyArray<PostReply> | undefined>,
) => {
  const seenReplyIds = new Set<string>();
  const replies: PostReply[] = [];

  for (const page of replyPages) {
    for (const reply of page ?? []) {
      if (seenReplyIds.has(reply.id)) continue;
      seenReplyIds.add(reply.id);
      replies.push(reply);
    }
  }

  return replies;
};

export type ApiErrorData = {
  code?: string;
  error?: string;
  message?: string;
  status?: number;
};

export type ApiError = Error & {
  data?: ApiErrorData;
};

export type ReplyTarget = {
  id: string;
  name: string;
} | null;

export type ReplyTargetItem = NonNullable<ReplyTarget>;

export type ReplyTargetMap = Record<string, ReplyTargetItem>;

export const EMPTY_REPLY_TARGETS: ReplyTargetMap = {};

export const MODERATION_BLOCKED_MESSAGE =
  "Não foi possível publicar este conteúdo. Remova links, convites externos ou trechos que violem as diretrizes da comunidade.";

export const MODERATION_SAFETY_MESSAGE =
  "Seu conteúdo não foi publicado por segurança. Se você estiver em risco imediato, procure uma pessoa de confiança ou um serviço de emergência local. A Lectum não realiza atendimento de emergência.";

export type ReportTarget = { type: "post" } | { reply: PostReply; type: "reply" } | null;

export type ReplyMediaPermission = {
  canAttach: boolean;
  reason: string;
  showControl: boolean;
};

export const COMMENT_GUIDANCE_MESSAGE = "Comente com respeito e empatia, mesmo quando discordar.";

export const REPLY_MEDIA_UPLOAD_ERROR_MESSAGE =
  "Não foi possível enviar a mídia. Verifique sua conexão e tente novamente.";

export const REPLY_PUBLISH_ERROR_MESSAGE =
  "Não foi possível publicar sua resposta agora. Verifique sua conexão e tente novamente.";

export const POST_DETAIL_MOBILE_QUERY = "(max-width: 639px)";

export const POST_REPLY_CANCEL_DRAG_THRESHOLD = 56;

export const POST_REPLY_COMPOSER_INPUT_SELECTOR =
  "textarea, [role='textbox'][contenteditable='true'], [role='textbox'][contenteditable='plaintext-only']";

export const PSYCHOLOGIST_COMMUNITY_REPLY_TIP_SELECTOR =
  '[data-psychologist-tip-target="community-reply"]';

export const FOCUSED_REPLY_HIGHLIGHT_CLASSES = ["lectum-reply-focus-pulse"] as const;

export const FOCUSED_REPLY_HIGHLIGHT_DURATION_MS = 3200;

export const FOCUSED_REPLY_RETRY_ATTEMPTS = 30;

export const REPLY_DRAFT_DISCARD_CONFIRMATION =
  "Você tem uma resposta em rascunho. Deseja descartá-la?";

export const confirmDiscardReplyDraft = () =>
  typeof window === "undefined" || window.confirm(REPLY_DRAFT_DISCARD_CONFIRMATION);

export const useIsPostDetailMobile = () => {
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

export const useReplyMediaPermission = (): ReplyMediaPermission => {
  const user = useAppSelector((state) => state.user);
  return getCommunityMediaPermission(user);
};

export const useReplyFocusHighlight = (replyId?: string | null, pending = false) => {
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

export const resolvePostError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Este post não foi encontrado ou não está mais disponível.";
  }

  if (normalized.includes("sess") || normalized.includes("token")) {
    return "Sua sessão precisa estar ativa para visualizar a discussão.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar este post agora.";
};

export const resolveReplyError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const code = apiError?.data?.code;

  if (code === "content_moderation_safety_hold") {
    return rawMessage || MODERATION_SAFETY_MESSAGE;
  }

  if (code === "content_moderation_blocked") {
    return rawMessage || MODERATION_BLOCKED_MESSAGE;
  }

  return rawMessage || "Não foi possível publicar sua resposta agora.";
};

export const resolveReplyMediaUploadError = (error: unknown) => {
  const status = getApiErrorStatus(error);
  const message = resolveMediaUploadError(error);
  const normalized = message.toLowerCase();

  if (status === 413) return COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE;

  if (
    normalized.includes("conectar") ||
    normalized.includes("conex") ||
    normalized.includes("demor") ||
    normalized.includes("temporariamente")
  ) {
    return REPLY_MEDIA_UPLOAD_ERROR_MESSAGE;
  }

  return message || REPLY_MEDIA_UPLOAD_ERROR_MESSAGE;
};

export const resolveReplyPublishError = (error: unknown) => {
  const status = getApiErrorStatus(error);
  const message = resolveReplyError(error);
  const normalized = message.toLowerCase();

  if (
    status === 408 ||
    normalized.includes("conectar") ||
    normalized.includes("conex") ||
    normalized.includes("demor") ||
    normalized.includes("temporariamente")
  ) {
    return REPLY_PUBLISH_ERROR_MESSAGE;
  }

  return message || REPLY_PUBLISH_ERROR_MESSAGE;
};

export const isVerifiedProfessionalReply = (reply: PostReply) =>
  reply.author.role === "psicologo" && reply.author.verified;

export const formatReplyAuthorMeta = (
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

export const mentorBadgePosition = (badge?: string | null) => {
  const match = badge?.match(/#(\d+)/);
  if (!match?.[1]) return Number.POSITIVE_INFINITY;

  return Number(match[1]);
};

export const newestReplyFirst = (a: PostReply, b: PostReply) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

export const REPLY_DOWNVOTE_RANKING_WEIGHT = 0.6;

export const replyVoteRankingScore = (reply: PostReply) =>
  reply.upvotes_count - reply.downvotes_count * REPLY_DOWNVOTE_RANKING_WEIGHT;

export const compareReplySiblingsByRelevance = (a: PostReply, b: PostReply) => {
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

export const compareProfessionalReplies = (a: PostReply, b: PostReply) => {
  return compareReplySiblingsByRelevance(a, b);
};

export const orderReplyChildrenByRelevance = (replies: PostReply[]): PostReply[] => {
  return replies
    .map((reply) => ({
      ...reply,
      replies: orderReplyChildrenByRelevance(reply.replies),
    }))
    .sort(compareReplySiblingsByRelevance);
};

export const orderRepliesForProfessionalPriority = (replies: PostReply[]): PostReply[] => {
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

export const countReplyTreeDescendants = (reply: PostReply): number => {
  const loadedDescendants = reply.replies.reduce(
    (total, child) => total + 1 + countReplyTreeDescendants(child),
    0,
  );
  const expectedDirectReplies = reply.replies_count ?? reply.replies.length;
  const notHydratedDirectReplies = Math.max(0, expectedDirectReplies - reply.replies.length);

  return loadedDescendants + notHydratedDirectReplies;
};

export const findReplyInTree = (replies: PostReply[], replyId: string): PostReply | null => {
  for (const reply of replies) {
    if (reply.id === replyId) return reply;

    const child = findReplyInTree(reply.replies, replyId);
    if (child) return child;
  }

  return null;
};

export const isReplyTreeInteractiveTarget = (
  target: EventTarget | null,
  currentTarget: HTMLElement,
) => {
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

export const stopReplyTreeCollapsePropagation: MouseEventHandler<HTMLElement> = (event) => {
  event.stopPropagation();
};

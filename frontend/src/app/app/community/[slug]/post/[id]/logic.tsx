"use client";

import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  Loader2,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Send,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  type ChangeEvent,
  type MouseEvent,
  type MouseEventHandler,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useCreatePostReply,
  useDeleteReply,
  usePostDetail,
  usePostReplies,
  usePostReplyThread,
  useReportPost,
  useReportReply,
  useSavePost,
  useSaveReply,
  useUploadPostReplyMedia,
  useVotePost,
} from "@/api/callers/posts";
import type { PostDetail, PostReply } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityFollowToggle } from "@/components/community/community-follow-toggle";
import { MentorBadge } from "@/components/community/mentor-badge";
import { components } from "@/components/controllers";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import {
  type PostReportForm,
  type ReplyComposerForm,
  toCreatePostReplyPayload,
  toPostReportPayload,
  usePostReportForm,
  useReplyComposerForm,
} from "./use-form";

const REPLIES_LIMIT = 8;

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

const replyMediaPermissionLabel =
  "Mídia disponível apenas para psicólogos verificados com Plano Profissional ativo.";

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
  const activeProfessionalPlan = user?.psychologist_profile?.subscriptions?.some(
    (subscription) =>
      subscription.status === "ativa" &&
      subscription.plan?.active !== false &&
      subscription.plan?.slug !== "gratuito",
  );
  const canAttach = Boolean(
    user?.role === "psicologo" &&
      user.psychologist_profile?.cfp_verified_at &&
      activeProfessionalPlan,
  );

  if (canAttach) {
    return {
      canAttach,
      reason: "",
      showControl: true,
    };
  }

  if (user?.role === "psicologo") {
    return {
      canAttach,
      reason: activeProfessionalPlan
        ? "Confirme seu registro CFP para anexar mídia."
        : replyMediaPermissionLabel,
      showControl: true,
    };
  }

  return {
    canAttach,
    reason: "",
    showControl: false,
  };
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

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const isVerifiedProfessionalReply = (reply: PostReply) =>
  reply.author.role === "psicologo" && reply.author.verified;

const formatReplyAuthorMeta = (author: PostReply["author"], createdAt: string) => {
  const relativeTime = formatRelativeTime(createdAt);

  if (author.role !== "psicologo") return relativeTime;

  return `${author.type_label} • ${relativeTime}`;
};

const mentorBadgePosition = (badge?: string | null) => {
  const match = badge?.match(/#(\d+)/);
  if (!match?.[1]) return Number.POSITIVE_INFINITY;

  return Number(match[1]);
};

const replyGeneralRelevanceScore = (reply: PostReply) => {
  const professionalBonus = isVerifiedProfessionalReply(reply) ? 6 : 0;
  const badgePosition = mentorBadgePosition(reply.author.featured_badge);
  const badgeBonus = Number.isFinite(badgePosition) ? Math.max(0, 6 - badgePosition) : 0;

  return reply.upvotes_count * 3 + reply.replies.length * 2 + professionalBonus + badgeBonus;
};

const newestReplyFirst = (a: PostReply, b: PostReply) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const compareRepliesByRelevance = (a: PostReply, b: PostReply) => {
  const scoreDiff = replyGeneralRelevanceScore(b) - replyGeneralRelevanceScore(a);
  if (scoreDiff !== 0) return scoreDiff;

  const repliesDiff = b.replies.length - a.replies.length;
  if (repliesDiff !== 0) return repliesDiff;

  const upvoteDiff = b.upvotes_count - a.upvotes_count;
  if (upvoteDiff !== 0) return upvoteDiff;

  const recencyDiff = newestReplyFirst(a, b);
  if (recencyDiff !== 0) return recencyDiff;

  return b.id.localeCompare(a.id);
};

const compareProfessionalReplies = (a: PostReply, b: PostReply) => {
  const upvoteDiff = b.upvotes_count - a.upvotes_count;
  if (upvoteDiff !== 0) return upvoteDiff;

  const badgeDiff =
    mentorBadgePosition(a.author.featured_badge) - mentorBadgePosition(b.author.featured_badge);
  if (badgeDiff !== 0) return badgeDiff;

  return compareRepliesByRelevance(a, b);
};

const orderRepliesForProfessionalPriority = (replies: PostReply[]): PostReply[] => {
  const withOrderedChildren = replies.map((reply) => ({
    ...reply,
    replies: orderRepliesForProfessionalPriority(reply.replies),
  }));
  const pinnedProfessional = [...withOrderedChildren]
    .filter(isVerifiedProfessionalReply)
    .sort(compareProfessionalReplies)[0];
  const remainingReplies = withOrderedChildren
    .filter((reply) => reply.id !== pinnedProfessional?.id)
    .sort(compareRepliesByRelevance);

  return pinnedProfessional ? [pinnedProfessional, ...remainingReplies] : remainingReplies;
};

const AuthorAvatar = ({
  anonymous,
  author,
  href,
  size = "md",
}: {
  anonymous?: boolean;
  author: PostDetail["author"] | PostReply["author"];
  href?: string;
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

  const avatar = (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-white dark:ring-background",
        sizeClass,
      )}
    >
      {avatarSrc ? (
        <Image
          alt={author.name}
          className="object-cover"
          fill
          sizes={imageSize}
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(author.name)
      )}
    </span>
  );

  if (!href) return avatar;

  return (
    <Link
      aria-label={`Abrir perfil de ${author.name}`}
      className="shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      href={href}
    >
      {avatar}
    </Link>
  );
};

const MediaBlock = ({
  alt,
  mediaType,
  mediaUrl,
  size = "lg",
}: {
  alt: string;
  mediaType: string | null;
  mediaUrl: string | null;
  size?: "lg" | "md";
}) => {
  if (!mediaUrl) return null;

  const src = resolvePublicMediaUrl(mediaUrl);
  if (!src) return null;

  const radius = size === "lg" ? "rounded-[22px]" : "rounded-[18px]";
  const compactMediaClass = size === "md" ? "mx-auto w-full max-w-[280px] sm:max-w-[320px]" : "";
  const videoFrameClass =
    size === "md"
      ? "mx-auto w-full max-w-[280px] sm:max-w-[320px]"
      : "mx-auto w-full max-w-[390px] sm:max-w-[420px]";
  const imageSizes =
    size === "lg"
      ? "(max-width: 430px) calc(100vw - 40px), 640px"
      : "(max-width: 430px) calc(100vw - 64px), 540px";

  if (mediaType === "video") {
    return (
      <VerticalVideoPlayer
        className={cn("mt-3 border-border", radius, videoFrameClass)}
        fit="contain"
        src={src}
        title={alt}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative mt-3 aspect-[4/5] overflow-hidden border border-border bg-surface-muted",
        radius,
        compactMediaClass,
      )}
    >
      <Image
        alt={alt}
        className="object-cover"
        fill
        sizes={imageSizes}
        src={src}
        unoptimized={isPublicMediaUrl(mediaUrl)}
      />
    </div>
  );
};

const PostHeader = ({
  onReport,
  post,
  slug,
}: {
  onReport: () => void;
  post: PostDetail;
  slug: string;
}) => {
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;
  const psychologistProfileHref = isPsychologistPost
    ? `/app/psychologist/${post.author.id}`
    : undefined;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="grid gap-4 px-5 pt-4 pb-3">
      <div className="-mx-5 flex items-center justify-between gap-3 border-[#EDF1F5] border-b px-5 pb-3 dark:border-border">
        <Button asChild className="h-10 w-10 rounded-full p-0" variant="ghost">
          <Link href={slug ? `/app/community/${slug}` : DEFAULT_COMMUNITY_FEED_HREF}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="text-base font-black text-[#182033] dark:text-foreground">Post</h1>
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
      </div>

      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-muted">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="shrink-0">Postado em</span>
        <Link
          className="block min-w-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap font-bold text-[#64748B] no-underline hover:text-[#64748B] hover:no-underline dark:text-muted dark:hover:text-muted"
          href={`/app/community/${post.community.slug}`}
        >
          {post.community.name}
        </Link>
        <CommunityFollowToggle
          className="ml-1"
          initialFollowing={Boolean(post.community.following)}
          slug={post.community.slug}
        />
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
                  {post.author.name}
                </Link>
              ) : (
                <h2 className="truncate text-sm font-black text-foreground">{post.author.name}</h2>
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
              {formatRelativeTime(post.created_at)}
            </Link>
          ) : (
            <p className="text-[11px] font-semibold text-muted">
              {formatRelativeTime(post.created_at)}
            </p>
          )}
        </div>
      </div>
    </header>
  );
};

const PostBody = ({ post }: { post: PostDetail }) => {
  const [contentExpanded, setContentExpanded] = useState(false);

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
      <MediaBlock alt={post.title} mediaType={post.media_type} mediaUrl={post.media_url} />
    </div>
  );
};

const PostVoteBar = ({
  currentVote,
  disabled,
  onFocusCommentComposer,
  onShare,
  onToggleSave,
  onVote,
  post,
}: {
  currentVote: 1 | -1 | null;
  disabled?: boolean;
  onFocusCommentComposer: () => void;
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

const ReplyVoteBar = ({
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
}) => (
  <CommunityActionBar
    className="mt-2 sm:mt-3"
    currentVote={currentVote}
    disabled={disabled}
    onVote={onVote}
    reply={{
      label: "Responder",
      onClick: onReply,
    }}
    save={{
      active: reply.saved,
      disabled: savePending,
      label: reply.saved ? "Remover resposta dos salvos" : "Salvar resposta",
      onClick: onToggleSave,
    }}
    share={{
      label: "Compartilhar resposta",
      onClick: onShare,
    }}
    upvotesCount={reply.upvotes_count}
    voteLabel="Marcar resposta como útil"
  />
);

const ReplyCard = ({
  currentUserId,
  deleteReplyPending,
  depth = 0,
  inlineReplyTargets,
  mediaPermission,
  onCancelInlineReplyTarget,
  onDeleteReply,
  onReply,
  onReportReply,
  onShare,
  onSubmitReply,
  onVote,
  maxInlineDepth = 1,
  postId,
  professionalThread,
  reply,
  replyApiError,
  replyDisabled,
  threadHrefBase,
  votePending,
}: {
  currentUserId?: string | null;
  deleteReplyPending?: boolean;
  depth?: number;
  inlineReplyTargets: ReplyTargetMap;
  mediaPermission: ReplyMediaPermission;
  onCancelInlineReplyTarget: (replyId: string) => void;
  onDeleteReply: (reply: PostReply) => void;
  onReply: (reply: PostReply) => void;
  onReportReply: (reply: PostReply) => void;
  onShare: (reply: PostReply) => void;
  onSubmitReply: (
    values: ReplyComposerForm,
    parentReplyId: string,
    mediaFile?: File | null,
  ) => Promise<void> | void;
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
  const isOwnReply = Boolean(currentUserId && reply.author.id === currentUserId);
  const highlightedProfessionalThread = professionalThread || isVerifiedProfessional;
  const saveReplyMutation = useSaveReply(postId, reply.id);
  const psychologistProfileHref = isProfessional ? `/app/psychologist/${reply.author.id}` : null;
  const inlineReplyTarget = inlineReplyTargets[reply.id] ?? null;
  const isReplyComposerOpen = Boolean(inlineReplyTarget);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const canRenderChildren = maxInlineDepth < 0 || depth < maxInlineDepth;
  const visibleChildren = canRenderChildren ? reply.replies : [];
  const totalRepliesCount = reply.replies_count ?? reply.replies.length;
  const hiddenRepliesCount = Math.max(0, totalRepliesCount - visibleChildren.length);
  const threadHref = threadHrefBase ? `${threadHrefBase}/${reply.id}` : null;

  return (
    <article
      className={cn(
        "relative grid gap-2 rounded-[20px] bg-white p-4 text-[#182033] dark:bg-surface dark:text-foreground",
        depth === 0
          ? "border border-[#E5EAF0] shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
          : "border border-[#EDF1F5] shadow-none",
        highlightedProfessionalThread &&
          "border-[#D8ECFF] bg-[#F4FAFF] shadow-none dark:border-primary/20 dark:bg-primary/5",
      )}
      id={`reply-${reply.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <AuthorAvatar
            author={reply.author}
            href={psychologistProfileHref ?? undefined}
            size={isProfessional ? "reply" : "sm"}
          />
          <div className="grid min-w-0 gap-1">
            <div className="flex min-w-0 items-center gap-x-2">
              <div className="flex min-w-0 items-center gap-[5px]">
                {isProfessional ? (
                  <Link
                    className="truncate text-sm font-black text-inherit no-underline hover:text-inherit hover:no-underline"
                    href={`/app/psychologist/${reply.author.id}`}
                  >
                    {reply.author.name}
                  </Link>
                ) : (
                  <h3 className="truncate text-sm font-black">{reply.author.name}</h3>
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
              />
            </div>
            {psychologistProfileHref ? (
              <Link
                className="w-fit cursor-pointer text-[11px] font-semibold text-muted no-underline hover:text-muted hover:no-underline"
                href={psychologistProfileHref}
              >
                {formatReplyAuthorMeta(reply.author, reply.created_at)}
              </Link>
            ) : (
              <p className="text-[11px] font-semibold text-muted">
                {formatReplyAuthorMeta(reply.author, reply.created_at)}
              </p>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Mais opções da resposta"
            className="grid h-8 w-8 place-items-center rounded-full text-[#64748B] transition hover:bg-surface-muted"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </button>

          {menuOpen ? (
            <div
              className="absolute top-9 right-0 z-20 w-56 overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white p-1.5 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-border dark:bg-surface"
              role="menu"
            >
              {isOwnReply ? (
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-danger transition hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deleteReplyPending}
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteReply(reply);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Excluir comentário
                </button>
              ) : (
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#182033] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
                  onClick={() => {
                    setMenuOpen(false);
                    onReportReply(reply);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  Denunciar comentário
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <InlineExpandableText
        className="text-sm leading-6 text-[#475569] dark:text-muted"
        expanded={contentExpanded}
        onToggle={() => setContentExpanded((current) => !current)}
        text={reply.content}
      />
      <MediaBlock
        alt="Mídia da resposta"
        mediaType={reply.media_type}
        mediaUrl={reply.media_url}
        size="md"
      />

      {isProfessional && reply.author.verified && reply.author.whatsapp_url ? (
        <PsychologistWhatsAppRedirectButton
          className="mx-auto mt-1 inline-flex h-11 w-full max-w-[280px] items-center justify-center gap-2 rounded-[14px] border-2 border-success bg-transparent text-success shadow-none transition hover:bg-success hover:text-white sm:max-w-[320px]"
          psychologist={{
            avatar: reply.author.avatar,
            crp: reply.author.crp,
            id: reply.author.id,
            name: reply.author.name,
            typeLabel: reply.author.type_label,
            whatsappUrl: reply.author.whatsapp_url,
          }}
        >
          <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
          Chamar no WhatsApp
        </PsychologistWhatsAppRedirectButton>
      ) : null}

      <ReplyVoteBar
        currentVote={reply.current_user_vote}
        disabled={votePending}
        onReply={() => onReply(reply)}
        onShare={() => onShare(reply)}
        onToggleSave={() => saveReplyMutation.mutate(reply.saved)}
        onVote={(value) => onVote(reply.id, value)}
        reply={reply}
        savePending={saveReplyMutation.isPending}
      />

      {isReplyComposerOpen ? (
        <ReplyComposer
          apiError={replyApiError}
          disabled={replyDisabled}
          mediaPermission={mediaPermission}
          onCancelContext={() => onCancelInlineReplyTarget(reply.id)}
          onSubmit={(values, mediaFile) => onSubmitReply(values, reply.id, mediaFile)}
          replyTarget={inlineReplyTarget}
          variant="inline"
          autoFocus
        />
      ) : null}

      {visibleChildren.length > 0 || hiddenRepliesCount > 0 ? (
        <div
          className={cn(
            "ml-4 grid gap-3 border-[#DCEBFF] border-l-2 pl-4",
            highlightedProfessionalThread &&
              "-mr-1 rounded-2xl border-[#BBDFFF] bg-[#F4FAFF]/70 p-3 pl-4 dark:border-primary/25 dark:bg-primary/5",
          )}
        >
          {visibleChildren.map((child) => (
            <ReplyCard
              currentUserId={currentUserId}
              deleteReplyPending={deleteReplyPending}
              depth={depth + 1}
              inlineReplyTargets={inlineReplyTargets}
              key={child.id}
              maxInlineDepth={maxInlineDepth}
              mediaPermission={mediaPermission}
              onCancelInlineReplyTarget={onCancelInlineReplyTarget}
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
          ))}
          {hiddenRepliesCount > 0 && threadHref ? (
            <Link
              className="w-fit rounded-full px-2 py-1 text-[11px] font-black text-primary no-underline transition hover:bg-primary-soft hover:text-primary hover:no-underline"
              href={threadHref}
            >
              Ver mais {hiddenRepliesCount} {hiddenRepliesCount === 1 ? "resposta" : "respostas"}
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
  onSubmit: (values: ReplyComposerForm, mediaFile?: File | null) => Promise<void> | void;
  replyToName?: string | null;
  replyTarget: ReplyTarget;
  variant?: "inline" | "main";
}) => {
  const form = useReplyComposerForm(replyTarget?.name ?? replyToName);
  const { formProps, hook } = form;
  const [composerActive, setComposerActive] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const localFormRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedFormRef = formRef ?? localFormRef;
  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    if (!hook.formState.isSubmitted) return null;

    return Object.values(hook.formState.errors)[0]?.message?.toString() ?? null;
  }, [apiError, hook.formState.errors, hook.formState.isSubmitted]);
  const content = hook.watch("content");
  const draft = String(content ?? "").trim();
  const hasDraft = draft.length > 0;
  const ready = hasDraft;
  const expanded =
    composerActive ||
    hasDraft ||
    Boolean(selectedMedia) ||
    (Boolean(replyTarget) && mediaPermission.showControl);
  const FieldComponent = components[formProps.fields[0].field];
  const isInline = variant === "inline";
  const shouldShowMediaControls = mediaPermission.showControl || Boolean(selectedMedia);
  const shouldShowGuidance = composerActive || hasDraft || Boolean(selectedMedia);
  const shouldShowReplyContext = !isInline && Boolean(replyTarget);
  const autoFocusTargetId = replyTarget?.id ?? "main";

  useEffect(() => {
    if (!autoFocus || !autoFocusTargetId) return;

    const timer = window.setTimeout(() => {
      const inputNode = resolvedFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      inputNode?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocus, autoFocusTargetId, resolvedFormRef]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !mediaPermission.canAttach) return;

    setSelectedMedia(file);
    setComposerActive(true);
  };

  return (
    <form
      className={cn(
        "grid gap-2 border-[#DDE6F0] bg-white/95 p-3 dark:border-border dark:bg-surface/95",
        isInline
          ? "mt-3 rounded-[20px] border shadow-none"
          : "fixed inset-x-0 bottom-0 z-40 border-t pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_-16px_44px_rgba(15,23,42,0.14)] backdrop-blur-md sm:static sm:rounded-[22px] sm:border sm:bg-white sm:pb-3 sm:shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:backdrop-blur-0 dark:sm:bg-surface",
      )}
      noValidate
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        if (!String(hook.getValues("content") ?? "").trim() && !selectedMedia) {
          setComposerActive(false);
        }
      }}
      onFocus={() => setComposerActive(true)}
      onSubmit={hook.handleSubmit(async (values) => {
        try {
          await onSubmit(values, selectedMedia);
          hook.reset({ content: "" });
          setSelectedMedia(null);
          setComposerActive(false);
        } catch {
          // O estado de erro é tratado pela mutation para manter o campo preenchido.
        }
      })}
      ref={resolvedFormRef}
    >
      {shouldShowGuidance ? (
        <p className="rounded-[14px] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold leading-5 text-[#64748B] dark:bg-surface-muted dark:text-muted">
          {COMMENT_GUIDANCE_MESSAGE}
        </p>
      ) : null}

      {shouldShowReplyContext ? (
        <div className="flex min-w-0 items-center justify-between gap-3 px-1 text-[11px] font-semibold leading-4 text-[#64748B] dark:text-muted">
          <span className="min-w-0 truncate">Respondendo {replyTarget?.name}</span>
          <button
            className="shrink-0 rounded-full px-2 py-1 text-[11px] font-bold text-[#308CE8] transition hover:bg-primary-soft"
            onClick={onCancelContext}
            type="button"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <FieldComponent control={hook.control} {...formProps.fields[0]} />
        </div>
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

      {expanded && shouldShowMediaControls ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs text-muted">
          <input
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={handleMediaChange}
            ref={fileInputRef}
            type="file"
          />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <button
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-bold transition",
                mediaPermission.canAttach
                  ? "border-[#D6E3F2] bg-white text-[#475569] hover:border-[#B8D7F5] hover:text-[#308CE8] dark:bg-surface"
                  : "cursor-not-allowed border-[#E5EAF0] bg-[#F8FAFC] text-[#94A3B8]",
              )}
              disabled={!mediaPermission.canAttach || disabled}
              onClick={() => fileInputRef.current?.click()}
              title={mediaPermission.canAttach ? "Anexar mídia" : mediaPermission.reason}
              type="button"
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              Anexar mídia
            </button>

            {!mediaPermission.canAttach && mediaPermission.reason ? (
              <span className="max-w-[280px] leading-4 text-[#64748B]">
                {mediaPermission.reason}
              </span>
            ) : null}

            {selectedMedia ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 font-bold text-primary">
                <span className="truncate">{selectedMedia.name}</span>
                <button
                  aria-label="Remover mídia anexada"
                  className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/70"
                  onClick={() => setSelectedMedia(null)}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ) : null}
          </div>
        </div>
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

const Pagination = ({
  currentPage,
  disabled,
  onPageChange,
  pages,
}: {
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pages: number;
}) => {
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Paginação de respostas"
      className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-white p-3 shadow-[var(--lectum-shadow-soft)] dark:bg-surface"
    >
      <Button
        disabled={currentPage <= 1 || disabled}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
        variant="outline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Anterior
      </Button>
      <span className="text-sm font-bold text-muted">
        {currentPage} de {pages}
      </span>
      <Button
        disabled={currentPage >= pages || disabled}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
        variant="outline"
      >
        Próxima
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
};

const RepliesList = ({
  currentUserId,
  deleteReplyPending,
  errorMessage,
  inlineReplyTargets,
  loading,
  maxInlineDepth = 1,
  mediaPermission,
  onCancelInlineReplyTarget,
  onDeleteReply,
  onReply,
  onReportReply,
  onShare,
  onSubmitReply,
  onVote,
  postId,
  replies,
  replyApiError,
  replyDisabled,
  threadHrefBase,
  votePending,
}: {
  currentUserId?: string | null;
  deleteReplyPending?: boolean;
  errorMessage?: string | null;
  inlineReplyTargets: ReplyTargetMap;
  loading?: boolean;
  maxInlineDepth?: number;
  mediaPermission: ReplyMediaPermission;
  onCancelInlineReplyTarget: (replyId: string) => void;
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
  postId: string;
  replies: PostReply[];
  replyApiError?: string | null;
  replyDisabled?: boolean;
  threadHrefBase?: string;
  votePending?: boolean;
}) => {
  const orderedReplies = useMemo(() => orderRepliesForProfessionalPriority(replies), [replies]);

  return (
    <section className="grid gap-3" id="discussao">
      <div className="flex items-center gap-2 px-1">
        <span className="h-6 w-1 rounded-full bg-[#308CE8]" />
        <h2 className="text-sm font-black tracking-[0.08em] text-[#64748B] uppercase">Discussão</h2>
      </div>

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
        <div className="grid gap-4 border-[#DCEBFF] border-l-2 pl-3">
          {orderedReplies.map((reply) => (
            <ReplyCard
              currentUserId={currentUserId}
              deleteReplyPending={deleteReplyPending}
              inlineReplyTargets={inlineReplyTargets}
              key={reply.id}
              maxInlineDepth={maxInlineDepth}
              mediaPermission={mediaPermission}
              onCancelInlineReplyTarget={onCancelInlineReplyTarget}
              onDeleteReply={onDeleteReply}
              onReply={onReply}
              onReportReply={onReportReply}
              onShare={onShare}
              onSubmitReply={onSubmitReply}
              onVote={onVote}
              postId={postId}
              reply={reply}
              replyApiError={replyApiError}
              replyDisabled={replyDisabled}
              threadHrefBase={threadHrefBase}
              votePending={votePending}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export const PostDetailLogic = () => {
  const params = useParams<{ slug: string; id: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const postId = typeof params.id === "string" ? params.id : "";
  const isMobile = useIsPostDetailMobile();
  const currentUserId = useAppSelector((state) => state.user?.id ?? null);
  const [page, setPage] = useState(1);
  const [mobileReplyTarget, setMobileReplyTarget] = useState<ReplyTarget>(null);
  const [desktopReplyTargets, setDesktopReplyTargets] = useState<ReplyTargetMap>({});
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteReplyError, setDeleteReplyError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const mediaPermission = useReplyMediaPermission();
  const postQuery = usePostDetail(postId);
  const repliesQuery = usePostReplies(
    postId,
    { page, limit: REPLIES_LIMIT },
    Boolean(postQuery.data),
  );
  const voteMutation = useVotePost(postId);
  const saveMutation = useSavePost(postId);
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
  const replies = repliesQuery.data?.data ?? [];
  const postError = postQuery.isError ? resolvePostError(postQuery.error) : null;
  const repliesError = repliesQuery.isError ? resolvePostError(repliesQuery.error) : null;
  const hasDesktopReplyTargets = !isMobile && Object.keys(desktopReplyTargets).length > 0;
  const activeMobileReplyTarget = isMobile ? mobileReplyTarget : null;
  const visibleInlineReplyTargets = isMobile ? EMPTY_REPLY_TARGETS : desktopReplyTargets;

  const sharePost = async () => {
    if (!post || typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback("post");
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const shareReply = async (reply: PostReply) => {
    if (!post || typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}#reply-${reply.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: reply.content, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(reply.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const focusMainComposer = () => {
    setReplyError(null);
    setMobileReplyTarget(null);

    window.setTimeout(() => {
      const composerNode = composerRef.current;
      const inputNode = composerNode?.querySelector<HTMLTextAreaElement>("textarea");

      if (!isMobile) {
        composerNode?.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      inputNode?.focus({ preventScroll: true });
    }, 0);
  };

  const handleReplyTarget = (reply: PostReply) => {
    setReplyError(null);
    const target = { id: reply.id, name: reply.author.name };

    if (isMobile) {
      setMobileReplyTarget(target);

      window.setTimeout(() => {
        const inputNode = composerRef.current?.querySelector<HTMLTextAreaElement>("textarea");
        inputNode?.focus({ preventScroll: true });
      }, 0);

      return;
    }

    setDesktopReplyTargets((currentTargets) => ({
      ...currentTargets,
      [reply.id]: target,
    }));
  };

  const submitReply = async (
    values: ReplyComposerForm,
    parentReplyId?: string | null,
    mediaFile?: File | null,
  ) => {
    if (!post) return;

    setReplyError(null);
    const media = mediaFile
      ? await uploadReplyMediaMutation.mutateAsync({
          file: mediaFile,
          id: post.id,
        })
      : null;

    await createReplyMutation.mutateAsync({
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

    if (parentReplyId) {
      setDesktopReplyTargets((currentTargets) => {
        if (!currentTargets[parentReplyId]) return currentTargets;

        const nextTargets = { ...currentTargets };
        delete nextTargets[parentReplyId];
        return nextTargets;
      });
      setMobileReplyTarget((currentTarget) =>
        currentTarget?.id === parentReplyId ? null : currentTarget,
      );
    } else {
      setMobileReplyTarget(null);
    }
  };

  return (
    <PrivateTemplate
      contentClassName="bg-[#F5F7FA] px-0 py-0 dark:bg-background"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-[#F5F7FA] pb-6 text-[#182033] dark:bg-background dark:text-foreground sm:max-w-2xl lg:max-w-3xl">
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
                onReport={() => {
                  setReportError(null);
                  setReportTarget({ type: "post" });
                }}
                post={post}
                slug={slug || post.community.slug}
              />
              <PostBody post={post} />
              <PostVoteBar
                currentVote={post.current_user_vote}
                disabled={voteMutation.isPending || saveMutation.isPending}
                onFocusCommentComposer={focusMainComposer}
                onShare={sharePost}
                onToggleSave={() => saveMutation.mutate(post.saved)}
                onVote={(value) => voteMutation.mutate({ value })}
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
                onCancelContext={() => setMobileReplyTarget(null)}
                onSubmit={(values, mediaFile) =>
                  submitReply(values, activeMobileReplyTarget?.id ?? null, mediaFile)
                }
                replyToName={post.author.name}
                replyTarget={activeMobileReplyTarget}
              />

              <RepliesList
                currentUserId={currentUserId}
                deleteReplyPending={deleteReplyMutation.isPending}
                errorMessage={repliesError}
                inlineReplyTargets={visibleInlineReplyTargets}
                loading={repliesQuery.isLoading || repliesQuery.isPending}
                mediaPermission={mediaPermission}
                onCancelInlineReplyTarget={(replyId) =>
                  setDesktopReplyTargets((currentTargets) => {
                    if (!currentTargets[replyId]) return currentTargets;

                    const nextTargets = { ...currentTargets };
                    delete nextTargets[replyId];
                    return nextTargets;
                  })
                }
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
                onVote={(replyId, value) => voteMutation.mutate({ replyId, value })}
                postId={post.id}
                replies={replies}
                replyApiError={replyError}
                replyDisabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
                threadHrefBase={`/app/community/${post.community.slug}/post/${post.id}/thread`}
                votePending={voteMutation.isPending}
              />

              {repliesQuery.isFetching && !repliesQuery.isLoading ? (
                <LoadingState label="Atualizando respostas" />
              ) : null}

              <Pagination
                currentPage={page}
                disabled={repliesQuery.isFetching}
                onPageChange={setPage}
                pages={repliesQuery.data?.pages ?? 0}
              />
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
    </PrivateTemplate>
  );
};

export const PostReplyThreadLogic = () => {
  const params = useParams<{ id: string; replyId: string; slug: string }>();
  const postId = typeof params.id === "string" ? params.id : "";
  const replyId = typeof params.replyId === "string" ? params.replyId : "";
  const isMobile = useIsPostDetailMobile();
  const currentUserId = useAppSelector((state) => state.user?.id ?? null);
  const [mobileReplyTarget, setMobileReplyTarget] = useState<ReplyTarget>(null);
  const [desktopReplyTargets, setDesktopReplyTargets] = useState<ReplyTargetMap>({});
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteReplyError, setDeleteReplyError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const mediaPermission = useReplyMediaPermission();
  const postQuery = usePostDetail(postId);
  const threadQuery = usePostReplyThread(postId, replyId, Boolean(postId && replyId));
  const voteMutation = useVotePost(postId);
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
  const postError = postQuery.isError ? resolvePostError(postQuery.error) : null;
  const threadError = threadQuery.isError ? resolvePostError(threadQuery.error) : null;
  const activeMobileReplyTarget = isMobile ? mobileReplyTarget : null;
  const visibleInlineReplyTargets = isMobile ? EMPTY_REPLY_TARGETS : desktopReplyTargets;

  const shareReply = async (reply: PostReply) => {
    if (!post || typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}#reply-${reply.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: reply.content, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(reply.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const handleReplyTarget = (reply: PostReply) => {
    setReplyError(null);
    const target = { id: reply.id, name: reply.author.name };

    if (isMobile) {
      setMobileReplyTarget(target);
      window.setTimeout(() => {
        const inputNode = composerRef.current?.querySelector<HTMLTextAreaElement>("textarea");
        inputNode?.focus({ preventScroll: true });
      }, 0);
      return;
    }

    setDesktopReplyTargets((currentTargets) => ({
      ...currentTargets,
      [reply.id]: target,
    }));
  };

  const submitReply = async (
    values: ReplyComposerForm,
    parentReplyId?: string | null,
    mediaFile?: File | null,
  ) => {
    if (!post || !rootReply) return;

    setReplyError(null);
    const media = mediaFile
      ? await uploadReplyMediaMutation.mutateAsync({
          file: mediaFile,
          id: post.id,
        })
      : null;

    await createReplyMutation.mutateAsync({
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

    if (parentReplyId) {
      setDesktopReplyTargets((currentTargets) => {
        if (!currentTargets[parentReplyId]) return currentTargets;

        const nextTargets = { ...currentTargets };
        delete nextTargets[parentReplyId];
        return nextTargets;
      });
    }

    setMobileReplyTarget(null);
  };

  return (
    <PrivateTemplate
      contentClassName="bg-[#F5F7FA] px-0 py-0 dark:bg-background"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-[#F5F7FA] pb-6 text-[#182033] dark:bg-background dark:text-foreground sm:max-w-2xl lg:max-w-3xl">
        <div className="sticky top-0 z-30 flex items-center justify-between border-[#EDF1F5] border-b bg-white/90 px-5 py-3 backdrop-blur dark:border-border dark:bg-surface/90">
          <Button asChild className="h-10 w-10 rounded-full p-0" variant="ghost">
            <Link href={post ? `/app/community/${post.community.slug}/post/${post.id}` : "../"}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Voltar ao post</span>
            </Link>
          </Button>
          <h1 className="text-base font-black text-[#182033] dark:text-foreground">Respostas</h1>
          <span className="h-10 w-10" aria-hidden="true" />
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
                        ? `/app/community/${post.community.slug}/post/${post.id}`
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
            <div className="rounded-[22px] border border-[#D8ECFF] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-border dark:bg-surface">
              <p className="text-xs font-bold tracking-[0.08em] text-[#64748B] uppercase">
                Fio de respostas
              </p>
              <h2 className="mt-1 line-clamp-2 text-lg font-black tracking-[-0.03em] text-[#182033] dark:text-foreground">
                {post.title}
              </h2>
            </div>

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

            <ReplyComposer
              apiError={isMobile ? replyError : null}
              autoFocus={Boolean(activeMobileReplyTarget)}
              disabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
              formRef={composerRef}
              mediaPermission={mediaPermission}
              onCancelContext={() => setMobileReplyTarget(null)}
              onSubmit={(values, mediaFile) =>
                submitReply(values, activeMobileReplyTarget?.id ?? rootReply.id, mediaFile)
              }
              replyToName={rootReply.author.name}
              replyTarget={activeMobileReplyTarget}
            />

            <RepliesList
              currentUserId={currentUserId}
              deleteReplyPending={deleteReplyMutation.isPending}
              errorMessage={null}
              inlineReplyTargets={visibleInlineReplyTargets}
              loading={false}
              maxInlineDepth={-1}
              mediaPermission={mediaPermission}
              onCancelInlineReplyTarget={(targetId) =>
                setDesktopReplyTargets((currentTargets) => {
                  if (!currentTargets[targetId]) return currentTargets;

                  const nextTargets = { ...currentTargets };
                  delete nextTargets[targetId];
                  return nextTargets;
                })
              }
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
              onVote={(targetReplyId, value) =>
                voteMutation.mutate({ replyId: targetReplyId, value })
              }
              postId={post.id}
              replies={[rootReply]}
              replyApiError={replyError}
              replyDisabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
              threadHrefBase={`/app/community/${post.community.slug}/post/${post.id}/thread`}
              votePending={voteMutation.isPending}
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
    </PrivateTemplate>
  );
};

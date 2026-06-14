"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Flame,
  ListChecks,
  MessageCircle,
  Play,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  UserX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useCommunityDetail,
  useCommunityFeedPosts,
  useCommunityPosts,
  useFollowCommunity,
  useUnfollowCommunity,
} from "@/api/callers/community";
import { useSavePost, useVotePost } from "@/api/callers/posts";
import type {
  CommunityDetail,
  CommunityFeedScope,
  CommunityPost,
} from "@/api/generator/types/community";
import { CommunityFollowButton } from "@/components/community/community-follow-button";
import { CommunityFollowToggle } from "@/components/community/community-follow-toggle";
import { PostActionButton, PostActionLink } from "@/components/community/post-action-button";
import { VoteActionButton, type VoteValue } from "@/components/community/vote-action-button";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Input } from "@/registry/new-york-v4/ui/input";
import { PrivateTemplate } from "@/templates/private";
import {
  COMMUNITY_CREATE_POST_HREF,
  COMMUNITY_EXPLORE_HREF,
  COMMUNITY_FEED_CHIPS,
  COMMUNITY_FEED_SLUG,
  DEFAULT_COMMUNITY_FEED_HREF,
  getCommunityFeedChip,
} from "@/utils/community";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PAGE_LIMIT = 12;
const COMMUNITY_RULES_SESSION_KEY_PREFIX = "lectum:community-rules";

const readCommunityRulesSessionState = (storageKey: string) => {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(storageKey) === "expanded";
  } catch {
    return false;
  }
};

const writeCommunityRulesSessionState = (storageKey: string, isExpanded: boolean) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey, isExpanded ? "expanded" : "collapsed");
  } catch {
    return;
  }
};

const COMMUNITY_POST_SORTS = [
  { icon: Flame, label: "Em destaque", value: "featured" },
  { icon: CalendarDays, label: "Novos", value: "new" },
  { icon: MessageCircle, label: "Mais discutidos", value: "discussed" },
] as const;

type CommunityPostSort = (typeof COMMUNITY_POST_SORTS)[number]["value"];

const FEED_SCOPE_OPTIONS: Array<{ label: string; value: CommunityFeedScope }> = [
  { label: "Todas as comunidades", value: "all" },
  { label: "Comunidades que sigo", value: "following" },
];

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type VoteSnapshot = {
  currentVote: VoteValue;
  downvotes: number;
  postId: string;
  upvotes: number;
};

type SaveSnapshot = {
  saved: boolean;
  saves: number;
};

const INLINE_TEXT_MAX_LINES = 2;
const INLINE_TEXT_MORE_LABEL = "... ver mais";
const INLINE_TEXT_LESS_LABEL = "ver menos";

const InlineExpandableText = ({
  className,
  expanded,
  onToggle,
  text,
}: {
  className?: string;
  expanded: boolean;
  onToggle: (event: ReactMouseEvent<HTMLButtonElement>) => void;
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

    const fitsWithinTwoLines = (value: string) => {
      measureNode.textContent = value;

      return measureNode.scrollHeight <= lineHeightPx() * INLINE_TEXT_MAX_LINES + 1;
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

      if (fitsWithinTwoLines(normalizedText)) {
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
        const candidate = `${candidatePreview} ${INLINE_TEXT_MORE_LABEL}`;

        if (fitsWithinTwoLines(candidate)) {
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
              {expanded ? INLINE_TEXT_LESS_LABEL : INLINE_TEXT_MORE_LABEL}
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

const resolveFeedError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Este recorte do feed não foi encontrado ou não está disponível.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar o feed da comunidade.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar o feed da comunidade agora.";
};

const resolveCommunityDetailError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Comunidade não encontrada ou indisponível.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar esta comunidade.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar a comunidade agora.";
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

const formatCompactCount = (value: number, singular: string, plural: string) => {
  const label = value === 1 ? singular : plural;

  return `${value.toLocaleString("pt-BR")} ${label}`;
};

const resolveVoteSnapshot = (snapshot: VoteSnapshot, value: 1 | -1): VoteSnapshot => {
  const nextVote = snapshot.currentVote === value ? null : value;
  const upDelta = (nextVote === 1 ? 1 : 0) - (snapshot.currentVote === 1 ? 1 : 0);
  const downDelta = (nextVote === -1 ? 1 : 0) - (snapshot.currentVote === -1 ? 1 : 0);

  return {
    ...snapshot,
    currentVote: nextVote,
    downvotes: Math.max(0, snapshot.downvotes + downDelta),
    upvotes: Math.max(0, snapshot.upvotes + upDelta),
  };
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const communityDetailHref = (communitySlug: string) => `/app/community/${communitySlug}`;
const communityCreatePostHref = (communitySlug: string) =>
  `/app/community/${communitySlug}/post/new`;
const communityPostDetailHref = (post: CommunityPost) =>
  `/app/community/${post.community.slug}/post/${post.id}`;

const AuthorAvatar = ({
  anonymous,
  author,
  size = "md",
}: {
  anonymous?: boolean;
  author: CommunityPost["author"];
  size?: "md" | "lg";
}) => {
  const sizeClass = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const imageSize = size === "lg" ? "40px" : "36px";

  if (anonymous) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-[#F1F5F9] text-[#94A3B8] ring-2 ring-[#E2E8F0] dark:bg-surface-muted dark:text-muted dark:ring-border",
          sizeClass,
        )}
      >
        <UserX className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(author.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(author.avatar);

  return (
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
};

const mentorBadgeClassName = (badge: string) => {
  if (badge.includes("#1")) {
    return "text-[#D4A017]";
  }

  if (badge.includes("#2")) {
    return "text-[#8A8F98]";
  }

  if (badge.includes("#3")) {
    return "text-[#B87333]";
  }

  return "text-[#D4A017]";
};

const mentorBadgeLabel = (badge: string) => {
  return badge.replace(/\bMENTOR\b/i, "Mentor");
};

const MentorBadge = ({ badge, className }: { badge?: string | null; className?: string }) => {
  if (!badge) return null;

  return (
    <span
      className={cn(
        "shrink-0 text-[11px] font-medium leading-none tracking-normal opacity-75",
        mentorBadgeClassName(badge),
        className,
      )}
    >
      {mentorBadgeLabel(badge)}
    </span>
  );
};

const AuthorIdentityLine = ({
  badge,
  href,
  name,
  onClick,
  verified,
}: {
  badge?: string | null;
  href?: string;
  name: string;
  onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  verified?: boolean;
}) => {
  const nameClassName = "min-w-0 truncate text-sm font-black text-foreground";

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1">
      {href ? (
        <Link
          className={cn("pointer-events-auto cursor-pointer", nameClassName)}
          href={href}
          onClick={onClick}
        >
          {name}
        </Link>
      ) : (
        <h2 className={nameClassName}>{name}</h2>
      )}
      {verified ? (
        <BadgeCheck
          className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
          aria-label="Psicólogo verificado"
        />
      ) : null}
      <MentorBadge badge={badge} />
    </div>
  );
};

const FilterMenu = ({
  onScopeChange,
  open,
  scope,
  setOpen,
}: {
  onScopeChange: (value: CommunityFeedScope) => void;
  open: boolean;
  scope: CommunityFeedScope;
  setOpen: (value: boolean) => void;
}) => (
  <div className="relative shrink-0">
    <button
      aria-expanded={open}
      aria-label="Filtrar feed"
      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#DFE5EC] bg-white text-[#64748B] shadow-sm transition hover:border-primary/50 hover:bg-primary-soft hover:text-primary dark:border-border dark:bg-surface dark:text-muted"
      onClick={() => setOpen(!open)}
      type="button"
    >
      <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
    </button>

    {open ? (
      <div className="absolute right-0 top-14 z-30 w-64 overflow-hidden rounded-[18px] border border-border bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:bg-surface">
        {FEED_SCOPE_OPTIONS.map((item) => {
          const selected = item.value === scope;

          return (
            <button
              aria-pressed={selected}
              className={cn(
                "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-sm font-bold transition",
                selected
                  ? "bg-primary-soft text-primary"
                  : "text-[#475569] hover:bg-surface-muted dark:text-muted",
              )}
              key={item.value}
              onClick={() => {
                onScopeChange(item.value);
                setOpen(false);
              }}
              type="button"
            >
              {item.label}
              {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
            </button>
          );
        })}
      </div>
    ) : null}
  </div>
);

const CommunityChips = ({
  activeSlug,
  onNavigate,
}: {
  activeSlug: string | null;
  onNavigate: () => void;
}) => (
  <nav aria-label="Comunidades" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
    <div className="flex min-w-max gap-2 pb-1">
      <Link
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-black text-[#475569] shadow-sm transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:bg-surface dark:text-muted"
        href={COMMUNITY_EXPLORE_HREF}
        onClick={onNavigate}
      >
        <Compass className="h-4 w-4" aria-hidden="true" />
        Explorar
      </Link>
      {COMMUNITY_FEED_CHIPS.map((item) => {
        const isActive = item.slug === activeSlug;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-2 text-[13px] font-semibold shadow-sm transition",
              isActive
                ? "border-primary bg-primary text-white shadow-primary/20"
                : "border-border bg-white text-[#475569] hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:bg-surface dark:text-muted",
            )}
            href={communityDetailHref(item.slug)}
            key={item.slug}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  </nav>
);

const PostMedia = ({ post }: { post: CommunityPost }) => {
  if (!post.media_url) return null;

  const mediaUrl = resolvePublicMediaUrl(post.media_url);
  if (!mediaUrl) return null;

  if (post.media_type === "video") {
    return (
      <div className="relative overflow-hidden rounded-[22px] border border-border bg-black shadow-inner">
        <video
          className="lectum-community-feed-video aspect-[4/5] w-full object-cover"
          controls
          playsInline
          src={mediaUrl}
        >
          <track kind="captions" label="Português" srcLang="pt-BR" />
        </video>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/70">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/30 backdrop-blur">
            <Play className="ml-1 h-7 w-7 fill-white" aria-hidden="true" />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-border bg-surface-muted">
      <Image
        alt={post.title}
        className="object-cover"
        fill
        sizes="(max-width: 430px) calc(100vw - 64px), 520px"
        src={mediaUrl}
        unoptimized={isPublicMediaUrl(post.media_url)}
      />
    </div>
  );
};

const ProfessionalReplyMedia = ({
  reply,
}: {
  reply: NonNullable<CommunityPost["highlighted_professional_reply"]>;
}) => {
  if (!reply.media_url) return null;

  const mediaUrl = resolvePublicMediaUrl(reply.media_url);
  if (!mediaUrl) return null;

  if (reply.media_type === "video") {
    return (
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[18px] border border-border bg-black shadow-inner">
        <video
          className="lectum-community-feed-video h-full w-full object-cover"
          controls
          onClick={(event) => event.stopPropagation()}
          playsInline
          src={mediaUrl}
        >
          <track kind="captions" label="Português" srcLang="pt-BR" />
        </video>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/70">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/30 backdrop-blur">
            <Play className="ml-1 h-6 w-6 fill-white" aria-hidden="true" />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px] border border-border bg-surface-muted">
      <Image
        alt="Mídia da resposta profissional"
        className="object-cover"
        fill
        sizes="(max-width: 430px) calc(100vw - 96px), 480px"
        src={mediaUrl}
        unoptimized={isPublicMediaUrl(reply.media_url)}
      />
    </div>
  );
};

const ProfessionalReplyPreview = ({ post }: { post: CommunityPost }) => {
  const reply = post.highlighted_professional_reply;
  const [replyExpanded, setReplyExpanded] = useState(false);
  const postHref = communityPostDetailHref(post);

  if (!reply) return null;

  const profileHref = `/app/psychologist/${reply.author.id}`;

  return (
    <div className="relative grid min-w-0 cursor-pointer grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-2xl border border-[#D8ECFF] bg-[#F4FAFF] p-3 dark:border-primary/20 dark:bg-primary/5">
      <Link
        aria-label={`Abrir post ${post.title}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl"
        href={postHref}
      />
      <div className="pointer-events-none flex justify-center pt-1" aria-hidden="true">
        <span className="h-full min-h-24 w-px rounded-full bg-[#BBDFFF] dark:bg-primary/25" />
      </div>
      <div className="pointer-events-none relative z-10 min-w-0">
        <div className="flex min-w-0 items-start gap-2.5">
          <AuthorAvatar author={reply.author} size="lg" />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <AuthorIdentityLine
              badge={reply.author.featured_badge}
              href={profileHref}
              name={reply.author.name}
              onClick={(event) => event.stopPropagation()}
              verified={reply.author.verified}
            />
            <Link
              className="pointer-events-auto min-w-0 cursor-pointer truncate text-[11px] font-semibold text-muted"
              href={profileHref}
              onClick={(event) => event.stopPropagation()}
            >
              {reply.author.type_label} <span aria-hidden="true">•</span>{" "}
              <time dateTime={reply.created_at}>{formatRelativeTime(reply.created_at)}</time>{" "}
              <span aria-hidden="true">•</span> {reply.upvotes_count.toLocaleString("pt-BR")}{" "}
              upvotes
            </Link>
          </div>
        </div>
        <div className="mt-2">
          <InlineExpandableText
            className="text-sm leading-6 text-[#334155] dark:text-muted"
            expanded={replyExpanded}
            onToggle={(event) => {
              event.stopPropagation();
              setReplyExpanded((current) => !current);
            }}
            text={reply.content}
          />
        </div>
        {reply.media_url || reply.author.whatsapp_url ? (
          <div className="pointer-events-auto mt-3 grid w-full gap-3 sm:mx-auto sm:max-w-[320px]">
            <ProfessionalReplyMedia reply={reply} />
            {reply.author.whatsapp_url ? (
              <PsychologistWhatsAppRedirectButton
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-success bg-transparent text-sm font-black text-success shadow-none transition hover:bg-success hover:text-white"
                psychologist={{
                  avatar: reply.author.avatar,
                  crp: reply.author.crp,
                  id: reply.author.id,
                  name: reply.author.name,
                  typeLabel: reply.author.type_label,
                  whatsappUrl: reply.author.whatsapp_url,
                }}
                stopPropagation
              >
                <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                Chamar no WhatsApp
              </PsychologistWhatsAppRedirectButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const PostCard = ({
  post,
  onShare,
  showCommunityHeader = true,
}: {
  post: CommunityPost;
  onShare: (post: CommunityPost) => void;
  showCommunityHeader?: boolean;
}) => {
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;
  const [contentExpanded, setContentExpanded] = useState(false);
  const [voteSnapshot, setVoteSnapshot] = useState<VoteSnapshot>({
    currentVote: post.current_user_vote,
    downvotes: post.downvotes_count,
    postId: post.id,
    upvotes: post.upvotes_count,
  });
  const [saveSnapshot, setSaveSnapshot] = useState<SaveSnapshot>({
    saved: post.saved,
    saves: post.saves_count,
  });
  const voteMutation = useVotePost(post.id);
  const saveMutation = useSavePost(post.id);
  const postDetailHref = communityPostDetailHref(post);

  const handleVote = (value: 1 | -1) => {
    const previousSnapshot = voteSnapshot;
    const optimisticSnapshot = resolveVoteSnapshot(voteSnapshot, value);

    setVoteSnapshot(optimisticSnapshot);
    voteMutation.mutate(
      { value },
      {
        onError: () => {
          setVoteSnapshot(previousSnapshot);
        },
        onSuccess: (data) => {
          if (data.target_type !== "post") return;

          setVoteSnapshot({
            currentVote: data.value,
            downvotes: data.downvotes_count ?? optimisticSnapshot.downvotes,
            postId: post.id,
            upvotes: data.upvotes_count,
          });
        },
      },
    );
  };

  const handleToggleSave = () => {
    const previousSnapshot = saveSnapshot;
    const nextSaved = !previousSnapshot.saved;
    const optimisticSnapshot = {
      saved: nextSaved,
      saves: Math.max(0, previousSnapshot.saves + (nextSaved ? 1 : -1)),
    };

    setSaveSnapshot(optimisticSnapshot);
    saveMutation.mutate(previousSnapshot.saved, {
      onError: () => {
        setSaveSnapshot(previousSnapshot);
      },
      onSuccess: (data) => {
        setSaveSnapshot({
          saved: data.saved,
          saves: data.saves_count ?? optimisticSnapshot.saves,
        });
      },
    });
  };

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-border dark:bg-surface">
      {showCommunityHeader ? (
        <div className="mb-4 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-muted">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="shrink-0">Postado em</span>
          <Link
            className="block min-w-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap font-black text-foreground"
            href={communityDetailHref(post.community.slug)}
          >
            {post.community.name}
          </Link>
          <CommunityFollowToggle
            className="ml-1"
            initialFollowing={Boolean(post.community.following)}
            slug={post.community.slug}
          />
        </div>
      ) : null}

      <div className="mb-3 flex items-start gap-3">
        <AuthorAvatar anonymous={isAnonymousPatient} author={post.author} />
        <div className="grid min-w-0 flex-1 gap-1">
          <AuthorIdentityLine
            badge={post.author.featured_badge ?? post.featured_badge}
            name={post.author.name}
            verified={post.author.verified}
          />
          <p className="text-[11px] font-semibold text-muted">
            {isPsychologistPost
              ? `${post.author.type_label} • ${formatRelativeTime(post.created_at)}`
              : formatRelativeTime(post.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Link
          className="cursor-pointer text-[1.32rem] font-black leading-[1.18] tracking-[-0.02em] text-[#182033] dark:text-foreground"
          href={postDetailHref}
        >
          {post.title}
        </Link>
        <div className="relative md:cursor-pointer">
          <Link
            aria-label={`Abrir post ${post.title}`}
            className="absolute inset-0 z-0 hidden cursor-pointer rounded-md md:block"
            href={postDetailHref}
          />
          <div className="relative z-10 md:pointer-events-none">
            <InlineExpandableText
              className="text-sm leading-6 text-[#64748B] dark:text-muted"
              expanded={contentExpanded}
              onToggle={(event) => {
                event.stopPropagation();
                setContentExpanded((current) => !current);
              }}
              text={post.content}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <PostMedia post={post} />
        <ProfessionalReplyPreview post={post} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-[#EDF1F5] border-t pt-3 dark:border-border">
        <div className="flex min-w-0 items-center gap-2">
          <div className="inline-flex h-8 items-center overflow-visible rounded-full bg-[#F4F6F8] ring-1 ring-[#E7ECF2] dark:bg-surface-muted dark:ring-border">
            <VoteActionButton
              count={voteSnapshot.upvotes}
              currentVote={voteSnapshot.currentVote}
              disabled={voteMutation.isPending}
              icon={ArrowUp}
              label="Dar upvote"
              onVote={handleVote}
              size="sm"
              value={1}
            />
            <span className="h-4 w-px bg-[#DDE4EC] dark:bg-border" aria-hidden="true" />
            <VoteActionButton
              currentVote={voteSnapshot.currentVote}
              disabled={voteMutation.isPending}
              icon={ArrowDown}
              label="Dar downvote"
              onVote={handleVote}
              showPositiveDelta={false}
              size="sm"
              value={-1}
            />
          </div>
          <PostActionLink
            count={post.replies_count}
            href={postDetailHref}
            icon={MessageCircle}
            label="Comentar"
            size="sm"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PostActionButton
            active={saveSnapshot.saved}
            count={saveSnapshot.saves}
            disabled={saveMutation.isPending}
            icon={Bookmark}
            iconClassName={saveSnapshot.saved ? "fill-current" : undefined}
            label={saveSnapshot.saved ? "Remover dos salvos" : "Salvar post"}
            onClick={handleToggleSave}
            size="sm"
          />
          <PostActionButton
            icon={Share2}
            label={`Compartilhar ${post.title}`}
            onClick={() => onShare(post)}
            size="sm"
          />
        </div>
      </div>
    </article>
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
      aria-label="Paginação do feed"
      className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface p-3"
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

const sortCommunityPosts = (posts: CommunityPost[], sort: CommunityPostSort) => {
  const items = [...posts];

  if (sort === "new") {
    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  if (sort === "discussed") {
    return items.sort((a, b) => {
      const replyDiff = b.replies_count - a.replies_count;
      if (replyDiff !== 0) return replyDiff;

      return b.upvotes_count - a.upvotes_count;
    });
  }

  return items.sort((a, b) => {
    const aScore =
      a.upvotes_count * 3 +
      a.replies_count * 2 +
      a.saves_count +
      (a.highlighted_professional_reply ? 250 : 0);
    const bScore =
      b.upvotes_count * 3 +
      b.replies_count * 2 +
      b.saves_count +
      (b.highlighted_professional_reply ? 250 : 0);

    if (bScore !== aScore) return bScore - aScore;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

const CommunityLogo = ({ community }: { community: CommunityDetail }) => (
  <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-[18px] border-[4px] border-white bg-gradient-to-br from-[#DFF3FF] via-[#F7FBFF] to-[#BFE7FF] text-center text-lg font-black leading-none text-primary shadow-[0_16px_34px_rgba(15,23,42,0.18)] dark:border-background">
    {getInitials(community.name)}
  </span>
);

const CommunityDetailSkeleton = () => (
  <div className="grid gap-4">
    <div className="min-h-[260px] animate-pulse rounded-[28px] bg-white shadow-[var(--lectum-shadow-soft)] dark:bg-surface" />
    <div className="grid gap-3">
      <div className="h-48 animate-pulse rounded-[22px] bg-white dark:bg-surface" />
      <div className="h-48 animate-pulse rounded-[22px] bg-white dark:bg-surface" />
    </div>
  </div>
);

const CommunityRulesCard = ({ communitySlug }: { communitySlug: string }) => {
  const rulesContentId = useId();
  const storageKey = `${COMMUNITY_RULES_SESSION_KEY_PREFIX}:${communitySlug}`;
  const [isExpanded, setIsExpanded] = useState(() => readCommunityRulesSessionState(storageKey));

  const toggleRules = () => {
    setIsExpanded((current) => {
      const next = !current;

      writeCommunityRulesSessionState(storageKey, next);

      return next;
    });
  };

  return (
    <section className="rounded-[22px] border border-[#E6EAF0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] dark:border-border dark:bg-surface">
      <button
        aria-controls={rulesContentId}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-2 rounded-[18px] text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary/25"
        onClick={toggleRules}
        type="button"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-foreground">Regras da comunidade</span>
          <span className="block text-xs font-semibold text-muted">
            Curadoria e moderação pela equipe Lectum
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted transition-transform duration-300 ease-out",
            isExpanded ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        id={rulesContentId}
      >
        <div className="overflow-hidden">
          <ul className="grid gap-2 pt-3 text-sm leading-6 text-[#64748B] dark:text-muted">
            <li className="flex gap-2">
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Publique com respeito, acolhimento e sem exposição de terceiros.
            </li>
            <li className="flex gap-2">
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Conteúdos clínicos não substituem atendimento psicológico individualizado.
            </li>
            <li className="flex gap-2">
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Solicitações de novas comunidades passam por análise da plataforma.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

const CommunityHeader = ({
  community,
  following,
  membershipPending,
  onShare,
  onToggleFollow,
}: {
  community: CommunityDetail;
  following: boolean;
  membershipPending: boolean;
  onShare: () => void;
  onToggleFollow: () => void;
}) => (
  <header className="-mx-5 overflow-hidden rounded-b-[28px] bg-white pb-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:bg-surface">
    <div className="relative min-h-[132px] bg-[linear-gradient(135deg,#308CE8_0%,#1B56B8_55%,#16418F_100%)] px-5 pt-4 text-white">
      <div className="relative z-10 flex items-center justify-between">
        <Link
          aria-label="Voltar ao feed da comunidade"
          className="grid h-10 w-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25"
          href={DEFAULT_COMMUNITY_FEED_HREF}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            aria-label="Buscar no feed global"
            className="grid h-10 w-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25"
            href={DEFAULT_COMMUNITY_FEED_HREF}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          <button
            aria-label="Compartilhar comunidade"
            className="grid h-10 w-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25"
            onClick={onShare}
            type="button"
          >
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <span className="absolute -right-10 -bottom-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <span className="absolute left-10 top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
    </div>

    <div className="relative px-5">
      <div className="-mt-8 flex items-start justify-between gap-4">
        <CommunityLogo community={community} />
        <CommunityFollowButton
          className="mt-10 h-10 px-6 text-sm"
          disabled={membershipPending}
          following={following}
          onClick={onToggleFollow}
          pending={membershipPending}
        />
      </div>

      <div className="mt-4 grid gap-2">
        <h1 className="text-[1.55rem] font-black leading-tight tracking-[-0.03em] text-[#182033] dark:text-foreground">
          {community.name}
        </h1>
        <p className="text-sm font-semibold text-muted">
          {formatCompactCount(community.members_count, "seguidor", "seguidores")}{" "}
          <span aria-hidden="true">•</span>{" "}
          {formatCompactCount(community.posts_count, "post", "posts")}
        </p>
        {community.description ? (
          <p className="max-w-2xl text-sm leading-6 text-[#475569] dark:text-muted">
            {community.description}
          </p>
        ) : (
          <p className="max-w-2xl text-sm leading-6 text-[#475569] dark:text-muted">
            Esta comunidade ainda não possui descrição cadastrada pela equipe Lectum.
          </p>
        )}
        <Link
          className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-black text-primary transition hover:bg-primary hover:text-white"
          href={`/app/community/top-mentors?community=${community.slug}`}
        >
          <Award className="h-3.5 w-3.5" aria-hidden="true" />
          Ver Top 5 mentores da comunidade
        </Link>
      </div>
    </div>
  </header>
);

const CommunityPostSortChips = ({
  onChange,
  value,
}: {
  onChange: (value: CommunityPostSort) => void;
  value: CommunityPostSort;
}) => (
  <nav
    aria-label="Ordenação dos posts"
    className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]"
  >
    <div className="flex min-w-max gap-2 pb-1">
      {COMMUNITY_POST_SORTS.map((item) => {
        const Icon = item.icon;
        const active = value === item.value;

        return (
          <button
            aria-pressed={active}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-black shadow-sm transition",
              active
                ? "border-primary bg-primary text-white"
                : "border-[#E5EAF0] bg-white text-[#64748B] hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:border-border dark:bg-surface dark:text-muted",
            )}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>
);

const CommunityDetailLogic = ({ slug }: { slug: string }) => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CommunityPostSort>("featured");
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [followingOverride, setFollowingOverride] = useState<boolean | null>(null);
  const detail = useCommunityDetail(slug);
  const postsQuery = useCommunityPosts(slug, { page, limit: PAGE_LIMIT }, Boolean(detail.data));
  const followMutation = useFollowCommunity();
  const unfollowMutation = useUnfollowCommunity();
  const community = detail.data?.community;
  const posts = useMemo(
    () => sortCommunityPosts(postsQuery.data?.data ?? [], sort),
    [postsQuery.data?.data, sort],
  );
  const detailError = detail.isError ? resolveCommunityDetailError(detail.error) : null;
  const postsError = postsQuery.isError ? resolveFeedError(postsQuery.error) : null;
  const membershipPending = followMutation.isPending || unfollowMutation.isPending;
  const following = followingOverride ?? Boolean(community?.following);

  const sharePost = async (post: CommunityPost) => {
    if (typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(post.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const shareCommunity = async () => {
    if (!community || typeof window === "undefined") return;

    const url = `${window.location.origin}${communityDetailHref(community.slug)}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: community.name, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(community.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const toggleFollow = () => {
    if (!community || membershipPending) return;

    const previousFollowing = following;
    const nextFollowing = !previousFollowing;
    setFollowingOverride(nextFollowing);

    const mutation = previousFollowing ? unfollowMutation : followMutation;
    mutation.mutate(community.slug, {
      onError: () => {
        setFollowingOverride(previousFollowing);
      },
      onSuccess: (data) => {
        setFollowingOverride(data.following);
      },
    });
  };

  return (
    <PrivateTemplate
      contentClassName="bg-[#F5F7FA] dark:bg-background"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto grid w-full max-w-[430px] gap-4 sm:max-w-2xl lg:max-w-[760px]">
        {detail.isLoading || detail.isPending ? <CommunityDetailSkeleton /> : null}

        {detailError ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href={DEFAULT_COMMUNITY_FEED_HREF}>Voltar ao feed</Link>
              </Button>
            }
            description={detailError}
            icon={UsersRound}
            title="Comunidade indisponível"
          />
        ) : null}

        {community ? (
          <>
            <CommunityHeader
              community={community}
              following={following}
              membershipPending={membershipPending}
              onShare={shareCommunity}
              onToggleFollow={toggleFollow}
            />

            <CommunityRulesCard key={community.slug} communitySlug={community.slug} />

            {shareFeedback ? (
              <InlineAlert title="Link preparado" variant="success">
                Link copiado ou enviado para compartilhamento.
              </InlineAlert>
            ) : null}

            {followMutation.isError || unfollowMutation.isError ? (
              <InlineAlert title="Não foi possível atualizar participação" variant="error">
                Tente novamente em alguns instantes.
              </InlineAlert>
            ) : null}

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#182033] dark:text-foreground">
                    Posts da comunidade
                  </h2>
                  <p className="text-xs font-semibold text-muted">
                    Dados reais publicados nesta comunidade.
                  </p>
                </div>
                <Button asChild className="hidden rounded-full font-black sm:inline-flex">
                  <Link href={communityCreatePostHref(community.slug)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Publicar
                  </Link>
                </Button>
              </div>
              <CommunityPostSortChips
                onChange={(value) => {
                  setSort(value);
                  setPage(1);
                }}
                value={sort}
              />
            </div>

            {postsQuery.isLoading || postsQuery.isPending ? (
              <div className="grid min-h-[220px] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
                <LoadingState label="Carregando posts da comunidade" />
              </div>
            ) : null}

            {postsError ? (
              <InlineAlert title="Posts indisponíveis" variant="error">
                {postsError}
              </InlineAlert>
            ) : null}

            {!postsQuery.isLoading && !postsQuery.isPending && !postsError && posts.length === 0 ? (
              <EmptyState
                action={
                  <Button asChild>
                    <Link href={communityCreatePostHref(community.slug)}>Criar primeiro post</Link>
                  </Button>
                }
                description="Ainda não há publicações reais nesta comunidade. Seja a primeira pessoa a iniciar uma conversa."
                icon={MessageCircle}
                title="Comunidade sem posts"
              />
            ) : null}

            {posts.length > 0 ? (
              <div className="grid gap-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    onShare={sharePost}
                    post={post}
                    showCommunityHeader={false}
                  />
                ))}
              </div>
            ) : null}

            {postsQuery.isFetching && !postsQuery.isLoading ? (
              <LoadingState label="Atualizando posts" />
            ) : null}

            <Pagination
              currentPage={page}
              disabled={postsQuery.isFetching}
              onPageChange={setPage}
              pages={postsQuery.data?.pages ?? 0}
            />
          </>
        ) : null}
      </section>

      {community ? (
        <Link
          aria-label="Criar publicação nesta comunidade"
          className="group fixed right-5 bottom-28 z-40 grid h-14 w-14 place-items-center rounded-full border-[5px] border-white bg-[#308CE8] text-white shadow-[0_14px_30px_rgba(48,140,232,0.28)] transition hover:-translate-y-1 hover:bg-[#2579CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#308CE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F7FA] lg:right-10 lg:bottom-10 xl:right-20 2xl:right-28"
          href={communityCreatePostHref(community.slug)}
          title="Criar publicação"
        >
          <Plus className="h-7 w-7 stroke-[2.4]" aria-hidden="true" />
          <span className="sr-only">Criar publicação</span>
        </Link>
      ) : null}
    </PrivateTemplate>
  );
};

export const CommunityFeedLogic = () => {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const routeSlug = typeof params.slug === "string" ? params.slug : COMMUNITY_FEED_SLUG;
  const communityFromQuery = getCommunityFeedChip(searchParams.get("community"));
  const communityFromLegacySlug =
    routeSlug !== COMMUNITY_FEED_SLUG ? getCommunityFeedChip(routeSlug) : null;
  const selectedCommunitySlug = communityFromQuery?.slug ?? communityFromLegacySlug?.slug ?? null;
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<CommunityFeedScope>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const createPostHref = selectedCommunitySlug
    ? communityCreatePostHref(selectedCommunitySlug)
    : COMMUNITY_CREATE_POST_HREF;
  const query = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      scope,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(selectedCommunitySlug ? { community: selectedCommunitySlug } : {}),
    }),
    [deferredSearch, page, scope, selectedCommunitySlug],
  );
  const feed = useCommunityFeedPosts(query);
  const posts = feed.data?.data ?? [];
  const errorMessage = feed.isError ? resolveFeedError(feed.error) : null;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY.current;

      if (currentScrollY < 48) {
        setHeaderHidden(false);
      } else if (Math.abs(currentScrollY - lastScrollY.current) > 8) {
        setHeaderHidden(isScrollingDown);
      }

      lastScrollY.current = currentScrollY;
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sharePost = async (post: CommunityPost) => {
    if (typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(post.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  return (
    <PrivateTemplate
      bottomNavigationCenterAction={{
        ariaLabel: "Criar publicação na comunidade",
        href: createPostHref,
        title: "Criar publicação",
      }}
      contentClassName="bg-[#F5F7FA] dark:bg-background"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto grid w-full max-w-[430px] gap-4 sm:max-w-2xl lg:max-w-[760px]">
        <header
          className={cn(
            "sticky top-0 z-20 -mx-5 border-[#E5EAF0] border-b bg-[#F5F7FA]/95 px-5 pb-3 pt-2 backdrop-blur transition-[transform,opacity] duration-300 ease-out supports-[backdrop-filter]:bg-[#F5F7FA]/88 dark:border-border dark:bg-background/90",
            headerHidden
              ? "pointer-events-none -translate-y-[calc(100%+8px)] opacity-0"
              : "translate-y-0 opacity-100",
          )}
        >
          <div className="mx-auto grid max-w-[430px] gap-3 sm:max-w-2xl lg:max-w-[760px]">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Buscar no feed"
                  className="h-12 rounded-full border-[#DFE5EC] bg-white pl-11 text-sm shadow-sm dark:bg-surface"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar no feed"
                  type="search"
                  value={search}
                />
              </div>

              <FilterMenu
                onScopeChange={(value) => {
                  setScope(value);
                  setPage(1);
                }}
                open={filterOpen}
                scope={scope}
                setOpen={setFilterOpen}
              />
            </div>

            <CommunityChips activeSlug={selectedCommunitySlug} onNavigate={() => setPage(1)} />
          </div>
        </header>

        {feed.isLoading || feed.isPending ? (
          <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando feed da comunidade" />
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Feed indisponível" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {shareFeedback ? (
          <InlineAlert title="Link preparado" variant="success">
            Link do post copiado ou enviado para compartilhamento.
          </InlineAlert>
        ) : null}

        {!feed.isLoading && !feed.isPending && !errorMessage && posts.length === 0 ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href={COMMUNITY_EXPLORE_HREF}>Explorar comunidades</Link>
              </Button>
            }
            description={
              scope === "following"
                ? "Ainda não há comunidades seguidas vinculadas ao seu usuário. Quando a participação em comunidades for ativada, este filtro exibirá esse recorte persistido."
                : "Nenhum destaque publicado para este recorte do feed. O feed usa apenas dados persistidos no backend."
            }
            icon={CalendarDays}
            title="Nenhum post publicado"
          />
        ) : null}

        {posts.length > 0 ? (
          <div className="grid gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} onShare={sharePost} post={post} />
            ))}
          </div>
        ) : null}

        {feed.isFetching && !feed.isLoading ? <LoadingState label="Atualizando feed" /> : null}

        <Pagination
          currentPage={page}
          disabled={feed.isFetching}
          onPageChange={setPage}
          pages={feed.data?.pages ?? 0}
        />
      </section>

      <Link
        aria-label="Criar publicação na comunidade"
        className="group fixed right-10 bottom-10 z-40 hidden h-16 w-16 items-center justify-center rounded-full border-[5px] border-white bg-[#308CE8] text-white shadow-[0_18px_36px_rgba(48,140,232,0.28)] transition hover:-translate-y-1 hover:bg-[#2579CF] hover:shadow-[0_22px_44px_rgba(48,140,232,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#308CE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F7FA] motion-safe:animate-[lectum-desktop-create-float_4.2s_ease-in-out_infinite] lg:flex xl:right-20 2xl:right-28"
        href={createPostHref}
        title="Criar publicação"
      >
        <Plus
          className="h-8 w-8 stroke-[2.4] transition group-hover:scale-105"
          aria-hidden="true"
        />
        <span className="sr-only">Criar publicação</span>
      </Link>

      <style>{`
        @media (min-width: 1024px) {
          .lectum-community-feed-video:fullscreen {
            position: fixed !important;
            inset: 0 !important;
            width: min(100vw, calc(100vh * 9 / 16)) !important;
            height: min(100vh, calc(100vw * 16 / 9)) !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            margin: auto !important;
            aspect-ratio: 9 / 16 !important;
            object-fit: contain !important;
            background: #000 !important;
          }

          .lectum-community-feed-video:fullscreen::backdrop {
            background: rgb(0 0 0 / 0.96);
          }

          .lectum-community-feed-video:-webkit-full-screen {
            position: fixed !important;
            inset: 0 !important;
            width: min(100vw, calc(100vh * 9 / 16)) !important;
            height: min(100vh, calc(100vw * 16 / 9)) !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            margin: auto !important;
            aspect-ratio: 9 / 16 !important;
            object-fit: contain !important;
            background: #000 !important;
          }

          .lectum-community-feed-video:-webkit-full-screen::backdrop {
            background: rgb(0 0 0 / 0.96);
          }
        }

        @keyframes lectum-desktop-create-float {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: 0 18px 36px rgba(48, 140, 232, 0.28);
          }
          50% {
            transform: translateY(-5px);
            box-shadow: 0 22px 44px rgba(48, 140, 232, 0.34);
          }
        }
      `}</style>
    </PrivateTemplate>
  );
};

export const CommunityRouteLogic = () => {
  const params = useParams<{ slug: string }>();
  const routeSlug = typeof params.slug === "string" ? params.slug : COMMUNITY_FEED_SLUG;

  if (routeSlug === COMMUNITY_FEED_SLUG) {
    return <CommunityFeedLogic />;
  }

  return <CommunityDetailLogic slug={routeSlug} />;
};

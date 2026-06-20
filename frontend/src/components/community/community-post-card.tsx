"use client";

import { BadgeCheck, FileText, Reply, UserX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MouseEventHandler,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useSavePost, useVotePost } from "@/api/callers/posts";
import type { PostListPost, PostProfessionalReply } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { MentorBadge } from "@/components/community/mentor-badge";
import { PostMutedBadge } from "@/components/community/post-muted-badge";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

type CommunityPostCardProps = {
  actionBarShowUpvoteText?: boolean;
  actionBarVoteLabel?: string;
  actionBarVotePresentation?: "cluster" | "inline";
  communityContextTone?: "default" | "muted";
  communityHeaderIncludesTime?: boolean;
  desktopPlainLinks?: boolean;
  footerExtra?: ReactNode;
  headerExtra?: ReactNode;
  interactiveActions?: boolean;
  onShare: (post: PostListPost) => void;
  openPostOnCardClick?: boolean;
  post: PostListPost;
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
  statusBadge?: ReactNode;
};

type ProfileContributionPost = PostListPost & {
  contribution_type?: "post" | "reply";
};

const INLINE_TEXT_MAX_LINES = 2;
const INLINE_TEXT_MORE_LABEL = "... ver mais";
const INLINE_TEXT_LESS_LABEL = "ver menos";

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

const InlineExpandableText = ({
  className,
  expanded,
  href,
  onToggle,
  text,
}: {
  className?: string;
  expanded: boolean;
  href?: string;
  onToggle?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
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
        const candidate = `${candidatePreview} ${INLINE_TEXT_MORE_LABEL}`;

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

  const visibleText = expanded || !truncated ? text : preview;
  const moreLabel = expanded ? INLINE_TEXT_LESS_LABEL : INLINE_TEXT_MORE_LABEL;
  const moreClassName =
    "pointer-events-auto inline cursor-pointer rounded-none border-0 bg-transparent p-0 align-baseline font-[inherit] text-[#64748B]/80 [font-size:inherit] [line-height:inherit] dark:text-muted/80";
  const textContent = (
    <p className={cn("whitespace-pre-line", className)}>
      {visibleText}
      {truncated ? (
        <>
          {" "}
          {href || !onToggle ? (
            <span className={moreClassName}>{moreLabel}</span>
          ) : (
            <button className={moreClassName} onClick={onToggle} type="button">
              {moreLabel}
            </button>
          )}
        </>
      ) : null}
    </p>
  );

  return (
    <div className="relative min-w-0 max-w-full" ref={containerRef}>
      {href ? (
        <Link
          className="block rounded-md no-underline transition hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={href}
        >
          {textContent}
        </Link>
      ) : (
        textContent
      )}
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

const postDetailHref = (post: PostListPost) =>
  `/app/community/${post.community.slug}/post/${post.id}`;

const isPostCardInteractiveTarget = (target: EventTarget | null) => {
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
      ].join(","),
    ),
  );
};

const AuthorAvatar = ({
  anonymous,
  avatar,
  href,
  name,
  size = "md",
}: {
  anonymous?: boolean;
  avatar: string | null;
  href?: string;
  name: string;
  size?: "md" | "lg";
}) => {
  const sizeClass = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const imageSize = size === "lg" ? "40px" : "36px";

  if (anonymous) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-surface-muted text-muted ring-2 ring-border",
          sizeClass,
        )}
      >
        <UserX className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(avatar);

  const avatarNode = (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-background",
        sizeClass,
      )}
    >
      {avatarSrc ? (
        <Image
          alt={name}
          className="object-cover"
          fill
          sizes={imageSize}
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(avatar)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );

  if (!href) return avatarNode;

  return (
    <Link
      aria-label={`Abrir perfil de ${name}`}
      className="shrink-0 cursor-pointer rounded-full no-underline transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]"
      href={href}
    >
      {avatarNode}
    </Link>
  );
};

const MediaBlock = ({
  alt,
  mediaType,
  mediaUrl,
  videoClassName,
}: {
  alt: string;
  mediaType: string | null;
  mediaUrl: string | null;
  videoClassName?: string;
}) => {
  if (!mediaUrl) return null;

  const resolvedUrl = resolvePublicMediaUrl(mediaUrl);
  if (!resolvedUrl) return null;

  if (mediaType === "video") {
    return (
      <VerticalVideoPlayer
        className={cn("mx-auto w-full max-w-[390px] rounded-[22px]", videoClassName)}
        src={resolvedUrl}
        title={alt}
      />
    );
  }

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-border bg-surface-muted">
      <Image
        alt={alt}
        className="object-cover"
        fill
        sizes="(max-width: 430px) calc(100vw - 64px), 520px"
        src={resolvedUrl}
        unoptimized={isPublicMediaUrl(mediaUrl)}
      />
    </div>
  );
};

const ProfessionalReplyPreview = ({
  profilePublicationMode,
  reply,
}: {
  profilePublicationMode?: boolean;
  reply: PostProfessionalReply | null;
}) => {
  const [contentExpanded, setContentExpanded] = useState(false);

  if (!reply) return null;

  const profileHref = `/app/psychologist/${reply.author.id}`;

  return (
    <div className="rounded-[18px] border border-[#D8ECFF] bg-[#F4FAFF] p-4 dark:border-primary/20 dark:bg-primary/5">
      {!profilePublicationMode ? (
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-primary">
          Resposta profissional em destaque
        </p>
      ) : null}
      <div className="mb-2 flex items-center gap-2">
        <AuthorAvatar
          avatar={reply.author.avatar}
          href={profileHref}
          name={reply.author.name}
          size="lg"
        />
        <div className="grid min-w-0 gap-1">
          <div
            className={cn(
              "flex min-w-0 items-center gap-x-2 gap-y-1",
              profilePublicationMode ? "flex-nowrap overflow-hidden" : "flex-wrap",
            )}
          >
            <span className="inline-flex min-w-0 items-center gap-[5px]">
              <Link
                className="min-w-0 truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                href={profileHref}
              >
                {reply.author.name}
              </Link>
              {reply.author.verified ? (
                profilePublicationMode ? (
                  <VerifiedBadgeIcon className="h-4 w-4 shrink-0" aria-label="Perfil verificado" />
                ) : (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                )
              ) : null}
            </span>
            <MentorBadge
              badge={reply.author.featured_badge}
              className={profilePublicationMode ? "max-w-[124px]" : undefined}
              href={profileHref}
            />
          </div>
          <Link
            className="w-fit text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
            href={profileHref}
          >
            {reply.author.type_label} • {formatRelativeTime(reply.created_at)} •{" "}
            {reply.upvotes_count.toLocaleString("pt-BR")} upvotes
          </Link>
        </div>
      </div>
      {reply.title && !profilePublicationMode ? (
        <h4 className="mb-1 text-sm font-black text-foreground">{reply.title}</h4>
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
          text={reply.content}
        />
      ) : (
        <p className="text-sm leading-6 text-muted">{reply.content}</p>
      )}
      <div className="mt-3">
        <MediaBlock
          alt={reply.title ?? "Mídia da resposta profissional"}
          mediaType={reply.media_type}
          mediaUrl={reply.media_url}
          videoClassName={profilePublicationMode ? "md:mx-auto md:max-w-[320px]" : undefined}
        />
      </div>
      {reply.author.whatsapp_url && !profilePublicationMode ? (
        <PsychologistWhatsAppRedirectButton
          className="mx-auto mt-3 flex h-11 w-full max-w-[390px] items-center justify-center gap-2 rounded-2xl border border-success bg-transparent text-sm font-bold text-success shadow-none transition hover:bg-success/10 active:scale-[0.99]"
          psychologist={{
            avatar: reply.author.avatar,
            crp: reply.author.crp,
            id: reply.author.id,
            name: reply.author.name,
            typeLabel: reply.author.type_label,
            whatsappUrl: reply.author.whatsapp_url,
          }}
        >
          <WhatsAppIcon className="h-5 w-5 text-success" aria-hidden="true" />
          Chamar no WhatsApp
        </PsychologistWhatsAppRedirectButton>
      ) : null}
    </div>
  );
};

export const CommunityPostCard = ({
  actionBarShowUpvoteText = true,
  actionBarVoteLabel = "Marcar como útil",
  actionBarVotePresentation = "cluster",
  communityContextTone = "default",
  communityHeaderIncludesTime = false,
  desktopPlainLinks = false,
  footerExtra,
  headerExtra,
  interactiveActions = false,
  onShare,
  openPostOnCardClick = false,
  post,
  profilePublicationMode = false,
  saveActionOverride,
  showAuthorHeader = true,
  showCommunityHeader = true,
  showHighlightedProfessionalReply = true,
  statusBadge,
}: CommunityPostCardProps) => {
  const router = useRouter();
  const contributionType = (post as ProfileContributionPost).contribution_type;
  const primaryReply =
    profilePublicationMode && contributionType === "reply"
      ? post.highlighted_professional_reply
      : null;
  const displayAuthor = primaryReply?.author ?? post.author;
  const displayCreatedAt = primaryReply?.created_at ?? post.created_at;
  const displayTitle = primaryReply ? null : post.title;
  const displayContent = primaryReply?.content ?? post.content;
  const displayMediaType = primaryReply?.media_type ?? post.media_type;
  const displayMediaUrl = primaryReply?.media_url ?? post.media_url;
  const displayFeaturedBadge =
    primaryReply?.author.featured_badge ?? displayAuthor.featured_badge ?? post.featured_badge;
  const highlightedProfessionalReply =
    primaryReply || !showHighlightedProfessionalReply ? null : post.highlighted_professional_reply;
  const isReplyContribution = contributionType === "reply";
  const communityContextLabel = isReplyContribution ? "Respondido em" : "Postado em";
  const CommunityContextIcon = isReplyContribution ? Reply : FileText;
  const usesMutedCommunityContext = communityContextTone === "muted";
  const hasSecondaryHeaderActions = Boolean(post.muted_by_current_user || statusBadge);
  const shouldCompactProfileReplyMedia =
    profilePublicationMode && isReplyContribution && Boolean(primaryReply);
  const isPsychologistPost = displayAuthor.role === "psicologo";
  const isAnonymousPatient = !primaryReply && !isPsychologistPost && post.anonymous;
  const psychologistProfileHref = isPsychologistPost
    ? `/app/psychologist/${displayAuthor.id}`
    : undefined;
  const voteMutation = useVotePost(post.id);
  const saveMutation = useSavePost(post.id);
  const conversion = useProgressiveConversion();
  const [contentExpanded, setContentExpanded] = useState(false);
  const [voteOverride, setVoteOverride] = useState<{
    currentVote: 1 | -1 | null;
    postId: string;
    upvotes: number;
  } | null>(null);
  const [saveOverride, setSaveOverride] = useState<{
    postId: string;
    saved: boolean;
    saves: number;
  } | null>(null);
  const voteSnapshot =
    voteOverride?.postId === post.id
      ? voteOverride
      : {
          currentVote: post.current_user_vote,
          upvotes: post.upvotes_count,
        };
  const saveSnapshot =
    saveOverride?.postId === post.id
      ? saveOverride
      : {
          saved: post.saved,
          saves: post.saves_count,
        };
  const handleVote = (value: 1 | -1) => {
    const previousOverride = voteOverride;
    const nextVote = voteSnapshot.currentVote === value ? null : value;
    const upDelta = (nextVote === 1 ? 1 : 0) - (voteSnapshot.currentVote === 1 ? 1 : 0);
    const optimisticSnapshot = {
      currentVote: nextVote,
      postId: post.id,
      upvotes: Math.max(0, voteSnapshot.upvotes + upDelta),
    };

    setVoteOverride(optimisticSnapshot);
    voteMutation.mutate(
      { value },
      {
        onError: () => {
          setVoteOverride(previousOverride);
        },
        onSuccess: (data) => {
          if (data.target_type !== "post") return;

          setVoteOverride({
            currentVote: data.value,
            postId: post.id,
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
          },
          type: "save_post",
        },
      });
      return;
    }

    const previousOverride = saveOverride;
    const nextSaved = !saveSnapshot.saved;
    const optimisticSnapshot = {
      postId: post.id,
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
          postId: post.id,
          saved: data.saved,
          saves: data.saves_count ?? optimisticSnapshot.saves,
        });
      },
    });
  }, [conversion, post.id, saveMutation, saveOverride, saveSnapshot.saved, saveSnapshot.saves]);

  useEffect(() => {
    if (!conversion.isAuthenticated || saveSnapshot.saved) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "save_post" && String(candidate.payload?.postId ?? "") === post.id,
    );

    if (!intent) return;

    window.setTimeout(handleToggleSave, 0);
  }, [conversion, handleToggleSave, post.id, saveSnapshot.saved]);

  const saveAction = saveActionOverride ?? {
    active: saveSnapshot.saved,
    count: saveSnapshot.saves,
    disabled: saveMutation.isPending,
    label: saveSnapshot.saved ? "Remover dos salvos" : "Salvar",
    onClick: interactiveActions ? handleToggleSave : undefined,
  };
  const postHref = postDetailHref(post);
  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!openPostOnCardClick || isPostCardInteractiveTarget(event.target)) return;

    router.push(postHref);
  };
  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!openPostOnCardClick || isPostCardInteractiveTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    router.push(postHref);
  };

  return (
    <article
      className={cn(
        "w-full overflow-hidden rounded-[22px] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]",
        openPostOnCardClick &&
          "transition hover:border-primary/20 hover:bg-primary-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:cursor-pointer",
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={openPostOnCardClick ? -1 : undefined}
    >
      {showCommunityHeader ? (
        <div className="mb-4 flex min-w-0 items-center gap-2 text-[11px] font-semibold tracking-[-0.01em] text-muted">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <CommunityContextIcon
              className={cn("h-3.5 w-3.5 shrink-0", usesMutedCommunityContext && "text-muted/80")}
              aria-hidden="true"
            />
            <span className="shrink-0">{communityContextLabel}</span>
            <Link
              className={cn(
                "block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-black underline-offset-4 hover:text-primary hover:underline",
                profilePublicationMode || usesMutedCommunityContext
                  ? "text-[#64748B] dark:text-muted"
                  : "text-foreground",
                desktopPlainLinks &&
                  (profilePublicationMode || usesMutedCommunityContext
                    ? "md:no-underline md:hover:text-[#64748B] md:hover:no-underline dark:md:hover:text-muted"
                    : "md:no-underline md:hover:text-foreground md:hover:no-underline"),
              )}
              href={`/app/community/${post.community.slug}`}
            >
              {post.community.name}
            </Link>
            {communityHeaderIncludesTime ? (
              <>
                <span className="shrink-0 text-muted/70" aria-hidden="true">
                  &bull;
                </span>
                <span className="shrink-0 text-muted">{formatRelativeTime(displayCreatedAt)}</span>
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

      {showAuthorHeader ? (
        <div className="mb-3 flex items-start gap-3">
          <AuthorAvatar
            anonymous={isAnonymousPatient}
            avatar={displayAuthor.avatar}
            href={psychologistProfileHref}
            name={displayAuthor.name}
          />
          <div className="grid min-w-0 flex-1 gap-1">
            <div
              className={cn(
                "flex min-w-0 items-center gap-x-2 gap-y-1",
                profilePublicationMode ? "flex-nowrap overflow-hidden" : "flex-wrap",
              )}
            >
              <div className="flex min-w-0 items-center gap-[5px]">
                {psychologistProfileHref ? (
                  <Link
                    className="min-w-0 truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                    href={psychologistProfileHref}
                  >
                    {displayAuthor.name}
                  </Link>
                ) : (
                  <h2 className="min-w-0 truncate text-sm font-black text-foreground">
                    {displayAuthor.name}
                  </h2>
                )}
                {displayAuthor.verified ? (
                  profilePublicationMode ? (
                    <VerifiedBadgeIcon
                      className="h-4 w-4 shrink-0"
                      aria-label="Perfil verificado"
                    />
                  ) : (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  )
                ) : null}
              </div>
              <MentorBadge
                badge={displayFeaturedBadge}
                className={profilePublicationMode ? "max-w-[124px]" : undefined}
                href={psychologistProfileHref}
              />
            </div>
            {psychologistProfileHref ? (
              <Link
                className="w-fit text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
                href={psychologistProfileHref}
              >
                {displayAuthor.type_label} <span aria-hidden="true">&bull;</span>{" "}
                {formatRelativeTime(displayCreatedAt)}
              </Link>
            ) : (
              <p className="text-[11px] font-semibold text-muted">
                {formatRelativeTime(displayCreatedAt)}
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        {displayTitle ? (
          <Link
            className={cn(
              "text-[1.32rem] font-black leading-[1.18] tracking-[-0.02em] text-foreground underline-offset-4 transition hover:text-primary hover:underline",
              profilePublicationMode && "line-clamp-2 text-[1.08rem] leading-[1.22]",
              desktopPlainLinks && "md:no-underline md:hover:text-foreground md:hover:no-underline",
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
            className="text-sm leading-6 text-muted"
            expanded={false}
            href={postHref}
            text={displayContent}
          />
        )}
      </div>

      <div className="mt-4 grid gap-4">
        <MediaBlock
          alt={displayTitle ?? "Mídia da publicação"}
          mediaType={displayMediaType}
          mediaUrl={displayMediaUrl}
          videoClassName={
            shouldCompactProfileReplyMedia ? "md:mx-auto md:max-w-[320px]" : undefined
          }
        />
        <ProfessionalReplyPreview
          profilePublicationMode={profilePublicationMode}
          reply={highlightedProfessionalReply}
        />
      </div>

      <CommunityActionBar
        className="mt-4 border-border border-t pt-3"
        comments={{
          count: post.replies_count,
          href: postHref,
          label: "Comentários",
        }}
        currentVote={voteSnapshot.currentVote}
        disabled={voteMutation.isPending}
        endSlot={footerExtra}
        onVote={interactiveActions ? handleVote : undefined}
        save={{
          active: saveAction.active,
          count: saveAction.count,
          disabled: saveAction.disabled,
          label: saveAction.label,
          onClick: saveAction.onClick,
        }}
        share={{
          label: displayTitle ? `Compartilhar ${displayTitle}` : "Compartilhar publicação",
          onClick: () => onShare(post),
        }}
        showUpvoteText={actionBarShowUpvoteText}
        upvotesCount={voteSnapshot.upvotes}
        voteLabel={actionBarVoteLabel}
        votePresentation={actionBarVotePresentation}
      />
    </article>
  );
};

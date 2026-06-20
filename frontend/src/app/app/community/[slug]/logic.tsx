"use client";

import {
  ArrowLeft,
  ArrowUp,
  Award,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Compass,
  FileText,
  Flame,
  ListChecks,
  type LucideIcon,
  MessageCircle,
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
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAccount } from "@/api/callers/account";
import {
  useCommunityDetail,
  useFollowCommunity,
  useInfiniteCommunityFeedPosts,
  useInfiniteCommunityPosts,
  useUnfollowCommunity,
} from "@/api/callers/community";
import { useSavePost, useVotePost } from "@/api/callers/posts";
import type {
  CommunityDetail,
  CommunityFeedScope,
  CommunityPost,
} from "@/api/generator/types/community";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityFollowButton } from "@/components/community/community-follow-button";
import { CommunityFollowToggle } from "@/components/community/community-follow-toggle";
import { MentorBadge } from "@/components/community/mentor-badge";
import { PostMutedBadge } from "@/components/community/post-muted-badge";
import { PostOwnerActionMenu } from "@/components/community/post-owner-action-menu";
import type { VoteValue } from "@/components/community/vote-action-button";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
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
import { navigateBackWithFallback } from "@/utils/navigation-history";

const PAGE_LIMIT = 12;

const COMMUNITY_POST_SORTS = [
  { icon: Flame, label: "Em destaque", value: "featured" },
  { icon: Clock, label: "Novos", value: "new" },
  { icon: MessageCircle, label: "Mais comentados", period: true, value: "commented" },
  { icon: ArrowUp, label: "Mais úteis", period: true, value: "voted" },
] as const;

type CommunityPostSort = (typeof COMMUNITY_POST_SORTS)[number]["value"];
type CommunityPostSortPeriod = "week" | "month" | "year" | "all";
type CommunityPostSortWithPeriod = Extract<CommunityPostSort, "commented" | "voted">;
type CommunityPostSelectedPeriods = Partial<
  Record<CommunityPostSortWithPeriod, CommunityPostSortPeriod>
>;

const COMMUNITY_POST_SORT_PERIODS: Array<{
  label: string;
  value: CommunityPostSortPeriod;
}> = [
  { label: "Esta semana", value: "week" },
  { label: "Este mês", value: "month" },
  { label: "Este ano", value: "year" },
  { label: "Desde sempre", value: "all" },
];

const getCommunityPostSortPeriodShortLabel = (value: CommunityPostSortPeriod) => {
  const labels: Record<CommunityPostSortPeriod, string> = {
    all: "Sempre",
    month: "Mês",
    week: "Semana",
    year: "Ano",
  };

  return labels[value];
};

const communityPostSortChipClassName = (active: boolean) =>
  cn(
    "group inline-flex h-[30px] min-h-[30px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[11px] font-bold leading-none tracking-[-0.01em] shadow-none transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.99]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#308CE8]/20",
    active
      ? "border-primary bg-primary text-white hover:bg-primary/95 dark:border-primary dark:bg-primary dark:text-white"
      : "border-[#DDE8F4] bg-white text-[#5F718A] hover:border-[#BFD8F4] hover:bg-[#F8FBFF] hover:text-[#123B6D] dark:border-border dark:bg-surface/70 dark:text-muted dark:hover:bg-surface-muted/70 dark:hover:text-foreground",
  );

const FEED_SCOPE_OPTIONS: Array<{ label: string; value: CommunityFeedScope }> = [
  { label: "Todas as comunidades", value: "all" },
  { label: "Comunidades que sigo", value: "following" },
];

type CommunityVisualPalette = {
  coverDepthColor: string;
  coverEndColor: string;
  coverStartColor: string;
  primaryColor: string;
  primaryDarkColor: string;
  softColor: string;
  textColor: string;
  gradientColor: string;
};

type CommunityPaletteStyle = CSSProperties & {
  "--community-cover-depth": string;
  "--community-cover-end": string;
  "--community-cover-start": string;
  "--community-gradient-color": string;
  "--community-primary-color": string;
  "--community-primary-dark": string;
  "--community-soft-color": string;
  "--community-text-color": string;
};

type RgbColor = {
  b: number;
  g: number;
  r: number;
};

type HslColor = {
  h: number;
  l: number;
  s: number;
};

const FALLBACK_COMMUNITY_PALETTE: CommunityVisualPalette = {
  coverDepthColor: "#245D9F",
  coverEndColor: "#183E78",
  coverStartColor: "#3278C2",
  primaryColor: "#2F7FD3",
  primaryDarkColor: "#1E3F7E",
  softColor: "#E7F1FB",
  textColor: "#245C9D",
  gradientColor: "#D6E7F7",
};

const COMMUNITY_PALETTE_CACHE = new Map<string, CommunityVisualPalette>();

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeHexColor = (value?: string | null) => {
  if (!value) return null;

  const trimmed = value.trim();
  const shortMatch = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (shortMatch) {
    return `#${shortMatch[1]
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toUpperCase()}`;
  }

  const longMatch = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (!longMatch) return null;

  return `#${longMatch[1].toUpperCase()}`;
};

const hexToRgb = (hex: string): RgbColor | null => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
};

const rgbToHex = ({ b, g, r }: RgbColor) => {
  const toHex = (value: number) =>
    Math.round(clampNumber(value, 0, 255))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rgbToHsl = ({ b, g, r }: RgbColor): HslColor => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return {
    h: Math.round((hue * 60 + 360) % 360),
    s: saturation,
    l: lightness,
  };
};

const hslToRgb = ({ h, l, s }: HslColor): RgbColor => {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = l - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    r: (red + match) * 255,
    g: (green + match) * 255,
    b: (blue + match) * 255,
  };
};

const paletteFromRgb = (rgb: RgbColor): CommunityVisualPalette => {
  const hsl = rgbToHsl(rgb);
  const saturation = clampNumber(hsl.s * 0.82, 0.36, 0.62);
  const lightness = clampNumber(hsl.l * 0.92, 0.34, 0.46);
  const primary = { h: hsl.h, s: saturation, l: lightness };
  const coverStart = {
    ...primary,
    l: clampNumber(lightness - 0.01, 0.34, 0.43),
    s: clampNumber(saturation * 0.82, 0.3, 0.5),
  };
  const coverDepth = {
    ...primary,
    l: clampNumber(lightness - 0.08, 0.28, 0.36),
    s: clampNumber(saturation * 0.76, 0.28, 0.46),
  };
  const coverEnd = {
    ...primary,
    l: clampNumber(lightness - 0.16, 0.2, 0.3),
    s: clampNumber(saturation * 0.7, 0.24, 0.4),
  };

  return {
    coverDepthColor: rgbToHex(hslToRgb(coverDepth)),
    coverEndColor: rgbToHex(hslToRgb(coverEnd)),
    coverStartColor: rgbToHex(hslToRgb(coverStart)),
    primaryColor: rgbToHex(hslToRgb(primary)),
    primaryDarkColor: rgbToHex(
      hslToRgb({ ...primary, l: clampNumber(lightness - 0.16, 0.22, 0.36) }),
    ),
    softColor: rgbToHex(
      hslToRgb({ ...primary, s: clampNumber(saturation * 0.55, 0.32, 0.5), l: 0.92 }),
    ),
    textColor: rgbToHex(hslToRgb({ ...primary, s: clampNumber(saturation, 0.54, 0.82), l: 0.36 })),
    gradientColor: rgbToHex(
      hslToRgb({ ...primary, s: clampNumber(saturation * 0.42, 0.24, 0.4), l: 0.88 }),
    ),
  };
};

const resolveStoredCommunityPalette = (
  community: CommunityDetail,
): CommunityVisualPalette | null => {
  const primaryColor = normalizeHexColor(community.visual_primary_color);
  if (!primaryColor) return null;

  const derived = hexToRgb(primaryColor);
  const derivedPalette = derived ? paletteFromRgb(derived) : FALLBACK_COMMUNITY_PALETTE;

  return {
    coverDepthColor: derivedPalette.coverDepthColor,
    coverEndColor: derivedPalette.coverEndColor,
    coverStartColor: derivedPalette.coverStartColor,
    primaryColor,
    primaryDarkColor:
      normalizeHexColor(community.visual_primary_dark_color) ?? derivedPalette.primaryDarkColor,
    softColor: normalizeHexColor(community.visual_soft_color) ?? derivedPalette.softColor,
    textColor: normalizeHexColor(community.visual_text_color) ?? derivedPalette.textColor,
    gradientColor:
      normalizeHexColor(community.visual_gradient_color) ?? derivedPalette.gradientColor,
  };
};

const extractCommunityPaletteFromImage = (src: string): Promise<CommunityVisualPalette> => {
  if (typeof window === "undefined") return Promise.resolve(FALLBACK_COMMUNITY_PALETTE);

  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const canvas = document.createElement("canvas");
    const size = 48;

    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      try {
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          reject(new Error("Canvas indisponível para extrair cor da comunidade."));
          return;
        }

        context.drawImage(image, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);
        const buckets = new Map<
          string,
          {
            count: number;
            hsl: HslColor;
            r: number;
            g: number;
            b: number;
          }
        >();

        for (let index = 0; index < data.length; index += 16) {
          const alpha = data[index + 3];
          if (alpha < 160) continue;

          const rgb = { r: data[index], g: data[index + 1], b: data[index + 2] };
          const hsl = rgbToHsl(rgb);

          if (hsl.l < 0.08 || hsl.l > 0.93 || hsl.s < 0.14) continue;

          const bucket = {
            r: Math.round(rgb.r / 24) * 24,
            g: Math.round(rgb.g / 24) * 24,
            b: Math.round(rgb.b / 24) * 24,
          };
          const key = `${bucket.r}:${bucket.g}:${bucket.b}`;
          const current = buckets.get(key);

          if (current) {
            current.count += 1;
            current.r += rgb.r;
            current.g += rgb.g;
            current.b += rgb.b;
          } else {
            buckets.set(key, {
              count: 1,
              hsl,
              r: rgb.r,
              g: rgb.g,
              b: rgb.b,
            });
          }
        }

        let best: {
          count: number;
          hsl: HslColor;
          r: number;
          g: number;
          b: number;
          score: number;
        } | null = null;

        for (const bucket of buckets.values()) {
          const score =
            bucket.count *
            (0.6 + bucket.hsl.s) *
            (1 - Math.min(0.45, Math.abs(bucket.hsl.l - 0.5)));

          if (!best || score > best.score) {
            best = { ...bucket, score };
          }
        }

        if (!best) {
          reject(new Error("Nenhuma cor elegível encontrada no avatar da comunidade."));
          return;
        }

        resolve(
          paletteFromRgb({
            r: best.r / best.count,
            g: best.g / best.count,
            b: best.b / best.count,
          }),
        );
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = src;
  });
};

const useCommunityVisualPalette = (community: CommunityDetail) => {
  const storedPalette = useMemo(() => resolveStoredCommunityPalette(community), [community]);
  const avatarSrc = useMemo(
    () => resolvePublicMediaUrl(community.avatar_url),
    [community.avatar_url],
  );
  const cacheKey = `${community.id}:${community.avatar_url ?? "no-avatar"}`;
  const cachedPalette = avatarSrc ? COMMUNITY_PALETTE_CACHE.get(cacheKey) : undefined;
  const [extractedPalette, setExtractedPalette] = useState<{
    cacheKey: string;
    palette: CommunityVisualPalette;
  } | null>(null);

  useEffect(() => {
    if (storedPalette || !avatarSrc || cachedPalette) return;

    let cancelled = false;

    extractCommunityPaletteFromImage(avatarSrc)
      .then((nextPalette) => {
        if (cancelled) return;

        COMMUNITY_PALETTE_CACHE.set(cacheKey, nextPalette);
        setExtractedPalette({ cacheKey, palette: nextPalette });
      })
      .catch(() => {
        if (!cancelled) setExtractedPalette({ cacheKey, palette: FALLBACK_COMMUNITY_PALETTE });
      });

    return () => {
      cancelled = true;
    };
  }, [avatarSrc, cacheKey, cachedPalette, storedPalette]);

  return (
    storedPalette ??
    cachedPalette ??
    (extractedPalette?.cacheKey === cacheKey
      ? extractedPalette.palette
      : FALLBACK_COMMUNITY_PALETTE)
  );
};

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
  href,
  onClick,
  size = "md",
}: {
  anonymous?: boolean;
  author: CommunityPost["author"];
  href?: string;
  onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
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

  const avatarNode = (
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

  if (!href) return avatarNode;

  return (
    <Link
      aria-label={`Abrir perfil de ${author.name}`}
      className="pointer-events-auto shrink-0 cursor-pointer rounded-full no-underline transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]"
      href={href}
      onClick={onClick}
    >
      {avatarNode}
    </Link>
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
      <MentorBadge badge={badge} href={href} onClick={onClick} />
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
      <VerticalVideoPlayer
        className="mx-auto w-full max-w-[390px] rounded-[22px]"
        fullscreenVariant="content"
        src={mediaUrl}
        title={post.title}
      />
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
      <VerticalVideoPlayer
        className="w-full rounded-[18px]"
        fullscreenVariant="content"
        src={mediaUrl}
        title="Vídeo da resposta profissional"
      />
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
          <AuthorAvatar
            author={reply.author}
            href={profileHref}
            onClick={(event) => event.stopPropagation()}
            size="lg"
          />
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
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-success bg-transparent text-sm font-black text-success shadow-none transition hover:bg-success hover:text-white"
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
  const conversion = useProgressiveConversion();
  const postDetailHref = communityPostDetailHref(post);
  const psychologistProfileHref = isPsychologistPost
    ? `/app/psychologist/${post.author.id}`
    : undefined;

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
  }, [conversion, post.id, saveMutation, saveSnapshot]);

  useEffect(() => {
    if (!conversion.isAuthenticated || saveSnapshot.saved) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "save_post" && String(candidate.payload?.postId ?? "") === post.id,
    );

    if (!intent) return;

    window.setTimeout(handleToggleSave, 0);
  }, [conversion, handleToggleSave, post.id, saveSnapshot.saved]);

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-border dark:bg-surface">
      {showCommunityHeader ? (
        <div className="mb-4 flex min-w-0 items-center gap-2 text-[11px] font-semibold text-subtle">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="shrink-0">Postado em</span>
            <Link
              className="block min-w-0 flex-1 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap font-black text-muted"
              href={communityDetailHref(post.community.slug)}
            >
              {post.community.name}
            </Link>
          </div>
          <CommunityFollowToggle
            className="shrink-0"
            initialFollowing={Boolean(post.community.following)}
            slug={post.community.slug}
          />
          {post.muted_by_current_user ? <PostMutedBadge className="shrink-0" /> : null}
          <PostOwnerActionMenu className="shrink-0" post={post} />
        </div>
      ) : null}

      <div className="mb-3 flex items-start gap-3">
        <AuthorAvatar
          anonymous={isAnonymousPatient}
          author={post.author}
          href={psychologistProfileHref}
        />
        <div className="grid min-w-0 flex-1 gap-1">
          <AuthorIdentityLine
            badge={post.author.featured_badge ?? post.featured_badge}
            href={psychologistProfileHref}
            name={post.author.name}
            verified={post.author.verified}
          />
          {psychologistProfileHref ? (
            <Link
              className="w-fit cursor-pointer text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
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
        {!showCommunityHeader ? (
          <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
            {post.muted_by_current_user ? <PostMutedBadge /> : null}
            <PostOwnerActionMenu post={post} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Link
          className="cursor-pointer text-[1.32rem] font-black leading-[1.18] tracking-[-0.02em] text-[#182033] dark:text-foreground"
          href={postDetailHref}
        >
          {post.title}
        </Link>
        <InlineExpandableText
          className="text-sm leading-6 text-[#64748B] dark:text-muted"
          expanded={false}
          href={postDetailHref}
          text={post.content}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <PostMedia post={post} />
        <ProfessionalReplyPreview post={post} />
      </div>

      <CommunityActionBar
        className="mt-4 border-[#EDF1F5] border-t pt-3 dark:border-border"
        comments={{
          count: post.replies_count,
          href: postDetailHref,
          label: "Comentar",
        }}
        currentVote={voteSnapshot.currentVote}
        disabled={voteMutation.isPending}
        onVote={handleVote}
        save={{
          active: saveSnapshot.saved,
          count: saveSnapshot.saves,
          disabled: saveMutation.isPending,
          label: saveSnapshot.saved ? "Remover dos salvos" : "Salvar post",
          onClick: handleToggleSave,
        }}
        share={{
          label: `Compartilhar ${post.title}`,
          onClick: () => onShare(post),
        }}
        upvotesCount={voteSnapshot.upvotes}
      />
    </article>
  );
};

const flattenCommunityPostPages = (pages?: Array<{ data: CommunityPost[] }>) => {
  const seen = new Set<string>();
  const posts: CommunityPost[] = [];

  for (const page of pages ?? []) {
    for (const post of page.data) {
      if (seen.has(post.id)) continue;

      seen.add(post.id);
      posts.push(post);
    }
  }

  return posts;
};

const InfinitePostLoader = ({
  hasNextPage,
  isLoading,
  label,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isLoading: boolean;
  label: string;
  onLoadMore: () => void;
}) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isLoading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "520px 0px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, isLoading, onLoadMore]);

  if (!hasNextPage && !isLoading) return null;

  return (
    <div className="grid min-h-10 place-items-center py-2" ref={sentinelRef}>
      {isLoading ? (
        <LoadingState label={label} />
      ) : (
        <span className="sr-only">Carregar mais posts automaticamente</span>
      )}
    </div>
  );
};

const comparePostDates = (a: CommunityPost, b: CommunityPost) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const fallbackCommunityPeriodMetrics = (
  value: number,
): Record<CommunityPostSortPeriod, number> => ({
  week: value,
  month: value,
  year: value,
  all: value,
});

const communityPostSortMetrics = (post: CommunityPost) =>
  post.sort_metrics ?? {
    comments: fallbackCommunityPeriodMetrics(post.replies_count),
    upvotes: fallbackCommunityPeriodMetrics(post.upvotes_count),
    psychologist_replies_count: post.highlighted_professional_reply ? 1 : 0,
    top_mentor_replies_count: post.highlighted_professional_reply?.author.featured_badge ? 1 : 0,
    shares_count: 0,
    penalty: 0,
  };

const communityPostMetricForPeriod = (
  post: CommunityPost,
  metric: "comments" | "upvotes",
  period: CommunityPostSortPeriod,
) => {
  return communityPostSortMetrics(post)[metric][period] ?? 0;
};

const communityFeaturedScore = (post: CommunityPost, now: number) => {
  const metrics = communityPostSortMetrics(post);
  const createdAt = new Date(post.created_at).getTime();
  const hoursSincePublication = Number.isNaN(createdAt)
    ? 0
    : Math.max(0, (now - createdAt) / 3_600_000);
  const highlightScore =
    metrics.upvotes.all * 3 +
    metrics.comments.all * 5 +
    metrics.psychologist_replies_count * 15 +
    metrics.top_mentor_replies_count * 25 +
    metrics.shares_count * 4 -
    metrics.penalty;

  return highlightScore / (hoursSincePublication + 2) ** 0.5;
};

const sortCommunityPostsByMetric = (
  posts: CommunityPost[],
  metric: "comments" | "upvotes",
  period: CommunityPostSortPeriod,
) => {
  const secondaryMetric = metric === "comments" ? "upvotes" : "comments";

  return posts.sort((a, b) => {
    const metricDiff =
      communityPostMetricForPeriod(b, metric, period) -
      communityPostMetricForPeriod(a, metric, period);
    if (metricDiff !== 0) return metricDiff;

    const secondaryMetricDiff =
      communityPostMetricForPeriod(b, secondaryMetric, period) -
      communityPostMetricForPeriod(a, secondaryMetric, period);
    if (secondaryMetricDiff !== 0) return secondaryMetricDiff;

    return comparePostDates(a, b);
  });
};

const sortCommunityPosts = (
  posts: CommunityPost[],
  sort: CommunityPostSort,
  periods: CommunityPostSelectedPeriods,
) => {
  const items = posts.filter((post) => post.status !== "removido");

  if (sort === "new") {
    return items.sort(comparePostDates);
  }

  if (sort === "commented") {
    return sortCommunityPostsByMetric(items, "comments", periods.commented ?? "all");
  }

  if (sort === "voted") {
    return sortCommunityPostsByMetric(items, "upvotes", periods.voted ?? "all");
  }

  const now = Date.now();

  return items.sort((a, b) => {
    const aScore = communityFeaturedScore(a, now);
    const bScore = communityFeaturedScore(b, now);

    if (bScore !== aScore) return bScore - aScore;

    return comparePostDates(a, b);
  });
};

const CommunityLogo = ({
  community,
  palette,
}: {
  community: CommunityDetail;
  palette: CommunityVisualPalette;
}) => {
  const avatarSrc = resolvePublicMediaUrl(community.avatar_url);
  const avatarIsPublicMedia = isPublicMediaUrl(community.avatar_url);

  return (
    <span
      className="relative grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] border-[4px] border-white text-center text-lg font-black leading-none shadow-[0_16px_34px_rgba(15,23,42,0.18)] dark:border-background"
      style={{
        background: `linear-gradient(135deg, ${palette.softColor} 0%, ${palette.gradientColor} 100%)`,
        color: palette.textColor,
      }}
    >
      {avatarSrc ? (
        <Image
          alt={`Avatar da comunidade ${community.name}`}
          className="object-cover"
          fill
          sizes="76px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(community.name)
      )}
    </span>
  );
};

const CommunityDetailSkeleton = () => (
  <div className="grid gap-4">
    <div className="min-h-[260px] animate-pulse rounded-[28px] bg-white shadow-[var(--lectum-shadow-soft)] dark:bg-surface" />
    <div className="grid gap-3">
      <div className="h-48 animate-pulse rounded-[22px] bg-white dark:bg-surface" />
      <div className="h-48 animate-pulse rounded-[22px] bg-white dark:bg-surface" />
    </div>
  </div>
);

const CommunityRulesCard = () => {
  const rulesContentId = useId();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleRules = () => {
    setIsExpanded((current) => !current);
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
            Comunidade mediada por psicólogos e moderada pela equipe Lectum.
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
              Compartilhe sua história à vontade, mas preserve sua privacidade e a de terceiros.
              Evite publicar informações como telefone, endereço, e-mail, CPF ou nome completo.
            </li>
            <li className="flex gap-2">
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Comente nos posts com respeito, acolhimento e empatia, mesmo quando discordar.
            </li>
            <li className="flex gap-2">
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Não publique conteúdos que incentivem violência, autolesão ou comportamentos
              prejudiciais à saúde física ou mental.
            </li>
            <li className="flex gap-2">
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Psicólogos participam como mediadores e fontes de conhecimento, mas não realizam
              consultas, diagnósticos ou acompanhamento pela comunidade.
            </li>
            <li className="flex gap-2">
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Se desejar uma consulta, diagnóstico ou acompanhamento individualizado, entre em
              contato diretamente com o psicólogo pelo WhatsApp para agendar um atendimento.
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
  onBack,
  onSearch,
  onShare,
  onToggleFollow,
}: {
  community: CommunityDetail;
  following: boolean;
  membershipPending: boolean;
  onBack: () => void;
  onSearch: () => void;
  onShare: () => void;
  onToggleFollow: () => void;
}) => {
  const palette = useCommunityVisualPalette(community);
  const communityPaletteStyle: CommunityPaletteStyle = {
    "--community-cover-depth": palette.coverDepthColor,
    "--community-cover-end": palette.coverEndColor,
    "--community-cover-start": palette.coverStartColor,
    "--community-gradient-color": palette.gradientColor,
    "--community-primary-color": palette.primaryColor,
    "--community-primary-dark": palette.primaryDarkColor,
    "--community-soft-color": palette.softColor,
    "--community-text-color": palette.textColor,
  };

  return (
    <header
      className="-mx-5 overflow-hidden rounded-b-[28px] bg-white pb-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:bg-surface"
      style={communityPaletteStyle}
    >
      <div
        className="relative min-h-[132px] px-5 pt-4 text-white"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 34%, rgba(15,23,42,0.12) 100%), linear-gradient(145deg, var(--community-cover-start) 0%, var(--community-cover-depth) 58%, var(--community-cover-end) 100%)",
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <button
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <button
              aria-label={`Buscar em ${community.name}`}
              className="grid h-10 w-10 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25"
              onClick={onSearch}
              type="button"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
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
        <span
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05),transparent_44%,rgba(2,6,23,0.08))]"
          aria-hidden="true"
        />
      </div>

      <div className="relative px-5">
        <div className="-mt-8 flex items-center justify-between gap-4">
          <CommunityLogo community={community} palette={palette} />
          <CommunityFollowButton
            disabled={membershipPending}
            following={following}
            onClick={onToggleFollow}
            pending={membershipPending}
            size="hero"
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
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--community-soft-color)] px-3 py-1.5 text-xs font-black text-[var(--community-text-color)] transition hover:bg-[var(--community-primary-color)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--community-primary-color)] focus-visible:ring-offset-2"
            href={`/app/community/top-mentors?community=${community.slug}`}
          >
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            Ver Top 5 mentores da comunidade
          </Link>
        </div>
      </div>
    </header>
  );
};

const CommunityContextSearchHeader = ({
  communityName,
  inputRef,
  onBack,
  onSearchChange,
  search,
}: {
  communityName: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onSearchChange: (value: string) => void;
  search: string;
}) => (
  <header className="sticky top-0 z-30 -mx-5 border-border border-b bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90">
    <div className="mx-auto flex max-w-[430px] items-center gap-3 sm:max-w-2xl lg:max-w-[760px]">
      <button
        aria-label={`Voltar para ${communityName}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="grid min-w-0 flex-1 gap-2">
        <h2 className="truncate text-sm font-black text-foreground">Buscar em {communityName}</h2>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <Input
            aria-label={`Buscar em ${communityName}`}
            className="h-11 rounded-full bg-surface pl-11 text-sm shadow-sm"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Buscar em ${communityName}`}
            ref={inputRef}
            type="search"
            value={search}
          />
        </div>
      </div>
    </div>
  </header>
);

const CommunityPeriodSortChip = ({
  active,
  icon: Icon,
  label,
  onPeriodChange,
  period,
  value,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onPeriodChange: (sort: CommunityPostSortWithPeriod, period: CommunityPostSortPeriod) => void;
  period: CommunityPostSortPeriod | null;
  value: CommunityPostSortWithPeriod;
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const periodLabel = period ? getCommunityPostSortPeriodShortLabel(period) : null;
  const showPeriod = active && Boolean(periodLabel);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const viewportPadding = 12;
    const desiredWidth = Math.max(rect.width, 232);
    const availableWidth = Math.max(window.innerWidth - viewportPadding * 2, 160);
    const width = Math.min(desiredWidth, availableWidth);
    const left = clampNumber(
      rect.left,
      viewportPadding,
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    const estimatedHeight = 198;
    const preferredTop = rect.bottom + 8;
    const top =
      preferredTop + estimatedHeight > window.innerHeight - viewportPadding
        ? Math.max(viewportPadding, rect.top - estimatedHeight - 8)
        : preferredTop;

    setMenuStyle({
      left,
      maxHeight: "min(16rem, calc(100vh - 1.5rem))",
      top,
      width,
    });
  }, []);

  const toggleMenu = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-pressed={active}
        className={communityPostSortChipClassName(active)}
        onClick={toggleMenu}
        ref={buttonRef}
        type="button"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden="true" strokeWidth={1.9} />
        <span className="whitespace-nowrap text-[11px] font-bold leading-none">{label}</span>
        <ChevronDown
          className={cn(
            "-ml-0.5 h-3.5 w-3.5 shrink-0 opacity-80 transition-transform duration-200",
            open ? "rotate-180" : "",
          )}
          aria-hidden="true"
        />
        {showPeriod ? (
          <span className="ml-0.5 rounded-full border border-[#B7D7F5]/70 bg-white/60 px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#2F5F94] dark:border-primary/25 dark:bg-white/10 dark:text-[#B8D8FF]">
            {periodLabel}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[90] overflow-y-auto rounded-[18px] border border-[#DCE6F2] bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)] outline-none animate-in fade-in slide-in-from-top-1 duration-150 dark:border-border dark:bg-surface"
              id={menuId}
              ref={menuRef}
              role="menu"
              style={menuStyle}
            >
              {COMMUNITY_POST_SORT_PERIODS.map((option) => {
                const selected = option.value === period;

                return (
                  <button
                    aria-checked={selected}
                    className={cn(
                      "group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold tracking-[-0.01em] transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                      selected
                        ? "bg-primary-soft/75 text-[#1D4ED8]"
                        : "text-[#475569] hover:bg-[#F8FBFF] hover:text-[#1E3A8A] dark:text-muted dark:hover:bg-surface-muted",
                    )}
                    key={option.value}
                    onClick={() => {
                      onPeriodChange(value, option.value);
                      setOpen(false);
                      buttonRef.current?.focus();
                    }}
                    role="menuitemradio"
                    type="button"
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                        selected
                          ? "border-primary/20 bg-white/80 text-primary"
                          : "border-transparent text-transparent group-hover:border-primary/10 group-hover:text-primary/40",
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

const CommunityPostSortChips = ({
  onChange,
  onPeriodChange,
  periods,
  value,
}: {
  onChange: (value: CommunityPostSort) => void;
  onPeriodChange: (sort: CommunityPostSortWithPeriod, period: CommunityPostSortPeriod) => void;
  periods: CommunityPostSelectedPeriods;
  value: CommunityPostSort;
}) => (
  <nav
    aria-label="Ordenação dos posts"
    className="w-full max-w-full overflow-x-auto scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <div className="flex min-w-max items-center gap-1.5 py-1 pr-2">
      {COMMUNITY_POST_SORTS.map((item) => {
        const Icon = item.icon;
        const active = value === item.value;
        const hasPeriod = "period" in item;
        const periodValue = hasPeriod
          ? (periods[item.value as CommunityPostSortWithPeriod] ?? null)
          : null;
        if (hasPeriod) {
          return (
            <CommunityPeriodSortChip
              active={active}
              icon={Icon}
              key={item.value}
              label={item.label}
              onPeriodChange={onPeriodChange}
              period={periodValue}
              value={item.value as CommunityPostSortWithPeriod}
            />
          );
        }

        return (
          <button
            aria-pressed={active}
            className={communityPostSortChipClassName(active)}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 opacity-85"
              aria-hidden="true"
              strokeWidth={1.9}
            />
            <span className="whitespace-nowrap text-[11px] font-bold leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

type CommunityPublishOnboardingVariant = "floating" | "bottomNavigation";

const COMMUNITY_PUBLISH_ONBOARDING_PLACEMENT: Record<
  CommunityPublishOnboardingVariant,
  { highlight: string; tooltip: string }
> = {
  bottomNavigation: {
    highlight:
      "left-1/2 bottom-5 -translate-x-1/2 lg:left-auto lg:right-10 lg:bottom-10 lg:translate-x-0 xl:right-20 2xl:right-28",
    tooltip:
      "left-1/2 bottom-[calc(1.25rem+5.5rem)] -translate-x-1/2 lg:left-auto lg:right-10 lg:bottom-[calc(2.5rem+5.75rem)] lg:translate-x-0 xl:right-20 2xl:right-28",
  },
  floating: {
    highlight:
      "right-5 bottom-[var(--lectum-mobile-nav-aware-fab-bottom)] sm:bottom-[var(--lectum-mobile-nav-aware-fab-bottom-sm)] lg:right-10 lg:bottom-10 xl:right-20 2xl:right-28",
    tooltip:
      "right-4 bottom-[calc(var(--lectum-mobile-nav-aware-fab-bottom)+5.25rem)] sm:bottom-[calc(var(--lectum-mobile-nav-aware-fab-bottom-sm)+5.25rem)] lg:right-10 lg:bottom-[calc(2.5rem+5.75rem)] xl:right-20 2xl:right-28",
  },
};

const CommunityPublishOnboarding = ({
  variant,
}: {
  variant: CommunityPublishOnboardingVariant;
}) => {
  const accountTips = useAccount({
    enableSecurity: false,
    enableTips: true,
  });
  const accountTipsUserId = accountTips.userId;
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const hasSyncedPreferenceRef = useRef(false);
  const hasPersistedSeenRef = useRef(false);
  const placement = COMMUNITY_PUBLISH_ONBOARDING_PLACEMENT[variant];

  const persistSeen = useCallback(() => {
    if (
      hasPersistedSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_community_post_tip ||
      accountTips.updateOnboardingTips.isPending
    ) {
      return;
    }

    hasPersistedSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_community_post_tip: true,
      },
      {
        onError: () => {
          hasPersistedSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_community_post_tip,
    accountTips.updateOnboardingTips,
  ]);

  const dismiss = useCallback(() => {
    persistSeen();
    setHasSeenOnboarding(true);
    setIsVisible(false);
  }, [persistSeen]);

  useEffect(() => {
    hasSyncedPreferenceRef.current = false;
    hasPersistedSeenRef.current = false;

    const frame = window.requestAnimationFrame(() => {
      setHasLoadedPreference(false);
      setHasSeenOnboarding(true);
      setIsVisible(false);
    });

    if (!accountTipsUserId) {
      return () => window.cancelAnimationFrame(frame);
    }

    return () => window.cancelAnimationFrame(frame);
  }, [accountTipsUserId]);

  useEffect(() => {
    if (hasSyncedPreferenceRef.current) return;
    if (accountTips.onboardingTips.isPending) return;

    hasSyncedPreferenceRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      if (!accountTips.onboardingTips.isSuccess) {
        setHasSeenOnboarding(true);
        setHasLoadedPreference(true);
        return;
      }

      setHasSeenOnboarding(Boolean(accountTips.onboardingTips.data.has_seen_community_post_tip));
      setHasLoadedPreference(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    accountTips.onboardingTips.data,
    accountTips.onboardingTips.isPending,
    accountTips.onboardingTips.isSuccess,
  ]);

  useEffect(() => {
    if (!hasLoadedPreference || hasSeenOnboarding) return;

    const timeout = window.setTimeout(() => {
      setIsVisible(true);
      persistSeen();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedPreference, hasSeenOnboarding, persistSeen]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismiss, isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[120] animate-in fade-in duration-200"
      data-community-publish-onboarding
    >
      <button
        aria-label="Fechar orientação para publicar na comunidade"
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/48 backdrop-blur-[2px]"
        onClick={dismiss}
        tabIndex={-1}
        type="button"
      />

      <div
        className={cn(
          "pointer-events-none fixed z-[125] grid h-16 w-16 place-items-center",
          placement.highlight,
        )}
        aria-hidden="true"
      >
        <span className="absolute -inset-3 rounded-full border border-[#308CE8]/25 motion-safe:animate-[lectum-community-publish-ring_1.8s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full border-2 border-[#308CE8]/35 motion-safe:animate-[lectum-community-publish-ring_1.8s_ease-out_0.18s_infinite]" />
        <span className="relative grid h-14 w-14 place-items-center rounded-full border-[5px] border-white bg-[#308CE8] text-white shadow-[0_20px_42px_rgba(48,140,232,0.42)] motion-safe:animate-[lectum-community-publish-pulse_1.8s_ease-in-out_infinite] lg:h-16 lg:w-16">
          <Plus className="h-7 w-7 stroke-[2.4] lg:h-8 lg:w-8" aria-hidden="true" />
        </span>
      </div>

      <section
        aria-labelledby="community-publish-onboarding-title"
        aria-modal="true"
        className={cn(
          "fixed z-[126] w-[calc(100vw-2rem)] max-w-[342px] rounded-[26px] border border-white/70 bg-white p-5 text-left shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-[#D9E8F8]/80",
          placement.tooltip,
        )}
        role="dialog"
      >
        <div className="grid gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF5FF] text-[#308CE8]">
            <Plus className="h-6 w-6 stroke-[2.3]" aria-hidden="true" />
          </div>
          <div className="grid gap-2">
            <h2
              className="font-extrabold text-[1.05rem] text-foreground leading-tight"
              id="community-publish-onboarding-title"
            >
              Publique sua dúvida ou relato
            </h2>
            <p className="text-sm text-subtle leading-relaxed">
              Converse gratuitamente na comunidade e receba acolhimento dos psicólogos mediadores.
            </p>
          </div>
          <Button
            className="mt-1 h-11 rounded-full bg-[#308CE8] font-extrabold text-white shadow-none hover:bg-[#2579CF]"
            onClick={dismiss}
            type="button"
          >
            Entendi
          </Button>
        </div>
      </section>

      <style>{`
        @keyframes lectum-community-publish-pulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 20px 42px rgba(48, 140, 232, 0.42);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 26px 56px rgba(48, 140, 232, 0.56);
          }
        }

        @keyframes lectum-community-publish-ring {
          0% {
            opacity: 0.72;
            transform: scale(0.86);
          }
          100% {
            opacity: 0;
            transform: scale(1.42);
          }
        }
      `}</style>
    </div>
  );
};

const CommunityDetailLogic = ({ slug }: { slug: string }) => {
  const router = useRouter();
  const conversion = useProgressiveConversion();
  const [sort, setSort] = useState<CommunityPostSort>("featured");
  const [sortPeriods, setSortPeriods] = useState<CommunityPostSelectedPeriods>({});
  const [communitySearchOpen, setCommunitySearchOpen] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");
  const deferredCommunitySearch = useDeferredValue(communitySearch.trim());
  const communitySearchInputRef = useRef<HTMLInputElement>(null);
  const communitySearchReturnStateRef = useRef<{ scrollY: number } | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [followingOverride, setFollowingOverride] = useState<boolean | null>(null);
  const detail = useCommunityDetail(slug);
  const postsQueryParams = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      sort,
      ...(sort === "commented" && sortPeriods.commented ? { period: sortPeriods.commented } : {}),
      ...(sort === "voted" && sortPeriods.voted ? { period: sortPeriods.voted } : {}),
      ...(communitySearchOpen && deferredCommunitySearch
        ? { search: deferredCommunitySearch }
        : {}),
    }),
    [communitySearchOpen, deferredCommunitySearch, sort, sortPeriods.commented, sortPeriods.voted],
  );
  const postsQuery = useInfiniteCommunityPosts(slug, postsQueryParams, Boolean(detail.data));
  const followMutation = useFollowCommunity();
  const unfollowMutation = useUnfollowCommunity();
  const community = detail.data?.community;
  const loadedPosts = useMemo(
    () => flattenCommunityPostPages(postsQuery.data?.pages),
    [postsQuery.data?.pages],
  );
  const posts = useMemo(
    () => sortCommunityPosts(loadedPosts, sort, sortPeriods),
    [loadedPosts, sort, sortPeriods],
  );
  const detailError = detail.isError ? resolveCommunityDetailError(detail.error) : null;
  const postsError = postsQuery.isError ? resolveFeedError(postsQuery.error) : null;
  const membershipPending = followMutation.isPending || unfollowMutation.isPending;
  const following = followingOverride ?? Boolean(community?.following);
  const hasCommunitySearchTerm = communitySearchOpen && deferredCommunitySearch.length > 0;
  const isInitialPostsLoading =
    (postsQuery.isLoading || postsQuery.isPending) && posts.length === 0;
  const {
    fetchNextPage: fetchNextCommunityPostsPage,
    hasNextPage: hasNextCommunityPostsPage,
    isFetching: isFetchingCommunityPosts,
    isFetchingNextPage: isFetchingNextCommunityPostsPage,
  } = postsQuery;
  const loadMoreCommunityPosts = useCallback(() => {
    if (
      !hasNextCommunityPostsPage ||
      isFetchingCommunityPosts ||
      isFetchingNextCommunityPostsPage
    ) {
      return;
    }

    void fetchNextCommunityPostsPage();
  }, [
    fetchNextCommunityPostsPage,
    hasNextCommunityPostsPage,
    isFetchingCommunityPosts,
    isFetchingNextCommunityPostsPage,
  ]);

  useEffect(() => {
    if (!communitySearchOpen) return;

    communitySearchInputRef.current?.focus();
  }, [communitySearchOpen]);

  const openCommunitySearch = () => {
    communitySearchReturnStateRef.current = {
      scrollY: typeof window === "undefined" ? 0 : window.scrollY,
    };
    setCommunitySearch("");
    setCommunitySearchOpen(true);
  };

  const closeCommunitySearch = () => {
    const returnState = communitySearchReturnStateRef.current;

    setCommunitySearch("");
    setCommunitySearchOpen(false);

    if (returnState && typeof window !== "undefined") {
      const { scrollY } = returnState;

      window.requestAnimationFrame(() => {
        window.scrollTo({ behavior: "auto", top: scrollY });
        window.setTimeout(() => window.scrollTo({ behavior: "auto", top: scrollY }), 0);
      });
    }

    communitySearchReturnStateRef.current = null;
  };

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

  const handleCreatePostClick = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (conversion.isAuthenticated) return;

    event.preventDefault();
    conversion.requestConversion("trigger_comentar", {
      intent: {
        returnTo: href,
        type: "create_post",
      },
    });
  };

  return (
    <PrivateTemplate
      allowAnonymous
      autoHideNavigation
      contentClassName="!pt-0 bg-[#F5F7FA] dark:bg-background sm:!pt-0"
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
            {communitySearchOpen ? (
              <CommunityContextSearchHeader
                communityName={community.name}
                inputRef={communitySearchInputRef}
                onBack={closeCommunitySearch}
                onSearchChange={setCommunitySearch}
                search={communitySearch}
              />
            ) : (
              <CommunityHeader
                community={community}
                following={following}
                membershipPending={membershipPending}
                onBack={() => navigateBackWithFallback(router)}
                onSearch={openCommunitySearch}
                onShare={shareCommunity}
                onToggleFollow={toggleFollow}
              />
            )}

            {communitySearchOpen ? null : <CommunityRulesCard key={community.slug} />}

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
              <CommunityPostSortChips
                onChange={setSort}
                onPeriodChange={(value, period) => {
                  setSort(value);
                  setSortPeriods((current) => ({ ...current, [value]: period }));
                }}
                periods={sortPeriods}
                value={sort}
              />
            </div>

            {isInitialPostsLoading ? (
              <div className="grid min-h-[220px] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
                <LoadingState label="Carregando posts da comunidade" />
              </div>
            ) : null}

            {postsError ? (
              <InlineAlert title="Posts indisponíveis" variant="error">
                {postsError}
              </InlineAlert>
            ) : null}

            {!isInitialPostsLoading && !postsError && posts.length === 0 ? (
              <EmptyState
                action={
                  hasCommunitySearchTerm ? (
                    <Button onClick={() => setCommunitySearch("")} type="button" variant="outline">
                      Limpar busca
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link
                        href={communityCreatePostHref(community.slug)}
                        onClick={(event) =>
                          handleCreatePostClick(event, communityCreatePostHref(community.slug))
                        }
                        scroll={false}
                      >
                        Criar primeiro post
                      </Link>
                    </Button>
                  )
                }
                description={
                  hasCommunitySearchTerm
                    ? "Nenhum post ou comentário publicado nesta comunidade corresponde ao termo buscado."
                    : "Ainda não há publicações reais nesta comunidade. Seja a primeira pessoa a iniciar uma conversa."
                }
                icon={MessageCircle}
                title={
                  hasCommunitySearchTerm
                    ? "Nenhum resultado nesta comunidade"
                    : "Comunidade sem posts"
                }
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

            {postsQuery.isFetching && !postsQuery.isFetchingNextPage && !isInitialPostsLoading ? (
              <LoadingState label="Atualizando posts" />
            ) : null}

            <InfinitePostLoader
              hasNextPage={Boolean(hasNextCommunityPostsPage)}
              isLoading={isFetchingNextCommunityPostsPage}
              label="Carregando mais posts"
              onLoadMore={loadMoreCommunityPosts}
            />
          </>
        ) : null}
      </section>

      {community ? (
        <Link
          aria-label="Criar publicação nesta comunidade"
          className="group fixed right-5 bottom-[var(--lectum-mobile-nav-aware-fab-bottom)] z-40 grid h-14 w-14 place-items-center rounded-full border-[5px] border-white bg-[#308CE8] text-white shadow-[0_14px_30px_rgba(48,140,232,0.28)] transition-[bottom,transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:bg-[#2579CF] hover:shadow-[0_18px_36px_rgba(48,140,232,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#308CE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F7FA] motion-safe:animate-[lectum-desktop-create-float_4.2s_ease-in-out_infinite] sm:bottom-[var(--lectum-mobile-nav-aware-fab-bottom-sm)] lg:right-10 lg:bottom-10 lg:h-16 lg:w-16 xl:right-20 2xl:right-28"
          href={communityCreatePostHref(community.slug)}
          scroll={false}
          onClick={(event) => handleCreatePostClick(event, communityCreatePostHref(community.slug))}
          title="Criar publicação"
        >
          <Plus
            className="h-8 w-8 stroke-[2.4] transition group-hover:scale-105"
            aria-hidden="true"
          />
          <span className="sr-only">Criar publicação</span>
        </Link>
      ) : null}

      {community ? <CommunityPublishOnboarding variant="floating" /> : null}
    </PrivateTemplate>
  );
};

export const CommunityFeedLogic = () => {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const conversion = useProgressiveConversion();
  const routeSlug = typeof params.slug === "string" ? params.slug : COMMUNITY_FEED_SLUG;
  const communityFromQuery = getCommunityFeedChip(searchParams.get("community"));
  const communityFromLegacySlug =
    routeSlug !== COMMUNITY_FEED_SLUG ? getCommunityFeedChip(routeSlug) : null;
  const selectedCommunitySlug = communityFromQuery?.slug ?? communityFromLegacySlug?.slug ?? null;
  const [scope, setScope] = useState<CommunityFeedScope>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const createPostHref = selectedCommunitySlug
    ? `${COMMUNITY_CREATE_POST_HREF}?community=${encodeURIComponent(selectedCommunitySlug)}`
    : COMMUNITY_CREATE_POST_HREF;
  const query = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      scope,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(selectedCommunitySlug ? { community: selectedCommunitySlug } : {}),
    }),
    [deferredSearch, scope, selectedCommunitySlug],
  );
  const feed = useInfiniteCommunityFeedPosts(query);
  const posts = useMemo(() => flattenCommunityPostPages(feed.data?.pages), [feed.data?.pages]);
  const errorMessage = feed.isError ? resolveFeedError(feed.error) : null;
  const firstFeedPage = feed.data?.pages[0];
  const hasNoFollowedCommunities =
    scope === "following" && (firstFeedPage?.following_count ?? 0) === 0;
  const isInitialFeedLoading = (feed.isLoading || feed.isPending) && posts.length === 0;
  const {
    fetchNextPage: fetchNextFeedPage,
    hasNextPage: hasNextFeedPage,
    isFetching: isFetchingFeed,
    isFetchingNextPage: isFetchingNextFeedPage,
  } = feed;
  const loadMoreFeedPosts = useCallback(() => {
    if (!hasNextFeedPage || isFetchingFeed || isFetchingNextFeedPage) return;

    void fetchNextFeedPage();
  }, [fetchNextFeedPage, hasNextFeedPage, isFetchingFeed, isFetchingNextFeedPage]);

  const handleCreatePostClick = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (conversion.isAuthenticated) return;

    event.preventDefault();
    conversion.requestConversion("trigger_comentar", {
      intent: {
        returnTo: href,
        type: "create_post",
      },
    });
  };

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
      allowAnonymous
      autoHideNavigation
      bottomNavigationCenterAction={{
        ariaLabel: "Criar publicação",
        href: createPostHref,
        onClick: (event) => handleCreatePostClick(event, createPostHref),
        scroll: false,
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
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar no feed"
                  type="search"
                  value={search}
                />
              </div>

              <FilterMenu
                onScopeChange={setScope}
                open={filterOpen}
                scope={scope}
                setOpen={setFilterOpen}
              />
            </div>

            <CommunityChips activeSlug={selectedCommunitySlug} onNavigate={() => undefined} />
          </div>
        </header>

        {isInitialFeedLoading ? (
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

        {!isInitialFeedLoading && !errorMessage && posts.length === 0 ? (
          <EmptyState
            action={
              hasNoFollowedCommunities ? (
                <Button asChild variant="outline">
                  <Link href={COMMUNITY_EXPLORE_HREF}>Encontrar comunidades</Link>
                </Button>
              ) : scope === "following" ? null : (
                <Button asChild variant="outline">
                  <Link href={COMMUNITY_EXPLORE_HREF}>Explorar comunidades</Link>
                </Button>
              )
            }
            description={
              hasNoFollowedCommunities
                ? "Siga suas comunidades favoritas para acompanhar conversas, receber apoio e descobrir conteúdos que contribuam para o seu bem-estar."
                : scope === "following"
                  ? "As comunidades que você segue ainda não possuem publicações para este filtro."
                  : "Nenhum destaque publicado para este recorte do feed. O feed usa apenas dados persistidos no backend."
            }
            icon={CalendarDays}
            title={
              hasNoFollowedCommunities
                ? "Você ainda não segue nenhuma comunidade"
                : scope === "following"
                  ? "Nenhuma publicação encontrada"
                  : "Nenhum post publicado"
            }
          />
        ) : null}

        {posts.length > 0 ? (
          <div className="grid gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} onShare={sharePost} post={post} />
            ))}
          </div>
        ) : null}

        {feed.isFetching && !feed.isFetchingNextPage && !isInitialFeedLoading ? (
          <LoadingState label="Atualizando feed" />
        ) : null}

        <InfinitePostLoader
          hasNextPage={Boolean(hasNextFeedPage)}
          isLoading={isFetchingNextFeedPage}
          label="Carregando mais posts"
          onLoadMore={loadMoreFeedPosts}
        />
      </section>

      <Link
        aria-label="Criar publicação na comunidade"
        className="group fixed right-5 bottom-[var(--lectum-mobile-nav-aware-fab-bottom)] z-40 hidden h-14 w-14 place-items-center rounded-full border-[5px] border-white bg-[#308CE8] text-white shadow-[0_14px_30px_rgba(48,140,232,0.28)] transition-[bottom,transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:bg-[#2579CF] hover:shadow-[0_18px_36px_rgba(48,140,232,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#308CE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F7FA] motion-safe:animate-[lectum-desktop-create-float_4.2s_ease-in-out_infinite] sm:bottom-[var(--lectum-mobile-nav-aware-fab-bottom-sm)] lg:right-10 lg:bottom-10 lg:grid lg:h-16 lg:w-16 xl:right-20 2xl:right-28"
        href={createPostHref}
        onClick={(event) => handleCreatePostClick(event, createPostHref)}
        scroll={false}
        title="Criar publicação"
      >
        <Plus
          className="h-8 w-8 stroke-[2.4] transition group-hover:scale-105"
          aria-hidden="true"
        />
        <span className="sr-only">Criar publicação</span>
      </Link>

      <CommunityPublishOnboarding variant="bottomNavigation" />

      <style>{`
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

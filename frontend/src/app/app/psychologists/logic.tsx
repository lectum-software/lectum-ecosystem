"use client";

import {
  Heart,
  MessageCircle,
  Play,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  UsersRound,
  VolumeX,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDirectoryPsychologists } from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import type { DirectoryPsychologistsQuery } from "@/api/generator/types/directory";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import {
  defaultPsychologistsFilterValues,
  type PsychologistsFilterForm,
  usePsychologistsFilterForm,
} from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const PAGE_LIMIT = 20;

const DEFAULT_NAV_BAR_HEIGHT = 72;
const PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR = "video[data-psychologists-background='true']";

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0";

  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatProfileTitle = (gender?: string | null, formationYears?: number | null) => {
  const base =
    gender?.toLowerCase() === "feminino" || gender?.toLowerCase() === "mulher"
      ? "Psicóloga"
      : "Psicólogo";
  const years = formationYears ?? 0;
  const yearsLabel = years === 1 ? "1 ano exp." : `${years} anos exp.`;

  return `${base} • ${yearsLabel}`;
};

const formatDisplayName = (name: string) => {
  return name;
};

const splitNameForBadge = (name: string) => {
  const words = formatDisplayName(name).trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return {
      firstPart: "",
      lastPart: words[0] ?? "",
    };
  }

  return {
    firstPart: words.slice(0, -1).join(" "),
    lastPart: words[words.length - 1],
  };
};

const normalizeFormValues = (
  values: Partial<PsychologistsFilterForm>,
): PsychologistsFilterForm => ({
  search: values.search?.trim() || "",
  specialty: values.specialty?.trim() || null,
  service: values.service?.trim() || null,
  approach: values.approach?.trim() || null,
});

const toQuery = (values: PsychologistsFilterForm, page: number): DirectoryPsychologistsQuery => ({
  page,
  limit: PAGE_LIMIT,
  search: values.search?.trim() || undefined,
  specialty: values.specialty || undefined,
  service: values.service || undefined,
  approach: values.approach || undefined,
});

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getPageFromParams = (params: URLSearchParams) => {
  const parsed = Number(params.get("page") || "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const readFiltersFromParams = (params: URLSearchParams): PsychologistsFilterForm => {
  return normalizeFormValues({
    search: params.get("search") || "",
    specialty: params.get("specialty"),
    service: params.get("service"),
    approach: params.get("approach"),
  });
};

const buildFiltersParams = (values: PsychologistsFilterForm, page = 1) => {
  const normalized = normalizeFormValues(values);
  const next = new URLSearchParams();

  if (normalized.search?.trim()) next.set("search", normalized.search.trim());
  if (normalized.specialty) next.set("specialty", normalized.specialty);
  if (normalized.service) next.set("service", normalized.service);
  if (normalized.approach) next.set("approach", normalized.approach);
  if (page > 1) next.set("page", String(page));

  return next;
};

type FloatingBenefitBadgeStyle = CSSProperties & {
  "--benefit-delay": string;
  "--benefit-duration": string;
  "--benefit-float-end-x": string;
  "--benefit-float-x": string;
};

const buildFloatingBenefitBadges = (
  psychologist:
    | {
        accepts_insurance?: boolean | null;
        discount_first_session?: boolean | null;
        social_value?: boolean | null;
      }
    | null
    | undefined,
) => {
  if (!psychologist) return [];

  const badges: Array<{
    id: string;
    label: string;
    toneClassName: string;
    floatX: string;
    floatEndX: string;
    delay: string;
    duration: string;
  }> = [];

  if (psychologist.discount_first_session) {
    badges.push({
      id: "discount-first-session",
      label: "Desconto 1ª sessão",
      toneClassName: "border-[#60A5FA]/60 bg-white/92 text-[#1D4ED8]",
      floatX: "16px",
      floatEndX: "28px",
      delay: "0s",
      duration: "5.2s",
    });
  }

  if (psychologist.social_value) {
    badges.push({
      id: "social-value",
      label: "Valor social",
      toneClassName: "border-[#34D399]/60 bg-white/92 text-[#047857]",
      floatX: "-4px",
      floatEndX: "10px",
      delay: "1.35s",
      duration: "5.5s",
    });
  }

  if (psychologist.accepts_insurance) {
    badges.push({
      id: "accepts-insurance",
      label: "Aceita convênios",
      toneClassName: "border-[#A78BFA]/60 bg-white/92 text-[#6D28D9]",
      floatX: "10px",
      floatEndX: "22px",
      delay: "2.7s",
      duration: "5.35s",
    });
  }

  return badges;
};

const resolveDirectoryErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para consultar psicólogos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar a listagem de psicólogos.";
};

const useViewportMetrics = () => {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 390 : window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      setWidth(window.innerWidth);
    };

    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return useMemo(() => {
    const effectiveWidth = Math.min(width, 430);
    const isCompact = effectiveWidth <= 390;
    const isTiny = effectiveWidth < 360;
    const actionRailWidth = isTiny ? 64 : 72;

    return {
      actionButtonSize: isTiny ? 34 : 36,
      actionGap: isCompact ? 14 : 18,
      actionIconSize: isTiny ? 13 : 14,
      actionLabelSize: isCompact ? 9 : 10,
      actionRightPadding: isTiny ? 12 : 16,
      actionRailWidth,
      actionTextLineHeight: 1,
      bioBottomOffset: isCompact ? 12 : 14,
      ratingIconSize: isCompact ? 11 : 12,
      ratingLineHeight: isCompact ? 16 : 18,
      ratingTextSize: isCompact ? 11 : 12,
      bioLineHeight: isTiny ? 16 : isCompact ? 17 : 19,
      bioSize: isTiny ? 11 : isCompact ? 12 : 13,
      filterButtonSize: isCompact ? 40 : 42,
      horizontalPadding: isCompact ? 24 : 28,
      navBarHeight: DEFAULT_NAV_BAR_HEIGHT,
      searchHeight: isCompact ? 42 : 46,
      searchRightGap: isCompact ? 62 : 74,
      searchTop: isCompact ? 36 : 40,
      subtitleSize: isCompact ? 13 : 14,
      textColumnGap: isTiny ? 8 : 10,
      titleSize: isTiny ? 17 : isCompact ? 18 : 20,
    };
  }, [width]);
};

export const PsychologistsLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const metrics = useViewportMetrics();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isVideoPlaybackFailed, setIsVideoPlaybackFailed] = useState(false);
  const [actionColumnTranslateY, setActionColumnTranslateY] = useState(0);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isBioTruncated, setIsBioTruncated] = useState(false);

  const filterDialogRef = useRef<HTMLDivElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const bioTextRef = useRef<HTMLButtonElement | null>(null);
  const actionColumnRef = useRef<HTMLDivElement | null>(null);
  const profileTextRef = useRef<HTMLSpanElement | null>(null);
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({
    enableProfile: false,
  });

  const params = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const filterValues = useMemo(() => readFiltersFromParams(params), [params]);
  const currentPage = useMemo(() => getPageFromParams(params), [params]);
  const query = useMemo(() => toQuery(filterValues, currentPage), [currentPage, filterValues]);

  const directory = useDirectoryPsychologists(query);
  const response = directory.data;
  const psychologists = response?.data ?? [];
  const featuredPsychologist = psychologists[0];
  const backgroundVideoSrc = resolvePublicMediaUrl(featuredPsychologist?.video_url);
  const backgroundPosterSrc = featuredPsychologist?.video_cover_url
    ? resolvePublicMediaUrl(featuredPsychologist.video_cover_url)
    : null;
  const shouldShowVideo = Boolean(backgroundVideoSrc) && !isVideoPlaybackFailed;
  const activeVideoSource = shouldShowVideo ? backgroundVideoSrc : null;
  const featuredBio = featuredPsychologist?.headline?.trim() || "";
  const featuredPsychologistId = featuredPsychologist?.id;
  const featuredNameParts = splitNameForBadge(featuredPsychologist?.name ?? "");
  const isFavorited = featuredPsychologist
    ? (favoriteOverrides[featuredPsychologist.id] ?? Boolean(featuredPsychologist.favorited))
    : false;

  const filters = usePsychologistsFilterForm({
    filters: response?.filters,
    loading: directory.isLoading || directory.isFetching,
    values: filterValues,
  });

  const errorMessage = directory.isError ? resolveDirectoryErrorMessage(directory.error) : null;
  const hasActiveFilters =
    Boolean(filterValues.search?.trim()) ||
    Boolean(filterValues.specialty) ||
    Boolean(filterValues.service) ||
    Boolean(filterValues.approach);

  const showInitialLoading = directory.isLoading && !response;
  const infoSectionBottom = `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + ${metrics.bioBottomOffset}px)`;
  const profileHref = featuredPsychologist
    ? `/app/psychologist/${featuredPsychologist.id}`
    : "/app/psychologists";
  const floatingBenefitBadges = buildFloatingBenefitBadges(featuredPsychologist);

  const syncActionColumnAlignment = useCallback(() => {
    const baselineText = featuredBio;
    const bioText = bioTextRef.current;
    const profileLabel = profileTextRef.current;
    const actionColumn = actionColumnRef.current;

    if (!baselineText || !bioText || !profileLabel || !actionColumn) return;

    const delta =
      bioText.getBoundingClientRect().bottom - profileLabel.getBoundingClientRect().bottom;

    setActionColumnTranslateY((current) => (Math.abs(current - delta) > 0.5 ? delta : current));
  }, [featuredBio]);

  const recalculateBioTruncation = useCallback(() => {
    if (!featuredBio) {
      setIsBioTruncated(false);
      return;
    }

    const bioText = bioTextRef.current;
    if (!bioText) return;

    const computedStyles = window.getComputedStyle(bioText);
    const computedLineHeight = Number.parseFloat(computedStyles.lineHeight);
    const lineHeight = Number.isFinite(computedLineHeight)
      ? computedLineHeight
      : metrics.bioLineHeight;
    const nextIsTruncated = bioText.scrollHeight > lineHeight * 2 + 1;

    setIsBioTruncated((current) => (current === nextIsTruncated ? current : nextIsTruncated));
    if (!nextIsTruncated) {
      setIsBioExpanded(false);
    }
  }, [featuredBio, metrics.bioLineHeight]);

  const recalculateInfoOverlayLayout = useCallback(() => {
    syncActionColumnAlignment();
    recalculateBioTruncation();
  }, [recalculateBioTruncation, syncActionColumnAlignment]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(() => {
      recalculateInfoOverlayLayout();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [recalculateInfoOverlayLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      recalculateInfoOverlayLayout();
    };

    const bioNode = bioTextRef.current;
    const resizeObserver = bioNode
      ? new ResizeObserver(() => recalculateInfoOverlayLayout())
      : null;

    if (bioNode) {
      resizeObserver?.observe(bioNode);
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
  }, [recalculateInfoOverlayLayout]);

  useEffect(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !activeVideoSource) return;

    currentVideo.muted = isVideoMuted;

    if (isVideoPaused) {
      currentVideo.pause();
      return;
    }

    void currentVideo.play().catch(() => {
      setIsVideoPaused(true);
    });
  }, [activeVideoSource, isVideoMuted, isVideoPaused]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    document
      .querySelectorAll<HTMLVideoElement>(PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR)
      .forEach((video) => {
        video.muted = isVideoMuted;
      });
  }, [isVideoMuted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!featuredPsychologistId) return;

    const frame = window.requestAnimationFrame(() => {
      setIsBioExpanded(false);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [featuredPsychologistId]);

  const stopInteractionPropagation = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  }, []);

  const navigateToProfile = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (!featuredPsychologist) return;

      router.push(profileHref);
    },
    [featuredPsychologist, profileHref, router],
  );

  const toggleExpandedBio = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (!isBioTruncated) return;

      setIsBioExpanded((current) => !current);
    },
    [isBioTruncated],
  );

  const applyFilterValues = useCallback(
    (values: PsychologistsFilterForm) => {
      const next = buildFiltersParams(normalizeFormValues(values), 1);

      router.replace(next.toString() ? `/app/psychologists?${next}` : "/app/psychologists", {
        scroll: false,
      });
    },
    [router],
  );

  const handleSubmitFilters = filters.hook.handleSubmit((values) => {
    applyFilterValues(values);
    setIsFiltersOpen(false);
  });

  const clearFilters = useCallback(() => {
    filters.hook.reset(defaultPsychologistsFilterValues);
    applyFilterValues(defaultPsychologistsFilterValues);
    setIsFiltersOpen(false);
  }, [applyFilterValues, filters.hook]);

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const nextSearch = String(formData.get("search") || "").trim();

      applyFilterValues({
        ...filterValues,
        search: nextSearch,
      });
    },
    [applyFilterValues, filterValues],
  );

  const handleFiltersOpen = useCallback(() => {
    filters.hook.reset(filterValues);
    setIsFiltersOpen(true);
  }, [filterValues, filters.hook]);

  const handleFiltersClose = useCallback(() => {
    filters.hook.reset(filterValues);
    setIsFiltersOpen(false);
  }, [filterValues, filters.hook]);

  const pauseVideoPlayback = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    currentVideo.pause();
    setIsVideoPaused(true);
  }, [shouldShowVideo]);

  const unmuteAllVideos = useCallback(() => {
    if (typeof window === "undefined") return;

    document
      .querySelectorAll<HTMLVideoElement>(PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR)
      .forEach((video) => {
        video.muted = false;
      });
  }, []);

  const playCurrentVideo = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    setIsVideoPaused(false);
    void currentVideo.play().catch(() => {
      setIsVideoPaused(true);
    });
  }, [shouldShowVideo]);

  const handleVideoTap = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    if (isVideoMuted) {
      currentVideo.muted = false;
      unmuteAllVideos();
      setIsVideoMuted(false);
      playCurrentVideo();
      return;
    }

    if (!currentVideo.paused) {
      pauseVideoPlayback();
      return;
    }

    playCurrentVideo();
  }, [isVideoMuted, pauseVideoPlayback, playCurrentVideo, shouldShowVideo, unmuteAllVideos]);

  useEffect(() => {
    if (!isFiltersOpen) return;

    const timer = window.setTimeout(() => {
      filterDialogRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleFiltersClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleFiltersClose, isFiltersOpen]);

  const toggleFavorite = useCallback(() => {
    if (!featuredPsychologist) return;

    const psychologistId = featuredPsychologist.id;
    const nextFavorited = !isFavorited;
    const clearFavoriteOverride = () => {
      setFavoriteOverrides((current) => {
        const next = { ...current };
        delete next[psychologistId];
        return next;
      });
    };

    setFavoriteOverrides((current) => ({
      ...current,
      [psychologistId]: nextFavorited,
    }));

    if (nextFavorited) {
      favoritePsychologist.mutate(psychologistId, {
        onError: clearFavoriteOverride,
        onSuccess: clearFavoriteOverride,
      });
      return;
    }

    unfavoritePsychologist.mutate(psychologistId, {
      onError: clearFavoriteOverride,
      onSuccess: clearFavoriteOverride,
    });
  }, [favoritePsychologist, featuredPsychologist, isFavorited, unfavoritePsychologist]);

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;

  const isFavoritePending = featuredPsychologist
    ? favoritePendingId === featuredPsychologist.id
    : false;

  const shareCurrent = useCallback(async () => {
    if (!featuredPsychologist || isSharing) return;

    const url =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/app/psychologist/${featuredPsychologist.id}`;

    try {
      setIsSharing(true);
      if (typeof window !== "undefined" && "share" in navigator) {
        await navigator.share({
          title: `Perfil de ${featuredPsychologist.name}`,
          text: featuredPsychologist.headline || "Perfis de Psicólogos na Lectum",
          url,
        });
        return;
      }

      if (url) {
        await navigator.clipboard.writeText(url);
        setShareFeedback(true);
        window.setTimeout(() => setShareFeedback(false), 1800);
      }
    } finally {
      setIsSharing(false);
    }
  }, [featuredPsychologist, isSharing]);

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="max-w-none p-0 sm:p-0"
      navigationTheme="solidWhite"
    >
      <style>
        {`
          @keyframes psychologists-benefit-float {
            0% {
              opacity: 0;
              transform: translate3d(0, 28px, 0) scale(0.92);
            }
            12% {
              opacity: 0;
              transform: translate3d(0, 22px, 0) scale(0.94);
            }
            22% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
            58% {
              opacity: 1;
              transform: translate3d(var(--benefit-float-x), -78px, 0) scale(1.02);
            }
            100% {
              opacity: 0;
              transform: translate3d(var(--benefit-float-end-x), -168px, 0) scale(1.08);
            }
          }

          .psychologists-benefit-float {
            animation: psychologists-benefit-float var(--benefit-duration) ease-in-out infinite;
            animation-delay: var(--benefit-delay);
            bottom: 0;
            left: 0;
            opacity: 0;
            position: absolute;
            will-change: opacity, transform;
          }

          @media (prefers-reduced-motion: reduce) {
            .psychologists-benefit-float {
              animation: none;
              opacity: 1;
              position: relative;
              transform: none;
            }
          }
        `}
      </style>
      <div className="relative isolate min-h-[100dvh] overflow-hidden bg-background text-white">
        <div
          className="relative mx-auto flex h-[100dvh] w-full overflow-hidden bg-black"
          style={{
            maxWidth: "430px",
          }}
        >
          <div className="relative z-20 h-full w-full">
            {showInitialLoading ? (
              <div className="grid h-full place-items-center bg-[#F8FAFC] px-4 text-foreground">
                <LoadingState label="Carregando Psicólogos" />
              </div>
            ) : null}

            {errorMessage ? (
              <InlineAlert className="mt-10" title="Não foi possível carregar" variant="error">
                {errorMessage}
              </InlineAlert>
            ) : null}

            {!showInitialLoading && !errorMessage && !featuredPsychologist ? (
              <div className="grid h-full w-full place-items-center px-4 py-8">
                <EmptyState
                  className="w-full"
                  description="Ainda não existem psicólogos publicados para estes filtros."
                  icon={UsersRound}
                  title="Nenhum Psicólogo encontrado"
                  action={
                    hasActiveFilters ? (
                      <button
                        aria-label="Limpar filtros"
                        className="mt-3 rounded-full bg-[#22c55e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16a34a]"
                        onClick={clearFilters}
                        type="button"
                      >
                        Limpar filtros
                      </button>
                    ) : null
                  }
                />
              </div>
            ) : null}

            {!showInitialLoading && !errorMessage && featuredPsychologist ? (
              <>
                <form
                  className="absolute z-30"
                  onSubmit={handleSearchSubmit}
                  style={{
                    top: `calc(env(safe-area-inset-top) + ${metrics.searchTop}px)`,
                    left: `${metrics.horizontalPadding}px`,
                    right: `${metrics.searchRightGap}px`,
                    height: `${metrics.searchHeight}px`,
                  }}
                >
                  <div className="relative flex h-full w-full items-center rounded-[999px] border border-[rgba(255,255,255,0.35)] bg-white/35 p-3 backdrop-blur-md">
                    <Search className="absolute left-3 h-4 w-4 text-white/85" aria-hidden="true" />
                    <input
                      aria-label="Buscar Psicólogos"
                      className="h-full w-full bg-transparent pr-3 pl-7 text-[14px] text-white outline-none placeholder:text-white/72"
                      maxLength={120}
                      defaultValue={filterValues.search}
                      placeholder="Buscar psicólogos..."
                      name="search"
                      type="text"
                    />
                  </div>
                </form>

                <button
                  aria-label="Abrir filtros"
                  className="absolute z-30 grid items-center justify-center rounded-full border border-[rgba(255,255,255,0.35)] bg-white/35 text-white shadow-[0_5px_24px_rgba(15,23,42,0.2)] backdrop-blur-md hover:bg-white/45"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleFiltersOpen();
                  }}
                  style={{
                    top: `calc(env(safe-area-inset-top) + ${metrics.searchTop}px)`,
                    right: `${metrics.actionRightPadding}px`,
                    width: `${metrics.filterButtonSize}px`,
                    height: `${metrics.filterButtonSize}px`,
                  }}
                  type="button"
                >
                  <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>

                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    top: 0,
                  }}
                >
                  <div className="relative h-full w-full overflow-hidden">
                    {shouldShowVideo ? (
                      <video
                        aria-label={`Vídeo de apresentação de ${featuredPsychologist.name}`}
                        data-psychologists-background="true"
                        autoPlay
                        className="h-full w-full bg-black object-cover"
                        controls={false}
                        loop
                        muted={isVideoMuted}
                        onError={() => setIsVideoPlaybackFailed(true)}
                        onLoadedData={() => {
                          setIsVideoPlaybackFailed(false);
                          setIsVideoPaused(false);
                        }}
                        onPause={() => setIsVideoPaused(true)}
                        onPlay={() => setIsVideoPaused(false)}
                        playsInline
                        poster={backgroundPosterSrc || undefined}
                        preload="metadata"
                        ref={backgroundVideoRef}
                        src={backgroundVideoSrc ?? undefined}
                      />
                    ) : backgroundPosterSrc ? (
                      <Image
                        alt={featuredPsychologist.name}
                        className="h-full w-full object-cover"
                        fill
                        priority
                        sizes="(min-width: 768px) 430px, 100vw"
                        src={backgroundPosterSrc}
                        unoptimized={isPublicMediaUrl(featuredPsychologist.video_cover_url)}
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[#e2e8f0] text-3xl font-extrabold text-[#94a3b8]">
                        {getInitials(featuredPsychologist.name)}
                      </div>
                    )}

                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.9) 15%, rgba(0,0,0,0.58) 28%, rgba(0,0,0,0.22) 40%, rgba(0,0,0,0) 55%)",
                      }}
                    />

                    {shouldShowVideo ? (
                      <button
                        aria-label={
                          isVideoPaused
                            ? `Retomar vídeo de ${featuredPsychologist.name}`
                            : `Desativar reprodução do vídeo de ${featuredPsychologist.name}`
                        }
                        className="absolute inset-0 z-10 h-full w-full cursor-default border-0 bg-transparent p-0"
                        onClick={handleVideoTap}
                        type="button"
                      />
                    ) : null}

                    {shouldShowVideo && (isVideoMuted || isVideoPaused) ? (
                      <button
                        aria-label={
                          isVideoPaused
                            ? `Retomar vídeo de ${featuredPsychologist.name}`
                            : `Ativar som do vídeo de ${featuredPsychologist.name}`
                        }
                        className="absolute left-1/2 top-1/2 z-20 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-black/30 text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:bg-black/40"
                        onClick={handleVideoTap}
                        type="button"
                      >
                        {isVideoPaused ? (
                          <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
                        ) : isVideoMuted ? (
                          <VolumeX className="h-5 w-5" aria-hidden="true" />
                        ) : null}
                      </button>
                    ) : null}

                    {floatingBenefitBadges.length > 0 ? (
                      <ul
                        aria-label="Benefícios do psicólogo"
                        className="pointer-events-none absolute top-[34%] left-4 z-30 flex h-[32dvh] w-[min(250px,70vw)] list-none flex-col justify-end gap-2 overflow-visible p-0"
                      >
                        {floatingBenefitBadges.map((badge) => {
                          const badgeStyle: FloatingBenefitBadgeStyle = {
                            "--benefit-delay": badge.delay,
                            "--benefit-duration": badge.duration,
                            "--benefit-float-end-x": badge.floatEndX,
                            "--benefit-float-x": badge.floatX,
                          };

                          return (
                            <li
                              className={cn(
                                "psychologists-benefit-float pointer-events-auto inline-flex w-max max-w-[220px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] leading-none font-extrabold tracking-[-0.01em] shadow-[0_12px_28px_rgba(15,23,42,0.24)] backdrop-blur-md",
                                badge.toneClassName,
                              )}
                              key={badge.id}
                              style={badgeStyle}
                            >
                              <span
                                aria-hidden="true"
                                className="h-1.5 w-1.5 rounded-full bg-current opacity-75"
                              />
                              {badge.label}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}

                    <section
                      aria-live={shareFeedback ? "polite" : "off"}
                      className="pointer-events-none absolute inset-x-0 z-40 grid items-end text-[#ffffff]"
                      style={{
                        left: `${metrics.horizontalPadding}px`,
                        right: `${metrics.actionRightPadding}px`,
                        bottom: infoSectionBottom,
                        columnGap: `${metrics.textColumnGap}px`,
                        gridTemplateColumns: `minmax(0, 1fr) ${metrics.actionRailWidth}px`,
                      }}
                    >
                      <div className="pointer-events-auto min-w-0">
                        {featuredPsychologist.available_today ? (
                          <div className="inline-flex animate-pulse items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#22C55E]">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
                            </span>
                            Disponível hoje
                          </div>
                        ) : null}

                        <div className="mt-2 grid gap-1">
                          <button
                            aria-label={`Ver perfil de ${featuredPsychologist.name}`}
                            className="block w-full min-w-0 max-w-full cursor-pointer text-left font-bold text-white"
                            onClick={navigateToProfile}
                            type="button"
                            style={{
                              fontSize: `${metrics.titleSize}px`,
                              lineHeight: 1.12,
                              maxWidth: "100%",
                              overflowWrap: "break-word",
                              wordBreak: "normal",
                            }}
                          >
                            {featuredNameParts.firstPart ? (
                              <span>{featuredNameParts.firstPart} </span>
                            ) : null}
                            <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap align-baseline">
                              <span>
                                {featuredNameParts.lastPart ||
                                  formatDisplayName(featuredPsychologist.name)}
                              </span>
                              {featuredPsychologist.verified ? (
                                <VerifiedBadgeIcon
                                  aria-hidden="true"
                                  className="h-4 w-4 shrink-0 translate-y-[1px]"
                                />
                              ) : null}
                            </span>
                          </button>

                          <div
                            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 leading-tight font-medium text-white/75"
                            style={{ fontSize: `${metrics.subtitleSize}px` }}
                          >
                            <span className="min-w-0">
                              {formatProfileTitle(
                                featuredPsychologist.gender,
                                featuredPsychologist.formation_years,
                              )}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[#FACC15] shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                              <Star
                                aria-hidden="true"
                                className="fill-[#FACC15]"
                                style={{
                                  height: `${metrics.ratingIconSize}px`,
                                  width: `${metrics.ratingIconSize}px`,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: `${metrics.ratingTextSize}px`,
                                  lineHeight: `${metrics.ratingLineHeight}px`,
                                }}
                              >
                                {formatRating(
                                  featuredPsychologist.rating_avg,
                                  featuredPsychologist.rating_count,
                                )}
                              </span>
                            </span>
                          </div>
                        </div>

                        {featuredBio ? (
                          <button
                            aria-expanded={isBioTruncated ? isBioExpanded : undefined}
                            className={cn(
                              "pointer-events-auto mt-2 w-full text-left text-white/95",
                              isBioExpanded ? "overflow-y-auto" : "line-clamp-2",
                              isBioTruncated
                                ? "cursor-default md:cursor-pointer"
                                : "cursor-default",
                            )}
                            onClick={toggleExpandedBio}
                            type="button"
                            ref={bioTextRef}
                            style={{
                              fontSize: `${metrics.bioSize}px`,
                              lineHeight: `${metrics.bioLineHeight}px`,
                              maxWidth: "100%",
                              maxHeight: isBioExpanded ? "min(34dvh, 220px)" : undefined,
                              overflowWrap: "break-word",
                              wordBreak: "normal",
                            }}
                          >
                            {featuredBio}
                          </button>
                        ) : null}

                        {shareFeedback ? (
                          <p
                            aria-live="polite"
                            className="mt-2 rounded-full bg-black/45 px-2 py-1 text-xs text-white"
                          >
                            Link copiado
                          </p>
                        ) : null}
                      </div>

                      <div
                        className="pointer-events-auto relative z-50 flex flex-col items-center justify-self-end"
                        ref={actionColumnRef}
                        style={{
                          gap: `${metrics.actionGap}px`,
                          transform: `translateY(${actionColumnTranslateY}px)`,
                          width: `${metrics.actionRailWidth}px`,
                        }}
                      >
                        <div className="grid justify-items-center gap-1 text-center">
                          <button
                            aria-label={`Favoritar ${featuredPsychologist.name}`}
                            aria-busy={isFavoritePending}
                            aria-pressed={isFavorited}
                            className={cn(
                              "relative z-50 grid cursor-pointer place-items-center rounded-full bg-white text-[#64748b] transition hover:bg-[#f8fafc] active:scale-95",
                              isFavorited ? "text-[#ef4444]" : "text-[#64748b] hover:bg-[#f8fafc]",
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite();
                            }}
                            style={{
                              width: `${metrics.actionButtonSize}px`,
                              height: `${metrics.actionButtonSize}px`,
                            }}
                            type="button"
                          >
                            <Heart
                              className={cn("h-4 w-4")}
                              aria-hidden="true"
                              style={{
                                height: `${metrics.actionIconSize}px`,
                                width: `${metrics.actionIconSize}px`,
                                color: isFavorited ? "#ef4444" : "#64748b",
                                fill: isFavorited ? "#ef4444" : "transparent",
                              }}
                            />
                          </button>
                          <span
                            className="pointer-events-none font-semibold leading-none"
                            style={{
                              fontSize: `${metrics.actionLabelSize}px`,
                              lineHeight: metrics.actionTextLineHeight.toString(),
                            }}
                          >
                            Favoritar
                          </span>
                        </div>

                        <div className="grid justify-items-center gap-1 text-center">
                          <button
                            aria-label={`Compartilhar perfil de ${featuredPsychologist.name}`}
                            className="grid place-items-center rounded-full bg-white text-[#64748b] transition hover:bg-[#e2e8f0]"
                            onClick={(event) => {
                              event.stopPropagation();
                              void shareCurrent();
                            }}
                            type="button"
                            style={{
                              width: `${metrics.actionButtonSize}px`,
                              height: `${metrics.actionButtonSize}px`,
                            }}
                          >
                            <Share2
                              className="h-4 w-4"
                              aria-hidden="true"
                              style={{
                                height: `${metrics.actionIconSize}px`,
                                width: `${metrics.actionIconSize}px`,
                              }}
                            />
                          </button>
                          <span
                            className="font-semibold leading-none"
                            style={{
                              fontSize: `${metrics.actionLabelSize}px`,
                              lineHeight: metrics.actionTextLineHeight.toString(),
                            }}
                          >
                            Compartilhar
                          </span>
                        </div>

                        {featuredPsychologist.whatsapp_url ? (
                          <div className="grid justify-items-center gap-1 text-center">
                            <a
                              aria-label={`Chamar ${featuredPsychologist.name} no WhatsApp`}
                              className="grid place-items-center rounded-full bg-[#22C55E] text-white transition hover:bg-[#16A34A]"
                              href={featuredPsychologist.whatsapp_url}
                              onClick={stopInteractionPropagation}
                              rel="noreferrer"
                              target="_blank"
                              style={{
                                width: `${metrics.actionButtonSize}px`,
                                height: `${metrics.actionButtonSize}px`,
                              }}
                            >
                              <WhatsAppIcon
                                aria-hidden="true"
                                className="h-4 w-4"
                                style={{
                                  color: "white",
                                  height: `${metrics.actionIconSize}px`,
                                  width: `${metrics.actionIconSize}px`,
                                }}
                              />
                            </a>
                            <span
                              className="font-semibold leading-none"
                              style={{
                                fontSize: `${metrics.actionLabelSize}px`,
                                lineHeight: metrics.actionTextLineHeight.toString(),
                              }}
                            >
                              WhatsApp
                            </span>
                          </div>
                        ) : (
                          <div className="grid justify-items-center gap-1 text-center">
                            <button
                              aria-label="WhatsApp indisponível"
                              className="grid cursor-not-allowed place-items-center rounded-full bg-[#22C55E]/70 text-white"
                              disabled
                              type="button"
                              style={{
                                width: `${metrics.actionButtonSize}px`,
                                height: `${metrics.actionButtonSize}px`,
                              }}
                            >
                              <MessageCircle
                                className="h-4 w-4"
                                aria-hidden="true"
                                style={{
                                  height: `${metrics.actionIconSize}px`,
                                  width: `${metrics.actionIconSize}px`,
                                }}
                              />
                            </button>
                            <span
                              className="font-semibold leading-none"
                              style={{
                                fontSize: `${metrics.actionLabelSize}px`,
                                lineHeight: metrics.actionTextLineHeight.toString(),
                              }}
                            >
                              WhatsApp
                            </span>
                          </div>
                        )}

                        <div className="grid justify-items-center gap-1 text-center">
                          <Link
                            aria-label={`Ver perfil de ${featuredPsychologist.name}`}
                            className="grid place-items-center rounded-full bg-transparent"
                            href={profileHref}
                            onClick={stopInteractionPropagation}
                          >
                            <div
                              className="relative overflow-hidden rounded-full bg-white p-0.5 text-[#0f172a]"
                              style={{
                                width: `${metrics.actionButtonSize}px`,
                                height: `${metrics.actionButtonSize}px`,
                                border: "2px solid #fff",
                              }}
                            >
                              {featuredPsychologist.avatar ? (
                                <Image
                                  alt={featuredPsychologist.name}
                                  className="h-full w-full rounded-full object-cover"
                                  fill
                                  sizes={`${metrics.actionButtonSize}px`}
                                  src={resolvePublicMediaUrl(featuredPsychologist.avatar) ?? ""}
                                  unoptimized={isPublicMediaUrl(featuredPsychologist.avatar)}
                                />
                              ) : (
                                <span className="grid h-full w-full place-items-center rounded-full bg-[#e2e8f0] text-[11px] font-semibold text-[#334155]">
                                  {getInitials(featuredPsychologist.name)}
                                </span>
                              )}
                            </div>
                          </Link>
                          <span
                            className="font-semibold leading-none"
                            style={{
                              fontSize: `${metrics.actionLabelSize}px`,
                              lineHeight: metrics.actionTextLineHeight.toString(),
                            }}
                            ref={profileTextRef}
                          >
                            Perfil
                          </span>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                {isFiltersOpen ? (
                  <div
                    aria-labelledby="psychologist-filters-title"
                    aria-modal="true"
                    className="fixed inset-0 z-50 grid place-items-center bg-foreground/55 p-4 backdrop-blur-sm"
                    onMouseDown={handleFiltersClose}
                    role="dialog"
                  >
                    <div
                      className="grid w-full max-w-[500px] gap-4 rounded-[28px] border border-[#e2e8f0] bg-surface p-5 shadow-[0_24px_70px_rgb(15_23_42_/_26%)]"
                      onMouseDown={(event) => event.stopPropagation()}
                      ref={filterDialogRef}
                      role="document"
                      tabIndex={-1}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2
                            className="text-lg font-extrabold text-foreground"
                            id="psychologist-filters-title"
                          >
                            Filtros de busca
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-muted">
                            Ajuste os critérios e aplique para refinar sua busca.
                          </p>
                        </div>
                        <button
                          aria-label="Fechar filtros"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
                          onClick={handleFiltersClose}
                          type="button"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      <form onSubmit={handleSubmitFilters}>
                        <filters.Form {...filters.formProps} />
                        <div className="mt-4 flex flex-col gap-3">
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-sm font-semibold text-foreground"
                            onClick={clearFilters}
                            type="button"
                          >
                            Limpar filtros
                          </button>
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-full bg-[#308ce8] font-semibold text-white"
                            type="submit"
                          >
                            Aplicar filtros
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </PrivateTemplate>
  );
};

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
  type FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
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

    return {
      actionBottomOffset: isCompact ? 12 : 14,
      actionButtonSize: isTiny ? 34 : 36,
      actionGap: isCompact ? 12 : 14,
      actionIconSize: isTiny ? 13 : 14,
      actionLabelSize: isCompact ? 9 : 10,
      actionRightPadding: isTiny ? 12 : 16,
      actionTextLineHeight: 1,
      bioBottomOffset: isCompact ? 12 : 14,
      bioLineHeight: isCompact ? 20 : 22,
      bioSize: isCompact ? 13 : 15,
      filterButtonSize: isCompact ? 40 : 42,
      horizontalPadding: isCompact ? 24 : 28,
      navBarHeight: DEFAULT_NAV_BAR_HEIGHT,
      searchHeight: isCompact ? 42 : 46,
      searchRightGap: isCompact ? 62 : 74,
      searchTop: isCompact ? 36 : 40,
      subtitleSize: isCompact ? 13 : 14,
      titleSize: isCompact ? 20 : 22,
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

  const filterDialogRef = useRef<HTMLDivElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const bioBaselineRef = useRef<HTMLSpanElement | null>(null);
  const actionColumnRef = useRef<HTMLDivElement | null>(null);
  const profileTextRef = useRef<HTMLSpanElement | null>(null);
  const [hasAuthToken] = useState(() => {
    if (typeof window === "undefined") return false;

    return Boolean(getToken());
  });
  const currentUser = useAppSelector((state) => state.user);
  const canFavoritePsychologists = Boolean(
    hasAuthToken && currentUser?.id && currentUser.role === "paciente",
  );

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
  const isFavorited = Boolean(featuredPsychologist?.favorited);

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
  const actionColumnBottom = `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + ${metrics.actionBottomOffset}px)`;
  const infoSectionBottom = `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + ${metrics.bioBottomOffset}px)`;

  const syncActionColumnAlignment = useCallback(() => {
    const baselineText = featuredBio;
    const bioMarker = bioBaselineRef.current;
    const profileLabel = profileTextRef.current;
    const actionColumn = actionColumnRef.current;

    if (!baselineText || !bioMarker || !profileLabel || !actionColumn) return;

    const delta =
      bioMarker.getBoundingClientRect().bottom - profileLabel.getBoundingClientRect().bottom;

    setActionColumnTranslateY((current) => (Math.abs(current - delta) > 0.5 ? delta : current));
  }, [featuredBio]);

  useLayoutEffect(() => {
    syncActionColumnAlignment();
  }, [syncActionColumnAlignment]);

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

    const onResize = () => {
      syncActionColumnAlignment();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [syncActionColumnAlignment]);

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
    if (!canFavoritePsychologists || !featuredPsychologist) return;

    if (featuredPsychologist.favorited) {
      unfavoritePsychologist.mutate(featuredPsychologist.id);
      return;
    }

    favoritePsychologist.mutate(featuredPsychologist.id);
  }, [
    canFavoritePsychologists,
    favoritePsychologist,
    featuredPsychologist,
    unfavoritePsychologist,
  ]);

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
                  onClick={handleFiltersOpen}
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

                    <section
                      aria-live={shareFeedback ? "polite" : "off"}
                      className="pointer-events-none absolute inset-x-0 text-[#ffffff]"
                      style={{
                        left: `${metrics.horizontalPadding}px`,
                        right: `${metrics.actionRightPadding + metrics.actionButtonSize + 12}px`,
                        bottom: infoSectionBottom,
                      }}
                    >
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
                        <p
                          className="flex min-w-0 flex-wrap items-center gap-1.5 leading-tight font-bold text-white"
                          style={{ fontSize: `${metrics.titleSize}px` }}
                        >
                          <span className="min-w-0">
                            {formatDisplayName(featuredPsychologist.name)}
                          </span>
                          {featuredPsychologist.verified ? (
                            <VerifiedBadgeIcon
                              aria-hidden="true"
                              className="mt-0.5 h-4 w-4 shrink-0"
                            />
                          ) : null}
                        </p>

                        <div
                          className="flex min-w-0 items-center gap-2 leading-tight font-semibold text-white"
                          style={{ fontSize: `${metrics.subtitleSize}px` }}
                        >
                          <span className="min-w-0 truncate">
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
                                height: `${metrics.subtitleSize}px`,
                                width: `${metrics.subtitleSize}px`,
                              }}
                            />
                            <span style={{ fontSize: `${metrics.subtitleSize}px` }}>
                              {formatRating(
                                featuredPsychologist.rating_avg,
                                featuredPsychologist.rating_count,
                              )}
                            </span>
                          </span>
                        </div>
                      </div>

                      {featuredBio ? (
                        <p
                          className="mt-2 text-white/95"
                          style={{
                            fontSize: `${metrics.bioSize}px`,
                            lineHeight: `${metrics.bioLineHeight}px`,
                          }}
                        >
                          {featuredBio}
                          <span
                            aria-hidden="true"
                            className="inline-block h-0 w-0"
                            ref={bioBaselineRef}
                            style={{ verticalAlign: "baseline" }}
                          />
                        </p>
                      ) : null}

                      {shareFeedback ? (
                        <p
                          aria-live="polite"
                          className="mt-2 rounded-full bg-black/45 px-2 py-1 text-xs text-white"
                        >
                          Link copiado
                        </p>
                      ) : null}
                    </section>

                    <div
                      className="absolute z-20 flex flex-col items-center pointer-events-auto"
                      ref={actionColumnRef}
                      style={{
                        right: `${metrics.actionRightPadding}px`,
                        bottom: actionColumnBottom,
                        gap: `${metrics.actionGap}px`,
                        transform: `translateY(${actionColumnTranslateY}px)`,
                      }}
                    >
                      <div className="grid justify-items-center gap-1 text-center">
                        <button
                          aria-label={`Favoritar ${featuredPsychologist.name}`}
                          aria-pressed={isFavorited}
                          className={cn(
                            "grid place-items-center rounded-full bg-white text-[#64748b] transition disabled:cursor-not-allowed disabled:opacity-60",
                            isFavorited ? "text-[#ef4444]" : "text-[#64748b] hover:bg-[#f8fafc]",
                          )}
                          disabled={isFavoritePending || !canFavoritePsychologists}
                          onClick={toggleFavorite}
                          style={{
                            width: `${metrics.actionButtonSize}px`,
                            height: `${metrics.actionButtonSize}px`,
                          }}
                          type="button"
                        >
                          <Heart
                            className={cn(
                              "h-4 w-4",
                              isFavorited ? "fill-[#ef4444]" : "fill-transparent text-[#64748b]",
                            )}
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
                          Favoritar
                        </span>
                      </div>

                      <div className="grid justify-items-center gap-1 text-center">
                        <button
                          aria-label={`Compartilhar perfil de ${featuredPsychologist.name}`}
                          className="grid place-items-center rounded-full bg-white text-[#64748b] transition hover:bg-[#e2e8f0]"
                          onClick={shareCurrent}
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
                          href={`/app/psychologist/${featuredPsychologist.id}`}
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

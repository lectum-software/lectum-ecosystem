"use client";

import {
  ArrowUp,
  Award,
  Heart,
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
  type PointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
  type UIEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDirectoryPsychologists } from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import type {
  DirectoryPsychologist,
  DirectoryPsychologistsQuery,
} from "@/api/generator/types/directory";
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
const SWIPE_HINT_STORAGE_KEY = "lectum:psychologists:has-seen-swipe-hint";
const VIDEO_SINGLE_TAP_DELAY_MS = 260;
const VIDEO_LONG_PRESS_DELAY_MS = 520;
const VIDEO_PROGRESS_VISIBLE_NAV_BAR_HEIGHT = 64;
const VIDEO_PROGRESS_HIDDEN_BOTTOM_GAP = 8;
const VIDEO_PROGRESS_TRACK_COLOR = "rgba(255,255,255,0.22)";
const VIDEO_PROGRESS_FILL_COLOR = "rgba(255,255,255,0.75)";
const LONG_PRESS_MOVE_TOLERANCE_PX = 20;
const LONG_PRESS_SCROLL_INTENT_THRESHOLD_PX = 32;
const LONG_PRESS_SIGNIFICANT_DRAG_THRESHOLD_PX = 44;
const LONG_PRESS_VERTICAL_DOMINANCE_RATIO = 1.15;
const SWIPE_HINT_INITIAL_DURATION_MS = 3000;
const SWIPE_HINT_IDLE_DELAY_MS = 5000;
const SWIPE_HINT_IDLE_DURATION_MS = 2000;
const SWIPE_HINT_NUDGE_DURATION_MS = 760;

type VideoProgressState = {
  currentTime: number;
  duration: number;
};

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0";

  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatProfileTitle = (
  gender?: string | null,
  formationYears?: number | null,
  showExperienceTag?: boolean | null,
) => {
  const base =
    gender?.toLowerCase() === "feminino" || gender?.toLowerCase() === "mulher"
      ? "Psicóloga"
      : "Psicólogo";

  if (showExperienceTag === false) {
    return base;
  }

  const years = formationYears ?? 0;
  const yearsLabel = years === 1 ? "1 ano exp." : `${years} anos exp.`;

  return `${base} • ${yearsLabel}`;
};

const formatDisplayName = (name: string) => {
  return name;
};

const normalizeSuggestionText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

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
  modality: values.modality?.trim() || null,
  approach: values.approach?.trim() || null,
  target_audience: values.target_audience?.trim() || null,
  state: values.state?.trim() || null,
  city: values.city?.trim() || null,
  gender: values.gender?.trim() || null,
  race_color: values.race_color?.trim() || null,
  religion: values.religion?.trim() || null,
  language: values.language?.trim() || null,
  more_experienced: Boolean(values.more_experienced),
  discount_first_session: Boolean(values.discount_first_session),
  accepts_insurance: Boolean(values.accepts_insurance),
  social_value: Boolean(values.social_value),
});

const toQuery = (values: PsychologistsFilterForm, page: number): DirectoryPsychologistsQuery => ({
  page,
  limit: PAGE_LIMIT,
  search: values.search?.trim() || undefined,
  specialty: values.specialty || undefined,
  service: values.service || undefined,
  modality: values.modality || undefined,
  approach: values.approach || undefined,
  target_audience: values.target_audience || undefined,
  state: values.state || undefined,
  city: values.city || undefined,
  gender: values.gender || undefined,
  race_color: values.race_color || undefined,
  religion: values.religion || undefined,
  language: values.language || undefined,
  more_experienced: values.more_experienced || undefined,
  discount_first_session: values.discount_first_session || undefined,
  accepts_insurance: values.accepts_insurance || undefined,
  social_value: values.social_value || undefined,
});

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getReadableVideoDuration = (video: HTMLVideoElement) =>
  Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

const resetVideoElementToStart = (video: HTMLVideoElement) => {
  video.pause();

  if (video.currentTime === 0) return;

  try {
    video.currentTime = 0;
  } catch {
    // Alguns browsers podem negar seek antes de metadata suficiente; o proximo load mantem o inicio.
  }
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
    modality: params.get("modality"),
    approach: params.get("approach"),
    target_audience: params.get("target_audience"),
    state: params.get("state"),
    city: params.get("city"),
    gender: params.get("gender"),
    race_color: params.get("race_color"),
    religion: params.get("religion"),
    language: params.get("language"),
    more_experienced: params.get("more_experienced") === "true",
    discount_first_session: params.get("discount_first_session") === "true",
    accepts_insurance: params.get("accepts_insurance") === "true",
    social_value: params.get("social_value") === "true",
  });
};

const buildFiltersParams = (values: PsychologistsFilterForm, page = 1) => {
  const normalized = normalizeFormValues(values);
  const next = new URLSearchParams();

  if (normalized.search?.trim()) next.set("search", normalized.search.trim());
  if (normalized.specialty) next.set("specialty", normalized.specialty);
  if (normalized.service) next.set("service", normalized.service);
  if (normalized.modality) next.set("modality", normalized.modality);
  if (normalized.approach) next.set("approach", normalized.approach);
  if (normalized.target_audience) next.set("target_audience", normalized.target_audience);
  if (normalized.state) next.set("state", normalized.state);
  if (normalized.city) next.set("city", normalized.city);
  if (normalized.gender) next.set("gender", normalized.gender);
  if (normalized.race_color) next.set("race_color", normalized.race_color);
  if (normalized.religion) next.set("religion", normalized.religion);
  if (normalized.language) next.set("language", normalized.language);
  if (normalized.more_experienced) next.set("more_experienced", "true");
  if (normalized.discount_first_session) next.set("discount_first_session", "true");
  if (normalized.accepts_insurance) next.set("accepts_insurance", "true");
  if (normalized.social_value) next.set("social_value", "true");
  if (page > 1) next.set("page", String(page));

  return next;
};

type FloatingBenefitBadgeStyle = CSSProperties & {
  "--benefit-delay": string;
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
    delay: string;
  }> = [];

  if (psychologist.discount_first_session) {
    badges.push({
      id: "discount-first-session",
      label: "Desconto 1ª sessão",
      delay: "0s",
    });
  }

  if (psychologist.social_value) {
    badges.push({
      id: "social-value",
      label: "Valor social",
      delay: "0.16s",
    });
  }

  if (psychologist.accepts_insurance) {
    badges.push({
      id: "accepts-insurance",
      label: "Aceita convênios",
      delay: "0.32s",
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
    const actionButtonSize = isTiny ? 34 : 36;

    return {
      actionButtonSize,
      actionGap: isCompact ? 12 : 16,
      actionIconSize: isTiny ? 13 : 14,
      actionRightPadding: isTiny ? 12 : 16,
      actionRailWidth: actionButtonSize,
      actionStandaloneIconSize: isTiny ? 22 : 24,
      availableBadgeTextSize: isTiny ? 10 : 11,
      bioBottomOffset: isCompact ? 34 : 36,
      ratingIconSize: isCompact ? 10 : 11,
      ratingLineHeight: 15,
      ratingTextSize: 11,
      bioLineHeight: 17,
      bioSize: 12,
      filterButtonSize: isCompact ? 40 : 42,
      horizontalPadding: isCompact ? 16 : 20,
      navBarHeight: DEFAULT_NAV_BAR_HEIGHT,
      searchHeight: isCompact ? 42 : 46,
      searchRightGap: isCompact ? 62 : 74,
      searchTop: isCompact ? 36 : 40,
      subtitleSize: isCompact ? 11 : 12,
      textColumnGap: isTiny ? 8 : 10,
      titleLineHeight: isTiny || isCompact ? 21 : 22,
      titleSize: isTiny || isCompact ? 17 : 18,
      verifiedBadgeSize: isTiny ? 12 : 14,
    };
  }, [width]);
};

export const PsychologistsLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const metrics = useViewportMetrics();
  const params = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const filterValues = useMemo(() => readFiltersFromParams(params), [params]);
  const currentPage = useMemo(() => getPageFromParams(params), [params]);
  const query = useMemo(() => toQuery(filterValues, currentPage), [currentPage, filterValues]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isVideoPlaybackFailed, setIsVideoPlaybackFailed] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showDoubleTapFavoriteFeedback, setShowDoubleTapFavoriteFeedback] = useState(false);
  const [hasLoadedSwipeHintPreference, setHasLoadedSwipeHintPreference] = useState(false);
  const [hasSeenSwipeHint, setHasSeenSwipeHint] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [shouldNudgeSwipeCard, setShouldNudgeSwipeCard] = useState(false);
  const [actionColumnTranslateY, setActionColumnTranslateY] = useState(0);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [isVideoProgressSeeking, setIsVideoProgressSeeking] = useState(false);
  const [videoProgress, setVideoProgress] = useState<VideoProgressState>({
    currentTime: 0,
    duration: 0,
  });
  const [videoSeekPreviewRatio, setVideoSeekPreviewRatio] = useState<number | null>(null);
  const [searchDraft, setSearchDraft] = useState(() => filterValues.search || "");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activePsychologistIndex, setActivePsychologistIndex] = useState(0);

  const filterDialogRef = useRef<HTMLDivElement | null>(null);
  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const bioTextRef = useRef<HTMLParagraphElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const actionColumnRef = useRef<HTMLDivElement | null>(null);
  const profileTextRef = useRef<HTMLElement | null>(null);
  const lastSearchParamsStringRef = useRef(searchParamsString);
  const lastActiveVideoResetKeyRef = useRef<string | null>(null);
  const tapTimeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const favoriteFeedbackTimeoutRef = useRef<number | null>(null);
  const progressAnimationFrameRef = useRef<number | null>(null);
  const isVideoProgressSeekingRef = useRef(false);
  const wasVideoPlayingBeforeProgressSeekRef = useRef(false);
  const swipeHintHideTimeoutRef = useRef<number | null>(null);
  const swipeHintIdleTimeoutRef = useRef<number | null>(null);
  const swipeHintNudgeTimeoutRef = useRef<number | null>(null);
  const hasInteractedWithFirstVideoRef = useRef(false);
  const hasShownInitialSwipeHintRef = useRef(false);
  const hasPlayedSwipeNudgeRef = useRef(false);
  const suppressNextTapRef = useRef(false);
  const didLongPressRef = useRef(false);
  const didMoveDuringPressRef = useRef(false);
  const didMoveBeyondLongPressToleranceRef = useRef(false);
  const isSearchModeActiveRef = useRef(false);
  const shouldResumeVideoAfterSearchRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({
    enableProfile: false,
  });

  const directory = useDirectoryPsychologists(query);
  const deferredSearchDraft = useDeferredValue(searchDraft);
  const suggestionSearch = deferredSearchDraft.trim();
  const shouldFetchSearchSuggestions = isSearchFocused && suggestionSearch.length >= 2;
  const suggestionQuery = useMemo<DirectoryPsychologistsQuery>(
    () => ({
      limit: 8,
      page: 1,
      search: suggestionSearch || undefined,
    }),
    [suggestionSearch],
  );
  const searchSuggestionsDirectory = useDirectoryPsychologists(
    suggestionQuery,
    shouldFetchSearchSuggestions,
  );
  const response = directory.data;
  const psychologists = response?.data ?? [];
  const featuredPsychologist = psychologists[activePsychologistIndex] ?? psychologists[0];
  const backgroundVideoSrc = resolvePublicMediaUrl(featuredPsychologist?.video_url);
  const shouldShowVideo = Boolean(backgroundVideoSrc) && !isVideoPlaybackFailed;
  const activeVideoSource = shouldShowVideo ? backgroundVideoSrc : null;
  const featuredBio = featuredPsychologist?.headline?.trim() || "";
  const featuredPsychologistId = featuredPsychologist?.id;
  const activeVideoResetKey = featuredPsychologistId
    ? `${featuredPsychologistId}:${activeVideoSource ?? ""}`
    : null;

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
    Boolean(filterValues.modality) ||
    Boolean(filterValues.approach) ||
    Boolean(filterValues.target_audience) ||
    Boolean(filterValues.state) ||
    Boolean(filterValues.city) ||
    Boolean(filterValues.gender) ||
    Boolean(filterValues.race_color) ||
    Boolean(filterValues.religion) ||
    Boolean(filterValues.language) ||
    Boolean(filterValues.more_experienced) ||
    Boolean(filterValues.discount_first_session) ||
    Boolean(filterValues.accepts_insurance) ||
    Boolean(filterValues.social_value);

  const showInitialLoading = directory.isLoading && !response;
  const canSwipeBetweenPsychologists = psychologists.length > 1;
  const infoSectionBottom = `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + ${metrics.bioBottomOffset}px)`;
  const searchSuggestionItems = useMemo(() => {
    const typedName = normalizeSuggestionText(searchDraft);
    if (typedName.length < 2) return [];

    const seen = new Set<string>();

    return (searchSuggestionsDirectory.data?.data ?? [])
      .filter((psychologist) => normalizeSuggestionText(psychologist.name).includes(typedName))
      .filter((psychologist) => {
        if (seen.has(psychologist.id)) return false;
        seen.add(psychologist.id);
        return true;
      })
      .slice(0, 5);
  }, [searchDraft, searchSuggestionsDirectory.data?.data]);
  const shouldRenderSearchSuggestions =
    isSearchFocused &&
    searchDraft.trim().length >= 2 &&
    (searchSuggestionsDirectory.isFetching || searchSuggestionItems.length > 0);

  const clearSwipeHintTimers = useCallback(() => {
    if (swipeHintHideTimeoutRef.current) {
      window.clearTimeout(swipeHintHideTimeoutRef.current);
      swipeHintHideTimeoutRef.current = null;
    }

    if (swipeHintIdleTimeoutRef.current) {
      window.clearTimeout(swipeHintIdleTimeoutRef.current);
      swipeHintIdleTimeoutRef.current = null;
    }

    if (swipeHintNudgeTimeoutRef.current) {
      window.clearTimeout(swipeHintNudgeTimeoutRef.current);
      swipeHintNudgeTimeoutRef.current = null;
    }
  }, []);

  const showSwipeHintTemporarily = useCallback(
    (duration: number, options?: { nudge?: boolean }) => {
      if (swipeHintHideTimeoutRef.current) {
        window.clearTimeout(swipeHintHideTimeoutRef.current);
      }

      setShowSwipeHint(true);

      if (options?.nudge && !hasPlayedSwipeNudgeRef.current) {
        hasPlayedSwipeNudgeRef.current = true;
        setShouldNudgeSwipeCard(true);

        if (swipeHintNudgeTimeoutRef.current) {
          window.clearTimeout(swipeHintNudgeTimeoutRef.current);
        }

        swipeHintNudgeTimeoutRef.current = window.setTimeout(() => {
          setShouldNudgeSwipeCard(false);
          swipeHintNudgeTimeoutRef.current = null;
        }, SWIPE_HINT_NUDGE_DURATION_MS);
      }

      swipeHintHideTimeoutRef.current = window.setTimeout(() => {
        setShowSwipeHint(false);
        swipeHintHideTimeoutRef.current = null;
      }, duration);
    },
    [],
  );

  const registerSwipeHintInteraction = useCallback(() => {
    hasInteractedWithFirstVideoRef.current = true;

    if (swipeHintIdleTimeoutRef.current) {
      window.clearTimeout(swipeHintIdleTimeoutRef.current);
      swipeHintIdleTimeoutRef.current = null;
    }
  }, []);

  const markSwipeHintSeen = useCallback(() => {
    clearSwipeHintTimers();
    hasInteractedWithFirstVideoRef.current = true;
    setShowSwipeHint(false);
    setShouldNudgeSwipeCard(false);

    setHasSeenSwipeHint((current) => {
      if (current) return current;

      try {
        window.localStorage.setItem(SWIPE_HINT_STORAGE_KEY, "true");
      } catch {
        // LocalStorage pode estar indisponivel em modos restritos; a sessao atual ainda respeita o estado.
      }

      return true;
    });
  }, [clearSwipeHintTimers]);

  const resetVideoInteractionState = useCallback(() => {
    if (tapTimeoutRef.current) {
      window.clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    if (favoriteFeedbackTimeoutRef.current) {
      window.clearTimeout(favoriteFeedbackTimeoutRef.current);
      favoriteFeedbackTimeoutRef.current = null;
    }

    suppressNextTapRef.current = false;
    didLongPressRef.current = false;
    didMoveDuringPressRef.current = false;
    didMoveBeyondLongPressToleranceRef.current = false;
    isSearchModeActiveRef.current = false;
    shouldResumeVideoAfterSearchRef.current = false;
    pointerStartRef.current = null;

    setIsUiHidden(false);
    setIsLongPressing(false);
    setIsSearchFocused(false);
    setShowDoubleTapFavoriteFeedback(false);
    setIsVideoProgressSeeking(false);
    setVideoSeekPreviewRatio(null);
    isVideoProgressSeekingRef.current = false;
    wasVideoPlayingBeforeProgressSeekRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      resetVideoInteractionState();
      clearSwipeHintTimers();
    };
  }, [clearSwipeHintTimers, resetVideoInteractionState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let hasSeenStoredHint = false;

    try {
      hasSeenStoredHint = window.localStorage.getItem(SWIPE_HINT_STORAGE_KEY) === "true";
    } catch {
      hasSeenStoredHint = false;
    }

    const frame = window.requestAnimationFrame(() => {
      setHasSeenSwipeHint(hasSeenStoredHint);
      setHasLoadedSwipeHintPreference(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (
      !hasLoadedSwipeHintPreference ||
      hasSeenSwipeHint ||
      !canSwipeBetweenPsychologists ||
      showInitialLoading ||
      errorMessage ||
      hasShownInitialSwipeHintRef.current
    ) {
      return;
    }

    hasShownInitialSwipeHintRef.current = true;
    showSwipeHintTemporarily(SWIPE_HINT_INITIAL_DURATION_MS, { nudge: true });
  }, [
    canSwipeBetweenPsychologists,
    errorMessage,
    hasLoadedSwipeHintPreference,
    hasSeenSwipeHint,
    showInitialLoading,
    showSwipeHintTemporarily,
  ]);

  useEffect(() => {
    if (
      !hasLoadedSwipeHintPreference ||
      hasSeenSwipeHint ||
      !canSwipeBetweenPsychologists ||
      activePsychologistIndex !== 0 ||
      isFiltersOpen ||
      hasInteractedWithFirstVideoRef.current
    ) {
      if (swipeHintIdleTimeoutRef.current) {
        window.clearTimeout(swipeHintIdleTimeoutRef.current);
        swipeHintIdleTimeoutRef.current = null;
      }
      return;
    }

    if (swipeHintIdleTimeoutRef.current) {
      window.clearTimeout(swipeHintIdleTimeoutRef.current);
    }

    swipeHintIdleTimeoutRef.current = window.setTimeout(() => {
      if (!hasInteractedWithFirstVideoRef.current) {
        showSwipeHintTemporarily(SWIPE_HINT_IDLE_DURATION_MS);
      }

      swipeHintIdleTimeoutRef.current = null;
    }, SWIPE_HINT_IDLE_DELAY_MS);

    return () => {
      if (swipeHintIdleTimeoutRef.current) {
        window.clearTimeout(swipeHintIdleTimeoutRef.current);
        swipeHintIdleTimeoutRef.current = null;
      }
    };
  }, [
    activePsychologistIndex,
    canSwipeBetweenPsychologists,
    hasLoadedSwipeHintPreference,
    hasSeenSwipeHint,
    isFiltersOpen,
    showSwipeHintTemporarily,
  ]);

  useEffect(() => {
    if (lastSearchParamsStringRef.current === searchParamsString) return;

    lastSearchParamsStringRef.current = searchParamsString;
    const frame = window.requestAnimationFrame(() => {
      setActivePsychologistIndex(0);
      resetVideoInteractionState();
      feedContainerRef.current?.scrollTo({
        top: 0,
        behavior: "auto",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [resetVideoInteractionState, searchParamsString]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (psychologists.length === 0) {
        setActivePsychologistIndex(0);
        return;
      }

      if (activePsychologistIndex >= psychologists.length) {
        setActivePsychologistIndex(psychologists.length - 1);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activePsychologistIndex, psychologists.length]);

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

  const recalculateInfoOverlayLayout = useCallback(() => {
    syncActionColumnAlignment();
  }, [syncActionColumnAlignment]);

  const syncActiveVideoProgress = useCallback((video?: HTMLVideoElement | null) => {
    const currentVideo = video ?? backgroundVideoRef.current;

    if (!currentVideo) {
      setVideoProgress((current) =>
        current.currentTime === 0 && current.duration === 0
          ? current
          : {
              currentTime: 0,
              duration: 0,
            },
      );
      return;
    }

    const duration = getReadableVideoDuration(currentVideo);
    const currentTime = duration ? clampNumber(currentVideo.currentTime || 0, 0, duration) : 0;

    setVideoProgress((current) => {
      const shouldUpdate =
        Math.abs(current.currentTime - currentTime) > 0.04 ||
        Math.abs(current.duration - duration) > 0.04;

      return shouldUpdate
        ? {
            currentTime,
            duration,
          }
        : current;
    });
  }, []);

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
    if (typeof window === "undefined") return;

    const hasActiveVideoChanged = lastActiveVideoResetKeyRef.current !== activeVideoResetKey;
    let activeVideo: HTMLVideoElement | null = null;

    const videos = document.querySelectorAll<HTMLVideoElement>(
      PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR,
    );

    for (const video of videos) {
      const isActiveVideo = video.dataset.psychologistId === featuredPsychologistId;
      video.muted = isVideoMuted;

      if (!isActiveVideo || !activeVideoSource) {
        resetVideoElementToStart(video);
        continue;
      }

      activeVideo = video;

      if (hasActiveVideoChanged) {
        resetVideoElementToStart(video);
      }
    }

    if (hasActiveVideoChanged) {
      setIsVideoPaused(false);
      setVideoProgress({
        currentTime: 0,
        duration: activeVideo ? getReadableVideoDuration(activeVideo) : 0,
      });
      setVideoSeekPreviewRatio(null);
      setIsVideoProgressSeeking(false);
      isVideoProgressSeekingRef.current = false;
    }

    lastActiveVideoResetKeyRef.current = activeVideoResetKey;

    if (!activeVideo || !activeVideoSource || isVideoPaused) {
      activeVideo?.pause();
      return;
    }

    void activeVideo.play().catch(() => {
      setIsVideoPaused(true);
    });
  }, [activeVideoResetKey, activeVideoSource, featuredPsychologistId, isVideoMuted, isVideoPaused]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeVideoSource || !featuredPsychologistId) return;

    const tick = () => {
      syncActiveVideoProgress();
      progressAnimationFrameRef.current = window.requestAnimationFrame(tick);
    };

    progressAnimationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (progressAnimationFrameRef.current) {
        window.cancelAnimationFrame(progressAnimationFrameRef.current);
        progressAnimationFrameRef.current = null;
      }
    };
  }, [activeVideoSource, featuredPsychologistId, syncActiveVideoProgress]);

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
      resetVideoInteractionState();
      setIsVideoPlaybackFailed(false);
      setIsVideoPaused(false);
      setVideoProgress({
        currentTime: 0,
        duration: 0,
      });
      setVideoSeekPreviewRatio(null);
      setIsVideoProgressSeeking(false);
      isVideoProgressSeekingRef.current = false;
      setShareFeedback(false);
      setActionColumnTranslateY(0);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [featuredPsychologistId, resetVideoInteractionState]);

  const stopInteractionPropagation = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  }, []);

  const navigateToProfile = useCallback(
    (psychologistId: string, event: { stopPropagation: () => void }) => {
      event.stopPropagation();

      router.push(`/app/psychologist/${psychologistId}`);
    },
    [router],
  );

  const cancelPendingVideoGestureTimers = useCallback(() => {
    if (tapTimeoutRef.current) {
      window.clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    pointerStartRef.current = null;
    didLongPressRef.current = false;
    didMoveDuringPressRef.current = false;
    suppressNextTapRef.current = false;
    setIsLongPressing(false);
  }, []);

  const applyFilterValues = useCallback(
    (values: PsychologistsFilterForm) => {
      const next = buildFiltersParams(normalizeFormValues(values), 1);

      router.replace(next.toString() ? `/app/psychologists?${next}` : "/app/psychologists", {
        scroll: false,
      });
    },
    [router],
  );

  const enterSearchMode = useCallback(() => {
    if (isSearchModeActiveRef.current) {
      setIsSearchFocused(true);
      return;
    }

    isSearchModeActiveRef.current = true;
    cancelPendingVideoGestureTimers();
    setShowDoubleTapFavoriteFeedback(false);

    const currentVideo = backgroundVideoRef.current;
    shouldResumeVideoAfterSearchRef.current = Boolean(
      currentVideo && shouldShowVideo && !currentVideo.paused,
    );

    if (currentVideo && shouldShowVideo) {
      currentVideo.pause();
      setIsVideoPaused(true);
    }

    setIsSearchFocused(true);
  }, [cancelPendingVideoGestureTimers, shouldShowVideo]);

  const exitSearchMode = useCallback(
    (options?: { resumeVideo?: boolean; shouldBlur?: boolean }) => {
      if (options?.shouldBlur !== false) {
        searchInputRef.current?.blur();
      }

      isSearchModeActiveRef.current = false;
      setIsSearchFocused(false);

      const shouldResumeVideo =
        options?.resumeVideo !== false && shouldResumeVideoAfterSearchRef.current;
      shouldResumeVideoAfterSearchRef.current = false;

      if (!shouldResumeVideo) return;

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      setIsVideoPaused(false);
      void currentVideo.play().catch(() => {
        setIsVideoPaused(true);
      });
    },
    [shouldShowVideo],
  );

  const handleSubmitFilters = filters.hook.handleSubmit((values) => {
    applyFilterValues({
      ...filterValues,
      ...values,
      search: filterValues.search,
    });
    setIsFiltersOpen(false);
  });

  const clearFilters = useCallback(() => {
    filters.hook.reset(defaultPsychologistsFilterValues);
    setSearchDraft("");
    exitSearchMode();
    applyFilterValues(defaultPsychologistsFilterValues);
    setIsFiltersOpen(false);
  }, [applyFilterValues, exitSearchMode, filters.hook]);

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextSearch = searchDraft.trim();

      setSearchDraft(nextSearch);
      exitSearchMode();
      applyFilterValues({
        ...filterValues,
        search: nextSearch,
      });
    },
    [applyFilterValues, exitSearchMode, filterValues, searchDraft],
  );

  const handleSearchSuggestionSelect = useCallback(
    (name: string) => {
      setSearchDraft(name);
      exitSearchMode();
      applyFilterValues({
        ...filterValues,
        search: name,
      });
    },
    [applyFilterValues, exitSearchMode, filterValues],
  );

  const handleFiltersOpen = useCallback(() => {
    exitSearchMode({
      resumeVideo: false,
    });

    const currentVideo = backgroundVideoRef.current;
    if (currentVideo && shouldShowVideo) {
      currentVideo.pause();
      setIsVideoPaused(true);
    }

    filters.hook.reset(filterValues);
    setIsFiltersOpen(true);
  }, [exitSearchMode, filterValues, filters.hook, shouldShowVideo]);

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

  const unmuteCurrentVideo = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;

    if (currentVideo) {
      currentVideo.muted = false;
    }

    unmuteAllVideos();
    setIsVideoMuted(false);
  }, [unmuteAllVideos]);

  const handleFeedScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (isSearchFocused) return;

      const container = event.currentTarget;
      const slideHeight = container.clientHeight;
      if (slideHeight <= 0 || psychologists.length === 0) return;

      const nextIndex = Math.max(
        0,
        Math.min(psychologists.length - 1, Math.round(container.scrollTop / slideHeight)),
      );

      if (nextIndex !== activePsychologistIndex) {
        markSwipeHintSeen();
        setActivePsychologistIndex(nextIndex);
      }
    },
    [activePsychologistIndex, isSearchFocused, markSwipeHintSeen, psychologists.length],
  );

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

  useEffect(() => {
    if (!isSearchFocused) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      exitSearchMode();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [exitSearchMode, isSearchFocused]);

  const toggleFavorite = useCallback(
    (psychologist: DirectoryPsychologist) => {
      if (isSearchFocused) return;

      const psychologistId = psychologist.id;
      const currentFavorited = favoriteOverrides[psychologistId] ?? Boolean(psychologist.favorited);
      const nextFavorited = !currentFavorited;
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
    },
    [favoriteOverrides, favoritePsychologist, isSearchFocused, unfavoritePsychologist],
  );

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;

  const shareCurrent = useCallback(
    async (psychologist: DirectoryPsychologist) => {
      if (isSharing) return;

      const url =
        typeof window === "undefined"
          ? ""
          : `${window.location.origin}/app/psychologist/${psychologist.id}`;

      try {
        setIsSharing(true);
        if (typeof window !== "undefined" && "share" in navigator) {
          await navigator.share({
            title: `Perfil de ${psychologist.name}`,
            text: psychologist.headline || "Perfis de Psicólogos na Lectum",
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
    },
    [isSharing],
  );

  const triggerDoubleTapFavorite = useCallback(
    (psychologist: DirectoryPsychologist) => {
      toggleFavorite(psychologist);
      setShowDoubleTapFavoriteFeedback(true);

      if (favoriteFeedbackTimeoutRef.current) {
        window.clearTimeout(favoriteFeedbackTimeoutRef.current);
      }

      favoriteFeedbackTimeoutRef.current = window.setTimeout(() => {
        setShowDoubleTapFavoriteFeedback(false);
        favoriteFeedbackTimeoutRef.current = null;
      }, 520);
    },
    [toggleFavorite],
  );

  const handleVideoAreaTap = useCallback(
    (psychologist: DirectoryPsychologist) => {
      if (isSearchFocused) return;

      if (suppressNextTapRef.current || didMoveDuringPressRef.current) {
        suppressNextTapRef.current = false;
        didMoveDuringPressRef.current = false;
        return;
      }

      if (didLongPressRef.current) {
        didLongPressRef.current = false;
        return;
      }

      if (tapTimeoutRef.current) {
        window.clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
        triggerDoubleTapFavorite(psychologist);
        return;
      }

      tapTimeoutRef.current = window.setTimeout(() => {
        tapTimeoutRef.current = null;

        if (isVideoMuted && shouldShowVideo) {
          unmuteCurrentVideo();
          playCurrentVideo();
          setIsUiHidden(true);
          return;
        }

        setIsUiHidden((current) => !current);
      }, VIDEO_SINGLE_TAP_DELAY_MS);
    },
    [
      isSearchFocused,
      isVideoMuted,
      playCurrentVideo,
      shouldShowVideo,
      triggerDoubleTapFavorite,
      unmuteCurrentVideo,
    ],
  );

  const handleLongPressStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary || !shouldShowVideo || isSearchFocused) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      pointerStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      didMoveDuringPressRef.current = false;
      didMoveBeyondLongPressToleranceRef.current = false;
      didLongPressRef.current = false;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
      }

      longPressTimeoutRef.current = window.setTimeout(() => {
        if (didMoveDuringPressRef.current) return;

        const currentVideo = backgroundVideoRef.current;
        if (!currentVideo) return;

        didLongPressRef.current = true;
        suppressNextTapRef.current = true;

        if (tapTimeoutRef.current) {
          window.clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }

        currentVideo.pause();
        setIsVideoPaused(true);
        setIsLongPressing(true);
      }, VIDEO_LONG_PRESS_DELAY_MS);
    },
    [isSearchFocused, shouldShowVideo],
  );

  const handleLongPressMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const start = pointerStartRef.current;
      if (!start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const absoluteDeltaX = Math.abs(deltaX);
      const absoluteDeltaY = Math.abs(deltaY);
      const distance = Math.hypot(deltaX, deltaY);

      if (distance <= LONG_PRESS_MOVE_TOLERANCE_PX) return;

      didMoveBeyondLongPressToleranceRef.current = true;

      const hasVerticalScrollIntent =
        absoluteDeltaY >= LONG_PRESS_SCROLL_INTENT_THRESHOLD_PX &&
        absoluteDeltaY >= absoluteDeltaX * LONG_PRESS_VERTICAL_DOMINANCE_RATIO;
      const hasSignificantDragIntent = distance >= LONG_PRESS_SIGNIFICANT_DRAG_THRESHOLD_PX;

      if (!hasVerticalScrollIntent && !hasSignificantDragIntent) return;

      didMoveDuringPressRef.current = true;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (!didLongPressRef.current) return;

      setIsLongPressing(false);
      didLongPressRef.current = false;
      suppressNextTapRef.current = true;
      playCurrentVideo();
    },
    [playCurrentVideo],
  );

  const handleLongPressEnd = useCallback(
    (event?: PointerEvent<HTMLButtonElement>) => {
      if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      pointerStartRef.current = null;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      if (
        (didMoveDuringPressRef.current || didMoveBeyondLongPressToleranceRef.current) &&
        !didLongPressRef.current
      ) {
        suppressNextTapRef.current = true;
        window.setTimeout(() => {
          suppressNextTapRef.current = false;
          didMoveDuringPressRef.current = false;
          didMoveBeyondLongPressToleranceRef.current = false;
        }, VIDEO_SINGLE_TAP_DELAY_MS);
        return;
      }

      if (!didLongPressRef.current) return;

      setIsLongPressing(false);
      playCurrentVideo();

      window.setTimeout(() => {
        suppressNextTapRef.current = false;
        didLongPressRef.current = false;
        didMoveDuringPressRef.current = false;
        didMoveBeyondLongPressToleranceRef.current = false;
      }, VIDEO_SINGLE_TAP_DELAY_MS);
    },
    [playCurrentVideo],
  );

  const handleVideoControlTap = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      if (isVideoMuted) {
        unmuteCurrentVideo();
        playCurrentVideo();
        setIsUiHidden(true);
        return;
      }

      if (!currentVideo.paused) {
        pauseVideoPlayback();
        return;
      }

      playCurrentVideo();
    },
    [isVideoMuted, pauseVideoPlayback, playCurrentVideo, shouldShowVideo, unmuteCurrentVideo],
  );

  const seekActiveVideoToTime = useCallback(
    (nextTime: number, durationOverride?: number) => {
      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      const duration =
        getReadableVideoDuration(currentVideo) || durationOverride || videoProgress.duration;
      if (!duration) return;

      const currentTime = clampNumber(nextTime, 0, duration);
      currentVideo.currentTime = currentTime;
      setVideoProgress({
        currentTime,
        duration,
      });
    },
    [videoProgress.duration],
  );

  const seekActiveVideoFromClientX = useCallback(
    (clientX: number, track: HTMLDivElement | null) => {
      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !track) return;

      const duration = getReadableVideoDuration(currentVideo) || videoProgress.duration;
      if (!duration) return;

      const bounds = track.getBoundingClientRect();
      if (bounds.width <= 0) return;

      const ratio = clampNumber((clientX - bounds.left) / bounds.width, 0, 1);
      const nextTime = ratio * duration;

      setVideoSeekPreviewRatio(ratio);
      seekActiveVideoToTime(nextTime, duration);
    },
    [seekActiveVideoToTime, videoProgress.duration],
  );

  const finishVideoProgressScrub = useCallback(() => {
    const shouldResumePlayback = wasVideoPlayingBeforeProgressSeekRef.current;
    wasVideoPlayingBeforeProgressSeekRef.current = false;
    isVideoProgressSeekingRef.current = false;
    setIsVideoProgressSeeking(false);
    setVideoSeekPreviewRatio(null);
    syncActiveVideoProgress();

    if (!shouldResumePlayback || isSearchFocused || !shouldShowVideo) return;

    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo) return;

    setIsVideoPaused(false);
    void currentVideo.play().catch(() => {
      setIsVideoPaused(true);
    });
  }, [isSearchFocused, shouldShowVideo, syncActiveVideoProgress]);

  const handleVideoProgressPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      if (!event.isPrimary || !shouldShowVideo || isSearchFocused) return;

      registerSwipeHintInteraction();
      cancelPendingVideoGestureTimers();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      wasVideoPlayingBeforeProgressSeekRef.current = !currentVideo.paused;
      currentVideo.pause();
      setIsVideoPaused(true);
      isVideoProgressSeekingRef.current = true;
      setIsVideoProgressSeeking(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      seekActiveVideoFromClientX(event.clientX, event.currentTarget);
    },
    [
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      registerSwipeHintInteraction,
      seekActiveVideoFromClientX,
      shouldShowVideo,
    ],
  );

  const handleVideoProgressPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (!isVideoProgressSeekingRef.current || isSearchFocused) return;

      event.preventDefault();
      seekActiveVideoFromClientX(event.clientX, event.currentTarget);
    },
    [isSearchFocused, seekActiveVideoFromClientX],
  );

  const handleVideoProgressPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      finishVideoProgressScrub();
    },
    [finishVideoProgressScrub],
  );

  const shouldUseTouchProgressFallback = useCallback(
    () => typeof window !== "undefined" && !("PointerEvent" in window),
    [],
  );

  const handleVideoProgressTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;

      event.preventDefault();
      if (!shouldShowVideo || isSearchFocused) return;

      const touch = event.touches[0];
      if (!touch) return;

      registerSwipeHintInteraction();
      cancelPendingVideoGestureTimers();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      wasVideoPlayingBeforeProgressSeekRef.current = !currentVideo.paused;
      currentVideo.pause();
      setIsVideoPaused(true);
      isVideoProgressSeekingRef.current = true;
      setIsVideoProgressSeeking(true);
      seekActiveVideoFromClientX(touch.clientX, event.currentTarget);
    },
    [
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      registerSwipeHintInteraction,
      seekActiveVideoFromClientX,
      shouldShowVideo,
      shouldUseTouchProgressFallback,
    ],
  );

  const handleVideoProgressTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;
      if (!isVideoProgressSeekingRef.current || isSearchFocused) return;

      const touch = event.touches[0];
      if (!touch) return;

      event.preventDefault();
      seekActiveVideoFromClientX(touch.clientX, event.currentTarget);
    },
    [isSearchFocused, seekActiveVideoFromClientX, shouldUseTouchProgressFallback],
  );

  const handleVideoProgressTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;

      event.preventDefault();
      finishVideoProgressScrub();
    },
    [finishVideoProgressScrub, shouldUseTouchProgressFallback],
  );

  const handleVideoProgressKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (isSearchFocused) return;

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      const duration = getReadableVideoDuration(currentVideo) || videoProgress.duration;
      if (!duration) return;

      const step = Math.min(5, Math.max(1, duration * 0.05));
      let nextTime: number | null = null;

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextTime = currentVideo.currentTime - step;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextTime = currentVideo.currentTime + step;
      }

      if (event.key === "Home") {
        nextTime = 0;
      }

      if (event.key === "End") {
        nextTime = duration;
      }

      if (nextTime === null) return;

      event.preventDefault();
      event.stopPropagation();
      cancelPendingVideoGestureTimers();
      seekActiveVideoToTime(nextTime);
      syncActiveVideoProgress();
    },
    [
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      seekActiveVideoToTime,
      shouldShowVideo,
      syncActiveVideoProgress,
      videoProgress.duration,
    ],
  );

  const shouldRenderSwipeHint =
    hasLoadedSwipeHintPreference &&
    !hasSeenSwipeHint &&
    showSwipeHint &&
    canSwipeBetweenPsychologists &&
    !isUiHidden &&
    !isFiltersOpen &&
    !isSearchFocused &&
    !showInitialLoading &&
    !errorMessage;
  const shouldRenderGlobalControls =
    !showInitialLoading && !errorMessage && psychologists.length > 0;
  const areGlobalControlsHidden = isUiHidden || isFiltersOpen;
  const globalControlsVisibilityClass = areGlobalControlsHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="max-w-none p-0 sm:p-0"
      navigationDimmed={isSearchFocused}
      navigationHidden={isUiHidden}
      navigationTheme="solidWhite"
    >
      <style>
        {`
          @keyframes psychologists-benefit-pill-in {
            0% {
              opacity: 0;
              transform: translate3d(-10px, 6px, 0) scale(0.98);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          @keyframes psychologists-benefit-pill-float {
            0%,
            100% {
              transform: translate3d(0, 0, 0);
            }
            50% {
              transform: translate3d(0, -4px, 0);
            }
          }

          @keyframes psychologists-double-tap-feedback {
            0% {
              opacity: 0;
              transform: translate3d(-50%, -50%, 0) scale(0.72);
            }
            22% {
              opacity: 1;
              transform: translate3d(-50%, -50%, 0) scale(1.12);
            }
            100% {
              opacity: 0;
              transform: translate3d(-50%, -50%, 0) scale(1.38);
            }
          }

          @keyframes psychologists-swipe-hint-float {
            0%,
            100% {
              transform: translate3d(-50%, 0, 0);
            }
            50% {
              transform: translate3d(-50%, -6px, 0);
            }
          }

          @keyframes psychologists-swipe-card-nudge {
            0%,
            100% {
              transform: translate3d(0, 0, 0);
            }
            45% {
              transform: translate3d(0, -8px, 0);
            }
          }

          .psychologists-benefit-pill {
            animation:
              psychologists-benefit-pill-in 520ms var(--benefit-delay) cubic-bezier(0.2, 0.9, 0.25, 1) both,
              psychologists-benefit-pill-float 4.8s calc(var(--benefit-delay) + 520ms) ease-in-out infinite;
            background: rgba(244, 247, 251, 0.86);
            box-shadow:
              0 10px 22px rgba(15, 23, 42, 0.16),
              inset 0 1px 0 rgba(255, 255, 255, 0.7);
            opacity: 0;
            text-shadow: none;
            will-change: opacity, transform;
          }

          .psychologists-video-feed {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
            scrollbar-width: none;
          }

          .psychologists-video-feed::-webkit-scrollbar {
            display: none;
          }

          .psychologists-double-tap-feedback {
            animation: psychologists-double-tap-feedback 520ms ease-out both;
          }

          .psychologists-swipe-hint {
            animation: psychologists-swipe-hint-float 1.4s ease-in-out infinite;
          }

          .psychologists-swipe-nudge {
            animation: psychologists-swipe-card-nudge 760ms cubic-bezier(0.2, 0.85, 0.2, 1) both;
          }

          .psychologists-ui-inert,
          .psychologists-ui-inert * {
            pointer-events: none !important;
          }

          @media (prefers-reduced-motion: reduce) {
            .psychologists-benefit-pill {
              animation: none;
              opacity: 1;
              transform: none;
            }

            .psychologists-video-feed {
              scroll-behavior: auto;
            }

            .psychologists-double-tap-feedback {
              animation: none;
              opacity: 1;
            }

            .psychologists-swipe-hint,
            .psychologists-swipe-nudge {
              animation: none;
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

            {!showInitialLoading && !errorMessage && psychologists.length === 0 ? (
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

            {shouldRenderGlobalControls ? (
              <>
                {isSearchFocused ? (
                  <button
                    aria-label="Fechar busca"
                    className="absolute inset-0 z-[60] cursor-default bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ease-out"
                    data-psychologists-scroll-lock="true"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      exitSearchMode();
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      exitSearchMode();
                    }}
                    onWheel={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    type="button"
                  />
                ) : null}

                <form
                  aria-hidden={areGlobalControlsHidden ? true : undefined}
                  className={cn(
                    "absolute z-[70] transition-all duration-200 ease-out",
                    globalControlsVisibilityClass,
                    isSearchFocused ? "scale-[1.015]" : null,
                  )}
                  data-psychologists-scroll-lock="true"
                  onMouseDown={stopInteractionPropagation}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    registerSwipeHintInteraction();
                  }}
                  onSubmit={handleSearchSubmit}
                  style={{
                    top: `calc(env(safe-area-inset-top) + ${metrics.searchTop}px)`,
                    left: `${metrics.horizontalPadding}px`,
                    right: `${metrics.searchRightGap}px`,
                    height: `${metrics.searchHeight}px`,
                  }}
                >
                  <div
                    className={cn(
                      "relative flex h-full w-full items-center rounded-[999px] border p-3 backdrop-blur-md transition-all duration-200 ease-out",
                      isSearchFocused
                        ? "border-white/80 bg-white/[0.92] shadow-[0_18px_46px_rgba(15,23,42,0.28)]"
                        : "border-[rgba(255,255,255,0.35)] bg-white/35",
                    )}
                  >
                    <Search
                      className={cn(
                        "absolute left-3 h-4 w-4 transition-colors",
                        isSearchFocused ? "text-[#64748b]" : "text-white/85",
                      )}
                      aria-hidden="true"
                    />
                    <input
                      aria-label="Buscar Psicólogos"
                      className={cn(
                        "h-full w-full bg-transparent pr-3 pl-7 text-[14px] outline-none transition-colors",
                        isSearchFocused
                          ? "text-[#0f172a] placeholder:text-[#64748b]"
                          : "text-white placeholder:text-white/72",
                      )}
                      maxLength={120}
                      disabled={areGlobalControlsHidden}
                      onBlur={() => {
                        window.setTimeout(() => exitSearchMode({ shouldBlur: false }), 120);
                      }}
                      onChange={(event) => {
                        setSearchDraft(event.target.value);
                        enterSearchMode();
                      }}
                      onFocus={enterSearchMode}
                      placeholder="Buscar psicólogos"
                      name="search"
                      ref={searchInputRef}
                      tabIndex={areGlobalControlsHidden ? -1 : undefined}
                      type="text"
                      value={searchDraft}
                    />
                  </div>

                  {shouldRenderSearchSuggestions ? (
                    <div
                      aria-label="Sugestões de psicólogos"
                      className="absolute top-[calc(100%+8px)] right-0 left-0 overflow-hidden rounded-2xl border border-white/25 bg-white/95 text-[#0f172a] shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur-md"
                      onMouseDown={(event) => event.preventDefault()}
                      role="listbox"
                    >
                      <div className="border-[#e2e8f0] border-b px-3 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#64748b] uppercase">
                        Profissionais cadastrados
                      </div>
                      {searchSuggestionsDirectory.isFetching ? (
                        <div className="px-3 py-3 text-sm font-medium text-[#64748b]">
                          Buscando profissionais...
                        </div>
                      ) : (
                        searchSuggestionItems.map((suggestion) => (
                          <button
                            aria-label={`Buscar por ${suggestion.name}`}
                            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold transition hover:bg-[#f8fafc]"
                            key={suggestion.id}
                            aria-selected={false}
                            onClick={() => handleSearchSuggestionSelect(suggestion.name)}
                            role="option"
                            type="button"
                          >
                            <span className="min-w-0 truncate">{suggestion.name}</span>
                            <span className="shrink-0 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-extrabold text-[#308ce8]">
                              {suggestion.verified ? "Verificado" : "Gratuito"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </form>

                <button
                  aria-label="Abrir filtros"
                  aria-hidden={areGlobalControlsHidden ? true : undefined}
                  className={cn(
                    "absolute z-[70] grid items-center justify-center rounded-full border shadow-[0_5px_24px_rgba(15,23,42,0.2)] backdrop-blur-md transition hover:bg-white/45",
                    globalControlsVisibilityClass,
                    isSearchFocused
                      ? "border-white/80 bg-white/[0.92] text-[#0f172a] shadow-[0_18px_46px_rgba(15,23,42,0.24)]"
                      : "border-[rgba(255,255,255,0.35)] bg-white/35 text-white",
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleFiltersOpen();
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    if (isSearchFocused) {
                      exitSearchMode({
                        resumeVideo: false,
                      });
                    }
                    registerSwipeHintInteraction();
                  }}
                  style={{
                    top: `calc(env(safe-area-inset-top) + ${metrics.searchTop}px)`,
                    right: `${metrics.actionRightPadding}px`,
                    width: `${metrics.filterButtonSize}px`,
                    height: `${metrics.filterButtonSize}px`,
                  }}
                  disabled={areGlobalControlsHidden}
                  tabIndex={areGlobalControlsHidden ? -1 : undefined}
                  type="button"
                >
                  <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </>
            ) : null}

            {!showInitialLoading && !errorMessage && psychologists.length > 0 ? (
              <div
                className={cn(
                  "psychologists-video-feed h-full w-full snap-y snap-mandatory overscroll-contain",
                  isSearchFocused || isVideoProgressSeeking ? "overflow-hidden" : "overflow-y-auto",
                )}
                onPointerDownCapture={isSearchFocused ? undefined : registerSwipeHintInteraction}
                onScroll={isSearchFocused ? undefined : handleFeedScroll}
                onWheelCapture={isSearchFocused ? undefined : registerSwipeHintInteraction}
                ref={feedContainerRef}
              >
                {psychologists.map((psychologist, index) => {
                  const isActiveSlide = index === activePsychologistIndex;
                  const slideProfileHref = `/app/psychologist/${psychologist.id}`;
                  const slideVideoSrc = resolvePublicMediaUrl(psychologist.video_url);
                  const slidePosterSrc = psychologist.video_cover_url
                    ? resolvePublicMediaUrl(psychologist.video_cover_url)
                    : null;
                  const slideShouldShowVideo =
                    Boolean(slideVideoSrc) && (!isActiveSlide || !isVideoPlaybackFailed);
                  const slideShouldRenderProgress =
                    Boolean(slideVideoSrc) && (!isActiveSlide || slideShouldShowVideo);
                  const slideBio = psychologist.headline?.trim() || "";
                  const slideNameParts = splitNameForBadge(psychologist.name);
                  const slideBenefitBadges = buildFloatingBenefitBadges(psychologist);
                  const slideIsFavorited =
                    favoriteOverrides[psychologist.id] ?? Boolean(psychologist.favorited);
                  const slideIsFavoritePending = favoritePendingId === psychologist.id;
                  const slideActionColumnTranslateY = isActiveSlide ? actionColumnTranslateY : 0;
                  const slideIsUiHidden = isActiveSlide && isUiHidden;
                  const slideUiVisibilityClass = slideIsUiHidden
                    ? "psychologists-ui-inert pointer-events-none opacity-0"
                    : "opacity-100";
                  const slideOverlayVisibilityClass = slideIsUiHidden ? "opacity-0" : "opacity-100";
                  const slideProgressRatio =
                    isActiveSlide && videoProgress.duration
                      ? clampNumber(
                          videoSeekPreviewRatio ??
                            videoProgress.currentTime / videoProgress.duration,
                          0,
                          1,
                        )
                      : 0;
                  const slideProgressPercent = `${slideProgressRatio * 100}%`;
                  const slideProgressBottom = slideIsUiHidden
                    ? `calc(env(safe-area-inset-bottom) + ${VIDEO_PROGRESS_HIDDEN_BOTTOM_GAP}px)`
                    : `calc(${VIDEO_PROGRESS_VISIBLE_NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))`;

                  return (
                    <section
                      aria-label={`Psicólogo ${psychologist.name}`}
                      className={cn(
                        "relative h-[100dvh] w-full snap-start snap-always overflow-hidden",
                        isActiveSlide && shouldNudgeSwipeCard ? "psychologists-swipe-nudge" : null,
                      )}
                      key={psychologist.id}
                    >
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{
                          top: 0,
                        }}
                      >
                        <div className="relative h-full w-full overflow-hidden">
                          {slideShouldShowVideo ? (
                            <video
                              aria-label={`Vídeo de apresentação de ${psychologist.name}`}
                              data-psychologist-id={psychologist.id}
                              data-psychologists-background="true"
                              autoPlay={isActiveSlide && !isVideoPaused}
                              className="h-full w-full bg-black object-cover"
                              controls={false}
                              loop
                              muted={isVideoMuted}
                              onDurationChange={(event) => {
                                if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
                              }}
                              onError={() => {
                                if (isActiveSlide) setIsVideoPlaybackFailed(true);
                              }}
                              onLoadedData={() => {
                                if (!isActiveSlide) return;

                                setIsVideoPlaybackFailed(false);
                                setIsVideoPaused(false);
                                syncActiveVideoProgress();
                              }}
                              onLoadedMetadata={(event) => {
                                if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
                              }}
                              onPause={() => {
                                if (!isActiveSlide) return;

                                setIsVideoPaused(true);
                                syncActiveVideoProgress();
                              }}
                              onPlay={() => {
                                if (!isActiveSlide) return;

                                setIsVideoPaused(false);
                                syncActiveVideoProgress();
                              }}
                              onTimeUpdate={(event) => {
                                if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
                              }}
                              playsInline
                              poster={slidePosterSrc || undefined}
                              preload={isActiveSlide ? "auto" : "metadata"}
                              ref={(node) => {
                                if (isActiveSlide) {
                                  backgroundVideoRef.current = node;
                                } else if (
                                  backgroundVideoRef.current?.dataset.psychologistId ===
                                  psychologist.id
                                ) {
                                  backgroundVideoRef.current = null;
                                }
                              }}
                              src={slideVideoSrc ?? undefined}
                            />
                          ) : slidePosterSrc ? (
                            <Image
                              alt={psychologist.name}
                              className="h-full w-full object-cover"
                              fill
                              priority={index === 0}
                              sizes="(min-width: 768px) 430px, 100vw"
                              src={slidePosterSrc}
                              unoptimized={isPublicMediaUrl(psychologist.video_cover_url)}
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-[#e2e8f0] text-3xl font-extrabold text-[#94a3b8]">
                              {getInitials(psychologist.name)}
                            </div>
                          )}

                          <div
                            className={cn(
                              "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out",
                              slideOverlayVisibilityClass,
                            )}
                            style={{
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.7) 17%, rgba(0,0,0,0.42) 31%, rgba(0,0,0,0.16) 43%, rgba(0,0,0,0) 58%)",
                            }}
                          />

                          <button
                            aria-label={
                              slideIsUiHidden
                                ? `Mostrar interface de ${psychologist.name}`
                                : `Ocultar interface de ${psychologist.name}`
                            }
                            className="absolute inset-0 z-10 h-full w-full cursor-default border-0 bg-transparent p-0"
                            onClick={
                              isActiveSlide
                                ? () => handleVideoAreaTap(psychologist)
                                : stopInteractionPropagation
                            }
                            onPointerCancel={isActiveSlide ? handleLongPressEnd : undefined}
                            onPointerDown={isActiveSlide ? handleLongPressStart : undefined}
                            onPointerLeave={isActiveSlide ? handleLongPressEnd : undefined}
                            onPointerMove={isActiveSlide ? handleLongPressMove : undefined}
                            onPointerUp={isActiveSlide ? handleLongPressEnd : undefined}
                            type="button"
                          />

                          {isActiveSlide &&
                          slideShouldShowVideo &&
                          !slideIsUiHidden &&
                          !isLongPressing &&
                          !isVideoProgressSeeking &&
                          (isVideoMuted || isVideoPaused) ? (
                            <button
                              aria-label={
                                isVideoPaused
                                  ? `Retomar vídeo de ${psychologist.name}`
                                  : `Ativar som do vídeo de ${psychologist.name}`
                              }
                              className="absolute top-1/2 left-1/2 z-20 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-black/30 text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:bg-black/40"
                              onClick={handleVideoControlTap}
                              type="button"
                            >
                              {isVideoPaused ? (
                                <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
                              ) : isVideoMuted ? (
                                <VolumeX className="h-5 w-5" aria-hidden="true" />
                              ) : null}
                            </button>
                          ) : null}

                          {isActiveSlide && showDoubleTapFavoriteFeedback ? (
                            <div
                              aria-hidden="true"
                              className="psychologists-double-tap-feedback pointer-events-none absolute top-1/2 left-1/2 z-50 grid h-20 w-20 place-items-center rounded-full bg-black/20 text-[#ef4444] backdrop-blur-[2px]"
                            >
                              <Heart className="h-11 w-11 fill-[#ef4444]" strokeWidth={2.2} />
                            </div>
                          ) : null}

                          {slideShouldRenderProgress ? (
                            <div
                              aria-label={`Progresso do vídeo de ${psychologist.name}`}
                              aria-valuemax={isActiveSlide ? Math.round(videoProgress.duration) : 0}
                              aria-valuemin={0}
                              aria-valuenow={
                                isActiveSlide ? Math.round(videoProgress.currentTime) : 0
                              }
                              className={cn(
                                "absolute z-50 flex h-6 items-end outline-none",
                                isActiveSlide
                                  ? "pointer-events-auto cursor-pointer"
                                  : "pointer-events-none",
                              )}
                              data-psychologists-scroll-lock="true"
                              onClick={stopInteractionPropagation}
                              onKeyDown={isActiveSlide ? handleVideoProgressKeyDown : undefined}
                              onPointerCancel={
                                isActiveSlide ? handleVideoProgressPointerEnd : undefined
                              }
                              onPointerDown={
                                isActiveSlide ? handleVideoProgressPointerDown : undefined
                              }
                              onPointerMove={
                                isActiveSlide ? handleVideoProgressPointerMove : undefined
                              }
                              onPointerUp={
                                isActiveSlide ? handleVideoProgressPointerEnd : undefined
                              }
                              onTouchCancel={
                                isActiveSlide ? handleVideoProgressTouchEnd : undefined
                              }
                              onTouchEnd={isActiveSlide ? handleVideoProgressTouchEnd : undefined}
                              onTouchMove={isActiveSlide ? handleVideoProgressTouchMove : undefined}
                              onTouchStart={
                                isActiveSlide ? handleVideoProgressTouchStart : undefined
                              }
                              ref={(node) => {
                                if (isActiveSlide) {
                                  progressTrackRef.current = node;
                                } else if (progressTrackRef.current === node) {
                                  progressTrackRef.current = null;
                                }
                              }}
                              role="slider"
                              style={{
                                bottom: slideProgressBottom,
                                left: 0,
                                right: 0,
                                touchAction: "none",
                              }}
                              tabIndex={isActiveSlide ? 0 : -1}
                            >
                              <div
                                className="relative w-full overflow-hidden transition-[height] duration-150 ease-out"
                                style={{
                                  backgroundColor: VIDEO_PROGRESS_TRACK_COLOR,
                                  height: isActiveSlide && isVideoProgressSeeking ? "5px" : "3px",
                                }}
                              >
                                <div
                                  className={cn(
                                    "h-full",
                                    isActiveSlide && isVideoProgressSeeking
                                      ? null
                                      : "transition-[width] duration-100 ease-linear",
                                  )}
                                  style={{
                                    backgroundColor: VIDEO_PROGRESS_FILL_COLOR,
                                    width: slideProgressPercent,
                                  }}
                                />
                              </div>
                            </div>
                          ) : null}

                          {slideBenefitBadges.length > 0 ? (
                            <ul
                              aria-label="Benefícios do psicólogo"
                              aria-hidden={slideIsUiHidden ? true : undefined}
                              className={cn(
                                "pointer-events-none absolute z-30 flex w-[min(190px,56vw)] list-none flex-col items-start gap-2 overflow-visible p-0 transition-opacity duration-200 ease-out",
                                slideOverlayVisibilityClass,
                              )}
                              style={{
                                left: `${metrics.horizontalPadding}px`,
                                top: `calc(env(safe-area-inset-top) + ${
                                  metrics.searchTop + metrics.searchHeight + 24
                                }px)`,
                              }}
                            >
                              {slideBenefitBadges.map((badge) => {
                                const badgeStyle: FloatingBenefitBadgeStyle = {
                                  "--benefit-delay": badge.delay,
                                };

                                return (
                                  <li
                                    className={cn(
                                      "psychologists-benefit-pill pointer-events-auto inline-flex w-max max-w-[172px] items-center gap-1.5 rounded-full border border-white/55 px-2.5 py-1.5 text-[10px] leading-none font-extrabold tracking-[-0.02em] text-[#64748B] backdrop-blur-md",
                                    )}
                                    key={badge.id}
                                    style={badgeStyle}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/70 text-[#64748B]"
                                    >
                                      <Award className="h-3 w-3" strokeWidth={2.4} />
                                    </span>
                                    {badge.label}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}

                          <div
                            aria-hidden="true"
                            className={cn(
                              "pointer-events-auto absolute inset-x-0 z-[35] transition-opacity duration-200 ease-out",
                              slideUiVisibilityClass,
                            )}
                            style={{
                              bottom: `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom))`,
                              height: `${metrics.bioBottomOffset}px`,
                            }}
                          />

                          <section
                            aria-hidden={slideIsUiHidden ? true : undefined}
                            aria-live={isActiveSlide && shareFeedback ? "polite" : "off"}
                            className={cn(
                              "pointer-events-none absolute inset-x-0 z-40 grid items-end text-[#ffffff] transition-opacity duration-200 ease-out",
                              slideUiVisibilityClass,
                            )}
                            style={{
                              left: `${metrics.horizontalPadding}px`,
                              right: `${metrics.actionRightPadding}px`,
                              bottom: infoSectionBottom,
                              columnGap: `${metrics.textColumnGap}px`,
                              gridTemplateColumns: `minmax(0, 1fr) ${metrics.actionRailWidth}px`,
                            }}
                          >
                            <div className="pointer-events-auto min-w-0">
                              {psychologist.available_today ? (
                                <div
                                  className="mb-1.5 flex w-fit items-center gap-1.5 font-semibold text-[#86EFAC]"
                                  style={{
                                    fontSize: `${metrics.availableBadgeTextSize}px`,
                                    lineHeight: "12px",
                                  }}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]"
                                  />
                                  Disponível hoje
                                </div>
                              ) : null}

                              <div className="grid gap-1.5">
                                <button
                                  aria-label={`Ver perfil de ${psychologist.name}`}
                                  className="block w-full min-w-0 max-w-full cursor-pointer text-left font-bold text-white"
                                  disabled={slideIsUiHidden}
                                  onClick={(event) => navigateToProfile(psychologist.id, event)}
                                  tabIndex={slideIsUiHidden ? -1 : undefined}
                                  type="button"
                                  style={{
                                    fontSize: `${metrics.titleSize}px`,
                                    fontWeight: 700,
                                    lineHeight: `${metrics.titleLineHeight}px`,
                                    maxWidth: "100%",
                                    overflowWrap: "break-word",
                                    wordBreak: "normal",
                                  }}
                                >
                                  {slideNameParts.firstPart ? (
                                    <span>{slideNameParts.firstPart} </span>
                                  ) : null}
                                  <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap align-baseline">
                                    <span>
                                      {slideNameParts.lastPart ||
                                        formatDisplayName(psychologist.name)}
                                    </span>
                                    {psychologist.verified ? (
                                      <VerifiedBadgeIcon
                                        aria-hidden="true"
                                        className="shrink-0 translate-y-[1px]"
                                        style={{
                                          height: `${metrics.verifiedBadgeSize}px`,
                                          width: `${metrics.verifiedBadgeSize}px`,
                                        }}
                                      />
                                    ) : null}
                                  </span>
                                </button>

                                <div
                                  className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 font-medium text-white/80"
                                  style={{
                                    fontSize: `${metrics.subtitleSize}px`,
                                    fontWeight: 500,
                                    lineHeight: "16px",
                                  }}
                                >
                                  <span className="min-w-0">
                                    {formatProfileTitle(
                                      psychologist.gender,
                                      psychologist.formation_years,
                                      psychologist.show_experience_tag,
                                    )}
                                  </span>
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[#FACC15] shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-sm">
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
                                        psychologist.rating_avg,
                                        psychologist.rating_count,
                                      )}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {slideBio ? (
                                <p
                                  className="pointer-events-auto mt-2 w-full whitespace-pre-line text-left text-white/90"
                                  onPointerDown={stopInteractionPropagation}
                                  ref={(node) => {
                                    if (isActiveSlide) {
                                      bioTextRef.current = node;
                                    }
                                  }}
                                  style={{
                                    fontSize: `${metrics.bioSize}px`,
                                    lineHeight: `${metrics.bioLineHeight}px`,
                                    maxWidth: "100%",
                                    overflowWrap: "break-word",
                                    wordBreak: "normal",
                                  }}
                                >
                                  {slideBio}
                                </p>
                              ) : null}

                              {isActiveSlide && shareFeedback ? (
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
                              ref={(node) => {
                                if (isActiveSlide) {
                                  actionColumnRef.current = node;
                                }
                              }}
                              style={{
                                gap: `${metrics.actionGap}px`,
                                transform: `translateY(${slideActionColumnTranslateY}px)`,
                                width: `${metrics.actionRailWidth}px`,
                              }}
                            >
                              <div className="grid justify-items-center text-center">
                                <button
                                  aria-label={`Favoritar ${psychologist.name}`}
                                  aria-busy={slideIsFavoritePending}
                                  aria-pressed={slideIsFavorited}
                                  className={cn(
                                    "relative z-50 grid cursor-pointer place-items-center rounded-full bg-transparent text-white transition hover:bg-white/10 active:scale-95",
                                    slideIsFavorited ? "text-[#ef4444]" : "text-white",
                                  )}
                                  disabled={slideIsUiHidden}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleFavorite(psychologist);
                                  }}
                                  tabIndex={slideIsUiHidden ? -1 : undefined}
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
                                      height: `${metrics.actionStandaloneIconSize}px`,
                                      width: `${metrics.actionStandaloneIconSize}px`,
                                      color: slideIsFavorited ? "#ef4444" : "white",
                                      fill: slideIsFavorited ? "#ef4444" : "transparent",
                                    }}
                                  />
                                </button>
                              </div>

                              <div className="grid justify-items-center text-center">
                                <button
                                  aria-label={`Compartilhar perfil de ${psychologist.name}`}
                                  className="grid place-items-center rounded-full bg-transparent text-white transition hover:bg-white/10"
                                  disabled={slideIsUiHidden}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void shareCurrent(psychologist);
                                  }}
                                  tabIndex={slideIsUiHidden ? -1 : undefined}
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
                                      height: `${metrics.actionStandaloneIconSize}px`,
                                      width: `${metrics.actionStandaloneIconSize}px`,
                                    }}
                                  />
                                </button>
                              </div>

                              {psychologist.whatsapp_url ? (
                                <div className="grid justify-items-center text-center">
                                  <a
                                    aria-label={`Chamar ${psychologist.name} no WhatsApp`}
                                    className="grid place-items-center rounded-full bg-[#22C55E] text-white transition hover:bg-[#16A34A]"
                                    href={psychologist.whatsapp_url}
                                    onClick={stopInteractionPropagation}
                                    rel="noreferrer"
                                    tabIndex={slideIsUiHidden ? -1 : undefined}
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
                                </div>
                              ) : (
                                <div className="grid justify-items-center text-center">
                                  <button
                                    aria-disabled="true"
                                    aria-label={`WhatsApp indisponível para ${psychologist.name}`}
                                    className="grid place-items-center rounded-full bg-[#22C55E] text-white transition"
                                    disabled={slideIsUiHidden}
                                    onClick={stopInteractionPropagation}
                                    tabIndex={slideIsUiHidden ? -1 : undefined}
                                    type="button"
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
                                  </button>
                                </div>
                              )}

                              <div className="grid justify-items-center text-center">
                                <Link
                                  aria-label={`Ver perfil de ${psychologist.name}`}
                                  className="grid place-items-center rounded-full bg-transparent"
                                  href={slideProfileHref}
                                  onClick={stopInteractionPropagation}
                                  tabIndex={slideIsUiHidden ? -1 : undefined}
                                  ref={(node) => {
                                    if (isActiveSlide) {
                                      profileTextRef.current = node;
                                    }
                                  }}
                                >
                                  <div
                                    className="relative overflow-hidden rounded-full bg-white p-0.5 text-[#0f172a]"
                                    style={{
                                      width: `${metrics.actionButtonSize}px`,
                                      height: `${metrics.actionButtonSize}px`,
                                      border: "2px solid #fff",
                                    }}
                                  >
                                    {psychologist.avatar ? (
                                      <Image
                                        alt={psychologist.name}
                                        className="h-full w-full rounded-full object-cover"
                                        fill
                                        sizes={`${metrics.actionButtonSize}px`}
                                        src={resolvePublicMediaUrl(psychologist.avatar) ?? ""}
                                        unoptimized={isPublicMediaUrl(psychologist.avatar)}
                                      />
                                    ) : (
                                      <span className="grid h-full w-full place-items-center rounded-full bg-[#e2e8f0] text-[11px] font-semibold text-[#334155]">
                                        {getInitials(psychologist.name)}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              </div>
                            </div>
                          </section>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : null}

            {shouldRenderSwipeHint ? (
              <div
                aria-live="polite"
                className="psychologists-swipe-hint pointer-events-none absolute left-1/2 z-50 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-white/20 bg-black/32 px-3.5 py-2 text-center text-[12px] font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm"
                style={{
                  bottom: `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + 14px)`,
                }}
              >
                <ArrowUp className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2.4} />
                <span>Deslize para descobrir novos psicólogos</span>
              </div>
            ) : null}

            {isFiltersOpen ? (
              <div
                aria-labelledby="psychologist-filters-title"
                aria-modal="true"
                className="fixed inset-0 z-50 grid place-items-center bg-foreground/55 p-4 backdrop-blur-sm"
                data-psychologists-scroll-lock="true"
                onMouseDown={handleFiltersClose}
                role="dialog"
              >
                <div
                  className="grid max-h-[calc(100dvh-2rem)] w-full max-w-[500px] gap-4 overflow-y-auto rounded-[28px] border border-[#e2e8f0] bg-surface p-5 shadow-[0_24px_70px_rgb(15_23_42_/_26%)]"
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
                        Ajuste os critérios para encontrar o psicólogo ideal para você
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

                  <filters.Form
                    {...filters.formProps}
                    className="grid grid-cols-2 gap-x-3 gap-y-1"
                    onSubmit={handleSubmitFilters}
                  >
                    <div className="col-span-2 mt-4 flex flex-col gap-3">
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
                  </filters.Form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </PrivateTemplate>
  );
};

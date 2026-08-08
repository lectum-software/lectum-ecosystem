"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useAccount } from "@/api/callers/account";
import { useImportantActionTracking } from "@/api/callers/analytics";
import { usePatient } from "@/api/callers/patient";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { useAppSelector } from "@/hooks/redux";
import { getPageFromParams, readFiltersFromParams } from "../modules/directory-url";
import type { PsychologistsOnboardingTip } from "../modules/onboarding";
import { DEFAULT_VIDEO_PLAYBACK_RATE } from "../modules/onboarding";
import type { FeedVideoAnalyticsState, VideoProgressState } from "../modules/video-analytics";
import { createEmptyFeedVideoAnalyticsState } from "../modules/video-analytics";
import { useViewportMetrics } from "../modules/viewport";

export const usePsychologistsSetup = () => {
  const router = useRouter();

  const searchParams = useSearchParams();

  const conversion = useProgressiveConversion();

  const currentUserId = useAppSelector((state) => state.user?.id);

  const currentUserRole = useAppSelector((state) => state.user?.role);

  const shouldShowPatientDiscoveryActionTips = currentUserRole === "paciente";

  const searchParamsString = searchParams.toString();

  const metrics = useViewportMetrics();

  const params = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);

  const filterValues = useMemo(() => readFiltersFromParams(params), [params]);

  const currentPage = useMemo(() => getPageFromParams(params), [params]);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [shareFeedback, setShareFeedback] = useState(false);

  const [isSharing, setIsSharing] = useState(false);

  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const [isVideoPaused, setIsVideoPaused] = useState(false);

  const [videoPlaybackRate, setVideoPlaybackRate] = useState(DEFAULT_VIDEO_PLAYBACK_RATE);

  const [videoVolume, setVideoVolume] = useState(1);

  const [isVideoPlaybackFailed, setIsVideoPlaybackFailed] = useState(false);

  const [isUiHidden, setIsUiHidden] = useState(false);

  const [isLongPressing, setIsLongPressing] = useState(false);

  const [hasLoadedSwipeHintPreference, setHasLoadedSwipeHintPreference] = useState(false);

  const [hasSeenSwipeHint, setHasSeenSwipeHint] = useState(true);

  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const [shouldNudgeSwipeCard, setShouldNudgeSwipeCard] = useState(false);

  const [activeOnboardingTip, setActiveOnboardingTip] = useState<PsychologistsOnboardingTip | null>(
    null,
  );

  const [actionColumnTranslateY, setActionColumnTranslateY] = useState(0);

  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  const [isVideoProgressSeeking, setIsVideoProgressSeeking] = useState(false);

  const [videoProgress, setVideoProgress] = useState<VideoProgressState>({
    currentTime: 0,
    duration: 0,
  });

  const [searchDraft, setSearchDraft] = useState(() => filterValues.search || "");

  const [filterModalSearchDraft, setFilterModalSearchDraft] = useState(
    () => filterValues.search || "",
  );

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [activePsychologistIndex, setActivePsychologistIndex] = useState(0);

  const [desktopFilterChipScroll, setDesktopFilterChipScroll] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const filterDialogRef = useRef<HTMLDivElement | null>(null);

  const filterDialogCloseTimerRef = useRef<number | null>(null);

  const filterDialogOpenFrameRef = useRef<number | null>(null);

  const feedContainerRef = useRef<HTMLDivElement | null>(null);

  const desktopFilterChipsRef = useRef<HTMLDivElement | null>(null);

  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const desktopSearchControlsRef = useRef<HTMLDivElement | null>(null);

  const bioTextRef = useRef<HTMLElement | null>(null);

  const progressTrackRef = useRef<HTMLDivElement | null>(null);

  const progressFillRef = useRef<HTMLDivElement | null>(null);

  const actionColumnRef = useRef<HTMLDivElement | null>(null);

  const actionAnchorRef = useRef<HTMLElement | null>(null);

  const videoProgressStateRef = useRef<VideoProgressState>({
    currentTime: 0,
    duration: 0,
  });

  const feedVideoAnalyticsRef = useRef<FeedVideoAnalyticsState>(
    createEmptyFeedVideoAnalyticsState(),
  );

  const lastSearchParamsStringRef = useRef(searchParamsString);

  const lastActiveVideoResetKeyRef = useRef<string | null>(null);

  const tapTimeoutRef = useRef<number | null>(null);

  const longPressTimeoutRef = useRef<number | null>(null);

  const progressAnimationFrameRef = useRef<number | null>(null);

  const isVideoProgressSeekingRef = useRef(false);

  const lastVideoProgressStateSyncRef = useRef(0);

  const wasVideoPlayingBeforeProgressScrubRef = useRef(false);

  const videoSeekPreviewRatioRef = useRef<number | null>(null);

  const swipeHintNudgeTimeoutRef = useRef<number | null>(null);

  const hasShownInitialSwipeHintRef = useRef(false);

  const hasSyncedSwipeHintPreferenceRef = useRef(false);

  const hasPersistedSwipeHintSeenRef = useRef(false);

  const hasShownOnboardingTipThisVisitRef = useRef(false);

  const hasPersistedMySearchTipSeenRef = useRef(false);

  const hasPersistedWhatsappTipSeenRef = useRef(false);

  const searchImpressionKeysRef = useRef<Set<string>>(new Set());

  const hasPlayedSwipeNudgeRef = useRef(false);

  const suppressNextTapRef = useRef(false);

  const didLongPressRef = useRef(false);

  const didMoveDuringPressRef = useRef(false);

  const didMoveBeyondLongPressToleranceRef = useRef(false);

  const isSearchModeActiveRef = useRef(false);

  const shouldResumeVideoAfterSearchRef = useRef(false);

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const desktopTouchStartYRef = useRef<number | null>(null);

  const accountTips = useAccount({
    enableSecurity: false,
    enableTips: true,
  });

  const accountTipsUserId = accountTips.userId;

  const { favoritePsychologist, unfavoritePsychologist } = usePatient({
    enableProfile: false,
  });

  const importantActionTracking = useImportantActionTracking();

  return {
    accountTips,
    accountTipsUserId,
    actionAnchorRef,
    actionColumnRef,
    actionColumnTranslateY,
    activeOnboardingTip,
    activePsychologistIndex,
    backgroundVideoRef,
    bioTextRef,
    conversion,
    currentPage,
    currentUserId,
    desktopFilterChipScroll,
    desktopFilterChipsRef,
    desktopSearchControlsRef,
    desktopTouchStartYRef,
    didLongPressRef,
    didMoveBeyondLongPressToleranceRef,
    didMoveDuringPressRef,
    favoriteOverrides,
    favoritePsychologist,
    feedContainerRef,
    feedVideoAnalyticsRef,
    filterDialogCloseTimerRef,
    filterDialogOpenFrameRef,
    filterDialogRef,
    filterModalSearchDraft,
    filterValues,
    hasLoadedSwipeHintPreference,
    hasPersistedMySearchTipSeenRef,
    hasPersistedSwipeHintSeenRef,
    hasPersistedWhatsappTipSeenRef,
    hasPlayedSwipeNudgeRef,
    hasSeenSwipeHint,
    hasShownInitialSwipeHintRef,
    hasShownOnboardingTipThisVisitRef,
    hasSyncedSwipeHintPreferenceRef,
    importantActionTracking,
    isFilterSheetOpen,
    isFiltersOpen,
    isLongPressing,
    isSearchFocused,
    isSearchModeActiveRef,
    isSharing,
    isUiHidden,
    isVideoMuted,
    isVideoPaused,
    isVideoPlaybackFailed,
    isVideoProgressSeeking,
    isVideoProgressSeekingRef,
    lastActiveVideoResetKeyRef,
    lastSearchParamsStringRef,
    lastVideoProgressStateSyncRef,
    longPressTimeoutRef,
    metrics,
    pointerStartRef,
    progressAnimationFrameRef,
    progressFillRef,
    progressTrackRef,
    router,
    searchDraft,
    searchImpressionKeysRef,
    searchInputRef,
    searchParamsString,
    setActionColumnTranslateY,
    setActiveOnboardingTip,
    setActivePsychologistIndex,
    setDesktopFilterChipScroll,
    setFavoriteOverrides,
    setFilterModalSearchDraft,
    setHasLoadedSwipeHintPreference,
    setHasSeenSwipeHint,
    setIsFilterSheetOpen,
    setIsFiltersOpen,
    setIsLongPressing,
    setIsSearchFocused,
    setIsSharing,
    setIsUiHidden,
    setIsVideoMuted,
    setIsVideoPaused,
    setIsVideoPlaybackFailed,
    setIsVideoProgressSeeking,
    setSearchDraft,
    setShareFeedback,
    setShouldNudgeSwipeCard,
    setShowSwipeHint,
    setVideoPlaybackRate,
    setVideoProgress,
    setVideoVolume,
    shareFeedback,
    shouldNudgeSwipeCard,
    shouldResumeVideoAfterSearchRef,
    shouldShowPatientDiscoveryActionTips,
    showSwipeHint,
    suppressNextTapRef,
    swipeHintNudgeTimeoutRef,
    tapTimeoutRef,
    unfavoritePsychologist,
    videoPlaybackRate,
    videoProgress,
    videoProgressStateRef,
    videoSeekPreviewRatioRef,
    videoVolume,
    wasVideoPlayingBeforeProgressScrubRef,
  };
};

export type PsychologistsSetup = ReturnType<typeof usePsychologistsSetup>;

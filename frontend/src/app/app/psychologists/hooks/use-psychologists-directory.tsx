"use client";

import { useCallback, useDeferredValue, useEffect, useMemo } from "react";
import {
  useDirectoryPsychologistSearchImpression,
  useDirectoryPsychologists,
  useDirectoryPsychologistVideoWatch,
} from "@/api/callers/directory";
import type {
  DirectoryPsychologist,
  DirectoryPsychologistsQuery,
} from "@/api/generator/types/directory";
import type { ImportantActionTrackingRequest } from "@/api/req/analytics";
import { getOrCreateAnalyticsIdentity } from "@/components/analytics/storage";
import { resolvePublicMediaUrl } from "@/utils/media";
import { currentAnalyticsPath, getDisplayMode } from "../modules/directory-url";
import {
  buildActiveFilterChips,
  buildBenefitChips,
  buildDirectoryFilterSearchTrackingItems,
} from "../modules/filter-config";
import { FILTER_DIALOG_CLOSE_DELAY_MS, PAGE_LIMIT } from "../modules/onboarding";
import { filterPsychologistsByName, normalizeFormValues, toQuery } from "../modules/profile-format";
import { PsychologistFilterSearchSuggestions } from "../modules/search-suggestions";
import { resolveDirectoryErrorMessage } from "../modules/viewport";
import { type PsychologistsFilterForm, usePsychologistsFilterForm } from "../use-form";
import { usePsychologistsSetupContext } from "./setup-context";

export const usePsychologistsDirectory = () => {
  const setup = usePsychologistsSetupContext();
  const {
    activePsychologistIndex,
    currentPage,
    filterDialogCloseTimerRef,
    filterDialogOpenFrameRef,
    filterModalSearchDraft,
    filterValues,
    importantActionTracking,
    isFiltersOpen,
    isSearchFocused,
    isVideoPlaybackFailed,
    metrics,
    router,
    searchDraft,
    searchImpressionKeysRef,
    searchParamsString,
    setFilterModalSearchDraft,
    setIsFilterSheetOpen,
    setIsFiltersOpen,
  } = setup;

  const deferredFilterModalSearchDraft = useDeferredValue(filterModalSearchDraft);

  const liveFilterValues = useMemo(
    () =>
      isFiltersOpen
        ? normalizeFormValues({
            ...filterValues,
            search: deferredFilterModalSearchDraft,
          })
        : filterValues,
    [deferredFilterModalSearchDraft, filterValues, isFiltersOpen],
  );

  const query = useMemo(
    () => toQuery(liveFilterValues, isFiltersOpen ? 1 : currentPage),
    [currentPage, isFiltersOpen, liveFilterValues],
  );

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

  const filterSuggestionSearch = deferredFilterModalSearchDraft.trim();

  const shouldFetchFilterSuggestions = isFiltersOpen && filterSuggestionSearch.length >= 2;

  const filterSuggestionQuery = useMemo<DirectoryPsychologistsQuery>(
    () => ({
      limit: 8,
      page: 1,
      search: filterSuggestionSearch || undefined,
    }),
    [filterSuggestionSearch],
  );

  const filterSuggestionsDirectory = useDirectoryPsychologists(
    filterSuggestionQuery,
    shouldFetchFilterSuggestions,
  );

  const response = directory.data;

  const psychologists = useMemo(() => response?.data ?? [], [response?.data]);

  const featuredPsychologistListIndex =
    activePsychologistIndex >= 0 && activePsychologistIndex < psychologists.length
      ? activePsychologistIndex
      : 0;

  const featuredPsychologist = psychologists[featuredPsychologistListIndex];

  const backgroundVideoSrc = resolvePublicMediaUrl(featuredPsychologist?.video_url);

  const shouldShowVideo = Boolean(backgroundVideoSrc) && !isVideoPlaybackFailed;

  const isMobileSearchFocusMode = isSearchFocused && !metrics.isDesktopLayout;

  const activeVideoSource = shouldShowVideo ? backgroundVideoSrc : null;

  const featuredBio = featuredPsychologist?.headline?.trim() || "";

  const featuredBenefitChipsCount = buildBenefitChips(featuredPsychologist).length;

  const featuredPsychologistId = featuredPsychologist?.id;

  const featuredPsychologistExplorePosition = featuredPsychologistId
    ? ((query.page ?? 1) - 1) * (query.limit ?? PAGE_LIMIT) + featuredPsychologistListIndex + 1
    : null;

  const activeVideoResetKey = featuredPsychologistId
    ? `${featuredPsychologistId}:${activeVideoSource ?? ""}`
    : null;

  const { mutate: trackFeaturedVideoWatch } = useDirectoryPsychologistVideoWatch(
    featuredPsychologistId ?? "",
  );

  const { mutate: trackSearchResultImpression } = useDirectoryPsychologistSearchImpression();

  const handleFilterSearchChange = useCallback(
    (value: string) => {
      setFilterModalSearchDraft(value);
    },
    [setFilterModalSearchDraft],
  );

  const filterSuggestionItems = useMemo(
    () => filterPsychologistsByName(filterSuggestionsDirectory.data?.data, filterModalSearchDraft),
    [filterModalSearchDraft, filterSuggestionsDirectory.data?.data],
  );

  const cancelFilterDialogMotion = useCallback(() => {
    if (filterDialogCloseTimerRef.current) {
      window.clearTimeout(filterDialogCloseTimerRef.current);
      filterDialogCloseTimerRef.current = null;
    }

    if (filterDialogOpenFrameRef.current) {
      window.cancelAnimationFrame(filterDialogOpenFrameRef.current);
      filterDialogOpenFrameRef.current = null;
    }
  }, [filterDialogCloseTimerRef, filterDialogOpenFrameRef]);

  useEffect(() => cancelFilterDialogMotion, [cancelFilterDialogMotion]);

  const openFilterDialogWithMotion = useCallback(() => {
    cancelFilterDialogMotion();

    setIsFilterSheetOpen(false);
    setIsFiltersOpen(true);

    filterDialogOpenFrameRef.current = window.requestAnimationFrame(() => {
      setIsFilterSheetOpen(true);
      filterDialogOpenFrameRef.current = null;
    });
  }, [cancelFilterDialogMotion, filterDialogOpenFrameRef, setIsFilterSheetOpen, setIsFiltersOpen]);

  const closeFilterDialogWithMotion = useCallback(() => {
    cancelFilterDialogMotion();

    setIsFilterSheetOpen(false);

    filterDialogCloseTimerRef.current = window.setTimeout(() => {
      setIsFiltersOpen(false);
      filterDialogCloseTimerRef.current = null;
    }, FILTER_DIALOG_CLOSE_DELAY_MS);
  }, [cancelFilterDialogMotion, filterDialogCloseTimerRef, setIsFilterSheetOpen, setIsFiltersOpen]);

  const handleFilterSuggestionSelect = useCallback(
    (psychologist: DirectoryPsychologist) => {
      setFilterModalSearchDraft("");
      closeFilterDialogWithMotion();
      router.push(`/psicologos/${psychologist.id}`);
    },
    [closeFilterDialogWithMotion, router, setFilterModalSearchDraft],
  );

  const filterSearchSuggestionsSlot = useMemo(() => {
    if (filterModalSearchDraft.trim().length < 2) return null;

    return (
      <PsychologistFilterSearchSuggestions
        isLoading={filterSuggestionsDirectory.isFetching}
        items={filterSuggestionItems}
        onSelect={handleFilterSuggestionSelect}
      />
    );
  }, [
    filterModalSearchDraft,
    filterSuggestionItems,
    filterSuggestionsDirectory.isFetching,
    handleFilterSuggestionSelect,
  ]);

  const trackPresentationVideoAction = useCallback(
    (actionType: ImportantActionTrackingRequest["action_type"], psychologistId: string) => {
      const analyticsIdentity = getOrCreateAnalyticsIdentity();
      if (!analyticsIdentity) return;

      void importantActionTracking
        .mutateAsync({
          action_type: actionType,
          display_mode: getDisplayMode(),
          occurred_at: new Date().toISOString(),
          page_kind: "psychologists",
          path: currentAnalyticsPath(),
          session_id: analyticsIdentity.sessionId,
          target_id: psychologistId,
          target_type: "psychologist",
          visitor_id: analyticsIdentity.visitorId,
        })
        .catch(() => {
          // Analytics first-party não deve bloquear navegação ou interação do vídeo.
        });
    },
    [importantActionTracking],
  );

  const trackDirectoryFilterSearch = useCallback(
    (values: PsychologistsFilterForm) => {
      const trackingItems = buildDirectoryFilterSearchTrackingItems(values);
      if (trackingItems.length === 0) return;

      const analyticsIdentity = getOrCreateAnalyticsIdentity();
      if (!analyticsIdentity) return;

      const basePayload = {
        action_type: "psychologist_directory_filter_search" as const,
        display_mode: getDisplayMode(),
        occurred_at: new Date().toISOString(),
        page_kind: "psychologists",
        path: currentAnalyticsPath(),
        session_id: analyticsIdentity.sessionId,
        visitor_id: analyticsIdentity.visitorId,
      };

      for (const item of trackingItems) {
        void importantActionTracking
          .mutateAsync({
            ...basePayload,
            target_id: item.targetId,
            target_type: item.targetType,
          })
          .catch(() => {
            // Analytics first-party não deve bloquear a aplicação dos filtros.
          });
      }
    },
    [importantActionTracking],
  );

  const filters = usePsychologistsFilterForm({
    filters: response?.filters,
    loading: directory.isLoading || directory.isFetching,
    onSearchChange: handleFilterSearchChange,
    searchSuggestionsSlot: filterSearchSuggestionsSlot,
    values: filterValues,
  });

  const errorMessage = directory.isError ? resolveDirectoryErrorMessage(directory.error) : null;

  const hasSelectedSearchFilters =
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
    Boolean(filterValues.social_value) ||
    Boolean(filterValues.available_today) ||
    Boolean(filterValues.verified);

  const hasActiveFilters = Boolean(filterValues.search?.trim()) || hasSelectedSearchFilters;

  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(filterValues, response?.filters),
    [filterValues, response?.filters],
  );

  const showInitialLoading = directory.isLoading && !response;

  useEffect(() => {
    if (
      !hasSelectedSearchFilters ||
      showInitialLoading ||
      directory.isFetching ||
      errorMessage ||
      !featuredPsychologistId
    ) {
      return;
    }

    const impressionKey = `${searchParamsString || "default"}:${featuredPsychologistId}:${
      featuredPsychologistExplorePosition ?? "sem-posicao"
    }`;
    if (searchImpressionKeysRef.current.has(impressionKey)) return;

    searchImpressionKeysRef.current.add(impressionKey);
    trackSearchResultImpression({
      id: featuredPsychologistId,
      path: currentAnalyticsPath(),
      position: featuredPsychologistExplorePosition,
    });
  }, [
    directory.isFetching,
    errorMessage,
    featuredPsychologistId,
    featuredPsychologistExplorePosition,
    hasSelectedSearchFilters,
    searchParamsString,
    showInitialLoading,
    trackSearchResultImpression,
    searchImpressionKeysRef,
  ]);

  const canSwipeBetweenPsychologists = psychologists.length > 1;

  const infoSectionBottom = `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + ${metrics.bioBottomOffset}px)`;

  const searchSuggestionItems = useMemo(
    () => filterPsychologistsByName(searchSuggestionsDirectory.data?.data, searchDraft, 5),
    [searchDraft, searchSuggestionsDirectory.data?.data],
  );

  const shouldRenderSearchSuggestions =
    isSearchFocused &&
    searchDraft.trim().length >= 2 &&
    (searchSuggestionsDirectory.isFetching || searchSuggestionItems.length > 0);

  return {
    activeFilterChips,
    activeVideoResetKey,
    activeVideoSource,
    canSwipeBetweenPsychologists,
    closeFilterDialogWithMotion,
    errorMessage,
    featuredBenefitChipsCount,
    featuredBio,
    featuredPsychologist,
    featuredPsychologistId,
    filters,
    hasActiveFilters,
    infoSectionBottom,
    isMobileSearchFocusMode,
    openFilterDialogWithMotion,
    psychologists,
    searchSuggestionItems,
    searchSuggestionsDirectory,
    shouldRenderSearchSuggestions,
    shouldShowVideo,
    showInitialLoading,
    trackDirectoryFilterSearch,
    trackFeaturedVideoWatch,
    trackPresentationVideoAction,
  };
};

export type PsychologistsDirectory = ReturnType<typeof usePsychologistsDirectory>;

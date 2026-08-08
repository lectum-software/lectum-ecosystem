"use client";

import { Search, SlidersHorizontal, UsersRound, X } from "lucide-react";
import { createPortal } from "react-dom";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { PrivateTemplate } from "@/templates/private";
import { FILTER_FEATURE_OPTIONS, FilterFeatureCard } from "../modules/filter-config";
import { PsychologistsCoachMark } from "../modules/onboarding";
import { PsychologistsDesktopRail } from "./components/desktop-rail";
import { PsychologistsFeed } from "./components/feed";
import { PsychologistsFeedStyles } from "./components/feed-styles";
import type { PsychologistsViewModel } from "./types";

export const PsychologistsView = ({ model }: { model: PsychologistsViewModel }) => {
  const { derived, directory, feed, navigation, onboarding, setup } = model;

  const {
    activeOnboardingTip,
    filterDialogRef,
    isFilterSheetOpen,
    isFiltersOpen,
    isSearchFocused,
    isUiHidden,
    metrics,
    searchDraft,
    searchInputRef,
    setActiveOnboardingTip,
    setSearchDraft,
  } = setup;

  const {
    activeFilterChips,
    errorMessage,
    filters,
    hasActiveFilters,
    isMobileSearchFocusMode,
    psychologists,
    searchSuggestionItems,
    searchSuggestionsDirectory,
    shouldRenderSearchSuggestions,
    showInitialLoading,
  } = directory;

  const { registerSwipeHintInteraction } = onboarding;
  const {
    clearFilters,
    enterSearchMode,
    exitSearchMode,
    handleExploreModeClick,
    handleFiltersClose,
    handleFiltersOpen,
    handleMySearchModeClick,
    handleRemoveActiveFilter,
    handleSearchSubmit,
    handleSearchSuggestionSelect,
    handleSubmitFilters,
    stopInteractionPropagation,
    toggleFilterFeature,
  } = navigation;

  const {
    handleDesktopPageTouchEnd,
    handleDesktopPageTouchMove,
    handleDesktopPageTouchStart,
    handleDesktopPageWheelCapture,
  } = feed;
  const {
    areFeedModeControlsHidden,
    areGlobalControlsHidden,
    feedModeControlsVisibilityClass,
    globalControlsVisibilityClass,
    shouldRenderDesktopControlRail,
    shouldRenderGlobalControls,
    shouldRenderMobileGlobalControls,
    shouldRenderSwipeHint,
  } = derived;

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="lectum-mobile-main-scrollbar-hidden h-[100dvh] max-w-none overflow-hidden p-0 sm:p-0 lg:pb-0"
      desktopNavigation="sidebar"
      navigationDimmed={isMobileSearchFocusMode}
      navigationHidden={metrics.isDesktopLayout ? false : isUiHidden}
      navigationTheme="solidWhite"
    >
      <PsychologistsFeedStyles />
      <div
        className="psychologists-shorts-layout relative isolate h-[100dvh] min-h-[100dvh] overflow-hidden bg-background text-white lg:bg-[#f8fafc] lg:touch-pan-y"
        onTouchCancel={handleDesktopPageTouchEnd}
        onTouchEnd={handleDesktopPageTouchEnd}
        onTouchMove={handleDesktopPageTouchMove}
        onTouchStart={handleDesktopPageTouchStart}
        onWheelCapture={handleDesktopPageWheelCapture}
      >
        <div className="relative mx-auto flex h-[100dvh] w-full max-w-[430px] justify-center overflow-hidden bg-black lg:max-w-none lg:items-start lg:gap-0 lg:bg-transparent lg:px-8">
          <div className="relative z-20 h-full w-full overflow-hidden bg-black lg:h-[100dvh] lg:w-[var(--psychologists-desktop-card-width)] lg:shrink-0 lg:overflow-visible lg:bg-transparent">
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
                  description="Ainda não existem psicólogos publicados com vídeo de apresentação para estes filtros."
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
              <div
                aria-hidden={areFeedModeControlsHidden ? true : undefined}
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 z-[76] bg-gradient-to-b from-black/75 via-black/35 to-transparent px-4 pb-5 pt-[calc(env(safe-area-inset-top)+20px)] transition-all duration-200 ease-out lg:hidden lg:top-[var(--psychologists-desktop-card-top)] lg:bg-none",
                  metrics.isDesktopLayout ? "lg:rounded-t-[22px] lg:px-5" : null,
                  feedModeControlsVisibilityClass,
                )}
                data-psychologists-scroll-lock="true"
                onMouseDown={stopInteractionPropagation}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  registerSwipeHintInteraction();
                }}
              >
                <div className="pointer-events-auto flex items-center justify-center gap-8 text-white">
                  <button
                    aria-current={!hasActiveFilters ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-9 items-center justify-center px-1 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity duration-150 ease-out",
                      hasActiveFilters ? "opacity-70 hover:opacity-100" : "opacity-100",
                    )}
                    onClick={handleExploreModeClick}
                    tabIndex={areFeedModeControlsHidden ? -1 : undefined}
                    type="button"
                  >
                    Explorar
                    {!hasActiveFilters ? (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-white"
                      />
                    ) : null}
                  </button>

                  <button
                    aria-current={hasActiveFilters ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-9 items-center justify-center gap-1.5 px-1 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity duration-150 ease-out",
                      hasActiveFilters ? "opacity-100" : "opacity-75 hover:opacity-100",
                    )}
                    data-psychologists-tip-target="my-search"
                    onClick={handleMySearchModeClick}
                    tabIndex={areFeedModeControlsHidden ? -1 : undefined}
                    type="button"
                  >
                    <span>Minha Busca</span>
                    <Search className="h-[17px] w-[17px]" aria-hidden="true" strokeWidth={2.25} />
                    {hasActiveFilters ? (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white"
                      />
                    ) : null}
                  </button>
                </div>

                {hasActiveFilters && activeFilterChips.length > 0 ? (
                  <div className="pointer-events-auto -mx-4 mt-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:-mx-5 lg:px-5">
                    <div className="flex min-w-max items-center justify-center gap-2">
                      {activeFilterChips.map((chip) => (
                        <button
                          aria-label={`Remover filtro ${chip.label}`}
                          className="inline-flex h-8 max-w-[180px] items-center gap-1.5 rounded-full border border-white/20 bg-white/16 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors duration-150 ease-out hover:bg-white/24"
                          key={`${chip.key}-${chip.label}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveActiveFilter(chip.key);
                          }}
                          tabIndex={areFeedModeControlsHidden ? -1 : undefined}
                          type="button"
                        >
                          <span className="truncate">{chip.label}</span>
                          <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </button>
                      ))}

                      <button
                        className="inline-flex h-8 shrink-0 items-center rounded-full border border-white/25 bg-white px-3 text-xs font-bold text-[#0f172a] transition-transform duration-150 ease-out hover:scale-[1.02]"
                        onClick={handleMySearchModeClick}
                        tabIndex={areFeedModeControlsHidden ? -1 : undefined}
                        type="button"
                      >
                        + Filtros
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {shouldRenderMobileGlobalControls ? (
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
              <PsychologistsFeed model={model} />
            ) : null}

            {shouldRenderSwipeHint ? (
              <div
                aria-live="polite"
                className="psychologists-swipe-hint pointer-events-none absolute left-1/2 z-50 inline-flex max-w-[calc(100%-2rem)] items-center justify-center rounded-full border border-white/70 bg-white/95 px-4 py-2.5 text-center text-[13px] font-extrabold text-[#0F172A] shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-[#D9E8F8]/80 backdrop-blur-md"
                style={{
                  bottom: `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + 14px)`,
                }}
              >
                <span>
                  <span className="text-[#308CE8]">↑</span> Descubra novos psicólogos
                </span>
              </div>
            ) : null}

            {!isUiHidden && activeOnboardingTip ? (
              <PsychologistsCoachMark
                onDismiss={() => setActiveOnboardingTip(null)}
                tip={activeOnboardingTip}
              />
            ) : null}

            {isFiltersOpen && typeof document !== "undefined"
              ? createPortal(
                  <div
                    aria-labelledby="psychologist-filters-title"
                    aria-modal="true"
                    className={cn(
                      "fixed inset-0 z-[140] flex items-end justify-center bg-foreground/55 p-0 text-foreground backdrop-blur-sm transition-opacity duration-200 ease-out sm:items-center sm:p-6",
                      isFilterSheetOpen ? "opacity-100" : "opacity-0",
                    )}
                    data-psychologists-scroll-lock="true"
                    onMouseDown={handleFiltersClose}
                    role="dialog"
                  >
                    <div
                      className={cn(
                        "flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-border bg-surface text-foreground shadow-[0_24px_70px_rgb(15_23_42_/_26%)] transition-transform duration-300 ease-out motion-reduce:transition-none sm:h-auto sm:max-h-[min(880px,calc(100dvh-2rem))] sm:max-w-[560px] sm:rounded-[32px] sm:border",
                        isFilterSheetOpen ? "translate-y-0" : "translate-y-full",
                      )}
                      onMouseDown={(event) => event.stopPropagation()}
                      ref={filterDialogRef}
                      role="document"
                      tabIndex={-1}
                    >
                      <div className="shrink-0 border-border border-b bg-surface/95 px-5 py-2.5 backdrop-blur sm:px-6 sm:py-3">
                        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3">
                          <button
                            aria-label="Fechar filtros"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-muted transition duration-200 ease-out hover:bg-surface-muted hover:text-foreground"
                            onClick={handleFiltersClose}
                            type="button"
                          >
                            <X className="h-4 w-4" aria-hidden="true" strokeWidth={2.25} />
                          </button>

                          <h2
                            className="self-center text-lg font-extrabold leading-5 text-foreground"
                            id="psychologist-filters-title"
                          >
                            Filtros de busca
                          </h2>

                          <button
                            className="self-center rounded-full px-2 py-1 text-[13px] font-medium text-[#2B7FC9] transition duration-200 ease-out hover:bg-[#EAF5FF] hover:text-[#1E6FB8] dark:text-[#8CCBFF] dark:hover:bg-primary/10"
                            onClick={clearFilters}
                            type="button"
                          >
                            Limpar
                          </button>

                          <p className="col-span-2 col-start-2 mt-1 max-w-[292px] text-[13px] leading-[17px] text-muted sm:max-w-none sm:text-sm sm:leading-5">
                            Ajuste os critérios para encontrar o psicólogo ideal para você
                          </p>
                        </div>
                      </div>

                      <filters.Form
                        {...filters.formProps}
                        className="psychologists-filter-dialog-scroll grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto px-5 py-4 sm:px-6"
                        onSubmit={handleSubmitFilters}
                      >
                        <section className="col-span-2 mt-2 grid gap-3">
                          <div>
                            <h3 className="text-sm font-extrabold text-foreground">
                              Selos e facilidades
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              Refine por confiança, acessibilidade e condições de atendimento.
                            </p>
                          </div>

                          <div className="grid gap-3">
                            {FILTER_FEATURE_OPTIONS.map((option) => (
                              <FilterFeatureCard
                                checked={Boolean(filters.hook.watch(option.name))}
                                key={option.name}
                                onToggle={toggleFilterFeature}
                                option={option}
                              />
                            ))}
                          </div>
                        </section>

                        <div className="sticky bottom-0 col-span-2 -mx-5 mt-5 bg-gradient-to-t from-surface via-surface/95 to-surface/0 px-5 pt-8 pb-2 sm:-mx-6 sm:px-6">
                          <button
                            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgb(48_140_232_/_26%)] transition duration-200 ease-out hover:-translate-y-px hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            type="submit"
                          >
                            Aplicar filtros
                          </button>
                        </div>
                      </filters.Form>
                    </div>
                  </div>,
                  document.body,
                )
              : null}
          </div>

          {shouldRenderDesktopControlRail ? <PsychologistsDesktopRail model={model} /> : null}
        </div>
      </div>
    </PrivateTemplate>
  );
};

"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PsychologistsViewModel } from "../types";
import type { PsychologistSlideView } from "./slide-model";

export const PsychologistSlideHeader = ({
  model,
  slide,
}: {
  model: PsychologistsViewModel;
  slide: PsychologistSlideView;
}) => {
  const { areFeedModeControlsHidden, feedModeControlsVisibilityClass } = model.derived;

  const {
    handleDesktopFilterChipsWheel,
    handleExploreModeClick,
    handleMySearchModeClick,
    handleRemoveActiveFilter,
    scrollDesktopFilterChips,
    stopInteractionPropagation,
    updateDesktopFilterChipScrollState,
  } = model.navigation;

  const { registerSwipeHintInteraction } = model.onboarding;

  const { activeFilterChips, hasActiveFilters } = model.directory;

  const { desktopFilterChipScroll, desktopFilterChipsRef } = model.setup;

  const { isActiveSlide, psychologist } = slide;

  return (
    <div
      aria-hidden={!isActiveSlide || areFeedModeControlsHidden ? true : undefined}
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-[76] hidden bg-gradient-to-b from-black/75 via-black/35 to-transparent px-5 pb-5 pt-[calc(env(safe-area-inset-top)+20px)] transition-all duration-200 ease-out lg:block lg:rounded-t-[22px] lg:bg-none",
        isActiveSlide
          ? feedModeControlsVisibilityClass
          : "psychologists-ui-inert pointer-events-none opacity-0",
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
          tabIndex={!isActiveSlide || areFeedModeControlsHidden ? -1 : undefined}
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
          data-psychologists-tip-target={isActiveSlide ? "my-search" : undefined}
          onClick={handleMySearchModeClick}
          tabIndex={!isActiveSlide || areFeedModeControlsHidden ? -1 : undefined}
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
        <div className="pointer-events-auto -mx-5 mt-2 px-5">
          <div className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-8 rounded-l-full bg-gradient-to-r from-black/35 to-transparent transition-opacity duration-150 lg:block",
                desktopFilterChipScroll.canScrollLeft ? "opacity-100" : "opacity-0",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-8 rounded-r-full bg-gradient-to-l from-black/35 to-transparent transition-opacity duration-150 lg:block",
                desktopFilterChipScroll.canScrollRight ? "opacity-100" : "opacity-0",
              )}
            />
            {desktopFilterChipScroll.canScrollLeft ? (
              <button
                aria-label="Ver filtros anteriores"
                className="absolute top-1/2 left-0 z-20 hidden h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-md transition-colors duration-150 hover:bg-black/55 lg:inline-flex"
                onClick={(event) => scrollDesktopFilterChips(-1, event)}
                onPointerDown={stopInteractionPropagation}
                type="button"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            {desktopFilterChipScroll.canScrollRight ? (
              <button
                aria-label="Ver mais filtros selecionados"
                className="absolute top-1/2 right-0 z-20 hidden h-6 w-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-md transition-colors duration-150 hover:bg-black/55 lg:inline-flex"
                onClick={(event) => scrollDesktopFilterChips(1, event)}
                onPointerDown={stopInteractionPropagation}
                type="button"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            <div
              className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={updateDesktopFilterChipScrollState}
              onWheel={handleDesktopFilterChipsWheel}
              ref={desktopFilterChipsRef}
            >
              <div className="flex w-max min-w-full items-center justify-center gap-2">
                {activeFilterChips.map((chip) => (
                  <button
                    aria-label={`Remover filtro ${chip.label}`}
                    className="inline-flex h-7 max-w-[144px] items-center gap-1 rounded-full border border-white/20 bg-white/16 px-2.5 text-[11px] font-semibold text-white backdrop-blur-md transition-colors duration-150 ease-out hover:bg-white/24"
                    key={`${psychologist.id}-${chip.key}-${chip.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveActiveFilter(chip.key);
                    }}
                    tabIndex={!isActiveSlide || areFeedModeControlsHidden ? -1 : undefined}
                    type="button"
                  >
                    <span className="truncate text-[11px] leading-none">{chip.label}</span>
                    <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </button>
                ))}

                <button
                  className="inline-flex h-7 shrink-0 items-center rounded-full border border-white/25 bg-white px-2.5 text-[11px] font-bold text-[#0f172a] transition-transform duration-150 ease-out hover:scale-[1.02]"
                  onClick={handleMySearchModeClick}
                  tabIndex={!isActiveSlide || areFeedModeControlsHidden ? -1 : undefined}
                  type="button"
                >
                  <span className="text-[11px] leading-none">+ Filtros</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

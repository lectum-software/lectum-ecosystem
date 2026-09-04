"use client";

import { ArrowDown, ArrowUp, Heart, Search, Share2, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { formatDisplayName, formatProfileTitle, getInitials } from "../../modules/profile-format";
import type { PsychologistsViewModel } from "../types";

export const PsychologistsDesktopRail = ({ model }: { model: PsychologistsViewModel }) => {
  const {
    areDesktopFeedControlsHidden,
    canNavigateToNextPsychologist,
    canNavigateToPreviousPsychologist,
    desktopActionIsFavoritePending,
    desktopActionIsFavorited,
    desktopActionIsOwnProfile,
    desktopActionPsychologist,
    desktopActionRailVisibilityClass,
    desktopFeedControlsVisibilityClass,
    isDesktopActionRailHidden,
    shouldRenderDesktopActionRail,
    shouldRenderDesktopFeedControls,
    shouldRenderDesktopNavigationRail,
  } = model.derived;

  const { desktopSearchControlsRef, isSearchFocused, searchDraft, searchInputRef, setSearchDraft } =
    model.setup;

  const {
    enterSearchMode,
    exitSearchMode,
    handleFiltersOpen,
    handleSearchSubmit,
    handleSearchSuggestionSelect,
    handleWhatsappInteraction,
    navigateToPublicPsychologistProfile,
    stopInteractionPropagation,
  } = model.navigation;

  const { registerSwipeHintInteraction } = model.onboarding;

  const { searchSuggestionItems, searchSuggestionsDirectory, shouldRenderSearchSuggestions } =
    model.directory;

  const { shareCurrent, toggleFavorite } = model.favorite;

  const { navigateToNextPsychologist, navigateToPreviousPsychologist } = model.feed;
  const desktopActionDisplayName = desktopActionPsychologist
    ? formatDisplayName(desktopActionPsychologist.name)
    : "";
  const desktopActionWhatsappName = desktopActionPsychologist
    ? getPsychologistWhatsappDisplayName({
        id: desktopActionPsychologist.id,
        name: desktopActionDisplayName,
        whatsappName: desktopActionPsychologist.whatsapp_name,
      })
    : "";

  return (
    <aside
      aria-label="Ações da tela de Psicólogos"
      className="absolute top-0 left-[var(--psychologists-desktop-rail-left)] z-[60] hidden h-full w-[176px] lg:block"
    >
      {shouldRenderDesktopFeedControls ? (
        <div
          aria-hidden={areDesktopFeedControlsHidden ? true : undefined}
          className={cn(
            "absolute top-[calc(env(safe-area-inset-top)+40px)] left-0 flex w-[76px] flex-col items-center gap-3 transition-opacity duration-200 ease-out",
            desktopFeedControlsVisibilityClass,
          )}
          data-psychologists-scroll-lock="true"
          ref={desktopSearchControlsRef}
        >
          {isSearchFocused ? (
            <div className="relative h-12 w-[76px]">
              <span
                aria-hidden="true"
                className="-translate-x-1/2 absolute top-0 left-1/2 grid h-12 w-12 place-items-center rounded-full bg-surface text-muted shadow-lectum-soft"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <form
                className="absolute top-0 left-[64px] w-[224px]"
                onMouseDown={stopInteractionPropagation}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  registerSwipeHintInteraction();
                }}
                onSubmit={handleSearchSubmit}
              >
                <div className="relative flex h-12 w-full items-center rounded-full border border-border bg-surface px-4 shadow-lectum-soft transition-all duration-200 ease-out">
                  <input
                    aria-label="Buscar Psicólogos"
                    className="h-full w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted"
                    disabled={areDesktopFeedControlsHidden}
                    maxLength={120}
                    name="search"
                    onBlur={() => {
                      window.setTimeout(() => exitSearchMode({ shouldBlur: false }), 120);
                    }}
                    onChange={(event) => {
                      setSearchDraft(event.target.value);
                      enterSearchMode();
                    }}
                    onFocus={enterSearchMode}
                    placeholder="Buscar psicólogos"
                    ref={searchInputRef}
                    tabIndex={areDesktopFeedControlsHidden ? -1 : undefined}
                    type="text"
                    value={searchDraft}
                  />
                </div>

                {shouldRenderSearchSuggestions ? (
                  <div
                    aria-label="Sugestões de psicólogos"
                    className="absolute top-[calc(100%+8px)] left-0 w-full overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-lectum-soft"
                    onMouseDown={(event) => event.preventDefault()}
                    role="listbox"
                  >
                    <div className="border-border border-b px-3 py-2 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">
                      Profissionais cadastrados
                    </div>
                    {searchSuggestionsDirectory.isFetching ? (
                      <div className="px-3 py-3 text-sm font-medium text-muted">
                        Buscando profissionais...
                      </div>
                    ) : (
                      searchSuggestionItems.map((suggestion) => {
                        const displayName = formatDisplayName(suggestion.name);

                        return (
                          <button
                            aria-label={`Buscar por ${displayName}`}
                            aria-selected={false}
                            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold transition hover:bg-surface-muted"
                            key={suggestion.id}
                            onClick={() => handleSearchSuggestionSelect(displayName)}
                            role="option"
                            type="button"
                          >
                            <span className="min-w-0 truncate">{displayName}</span>
                            <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary">
                              {suggestion.verified ? "Verificado" : "Gratuito"}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </form>
            </div>
          ) : (
            <button
              aria-label="Pesquisar psicólogos"
              className="grid h-12 w-12 place-items-center rounded-full bg-surface text-muted shadow-lectum-soft transition hover:scale-105 hover:bg-surface-muted active:scale-95"
              disabled={areDesktopFeedControlsHidden}
              onClick={(event) => {
                event.stopPropagation();
                registerSwipeHintInteraction();
                enterSearchMode();
                window.setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              tabIndex={areDesktopFeedControlsHidden ? -1 : undefined}
              type="button"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          <button
            aria-label="Abrir filtros"
            className="grid h-12 w-12 place-items-center rounded-full bg-surface text-muted shadow-lectum-soft transition hover:scale-105 hover:bg-surface-muted active:scale-95"
            disabled={areDesktopFeedControlsHidden}
            onClick={(event) => {
              event.stopPropagation();
              if (isSearchFocused) {
                exitSearchMode({ resumeVideo: false });
              }
              handleFiltersOpen();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              registerSwipeHintInteraction();
            }}
            tabIndex={areDesktopFeedControlsHidden ? -1 : undefined}
            type="button"
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {shouldRenderDesktopActionRail && desktopActionPsychologist ? (
        <div
          aria-hidden={isDesktopActionRailHidden ? true : undefined}
          className={cn(
            "absolute top-1/2 left-0 flex w-[68px] -translate-y-[35%] flex-col items-center gap-3 transition-opacity duration-200 ease-out",
            desktopActionRailVisibilityClass,
          )}
        >
          <div className="grid w-[68px] justify-items-center gap-1 text-center">
            <button
              aria-label={`Ver perfil de ${desktopActionDisplayName}`}
              className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-border bg-surface p-0.5 text-foreground transition hover:scale-105 hover:bg-surface-muted active:scale-95"
              disabled={isDesktopActionRailHidden}
              onClick={(event) =>
                navigateToPublicPsychologistProfile(desktopActionPsychologist.id, event)
              }
              onPointerDown={stopInteractionPropagation}
              tabIndex={isDesktopActionRailHidden ? -1 : undefined}
              type="button"
            >
              <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-surface-muted text-[11px] font-bold text-muted">
                {desktopActionPsychologist.avatar ? (
                  <Image
                    alt={desktopActionDisplayName}
                    className="h-full w-full rounded-full object-cover"
                    fill
                    sizes="40px"
                    src={resolvePublicMediaUrl(desktopActionPsychologist.avatar) ?? ""}
                    unoptimized={isPublicMediaUrl(desktopActionPsychologist.avatar)}
                  />
                ) : (
                  getInitials(desktopActionDisplayName)
                )}
              </span>
            </button>
            <span className="text-[10px] font-bold text-muted">Perfil</span>
          </div>

          <div className="grid w-[68px] justify-items-center gap-1 text-center">
            <button
              aria-label={
                desktopActionIsOwnProfile
                  ? "Você não pode favoritar o próprio perfil"
                  : desktopActionIsFavorited
                    ? `Remover ${desktopActionDisplayName} dos favoritos`
                    : `Favoritar ${desktopActionDisplayName}`
              }
              aria-busy={desktopActionIsFavoritePending}
              aria-pressed={desktopActionIsFavorited}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition hover:scale-105 hover:bg-surface-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 disabled:hover:bg-surface disabled:active:scale-100"
              disabled={isDesktopActionRailHidden || desktopActionIsOwnProfile}
              onClick={(event) => {
                event.stopPropagation();
                toggleFavorite(desktopActionPsychologist);
              }}
              tabIndex={isDesktopActionRailHidden || desktopActionIsOwnProfile ? -1 : undefined}
              title={
                desktopActionIsOwnProfile ? "Você não pode favoritar o próprio perfil" : undefined
              }
              type="button"
            >
              <Heart
                className="h-5 w-5"
                aria-hidden="true"
                style={{
                  color: desktopActionIsFavorited ? "var(--lectum-danger)" : "var(--lectum-muted)",
                  fill: desktopActionIsFavorited ? "var(--lectum-danger)" : "transparent",
                }}
              />
            </button>
            <span className="text-[10px] font-bold text-muted">Favoritar</span>
          </div>

          <div className="grid w-[68px] justify-items-center gap-1 text-center">
            <button
              aria-label={`Compartilhar perfil de ${desktopActionDisplayName}`}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition hover:scale-105 hover:bg-surface-muted active:scale-95"
              disabled={isDesktopActionRailHidden}
              onClick={(event) => {
                event.stopPropagation();
                void shareCurrent(desktopActionPsychologist);
              }}
              tabIndex={isDesktopActionRailHidden ? -1 : undefined}
              type="button"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-[10px] font-bold text-muted">Compartilhar</span>
          </div>

          <div className="grid w-[68px] justify-items-center gap-1 text-center">
            {desktopActionPsychologist.whatsapp_url ? (
              <PsychologistWhatsAppRedirectButton
                aria-label={`Fale com ${desktopActionWhatsappName || desktopActionDisplayName} no WhatsApp`}
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-success transition hover:scale-105 hover:bg-surface-muted active:scale-95"
                data-psychologists-tip-target={isDesktopActionRailHidden ? undefined : "whatsapp"}
                importantActionType="psychologist_video_whatsapp_click"
                onClick={handleWhatsappInteraction}
                psychologist={{
                  avatar: desktopActionPsychologist.avatar,
                  crp: desktopActionPsychologist.crp,
                  id: desktopActionPsychologist.id,
                  name: desktopActionDisplayName,
                  typeLabel: formatProfileTitle(desktopActionPsychologist.gender, null, false),
                  whatsappName: desktopActionWhatsappName,
                  whatsappUrl: desktopActionPsychologist.whatsapp_url,
                }}
                stopPropagation
                tabIndex={isDesktopActionRailHidden ? -1 : undefined}
                trackingContext={{
                  pageKind: "psychologists",
                  targetId: desktopActionPsychologist.id,
                  targetType: "psychologist",
                }}
              >
                <WhatsAppIcon aria-hidden="true" className="h-5 w-5 text-whatsapp" />
              </PsychologistWhatsAppRedirectButton>
            ) : (
              <button
                aria-disabled="true"
                aria-label={`WhatsApp indisponível para ${desktopActionDisplayName}`}
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-success opacity-55"
                disabled={isDesktopActionRailHidden}
                onClick={stopInteractionPropagation}
                tabIndex={isDesktopActionRailHidden ? -1 : undefined}
                type="button"
              >
                <WhatsAppIcon aria-hidden="true" className="h-5 w-5 text-whatsapp" />
              </button>
            )}
            <span className="text-[10px] font-bold text-muted">WhatsApp</span>
          </div>
        </div>
      ) : null}

      {shouldRenderDesktopNavigationRail ? (
        <div
          aria-hidden={isDesktopActionRailHidden ? true : undefined}
          className={cn(
            "fixed top-1/2 right-[clamp(24px,3vw,54px)] flex -translate-y-1/2 flex-col items-center gap-5 transition-opacity duration-200 ease-out",
            desktopActionRailVisibilityClass,
          )}
          data-psychologists-scroll-lock="true"
        >
          <button
            aria-label="Psicólogo anterior"
            className={cn(
              "grid h-12 w-12 place-items-center rounded-2xl bg-transparent text-foreground/80 transition-[background,color,opacity,transform] duration-200 ease-out hover:scale-105 hover:bg-surface-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-95",
              !canNavigateToPreviousPsychologist || isDesktopActionRailHidden
                ? "cursor-not-allowed opacity-35 hover:scale-100"
                : null,
            )}
            disabled={!canNavigateToPreviousPsychologist || isDesktopActionRailHidden}
            onClick={navigateToPreviousPsychologist}
            type="button"
          >
            <ArrowUp className="h-7 w-7" aria-hidden="true" strokeWidth={2.3} />
          </button>

          <button
            aria-label="Próximo psicólogo"
            className={cn(
              "grid h-12 w-12 place-items-center rounded-2xl bg-transparent text-foreground/80 transition-[background,color,opacity,transform] duration-200 ease-out hover:scale-105 hover:bg-surface-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-95",
              !canNavigateToNextPsychologist || isDesktopActionRailHidden
                ? "cursor-not-allowed opacity-35 hover:scale-100"
                : null,
            )}
            disabled={!canNavigateToNextPsychologist || isDesktopActionRailHidden}
            onClick={navigateToNextPsychologist}
            type="button"
          >
            <ArrowDown className="h-7 w-7" aria-hidden="true" strokeWidth={2.3} />
          </button>
        </div>
      ) : null}
    </aside>
  );
};

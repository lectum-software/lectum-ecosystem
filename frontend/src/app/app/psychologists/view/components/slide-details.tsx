"use client";

import { Heart, Share2, Star } from "lucide-react";
import Image from "next/image";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import {
  formatDisplayName,
  formatProfileTitle,
  formatRating,
  getInitials,
} from "../../modules/profile-format";
import type { PsychologistsViewModel } from "../types";
import type { PsychologistSlideView } from "./slide-model";

export const PsychologistSlideDetails = ({
  model,
  slide,
}: {
  model: PsychologistsViewModel;
  slide: PsychologistSlideView;
}) => {
  const { actionAnchorRef, actionColumnRef, bioTextRef, metrics, shareFeedback } = model.setup;

  const { infoSectionBottom } = model.directory;

  const {
    handleWhatsappInteraction,
    navigateToPublicPsychologistProfile,
    stopInteractionPropagation,
  } = model.navigation;

  const { shareCurrent, toggleFavorite } = model.favorite;

  const {
    isActiveSlide,
    psychologist,
    slideActionColumnTranslateY,
    slideBenefitChips,
    slideBio,
    slideFavoriteDisabled,
    slideFavoriteLabel,
    slideFavoriteTabIndex,
    slideIsFavoritePending,
    slideIsFavorited,
    slideIsOwnProfile,
    slideNameParts,
    slideShouldHideChrome,
    slideUiVisibilityClass,
  } = slide;

  return (
    <section
      aria-hidden={slideShouldHideChrome ? true : undefined}
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
            className="mb-1.5 flex w-fit items-center gap-1.5 font-semibold text-[#22C55E]"
            style={{
              fontSize: `${metrics.availableBadgeTextSize}px`,
              lineHeight: "12px",
            }}
          >
            <span
              aria-hidden="true"
              className="psychologists-availability-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]"
            />
            Disponível hoje
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <button
            aria-label={`Ver perfil de ${psychologist.name}`}
            className="block w-full min-w-0 max-w-full cursor-pointer text-left font-bold text-white"
            disabled={slideShouldHideChrome}
            onClick={(event) => navigateToPublicPsychologistProfile(psychologist.id, event)}
            tabIndex={slideShouldHideChrome ? -1 : undefined}
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
            {slideNameParts.firstPart ? <span>{slideNameParts.firstPart} </span> : null}
            <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap align-baseline">
              <span>{slideNameParts.lastPart || formatDisplayName(psychologist.name)}</span>
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
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/10 px-1 py-0 text-[#FDE68A] shadow-none backdrop-blur-[1px]">
              <Star
                aria-hidden="true"
                className="fill-[#FDE68A] opacity-85"
                style={{
                  height: `${metrics.ratingIconSize}px`,
                  width: `${metrics.ratingIconSize}px`,
                }}
              />
              <span
                style={{
                  fontSize: `${metrics.ratingTextSize}px`,
                  fontWeight: 600,
                  lineHeight: `${metrics.ratingLineHeight}px`,
                }}
              >
                {formatRating(psychologist.rating_avg, psychologist.rating_count)}
              </span>
            </span>
          </div>
        </div>

        {slideBio ? (
          <p
            className="pointer-events-auto mt-2 w-full whitespace-pre-line text-left text-white/90"
            onPointerDown={stopInteractionPropagation}
            ref={(node) => {
              if (isActiveSlide && slideBenefitChips.length === 0) {
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

        {slideBenefitChips.length > 0 ? (
          <ul
            aria-label="Benefícios do psicólogo"
            className="pointer-events-auto mt-2 flex max-w-full list-none flex-nowrap items-center gap-1 overflow-hidden p-0 min-[390px]:gap-1.5"
            onPointerDown={stopInteractionPropagation}
            ref={(node) => {
              if (isActiveSlide) {
                bioTextRef.current = node;
              }
            }}
          >
            {slideBenefitChips.map((chip) => (
              <li
                className="inline-flex min-w-0 shrink items-center rounded-full border border-white/70 bg-black/15 px-1.5 py-1 text-[9px] leading-none font-bold whitespace-nowrap text-white/95 shadow-[0_4px_14px_rgba(15,23,42,0.2)] backdrop-blur-[2px] min-[390px]:px-2 min-[390px]:text-[10px]"
                key={chip.id}
              >
                <span className="truncate">{chip.label}</span>
              </li>
            ))}
          </ul>
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

      {!metrics.isDesktopLayout ? (
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
              aria-label={`Ver perfil de ${psychologist.name}`}
              className="grid place-items-center rounded-full bg-transparent transition active:scale-95"
              disabled={slideShouldHideChrome}
              onClick={(event) => navigateToPublicPsychologistProfile(psychologist.id, event)}
              onPointerDown={stopInteractionPropagation}
              tabIndex={slideShouldHideChrome ? -1 : undefined}
              type="button"
              style={{
                width: `${metrics.actionHitSize}px`,
                height: `${metrics.actionHitSize}px`,
              }}
            >
              <div
                className="relative overflow-hidden rounded-full bg-white p-0.5 text-[#0f172a]"
                style={{
                  width: `${metrics.actionAvatarSize}px`,
                  height: `${metrics.actionAvatarSize}px`,
                  border: "1.5px solid #fff",
                }}
              >
                {psychologist.avatar ? (
                  <Image
                    alt={psychologist.name}
                    className="h-full w-full rounded-full object-cover"
                    fill
                    sizes={`${metrics.actionAvatarSize}px`}
                    src={resolvePublicMediaUrl(psychologist.avatar) ?? ""}
                    unoptimized={isPublicMediaUrl(psychologist.avatar)}
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center rounded-full bg-[#e2e8f0] text-[10px] font-semibold text-[#334155]">
                    {getInitials(psychologist.name)}
                  </span>
                )}
              </div>
            </button>
          </div>

          <div className="grid justify-items-center text-center">
            <button
              aria-label={slideFavoriteLabel}
              aria-busy={slideIsFavoritePending}
              aria-pressed={slideIsFavorited}
              className={cn(
                "relative z-50 grid place-items-center rounded-full bg-transparent text-white transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:active:scale-100",
                slideIsFavorited ? "text-[#ef4444]" : "text-white",
              )}
              disabled={slideFavoriteDisabled}
              onClick={(event) => {
                event.stopPropagation();
                toggleFavorite(psychologist);
              }}
              tabIndex={slideFavoriteTabIndex}
              style={{
                width: `${metrics.actionHitSize}px`,
                height: `${metrics.actionHitSize}px`,
              }}
              title={slideIsOwnProfile ? slideFavoriteLabel : undefined}
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
              disabled={slideShouldHideChrome}
              onClick={(event) => {
                event.stopPropagation();
                void shareCurrent(psychologist);
              }}
              tabIndex={slideShouldHideChrome ? -1 : undefined}
              type="button"
              style={{
                width: `${metrics.actionHitSize}px`,
                height: `${metrics.actionHitSize}px`,
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
            <div
              className="grid justify-items-center text-center"
              ref={(node) => {
                if (isActiveSlide) {
                  actionAnchorRef.current = node;
                }
              }}
            >
              <PsychologistWhatsAppRedirectButton
                aria-label={`Fale com ${psychologist.whatsapp_name || psychologist.name} no WhatsApp`}
                className="grid place-items-center rounded-full bg-transparent text-white transition active:scale-95"
                data-psychologists-tip-target={isActiveSlide ? "whatsapp" : undefined}
                importantActionType="psychologist_video_whatsapp_click"
                onClick={handleWhatsappInteraction}
                psychologist={{
                  avatar: psychologist.avatar,
                  crp: psychologist.crp,
                  id: psychologist.id,
                  name: psychologist.name,
                  typeLabel: formatProfileTitle(psychologist.gender, null, false),
                  whatsappName: psychologist.whatsapp_name,
                  whatsappUrl: psychologist.whatsapp_url,
                }}
                stopPropagation
                tabIndex={slideShouldHideChrome ? -1 : undefined}
                trackingContext={{
                  pageKind: "psychologists",
                  targetId: psychologist.id,
                  targetType: "psychologist",
                }}
                style={{
                  width: `${metrics.actionHitSize}px`,
                  height: `${metrics.actionHitSize}px`,
                }}
              >
                <span
                  className="grid place-items-center rounded-full bg-[#22C55E] transition hover:bg-[#16A34A]"
                  style={{
                    height: `${metrics.actionPrimaryButtonSize}px`,
                    width: `${metrics.actionPrimaryButtonSize}px`,
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
                </span>
              </PsychologistWhatsAppRedirectButton>
            </div>
          ) : (
            <div
              className="grid justify-items-center text-center"
              ref={(node) => {
                if (isActiveSlide) {
                  actionAnchorRef.current = node;
                }
              }}
            >
              <button
                aria-disabled="true"
                aria-label={`WhatsApp indisponível para ${psychologist.name}`}
                className="grid place-items-center rounded-full bg-transparent text-white transition"
                disabled={slideShouldHideChrome}
                onClick={stopInteractionPropagation}
                tabIndex={slideShouldHideChrome ? -1 : undefined}
                type="button"
                style={{
                  width: `${metrics.actionHitSize}px`,
                  height: `${metrics.actionHitSize}px`,
                }}
              >
                <span
                  className="grid place-items-center rounded-full bg-[#22C55E]"
                  style={{
                    height: `${metrics.actionPrimaryButtonSize}px`,
                    width: `${metrics.actionPrimaryButtonSize}px`,
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
                </span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
};

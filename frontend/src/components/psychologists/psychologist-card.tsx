"use client";

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppButtonContent,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Button } from "@/registry/new-york-v4/ui/button";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { AvailabilityBadge, FavoriteButton, ShareButton } from "./psychologist-card-actions";
import {
  buildBenefitTags,
  type CardOverlayStyle,
  getInitials,
  getPsychologistDisplayName,
  getPsychologistTypeLabel,
  getSubinfo,
  OVERLAY_FAVORITE_OFFSET,
  OVERLAY_SHARE_GAP,
  OVERLAY_SIDE_BADGE_GAP,
  OVERLAY_TAGS_MARGIN_PX,
  PSYCHOLOGIST_OVERLAY_HEIGHT,
  type PsychologistCardProps,
} from "./psychologist-card-support";
import { CardVideo } from "./psychologist-card-video";

export function PsychologistCard({
  canFavorite = true,
  favoritePending,
  onToggleFavorite,
  psychologist,
}: PsychologistCardProps) {
  const avatarSrc = resolvePublicMediaUrl(psychologist.avatar);
  const videoSrc = psychologist.verified ? resolvePublicMediaUrl(psychologist.video_url) : null;
  const mediaIsPublic = isPublicMediaUrl(avatarSrc);
  const tags = buildBenefitTags(psychologist);
  const displayName = getPsychologistDisplayName(psychologist);
  const whatsappName = getPsychologistWhatsappDisplayName({
    id: psychologist.id,
    name: displayName,
    whatsappName: psychologist.whatsapp_name,
  });
  const route = `/psicologos/${psychologist.id}`;
  const overlayRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const tagContainerRef = useRef<HTMLDivElement>(null);
  const nameLineRef = useRef<HTMLHeadingElement>(null);
  const [tagTopOffsetPx, setTagTopOffsetPx] = useState<number | null>(null);
  const [profileActionTopPx, setProfileActionTopPx] = useState<number | null>(null);
  const [overlayHeightPx, setOverlayHeightPx] = useState<number | null>(null);

  const recalculateTagTopOffset = useCallback(() => {
    const cardNode = cardRef.current;
    const overlayNode = overlayRef.current;
    const tagContainerNode = tagContainerRef.current;
    const nameLineNode = nameLineRef.current;

    if (!cardNode || !overlayNode) {
      return;
    }

    const cardRect = cardNode.getBoundingClientRect();
    const overlayRect = overlayNode.getBoundingClientRect();
    const nextOverlayHeight = Math.round(overlayRect.height);
    let nextTagTop: number | null = null;

    if (tagContainerNode) {
      const tagContainerHeight = tagContainerNode.getBoundingClientRect().height;
      nextTagTop = Math.round(
        overlayRect.top - cardRect.top - tagContainerHeight - OVERLAY_TAGS_MARGIN_PX,
      );
    }

    let nextProfileActionTop: number | null = null;
    if (nameLineNode) {
      nextProfileActionTop = Math.max(
        0,
        Math.round(nameLineNode.getBoundingClientRect().top - cardRect.top),
      );
    }

    setProfileActionTopPx((current) =>
      current === nextProfileActionTop ? current : nextProfileActionTop,
    );
    setTagTopOffsetPx((current) => (current === nextTagTop ? current : nextTagTop));
    setOverlayHeightPx((current) => (current === nextOverlayHeight ? current : nextOverlayHeight));
  }, []);

  useEffect(() => {
    const cardNode = cardRef.current;
    const overlayNode = overlayRef.current;
    const nameLineNode = nameLineRef.current;

    if (!cardNode || !overlayNode) return;

    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return;

    const animationFrameHandle = requestAnimationFrame(() => {
      recalculateTagTopOffset();
    });

    const resizeObserver = new ResizeObserver(() => {
      recalculateTagTopOffset();
    });

    resizeObserver.observe(cardNode);
    resizeObserver.observe(overlayNode);
    if (nameLineNode) resizeObserver.observe(nameLineNode);
    window.addEventListener("resize", recalculateTagTopOffset);

    return () => {
      cancelAnimationFrame(animationFrameHandle);
      resizeObserver.disconnect();
      window.removeEventListener("resize", recalculateTagTopOffset);
    };
  }, [recalculateTagTopOffset]);

  const profileActionTop =
    profileActionTopPx === null
      ? `calc(100% - (var(--psychologist-overlay-height) + ${OVERLAY_FAVORITE_OFFSET}))`
      : `${profileActionTopPx}px`;

  return (
    <article
      className="relative w-[calc(100vw-54px)] overflow-hidden rounded-[14px] shadow-lectum-soft"
      ref={cardRef}
      style={
        {
          "--psychologist-overlay-height":
            overlayHeightPx === null ? PSYCHOLOGIST_OVERLAY_HEIGHT : `${overlayHeightPx}px`,
          aspectRatio: "9 / 16",
          maxWidth: "380px",
          minWidth: "320px",
          width: "min(calc(100vw - 54px), 380px, calc((100dvh - 170px) * 9 / 16))",
          left: "50%",
          transform: "translateX(-50%)",
        } as CardOverlayStyle
      }
    >
      <div className="absolute inset-0">
        {videoSrc ? (
          <CardVideo name={displayName} url={videoSrc} />
        ) : avatarSrc ? (
          <Image
            alt={displayName}
            className="h-full w-full object-cover object-top"
            fill
            sizes="(max-width: 430px) 92vw, 380px"
            src={avatarSrc}
            unoptimized={mediaIsPublic}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-muted text-[clamp(2.4rem,6vw,3.6rem)] font-extrabold text-primary">
            {getInitials(displayName)}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-30">
        <div
          className="pointer-events-auto absolute"
          style={{
            top: "3.2%",
            left: "4.5%",
          }}
        >
          <AvailabilityBadge available={psychologist.available_today} />
        </div>

        <FavoriteButton
          className="pointer-events-auto"
          buttonStyle={{
            right: "3.2%",
            position: "absolute",
            // mantém a distância relativa ao topo do overlay quando sua altura muda
            top: `calc(100% - (var(--psychologist-overlay-height) + ${OVERLAY_FAVORITE_OFFSET}))`,
            zIndex: 31,
          }}
          canFavorite={canFavorite}
          favoritePending={favoritePending}
          onToggleFavorite={onToggleFavorite}
          psychologist={psychologist}
        />

        <ShareButton
          buttonRef={shareButtonRef}
          className="pointer-events-auto z-31"
          buttonStyle={{
            right: "3.2%",
            position: "absolute",
            // mantém a distância relativa ao topo do overlay quando sua altura muda
            top: `calc(100% - (var(--psychologist-overlay-height) + ${OVERLAY_FAVORITE_OFFSET} - ${OVERLAY_SHARE_GAP}))`,
            zIndex: 31,
          }}
          route={route}
          psychologistName={displayName}
        />

        <Link
          aria-label={`Abrir perfil de ${displayName}`}
          className="pointer-events-auto absolute grid place-items-center rounded-full text-muted transition"
          href={route}
          style={{
            right: "3.2%",
            position: "absolute",
            top: profileActionTop,
            width: "clamp(38px, 10vw, 44px)",
            height: "clamp(38px, 10vw, 44px)",
            zIndex: 31,
          }}
        >
          <ChevronRight
            aria-hidden="true"
            className="text-muted"
            style={{ width: "clamp(22px, 8vw, 26px)", height: "clamp(22px, 8vw, 26px)" }}
          />
        </Link>

        {tags.length > 0 ? (
          <div
            className="pointer-events-none absolute flex flex-col-reverse"
            ref={tagContainerRef}
            style={{
              left: "3.2%",
              top:
                tagTopOffsetPx === null
                  ? `calc(100% - (var(--psychologist-overlay-height) + ${OVERLAY_TAGS_MARGIN_PX}px))`
                  : `${tagTopOffsetPx}px`,
              gap: OVERLAY_SIDE_BADGE_GAP,
              zIndex: 31,
            }}
          >
            {tags.map((tag, index) => (
              <span
                key={tag}
                className="inline-flex min-w-0 max-w-full items-center justify-center overflow-hidden rounded-full border border-media-foreground/80 bg-surface/55 py-0 text-center font-bold leading-none text-muted truncate whitespace-nowrap psychologist-tag-float"
                style={{
                  height: "clamp(26px, calc(22px + 2vw), 28px)",
                  minWidth: 0,
                  width: "fit-content",
                  maxWidth: "min(46vw, 178px)",
                  fontSize: "clamp(10px, 2.8vw, 12px)",
                  paddingLeft: "clamp(6px, 2vw, 10px)",
                  paddingRight: "clamp(6px, 2vw, 10px)",
                  animationDelay: `${index * 0.14}s`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 w-full overflow-hidden rounded-[14px] p-[4.5%]"
        ref={overlayRef}
        style={{
          minHeight: PSYCHOLOGIST_OVERLAY_HEIGHT,
          top: "auto",
          background: "color-mix(in srgb, var(--lectum-media-foreground) 38%, transparent)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid color-mix(in srgb, var(--lectum-media-foreground) 55%, transparent)",
          borderTop:
            "1px solid color-mix(in srgb, var(--lectum-media-foreground) 55%, transparent)",
          boxShadow:
            "inset 0 1px 0 color-mix(in srgb, var(--lectum-media-foreground) 65%, transparent), inset 0 -1px 0 color-mix(in srgb, var(--lectum-media-foreground) 18%, transparent), 0 -8px 24px color-mix(in srgb, var(--foreground) 10%, transparent)",
        }}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-[14px]"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--lectum-media-foreground) 72%, transparent) 0%, color-mix(in srgb, var(--lectum-media-foreground) 30%, transparent) 42%, color-mix(in srgb, var(--lectum-media-foreground) 14%, transparent) 100%)",
          }}
        />

        <div className="relative z-10 grid h-full w-full gap-2 text-foreground/90">
          <div className="relative">
            <div className="min-w-0 flex-1" style={{ paddingRight: "44px" }}>
              <h2
                ref={nameLineRef}
                className="line-clamp-2 min-h-[24px] font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: "clamp(18px, 5vw, 22px)",
                  lineHeight: "clamp(24px, 5.4vw, 27px)",
                }}
              >
                <span className="line-clamp-2 inline-flex min-w-0 items-center gap-1.5">
                  {displayName}
                  {psychologist.verified ? (
                    <VerifiedBadgeIcon aria-hidden="true" className="inline h-[16px] w-[16px]" />
                  ) : null}
                </span>
              </h2>

              <div
                className="mt-1 w-full truncate text-media-background"
                style={{
                  fontSize: "clamp(10px, 3vw, 12px)",
                  lineHeight: "1.15",
                }}
              >
                <span>{getSubinfo(psychologist)}</span>
              </div>
            </div>
          </div>

          <div
            className="mt-auto flex w-full items-center justify-start"
            style={{ marginTop: "clamp(14px, 3vw, 18px)" }}
          >
            {psychologist.whatsapp_url ? (
              <PsychologistWhatsAppRedirectButton
                className="pointer-events-auto h-[clamp(44px,12vw,52px)] min-h-[clamp(44px,12vw,52px)] w-full min-w-0 rounded-[999px] bg-success px-4 text-[15px] font-medium leading-none text-primary-foreground hover:bg-success/90"
                psychologist={{
                  avatar: psychologist.avatar,
                  crp: psychologist.crp,
                  id: psychologist.id,
                  name: displayName,
                  typeLabel: getPsychologistTypeLabel(psychologist.gender),
                  whatsappName,
                  whatsappUrl: psychologist.whatsapp_url,
                }}
              >
                <PsychologistWhatsAppButtonContent label={`Fale com ${whatsappName}`} />
              </PsychologistWhatsAppRedirectButton>
            ) : (
              <Button
                className="pointer-events-auto h-[clamp(44px,12vw,52px)] min-h-[clamp(44px,12vw,52px)] w-full rounded-[999px] bg-success px-4 text-[15px] font-medium leading-none text-primary-foreground"
                disabled
                type="button"
              >
                <span className="inline-flex min-w-0 max-w-full items-center justify-center gap-2 whitespace-nowrap">
                  <WhatsAppIcon
                    className="h-5 w-5 shrink-0 text-primary-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate whitespace-nowrap text-center leading-none">
                    WhatsApp indisponível
                  </span>
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export type { PsychologistCardItem } from "./psychologist-card-support";

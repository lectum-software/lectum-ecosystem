"use client";

import { ChevronRight, Heart, Pause, Play, Share2, VolumeX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  type MouseEvent,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppButtonContent,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { playVideoWithSound } from "@/lib/video-playback";
import { Button } from "@/registry/new-york-v4/ui/button";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";

export type PsychologistCardItem = {
  id: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  video_url?: string | null;
  video_cover_url?: string | null;
  crp?: string | null;
  gender?: string | null;
  modality: string | null;
  rating_avg: number;
  rating_count: number;
  verified: boolean;
  available_today?: boolean;
  formation_years?: number | null;
  discount_first_session?: boolean;
  social_value?: boolean;
  accepts_insurance?: boolean;
  show_experience_tag?: boolean;
  whatsapp_name?: string | null;
  whatsapp_url?: string | null;
  favorited: boolean;
  specialties: Array<{ name: string }>;
  services: Array<{ name: string }>;
};

type PsychologistCardProps = {
  canFavorite?: boolean;
  favoritePending?: boolean;
  psychologist: PsychologistCardItem;
  onToggleFavorite: (psychologist: PsychologistCardItem) => void;
};

type AudioPreferenceListener = (soundEnabled: boolean) => void;

let globalSoundEnabled = false;
const audioPreferenceListeners = new Set<AudioPreferenceListener>();

const subscribeAudioPreference = (listener: AudioPreferenceListener) => {
  listener(globalSoundEnabled);
  audioPreferenceListeners.add(listener);

  return () => {
    audioPreferenceListeners.delete(listener);
  };
};

const setGlobalSoundEnabled = (next: boolean) => {
  if (globalSoundEnabled === next) return;

  globalSoundEnabled = next;

  for (const listener of audioPreferenceListeners) {
    listener(next);
  }
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0.0 (0)";

  return `${(ratingAvg / 100).toFixed(1)} (${ratingCount})`;
};

const getPsychologistDisplayName = (psychologist: PsychologistCardItem) =>
  normalizeProfessionalDisplayName(psychologist.name) || psychologist.name;

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "PSICÓLOGA" : "PSICÓLOGO";
};

const getPsychologistTypeLabel = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psic\u00f3loga" : "Psic\u00f3logo";
};

const PSYCHOLOGIST_OVERLAY_HEIGHT = "26%";
const OVERLAY_FAVORITE_OFFSET = "17%";
const OVERLAY_SHARE_GAP = "clamp(48px, 12vw, 54px)";
const OVERLAY_SIDE_BADGE_GAP = "clamp(8px, 2vw, 10px)";
const OVERLAY_TAGS_MARGIN_PX = 8;
type CardOverlayStyle = CSSProperties & { "--psychologist-overlay-height": string };

const getSubinfo = (psychologist: PsychologistCardItem) => {
  const role = getPsychologistTitle(psychologist.gender);
  const years = psychologist.formation_years ?? 10;
  const rating = formatRating(psychologist.rating_avg, psychologist.rating_count);

  if (psychologist.show_experience_tag === false) {
    return `${role} • ★ ${rating}`;
  }

  return `${role} • ${years} ANOS EXP • ★ ${rating}`;
};

const buildBenefitTags = (psychologist: PsychologistCardItem) => {
  const tags: string[] = [];

  if (psychologist.accepts_insurance) {
    tags.push("Aceita convênios");
  }

  if (psychologist.social_value) {
    tags.push("Valor social");
  }

  if (psychologist.discount_first_session) {
    tags.push("Desconto 1ª sessão");
  }

  return tags;
};

const AvailabilityBadge = ({ available }: { available?: boolean }) => {
  if (!available) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full text-[10px] font-semibold leading-none text-[#22c55e]"
      style={{
        height: "clamp(22px, 3.6vw, 26px)",
        paddingLeft: "clamp(10px, 3vw, 14px)",
        paddingRight: "clamp(10px, 3vw, 14px)",
        background: "rgba(255, 255, 255, 0.92)",
        borderRadius: "999px",
        zIndex: 5,
      }}
    >
      <span
        className="h-2 w-2 rounded-full bg-[#2ecc71] motion-safe:animate-pulse"
        aria-hidden="true"
      />
      Disponível hoje
    </span>
  );
};

const FavoriteButton = ({
  canFavorite = true,
  favoritePending,
  onToggleFavorite,
  psychologist,
  buttonStyle,
  className,
}: {
  canFavorite?: boolean;
  favoritePending?: boolean;
  onToggleFavorite: (psychologist: PsychologistCardItem) => void;
  psychologist: PsychologistCardItem;
  buttonStyle?: CSSProperties;
  className?: string;
}) => {
  const isFavorited = psychologist.favorited;
  const displayName = getPsychologistDisplayName(psychologist);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isAnimating) return;

    const timer = window.setTimeout(() => {
      setIsAnimating(false);
    }, 420);

    return () => {
      clearTimeout(timer);
    };
  }, [isAnimating]);

  const handleFavoriteClick = () => {
    if (favoritePending || !canFavorite) return;

    setIsAnimating(true);
    onToggleFavorite(psychologist);
  };

  return (
    <button
      aria-label={
        !canFavorite
          ? "Favoritos disponíveis apenas para usuários autenticados"
          : psychologist.favorited
            ? `Remover ${displayName} dos favoritos`
            : `Favoritar ${displayName}`
      }
      aria-pressed={psychologist.favorited}
      className={cn(
        "grid place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60",
        "duration-300",
        isAnimating ? "scale-110" : "scale-100",
        isFavorited ? "bg-[#fee2e2] text-[#ef4444]" : "bg-[rgba(255,255,255,0.94)] text-[#64748b]",
        className,
      )}
      disabled={favoritePending || !canFavorite}
      onClick={handleFavoriteClick}
      style={{
        width: "clamp(38px, 10vw, 44px)",
        height: "clamp(38px, 10vw, 44px)",
        borderRadius: "999px",
        zIndex: 5,
        ...buttonStyle,
      }}
      title={!canFavorite ? "Favoritos disponíveis apenas para usuários autenticados" : undefined}
      type="button"
    >
      <Heart
        aria-hidden="true"
        className={cn(
          "h-[22px] w-[22px] transition-transform duration-300",
          isAnimating ? "scale-125" : "scale-100",
          isFavorited ? "fill-[#ef4444] stroke-[#ef4444]" : "fill-none stroke-[#64748b]",
        )}
      />
    </button>
  );
};

const ShareButton = ({
  route,
  psychologistName,
  buttonStyle,
  className,
  buttonRef,
}: {
  route: string;
  psychologistName: string;
  buttonRef?: Ref<HTMLButtonElement>;
  buttonStyle?: CSSProperties;
  className?: string;
}) => {
  const handleShare = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const shareUrl = new URL(route, window.location.origin).toString();

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Perfil de ${psychologistName}`,
          text: `Confira o perfil de ${psychologistName} na Lectum.`,
          url: shareUrl,
        });

        return;
      } catch {
        // ignore
      }
    }

    await navigator.clipboard?.writeText(shareUrl);
  };

  return (
    <button
      ref={buttonRef}
      aria-label={`Compartilhar perfil de ${psychologistName}`}
      className={cn(
        "grid place-items-center rounded-full bg-[rgba(255,255,255,0.94)] text-[#334155] transition",
        className,
      )}
      onClick={handleShare}
      style={{
        width: "clamp(38px, 10vw, 44px)",
        height: "clamp(38px, 10vw, 44px)",
        borderRadius: "999px",
        zIndex: 6,
        ...buttonStyle,
      }}
      type="button"
    >
      <Share2 aria-hidden="true" className="h-5 w-5" />
    </button>
  );
};

const CardVideo = ({
  name,
  poster,
  url,
}: {
  name: string;
  poster?: string | null;
  url: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [focused, setFocused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(globalSoundEnabled);
  const [controlMode, setControlMode] = useState<"hidden" | "media">(
    globalSoundEnabled ? "hidden" : "media",
  );
  const [videoPoster, setVideoPoster] = useState<string | null>(null);
  const posterExtractionStarted = useRef(false);
  const userInitiatedPlayRef = useRef(false);
  const controlsAutoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearControlsAutoHideTimeout = useCallback(() => {
    if (controlsAutoHideTimeoutRef.current) {
      clearTimeout(controlsAutoHideTimeoutRef.current);
      controlsAutoHideTimeoutRef.current = null;
    }
  }, []);

  const onPlay = () => {
    if (userInitiatedPlayRef.current) {
      setControlMode("hidden");
      userInitiatedPlayRef.current = false;
    }

    setPlaying(true);
  };

  const onPause = () => {
    clearControlsAutoHideTimeout();
    setPlaying(false);
  };

  const onEnded = () => {
    clearControlsAutoHideTimeout();
    setPlaying(false);
  };

  const unmuteVideo = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    if (soundEnabled && !currentVideo.muted && currentVideo.volume > 0) return;

    setControlMode("hidden");

    setSoundEnabled(true);
    setGlobalSoundEnabled(true);
    clearControlsAutoHideTimeout();

    userInitiatedPlayRef.current = true;
    void playVideoWithSound(currentVideo);
  };

  const togglePlayback = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    if (currentVideo.paused) {
      userInitiatedPlayRef.current = true;
      setControlMode("hidden");
      clearControlsAutoHideTimeout();
      void playVideoWithSound(currentVideo);
    } else {
      clearControlsAutoHideTimeout();
      currentVideo.pause();
    }
  };

  const handleVideoTap = () => {
    togglePlayback();
  };

  const handleVideoPosterExtraction = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo || videoPoster || posterExtractionStarted.current) return;
    if (
      currentVideo.readyState < 1 ||
      !Number.isFinite(currentVideo.duration) ||
      currentVideo.duration <= 0
    )
      return;

    posterExtractionStarted.current = true;
    const currentTime = currentVideo.currentTime;
    const wasPlaying = !currentVideo.paused;
    const captureTime =
      currentVideo.duration > 1 ? 0.1 : Math.max(0.001, currentVideo.duration * 0.3);
    const restorePlayback = () => {
      if (Number.isFinite(currentTime)) {
        try {
          currentVideo.currentTime = currentTime;
        } catch {
          // ignore
        }
      }

      if (wasPlaying) {
        void currentVideo.play().catch(() => {});
      }
    };

    const onSeeked = () => {
      currentVideo.removeEventListener("seeked", onSeeked);
      posterExtractionStarted.current = false;

      try {
        const width = currentVideo.videoWidth;
        const height = currentVideo.videoHeight;

        if (!width || !height) return;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.width = width;
        canvas.height = height;
        context.drawImage(currentVideo, 0, 0, width, height);

        const nextPoster = canvas.toDataURL("image/jpeg", 0.74);
        setVideoPoster(nextPoster);
      } catch {
        // Ignore when browser/CORS restrictions prevent poster extraction.
      } finally {
        restorePlayback();
      }
    };

    currentVideo.addEventListener("seeked", onSeeked, { once: true });
    currentVideo.currentTime = captureTime;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(0);
        const ratio = entry?.intersectionRatio ?? 0;
        const nextFocused = Boolean(entry?.isIntersecting) && ratio >= 0.35;

        setFocused(nextFocused);
        setControlMode(nextFocused ? "media" : "hidden");
      },
      {
        threshold: [0, 0.35],
      },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return subscribeAudioPreference(setSoundEnabled);
  }, []);

  useEffect(() => {
    return () => {
      clearControlsAutoHideTimeout();
    };
  }, [clearControlsAutoHideTimeout]);

  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    currentVideo.muted = !soundEnabled;

    if (!focused) {
      currentVideo.pause();
      return;
    }

    void currentVideo.play().catch(() => {
      setPlaying(false);
    });
  }, [focused, soundEnabled]);

  const showPlaybackControls = controlMode === "media";

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-surface-muted">
      <button
        aria-label={`Abrir controles do vídeo de ${name}`}
        className="absolute inset-0 z-[5] h-full w-full cursor-default border-0 bg-transparent p-0"
        onClick={handleVideoTap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleVideoTap();
          }
        }}
        type="button"
      />
      <video
        aria-label={`Vídeo de apresentação de ${name}`}
        className="pointer-events-none h-full w-full bg-black object-cover object-top"
        controls={false}
        loop
        muted
        crossOrigin="anonymous"
        onLoadedMetadata={handleVideoPosterExtraction}
        poster={videoPoster || poster || undefined}
        onPause={onPause}
        onPlay={onPlay}
        onEnded={onEnded}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={url}
      />

      {focused && showPlaybackControls && (
        <div className="absolute left-1/2 top-[46%] z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
          {!soundEnabled ? (
            <button
              aria-label={`Desmutar o vídeo de ${name}`}
              className="z-10 grid h-[52px] w-[52px] place-items-center rounded-full border-4 border-white bg-black/25"
              onClick={(event) => {
                event.stopPropagation();
                unmuteVideo();
              }}
              type="button"
            >
              <VolumeX aria-hidden="true" className="ml-[1px] h-6 w-6 text-white/90" />
            </button>
          ) : (
            <button
              aria-label={playing ? "Pausar vídeo" : "Retomar vídeo"}
              className="z-10 grid h-[52px] w-[52px] place-items-center rounded-full border-4 border-white bg-black/25"
              onClick={(event) => {
                event.stopPropagation();
                togglePlayback();
              }}
              type="button"
            >
              {playing ? (
                <Pause aria-hidden="true" className="h-6 w-6 text-white/90" />
              ) : (
                <Play aria-hidden="true" className="ml-[1px] h-6 w-6 text-white/90" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
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
  const whatsappName =
    psychologist.whatsapp_name ||
    getPsychologistWhatsappDisplayName({ id: psychologist.id, name: displayName });
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
      className="relative w-[calc(100vw-54px)] overflow-hidden rounded-[14px] shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
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
          className="pointer-events-auto absolute grid place-items-center rounded-full text-[#334155] transition"
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
            className="text-[#334155]"
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
                className="inline-flex min-w-0 max-w-full items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white/55 py-0 text-center font-bold leading-none text-[#334155] truncate whitespace-nowrap psychologist-tag-float"
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
          background: "rgba(255, 255, 255, 0.38)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.55)",
          borderTop: "1px solid rgba(255,255,255,0.55)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(255,255,255,0.18), 0 -8px 24px rgba(15,23,42,0.10)",
        }}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-[14px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.30) 42%, rgba(255,255,255,0.14) 100%)",
          }}
        />

        <div className="relative z-10 grid h-full w-full gap-2 text-[color:rgba(15,23,42,0.9)]">
          <div className="relative">
            <div className="min-w-0 flex-1" style={{ paddingRight: "44px" }}>
              <h2
                ref={nameLineRef}
                className="line-clamp-2 min-h-[24px] font-semibold tracking-tight text-[#0f172a]"
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
                className="mt-1 w-full truncate text-[#000]"
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
                className="pointer-events-auto h-[clamp(44px,12vw,52px)] min-h-[clamp(44px,12vw,52px)] w-full min-w-0 rounded-[999px] bg-[#22C55E] px-4 text-[15px] font-medium leading-none text-white hover:bg-[#22C55E]/90"
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
                className="pointer-events-auto h-[clamp(44px,12vw,52px)] min-h-[clamp(44px,12vw,52px)] w-full rounded-[999px] bg-[#22C55E] px-4 text-[15px] font-medium leading-none text-white"
                disabled
                type="button"
              >
                <span className="inline-flex min-w-0 max-w-full items-center justify-center gap-2 whitespace-nowrap">
                  <WhatsAppIcon className="h-5 w-5 shrink-0 text-white" aria-hidden="true" />
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

"use client";

import {
  ChevronRight,
  Heart,
  Pause,
  Play,
  Share2,
  ShieldCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from "react";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

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

const getHonorificName = (psychologist: PsychologistCardItem) => {
  if (!psychologist.verified) return psychologist.name;

  const gender = psychologist.gender?.toLowerCase();
  const honorific = gender === "feminino" ? "Dra." : "Dr.";

  return `${honorific} ${psychologist.name}`;
};

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "PSICÃƒâ€œLOGA" : "PSICÃƒâ€œLOGO";
};

const getSubinfo = (psychologist: PsychologistCardItem) => {
  const role = getPsychologistTitle(psychologist.gender);
  const years = psychologist.formation_years ?? 10;
  const rating = formatRating(psychologist.rating_avg, psychologist.rating_count);

  return `${role} Ã¢â‚¬Â¢ ${years} ANOS EXP Ã¢â‚¬Â¢ Ã¢Ëœâ€¦ ${rating}`;
};

const buildBenefitTags = (psychologist: PsychologistCardItem) => {
  const tags: string[] = [];

  if (psychologist.accepts_insurance) {
    tags.push("Aceita convÃƒÂªnios");
  }

  if (psychologist.social_value) {
    tags.push("Valor social");
  }

  if (psychologist.discount_first_session) {
    tags.push("Desconto 1Ã‚Âª sessÃƒÂ£o");
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
      <span className="h-2 w-2 rounded-full bg-[#2ecc71]" aria-hidden="true" />
      DisponÃƒÂ­vel hoje
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

  return (
    <button
      aria-label={
        !canFavorite
          ? "Favoritos disponÃƒÂ­veis apenas para usuÃƒÂ¡rios autenticados"
          : psychologist.favorited
            ? `Remover ${psychologist.name} dos favoritos`
            : `Favoritar ${psychologist.name}`
      }
      aria-pressed={psychologist.favorited}
      className={cn(
        "grid place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60",
        isFavorited ? "bg-[#fee2e2] text-[#ef4444]" : "bg-[rgba(255,255,255,0.94)] text-[#64748b]",
        className,
      )}
      disabled={favoritePending || !canFavorite}
      onClick={() => onToggleFavorite(psychologist)}
      style={{
        width: "clamp(38px, 10vw, 44px)",
        height: "clamp(38px, 10vw, 44px)",
        borderRadius: "999px",
        zIndex: 5,
        ...buttonStyle,
      }}
      title={
        !canFavorite ? "Favoritos disponÃƒÂ­veis apenas para usuÃƒÂ¡rios autenticados" : undefined
      }
      type="button"
    >
      <Heart
        aria-hidden="true"
        className={cn(
          "h-[22px] w-[22px]",
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
}: {
  route: string;
  psychologistName: string;
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
  const [controlMode, setControlMode] = useState<"hidden" | "volume" | "media">("hidden");
  const [videoPoster, setVideoPoster] = useState<string | null>(null);
  const posterExtractionStarted = useRef(false);

  const onPlay = () => {
    setPlaying(true);
  };

  const onPause = () => {
    setPlaying(false);
  };

  const onEnded = () => {
    setPlaying(false);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setGlobalSoundEnabled(next);

    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    currentVideo.muted = !next;
    void currentVideo.play();

    setControlMode("hidden");
  };

  const togglePlayback = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    if (currentVideo.paused) {
      void currentVideo.play();
    } else {
      currentVideo.pause();
    }
  };

  const handleVideoClick = () => {
    if (!focused) return;

    setControlMode(soundEnabled ? "media" : "volume");
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
        setControlMode(nextFocused ? "volume" : "hidden");
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

  const showVolumeControl = controlMode === "volume";
  const showPlaybackControls = controlMode === "media";

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-surface-muted">
      <button
        aria-label={`Abrir controles do vÃƒÂ­deo de ${name}`}
        className="absolute inset-0 z-0 h-full w-full cursor-default border-0 bg-transparent p-0"
        onClick={handleVideoClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleVideoClick();
          }
        }}
        type="button"
      />
      <video
        aria-label={`VÃƒÂ­deo de apresentaÃƒÂ§ÃƒÂ£o de ${name}`}
        className="h-full w-full bg-black object-cover object-top"
        controls={false}
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

      {focused && showVolumeControl && (
        <button
          aria-label={`Controlar Ã¡udio do vÃƒÂ­deo de ${name}`}
          className="absolute left-1/2 top-[56%] z-10 -translate-x-1/2 -translate-y-1/2"
          onClick={(event) => {
            event.stopPropagation();
            toggleSound();
          }}
          style={{
            width: "52px",
            height: "52px",
          }}
          type="button"
        >
          <span className="grid h-full w-full place-items-center rounded-full border-4 border-white">
            {soundEnabled ? (
              <Volume2 aria-hidden="true" className="ml-[1px] h-5 w-5 text-white/90" />
            ) : (
              <VolumeX aria-hidden="true" className="ml-[1px] h-5 w-5 text-white/90" />
            )}
          </span>
        </button>
      )}

      {focused && showPlaybackControls && (
        <div className="absolute left-1/2 top-[56%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
          <button
            aria-label={playing ? "Pausar vÃƒÂ­deo" : "Retomar vÃƒÂ­deo"}
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

          <button
            aria-label={`Controlar Ã¡udio do vÃƒÂ­deo de ${name}`}
            className="z-10 grid h-[52px] w-[52px] place-items-center rounded-full border-4 border-white bg-black/25"
            onClick={(event) => {
              event.stopPropagation();
              toggleSound();
            }}
            type="button"
          >
            {soundEnabled ? (
              <Volume2 aria-hidden="true" className="ml-[1px] h-6 w-6 text-white/90" />
            ) : (
              <VolumeX aria-hidden="true" className="ml-[1px] h-6 w-6 text-white/90" />
            )}
          </button>
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
  const displayName = getHonorificName(psychologist);
  const route = `/app/psychologist/${psychologist.id}`;

  return (
    <article
      className="relative mx-auto w-[calc(100vw-54px)] overflow-hidden rounded-[14px] shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
      style={{
        aspectRatio: "9 / 16",
        maxWidth: "380px",
        minWidth: "320px",
        width: "min(calc(100vw - 54px), 380px, calc((100dvh - 170px) * 9 / 16))",
      }}
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
            {getInitials(psychologist.name)}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
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
            top: "57%",
            right: "3.2%",
            position: "absolute",
          }}
          canFavorite={canFavorite}
          favoritePending={favoritePending}
          onToggleFavorite={onToggleFavorite}
          psychologist={psychologist}
        />

        <ShareButton
          className="pointer-events-auto"
          buttonStyle={{
            top: "calc(57% + clamp(48px, 12vw, 54px))",
            right: "3.2%",
            position: "absolute",
          }}
          route={route}
          psychologistName={displayName}
        />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-10 w-full min-h-[26%] overflow-hidden rounded-[14px] p-[4.5%]"
        style={{
          background: "rgba(255, 255, 255, 0.38)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[1rem] font-extrabold leading-[1.15] tracking-tight text-[#0f172a] sm:text-[1.05rem]">
                <span className="line-clamp-2 inline-flex min-w-0 items-center gap-1.5">
                  {displayName}
                  {psychologist.verified ? (
                    <VerifiedBadgeIcon aria-hidden="true" className="inline h-[16px] w-[16px]" />
                  ) : null}
                </span>
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-extrabold tracking-[0.8px] text-[#000]">
                <span>{getSubinfo(psychologist)}</span>
              </div>
            </div>

            <Link
              aria-label={`Abrir perfil de ${psychologist.name}`}
              className="grid h-9 w-9 shrink-0 place-items-center text-[#334155] transition"
              href={route}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/55 px-2 py-0.5 text-[0.64rem] font-bold text-[#334155]"
              >
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-start">
            {psychologist.whatsapp_url ? (
              <Button
                asChild
                className="h-[clamp(36px,5vw,44px)] w-[323px] rounded-full bg-[#22C55E] text-[15px] font-medium text-white hover:bg-[#22C55E]/90"
              >
                <a
                  className="grid h-full w-full place-items-center gap-2"
                  href={psychologist.whatsapp_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                  Chamar no WhatsApp
                </a>
              </Button>
            ) : (
              <Button
                className="h-[clamp(36px,5vw,44px)] w-[323px] rounded-full bg-[#22C55E] text-[15px] font-medium text-white"
                disabled
                type="button"
              >
                <span className="inline-flex w-full items-center justify-center gap-2">
                  <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                  WhatsApp indisponÃƒÂ­vel
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

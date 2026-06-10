"use client";

import { ChevronRight, Heart, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

  if (
    psychologist.show_experience_tag !== false &&
    psychologist.verified &&
    psychologist.formation_years
  ) {
    tags.push(`${psychologist.formation_years} anos de experiÃƒÂªncia`);
  }

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
}: {
  canFavorite?: boolean;
  favoritePending?: boolean;
  onToggleFavorite: (psychologist: PsychologistCardItem) => void;
  psychologist: PsychologistCardItem;
}) => (
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
      "grid place-items-center rounded-full bg-[rgba(255,255,255,0.92)] text-[#64748b] transition disabled:cursor-not-allowed disabled:opacity-60",
    )}
    disabled={favoritePending || !canFavorite}
    onClick={() => onToggleFavorite(psychologist)}
    style={{
      width: "clamp(38px, 10.5vw, 44px)",
      height: "clamp(38px, 10.5vw, 44px)",
      borderRadius: "999px",
      zIndex: 5,
    }}
    title={
      !canFavorite ? "Favoritos disponÃƒÂ­veis apenas para usuÃƒÂ¡rios autenticados" : undefined
    }
    type="button"
  >
    <Heart aria-hidden="true" className={cn("h-[22px] w-[22px]", "fill-none stroke-[#64748b]")} />
  </button>
);

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
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(0);
        const ratio = entry?.intersectionRatio ?? 0;
        setFocused(Boolean(entry?.isIntersecting) && ratio >= 0.35);
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

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-surface-muted">
      <video
        aria-label={`VÃƒÂ­deo de apresentaÃƒÂ§ÃƒÂ£o de ${name}`}
        className="h-full w-full bg-black object-cover object-top"
        controls={playing}
        muted
        onPause={onPause}
        onPlay={onPlay}
        onEnded={onEnded}
        playsInline
        preload="metadata"
        poster={poster || undefined}
        ref={videoRef}
        src={url}
      />

      {focused ? (
        <button
          aria-label={`Controlar Ã¡udio do vÃƒÂ­deo de ${name}`}
          className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2"
          onClick={toggleSound}
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
      ) : null}
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
  const videoCoverSrc = resolvePublicMediaUrl(psychologist.video_cover_url);
  const videoSrc = psychologist.verified ? resolvePublicMediaUrl(psychologist.video_url) : null;
  const mediaSrc = videoCoverSrc || avatarSrc;
  const mediaIsPublic = isPublicMediaUrl(mediaSrc);
  const tags = buildBenefitTags(psychologist);
  const displayName = getHonorificName(psychologist);
  const route = `/app/psychologist/${psychologist.id}`;

  return (
    <article
      className="relative mx-auto w-[calc(100vw-54px)] overflow-hidden rounded-[14px]"
      style={{
        aspectRatio: "9 / 16",
        maxWidth: "380px",
        minWidth: "320px",
        width: "min(calc(100vw - 54px), 380px, calc((100dvh - 170px) * 9 / 16))",
      }}
    >
      <div className="absolute inset-0">
        {videoSrc ? (
          <CardVideo name={displayName} poster={mediaSrc} url={videoSrc} />
        ) : mediaSrc ? (
          <Image
            alt={displayName}
            className="h-full w-full object-cover object-top"
            fill
            sizes="(max-width: 430px) 92vw, 380px"
            src={mediaSrc}
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

        <div
          className="pointer-events-auto absolute"
          style={{
            top: "3.2%",
            right: "4.5%",
          }}
        >
          <FavoriteButton
            canFavorite={canFavorite}
            favoritePending={favoritePending}
            onToggleFavorite={onToggleFavorite}
            psychologist={psychologist}
          />
        </div>
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
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/85 text-[#334155] transition hover:bg-white"
              href={route}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 2).map((tag) => (
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
                className="h-[39px] w-[323px] rounded-full bg-[#22C55E] text-[15px] font-medium text-white hover:bg-[#22C55E]/90"
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
                className="h-[39px] w-[323px] rounded-full bg-[#22C55E] text-[15px] font-medium text-white"
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

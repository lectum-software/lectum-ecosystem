"use client";

import {
  BadgePercent,
  BriefcaseBusiness,
  ChevronRight,
  Heart,
  HeartHandshake,
  Play,
  ShieldCheck,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
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

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0 (0)";

  return `${(ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} (${ratingCount})`;
};

const getHonorificName = (psychologist: PsychologistCardItem) => {
  if (!psychologist.verified) return psychologist.name;

  const gender = psychologist.gender?.toLowerCase();
  const honorific = gender === "feminino" ? "Dra." : "Dr.";

  return `${honorific} ${psychologist.name}`;
};

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psicóloga" : "Psicólogo";
};

const buildBenefitTags = (psychologist: PsychologistCardItem) => {
  const tags: Array<{
    icon: typeof BriefcaseBusiness;
    label: string;
  }> = [];

  if (
    psychologist.show_experience_tag !== false &&
    psychologist.verified &&
    psychologist.formation_years
  ) {
    tags.push({
      icon: BriefcaseBusiness,
      label: `${psychologist.formation_years} anos de experiência`,
    });
  }

  if (psychologist.accepts_insurance) {
    tags.push({ icon: ShieldCheck, label: "Aceita convênios" });
  }

  if (psychologist.social_value) {
    tags.push({ icon: HeartHandshake, label: "Valor social" });
  }

  if (psychologist.discount_first_session) {
    tags.push({ icon: BadgePercent, label: "Desconto 1ª sessão" });
  }

  return tags;
};

const AvailabilityBadge = ({ available }: { available?: boolean }) => {
  if (!available) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-2.5 py-1 text-[0.68rem] font-extrabold text-[#16A34A] shadow-[0_8px_20px_rgb(15_23_42_/_14%)] backdrop-blur-sm">
      <span
        className="h-2.5 w-2.5 rounded-full bg-[#22C55E] motion-safe:animate-pulse"
        aria-hidden="true"
      />
      Disponível hoje
    </span>
  );
};

const FavoriteButton = ({
  className,
  canFavorite = true,
  favoritePending,
  onToggleFavorite,
  psychologist,
}: {
  className?: string;
  canFavorite?: boolean;
  favoritePending?: boolean;
  onToggleFavorite: (psychologist: PsychologistCardItem) => void;
  psychologist: PsychologistCardItem;
}) => (
  <button
    aria-label={
      !canFavorite
        ? "Favoritos disponíveis apenas para usuários autenticados"
        : psychologist.favorited
          ? `Remover ${psychologist.name} dos favoritos`
          : `Favoritar ${psychologist.name}`
    }
    aria-pressed={psychologist.favorited}
    className={cn(
      "grid h-12 w-12 place-items-center rounded-full border border-border bg-surface/95 text-muted shadow-[var(--lectum-shadow-soft)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60",
      psychologist.favorited && "border-red-200 bg-red-50 text-red-500",
      className,
    )}
    disabled={favoritePending || !canFavorite}
    onClick={() => onToggleFavorite(psychologist)}
    title={!canFavorite ? "Favoritos disponíveis apenas para usuários autenticados" : undefined}
    type="button"
  >
    <Heart className={cn("h-6 w-6", psychologist.favorited && "fill-current")} aria-hidden="true" />
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    setPlaying(true);
    void videoRef.current?.play();
  };

  return (
    <div className="relative aspect-video overflow-hidden bg-surface-muted">
      {/* biome-ignore lint/a11y/useMediaCaption: vídeos enviados por profissionais ainda não possuem trilha de legenda nesta etapa. */}
      <video
        aria-label={`Vídeo de apresentação de ${name}`}
        className="h-full w-full object-cover"
        controls={playing}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        playsInline
        preload="metadata"
        poster={poster || undefined}
        ref={videoRef}
        src={url}
      />
      {!playing ? (
        <button
          aria-label={`Reproduzir vídeo de ${name}`}
          className="absolute inset-0 grid place-items-center bg-slate-950/5 text-white transition hover:bg-slate-950/15"
          onClick={play}
          type="button"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full border-4 border-white/90 bg-white/20 text-white shadow-lg backdrop-blur-sm">
            <Play className="ml-1 h-8 w-8 fill-current" aria-hidden="true" />
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
  const avatarIsPublicMedia = isPublicMediaUrl(psychologist.avatar);
  const videoSrc = psychologist.verified ? resolvePublicMediaUrl(psychologist.video_url) : null;
  const videoCoverSrc = resolvePublicMediaUrl(psychologist.video_cover_url);
  const tags = buildBenefitTags(psychologist);
  const displayName = getHonorificName(psychologist);
  const summary =
    psychologist.headline ||
    psychologist.bio ||
    "Perfil profissional publicado na Lectum com informações públicas do psicólogo.";

  return (
    <article className="w-full max-w-[390px] overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_14px_32px_rgb(15_23_42_/_10%)] transition hover:border-border-strong hover:shadow-[0_18px_38px_rgb(15_23_42_/_12%)]">
      {videoSrc ? (
        <div className="relative">
          <CardVideo name={psychologist.name} poster={videoCoverSrc} url={videoSrc} />
          <div className="absolute left-4 top-4">
            <AvailabilityBadge available={psychologist.available_today} />
          </div>
          <FavoriteButton
            className="absolute right-4 top-4"
            canFavorite={canFavorite}
            favoritePending={favoritePending}
            onToggleFavorite={onToggleFavorite}
            psychologist={psychologist}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <AvailabilityBadge available={psychologist.available_today} />
          <FavoriteButton
            canFavorite={canFavorite}
            favoritePending={favoritePending}
            onToggleFavorite={onToggleFavorite}
            psychologist={psychologist}
          />
        </div>
      )}

      <div className="grid gap-4 p-5">
        <div className="flex items-center gap-3">
          {!videoSrc ? (
            <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-lg font-bold text-primary">
              {avatarSrc ? (
                <Image
                  alt={psychologist.name}
                  className="object-cover"
                  fill
                  sizes="56px"
                  src={avatarSrc}
                  unoptimized={avatarIsPublicMedia}
                />
              ) : (
                getInitials(psychologist.name)
              )}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="mt-0.5 min-w-0">
              <h2 className="min-w-0 text-[1.22rem] font-extrabold leading-6 text-foreground">
                <span className="line-clamp-2 block min-w-0 break-words">
                  <span>{displayName}</span>
                  {psychologist.verified ? (
                    <VerifiedBadgeIcon
                      aria-hidden="true"
                      className="ml-1 inline h-[18px] w-[18px]"
                    />
                  ) : null}
                </span>
              </h2>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[0.66rem] font-extrabold uppercase tracking-[0.16em] text-subtle">
                {getPsychologistTitle(psychologist.gender)}
              </span>
              <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-muted">
                <Star className="h-3.5 w-3.5 fill-[#FACC15] text-[#FACC15]" aria-hidden="true" />
                {formatRating(psychologist.rating_avg, psychologist.rating_count)}
              </span>
            </div>
          </div>

          <Link
            aria-label={`Abrir perfil de ${psychologist.name}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-subtle transition hover:bg-primary-soft hover:text-primary"
            href={`/app/psychologist/${psychologist.id}`}
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>

        <p className="line-clamp-4 text-[0.86rem] leading-6 text-muted">{summary}</p>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const Icon = tag.icon;

              return (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[0.68rem] font-bold text-muted"
                  key={tag.label}
                >
                  <Icon className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
                  {tag.label}
                </span>
              );
            })}
          </div>
        ) : null}

        {psychologist.whatsapp_url ? (
          <Button
            asChild
            className="h-12 rounded-xl bg-[#22C55E] text-sm font-extrabold text-white hover:bg-[#22C55E]/90"
          >
            <a href={psychologist.whatsapp_url} rel="noreferrer" target="_blank">
              <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
              Chamar no WhatsApp
            </a>
          </Button>
        ) : (
          <Button
            className="h-12 rounded-xl bg-[#22C55E] text-sm font-extrabold text-white"
            disabled
            type="button"
          >
            <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
            WhatsApp indisponível
          </Button>
        )}
      </div>
    </article>
  );
}

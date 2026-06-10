"use client";

import { ChevronRight, Heart, ShieldCheck, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
  const tags: string[] = [];

  if (
    psychologist.show_experience_tag !== false &&
    psychologist.verified &&
    psychologist.formation_years
  ) {
    tags.push(`${psychologist.formation_years} anos de experiência`);
  }

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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22c55e]/45 bg-white/90 px-2.5 py-1 text-[0.68rem] font-semibold text-[#15803d] shadow-[0_1px_12px_rgb(15_23_42_/_12%)]">
      <span className="h-2 w-2 rounded-full bg-[#22c55e]" aria-hidden="true" />
      Disponível hoje
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
        ? "Favoritos disponíveis apenas para usuários autenticados"
        : psychologist.favorited
          ? `Remover ${psychologist.name} dos favoritos`
          : `Favoritar ${psychologist.name}`
    }
    aria-pressed={psychologist.favorited}
    className={cn(
      "grid h-9 w-9 place-items-center rounded-full border border-white/80 bg-white/90 text-muted shadow-[0_10px_24px_rgb(15_23_42_/_14%)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60",
      psychologist.favorited && "border-rose-200 bg-rose-50 text-rose-500",
    )}
    disabled={favoritePending || !canFavorite}
    onClick={() => onToggleFavorite(psychologist)}
    title={!canFavorite ? "Favoritos disponíveis apenas para usuários autenticados" : undefined}
    type="button"
  >
    <Heart className={cn("h-5 w-5", psychologist.favorited && "fill-current")} aria-hidden="true" />
  </button>
);

export function PsychologistCard({
  canFavorite = true,
  favoritePending,
  onToggleFavorite,
  psychologist,
}: PsychologistCardProps) {
  const avatarSrc = resolvePublicMediaUrl(psychologist.avatar);
  const videoCoverSrc = resolvePublicMediaUrl(psychologist.video_cover_url);
  const mediaSrc = videoCoverSrc || avatarSrc;
  const mediaIsPublic = isPublicMediaUrl(mediaSrc);
  const tags = buildBenefitTags(psychologist);
  const displayName = getHonorificName(psychologist);
  const summary =
    psychologist.headline ||
    psychologist.bio ||
    "Perfil profissional publicado na Lectum com informações públicas do psicólogo.";
  const route = `/app/psychologist/${psychologist.id}`;

  return (
    <article
      className="relative mx-auto w-[calc(100vw-54px)] overflow-hidden rounded-[14px] border border-border/20 bg-white"
      style={{
        aspectRatio: "9 / 16",
        maxWidth: "380px",
        minWidth: "320px",
        width: "min(calc(100vw - 54px), 380px, calc((100dvh - 170px) * 9 / 16))",
      }}
    >
      <div className="absolute inset-0">
        {mediaSrc ? (
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

      <div
        className="absolute inset-x-0 bottom-0 z-10 w-full min-h-[26%] rounded-b-[14px] p-[4.5%]"
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
          className="pointer-events-none absolute inset-0 rounded-b-[14px]"
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

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[#334155]/85">
                <span>{getPsychologistTitle(psychologist.gender)}</span>
                <span className="inline-flex items-center gap-1 text-[0.72rem] font-bold text-[#f59e0b]">
                  <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" aria-hidden="true" />
                  {formatRating(psychologist.rating_avg, psychologist.rating_count)}
                </span>
              </div>
            </div>

            <div className="shrink-0 pt-0.5">
              <Link
                aria-label={`Abrir perfil de ${psychologist.name}`}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-[#334155] transition hover:bg-white"
                href={route}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <p className="line-clamp-3 text-[0.72rem] leading-4 text-[#0f172a]/85">{summary}</p>

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

          <div className="mt-auto flex items-center justify-between gap-2">
            <AvailabilityBadge available={psychologist.available_today} />
            <FavoriteButton
              canFavorite={canFavorite}
              favoritePending={favoritePending}
              onToggleFavorite={onToggleFavorite}
              psychologist={psychologist}
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[4.5%] left-[4.5%] z-[3] w-[91%]">
        {psychologist.whatsapp_url ? (
          <Button
            asChild
            className="h-10 w-full rounded-lg bg-[#22C55E] text-xs font-bold text-white hover:bg-[#22C55E]/90"
          >
            <a href={psychologist.whatsapp_url} rel="noreferrer" target="_blank">
              <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
              Chamar no WhatsApp
            </a>
          </Button>
        ) : (
          <Button
            className="h-10 w-full rounded-lg bg-[#22C55E] text-xs font-bold text-white"
            disabled
            type="button"
          >
            <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
            WhatsApp indisponível
          </Button>
        )}
      </div>
    </article>
  );
}

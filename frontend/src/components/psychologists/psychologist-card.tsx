"use client";

import { Check, ChevronRight, Heart, PhoneCall, Star, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { formatCrpNumber } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

export type PsychologistCardItem = {
  id: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  crp?: string | null;
  modality: string | null;
  rating_avg: number;
  rating_count: number;
  verified: boolean;
  available_today?: boolean;
  favorited: boolean;
  followed: boolean;
  specialties: Array<{ name: string }>;
  services: Array<{ name: string }>;
};

type PsychologistCardProps = {
  favoritePending?: boolean;
  followPending?: boolean;
  psychologist: PsychologistCardItem;
  onToggleFavorite: (psychologist: PsychologistCardItem) => void;
  onToggleFollow: (psychologist: PsychologistCardItem) => void;
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "Sem avaliações";

  return `${(ratingAvg / 100).toFixed(1)} (${ratingCount})`;
};

export function PsychologistCard({
  favoritePending,
  followPending,
  onToggleFavorite,
  onToggleFollow,
  psychologist,
}: PsychologistCardProps) {
  const avatarSrc = resolvePublicMediaUrl(psychologist.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(psychologist.avatar);
  const formattedCrp = formatCrpNumber(psychologist.crp);
  const tags = [
    ...psychologist.specialties.slice(0, 2).map((item) => item.name),
    ...psychologist.services.slice(0, 2).map((item) => item.name),
    psychologist.modality,
  ].filter(Boolean) as string[];

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_28px_rgb(15_23_42_/_5%)] transition hover:border-border-strong hover:shadow-[0_12px_32px_rgb(15_23_42_/_7%)]">
      <div className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          {psychologist.available_today ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[0.72rem] font-bold text-success">
              <span
                className="h-2.5 w-2.5 rounded-full bg-success motion-safe:animate-pulse"
                aria-hidden="true"
              />
              Disponível hoje
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              aria-label={
                psychologist.followed
                  ? `Deixar de seguir ${psychologist.name}`
                  : `Seguir ${psychologist.name}`
              }
              aria-pressed={psychologist.followed}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-extrabold text-muted shadow-[var(--lectum-shadow-soft)] transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
                psychologist.followed && "border-primary/30 bg-primary-soft text-primary",
              )}
              disabled={followPending}
              onClick={() => onToggleFollow(psychologist)}
              type="button"
            >
              {psychologist.followed ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
              {psychologist.followed ? "Seguindo" : "Seguir"}
            </button>
            <button
              aria-label={
                psychologist.favorited
                  ? `Remover ${psychologist.name} dos favoritos`
                  : `Favoritar ${psychologist.name}`
              }
              aria-pressed={psychologist.favorited}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted shadow-[var(--lectum-shadow-soft)] transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
                psychologist.favorited && "border-primary/30 bg-primary-soft text-primary",
              )}
              disabled={favoritePending}
              onClick={() => onToggleFavorite(psychologist)}
              type="button"
            >
              <Heart
                className={cn("h-5 w-5", psychologist.favorited && "fill-current")}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-lg font-bold text-primary">
            {avatarSrc ? (
              <Image
                alt={psychologist.name}
                className="object-cover"
                fill
                sizes="48px"
                src={avatarSrc}
                unoptimized={avatarIsPublicMedia}
              />
            ) : (
              getInitials(psychologist.name)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-1.5 text-[1.08rem] font-extrabold leading-6 text-foreground lg:text-[1.12rem]">
              <span className="truncate">{psychologist.name}</span>
              {psychologist.verified ? (
                <VerifiedBadgeIcon aria-hidden="true" className="h-4 w-4" />
              ) : null}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.26em] text-subtle">
                Psicólogo{formattedCrp ? ` • CRP ${formattedCrp}` : ""}
              </span>
              <span className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-muted">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
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

        <p className="line-clamp-3 text-[0.88rem] leading-6 text-muted">
          {psychologist.headline ||
            psychologist.bio ||
            "Perfil publicado na Lectum. Abra o perfil para conferir as informações disponíveis."}
        </p>

        <div className="flex flex-wrap gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span
                className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[0.7rem] font-semibold text-muted"
                key={tag}
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[0.7rem] font-semibold text-muted">
              Dados profissionais públicos
            </span>
          )}
        </div>

        <Button
          asChild
          className="h-11 w-full rounded-full bg-success text-sm font-extrabold text-white hover:bg-success/90"
        >
          <Link href={`/app/psychologist/${psychologist.id}`}>
            <PhoneCall className="h-5 w-5" aria-hidden="true" />
            Chamar no WhatsApp
          </Link>
        </Button>
      </div>
    </article>
  );
}

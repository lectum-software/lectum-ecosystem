"use client";

import { ArrowLeft, PencilLine, Share2, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
import { FavoriteHeart } from "@/components/ui/favorite-heart";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

import {
  buildBenefitTags,
  formatExperienceLabel,
  formatHeroRating,
  getInitials,
  getPsychologistDisplayName,
  getPsychologistTitle,
} from "../modules/support";

import { ExpandableAboutText } from "./about";

export const ProfileAvatar = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const avatarSrc = resolvePublicMediaUrl(profile.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(profile.avatar);
  const displayName = getPsychologistDisplayName(profile) || profile.name || "Profissional";

  return (
    <div
      className="relative grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] border-[4px] border-media-foreground bg-surface-muted text-2xl font-extrabold text-primary shadow-lectum-soft dark:border-background"
      data-profile-avatar="true"
    >
      {avatarSrc ? (
        <Image
          alt={displayName}
          className="object-cover"
          fill
          priority
          sizes="76px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(displayName)
      )}
    </div>
  );
};

export const ProfileHeroMedia = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const coverImageSrc = resolvePublicMediaUrl(profile.cover_image_url);
  const coverImageIsPublicMedia = isPublicMediaUrl(profile.cover_image_url);
  const [failedCoverImageUrl, setFailedCoverImageUrl] = useState<string | null>(null);
  const coverImageFailed = Boolean(coverImageSrc && failedCoverImageUrl === coverImageSrc);
  const displayName = getPsychologistDisplayName(profile) || profile.name || "Profissional";

  if (!coverImageSrc || coverImageFailed) {
    return (
      <div
        className="relative h-[132px] overflow-hidden bg-primary-soft"
        data-profile-default-cover="psychologist"
      >
        <Image
          alt=""
          className="object-cover object-center"
          fill
          sizes="(min-width: 768px) 760px, 100vw"
          src="/images/psychologist-default-sky.png"
        />
      </div>
    );
  }

  return (
    <div className="relative h-[132px] overflow-hidden bg-media-background">
      <Image
        alt={`Imagem de capa de ${displayName}`}
        className="h-full w-full object-cover object-center"
        fill
        priority={false}
        sizes="(min-width: 768px) 720px, 100vw"
        src={coverImageSrc}
        unoptimized={coverImageIsPublicMedia}
        onError={() => setFailedCoverImageUrl(coverImageSrc)}
      />
      <div className="psychologist-cover-overlay absolute inset-0" />
    </div>
  );
};

export const ProfileHero = ({
  canFavorite,
  canEditProfile,
  favoriteDisabledReason,
  favoritePending,
  onBack,
  onEditProfile,
  onShareProfile,
  onToggleFavorite,
  profile,
}: {
  canFavorite: boolean;
  canEditProfile: boolean;
  favoriteDisabledReason?: string | null;
  favoritePending: boolean;
  onBack: () => void;
  onEditProfile: () => void;
  onShareProfile: () => void;
  onToggleFavorite: () => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const displayName = getPsychologistDisplayName(profile) || profile.name || "Profissional";
  const shortBio = profile.headline?.trim() ?? "";
  const lastNameStart = displayName.lastIndexOf(" ") + 1;
  const benefitTags = buildBenefitTags(profile);
  const formattedCrp = formatCrpLabel(profile.crp);
  const experienceLabel =
    profile.show_experience_tag !== false ? formatExperienceLabel(profile.formation_years) : null;
  const displayedFavorited = canFavorite && profile.favorited;
  const favoriteButtonLabel =
    favoriteDisabledReason ??
    (displayedFavorited ? `Remover ${displayName} dos favoritos` : `Favoritar ${displayName}`);

  return (
    <header
      className="overflow-hidden rounded-b-[28px] border-b border-border bg-surface pb-5 shadow-none dark:border-border dark:bg-surface"
      data-profile-hero="true"
    >
      <div className="relative text-primary-foreground">
        <ProfileHeroMedia profile={profile} />

        <div className="absolute inset-x-0 top-4 z-10 flex items-center justify-between px-5">
          <button
            aria-label="Voltar para a tela anterior"
            className="grid h-10 w-10 place-items-center rounded-full bg-media-background/15 text-primary-foreground backdrop-blur transition hover:bg-media-background/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            {canEditProfile ? (
              <button
                aria-label="Editar perfil"
                className="grid h-10 w-10 place-items-center rounded-full bg-media-background/15 text-primary-foreground backdrop-blur transition hover:bg-media-background/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70"
                onClick={onEditProfile}
                type="button"
              >
                <PencilLine className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}

            <button
              aria-label="Compartilhar perfil"
              className="grid h-10 w-10 place-items-center rounded-full bg-media-background/15 text-primary-foreground backdrop-blur transition hover:bg-media-background/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70"
              onClick={onShareProfile}
              type="button"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative px-5">
        <div className="-mt-8 flex items-start justify-between gap-4">
          <ProfileAvatar profile={profile} />

          <button
            aria-busy={favoritePending}
            aria-label={favoriteButtonLabel}
            aria-pressed={displayedFavorited}
            className={cn(
              "mt-10 inline-flex h-10 shrink-0 items-center justify-center rounded-full border text-muted shadow-sm transition-[width,gap,background-color,border-color] duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
              displayedFavorited
                ? "w-10 gap-0 border-favorite-border bg-favorite-soft"
                : "w-[112px] gap-2 border-border bg-surface hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:bg-surface-muted",
            )}
            disabled={favoritePending || !canFavorite}
            onClick={onToggleFavorite}
            title={favoriteButtonLabel}
            type="button"
          >
            <FavoriteHeart active={displayedFavorited} className="shrink-0" />
            <span
              aria-hidden="true"
              className={cn(
                "overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200 motion-reduce:transition-none",
                displayedFavorited ? "w-0 opacity-0" : "w-[56px] opacity-100",
              )}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Favoritar
            </span>
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <h1 className="min-w-0 break-words text-[1.55rem] font-black leading-tight tracking-normal text-foreground dark:text-foreground">
            {profile.verified ? (
              <>
                {displayName.slice(0, lastNameStart)}
                <span className="inline-flex max-w-full items-center gap-1.5 align-bottom">
                  <span className="min-w-0 break-words">{displayName.slice(lastNameStart)}</span>
                  <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-[18px] w-[18px]" />
                </span>
              </>
            ) : (
              displayName
            )}
          </h1>

          <div className="grid gap-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-muted">
              {getPsychologistTitle(profile.gender)}
              <span aria-hidden="true">•</span>
              <span>{formattedCrp}</span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1 font-extrabold text-warning">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                {formatHeroRating(profile.rating_avg)}
              </span>
            </p>

            {profile.available_today ? (
              <span
                className="inline-flex w-fit items-center gap-2 text-[12px] font-black text-success"
                data-availability-badge="true"
              >
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                Disponível hoje
              </span>
            ) : null}
          </div>

          {shortBio ? (
            <div data-profile-hero-short-bio="headline">
              <ExpandableAboutText containerClassName="mt-0.5 max-w-2xl" text={shortBio} />
            </div>
          ) : null}

          {experienceLabel ? (
            <p className="text-[12.5px] font-semibold leading-5 text-muted dark:text-muted">
              {experienceLabel}
            </p>
          ) : null}

          {benefitTags.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-2" data-profile-benefit-tags="true">
              {benefitTags.map((tag) => {
                const Icon = tag.icon;

                return (
                  <span
                    className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-border bg-transparent px-2.5 py-1 text-[11.5px] font-semibold leading-none text-primary dark:border-primary/35 dark:text-primary"
                    key={tag.label}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{tag.label}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

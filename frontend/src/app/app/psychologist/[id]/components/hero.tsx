"use client";

import { ArrowLeft, PencilLine, Share2 } from "lucide-react";
import Image from "next/image";
import { type Ref, useState } from "react";
import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

import {
  buildBenefitTags,
  formatExperienceLabel,
  getInitials,
  getPsychologistDisplayName,
  getPsychologistTitle,
} from "../modules/support";

import { ExpandableAboutText } from "./about";
import { ProfileFavoriteButton } from "./profile-favorite-button";
import { WhatsAppCta } from "./whatsapp-cta";

export const ProfileAvatar = ({
  profile,
  compact = false,
}: {
  profile: DirectoryPsychologistProfile;
  compact?: boolean;
}) => {
  const avatarSrc = resolvePublicMediaUrl(profile.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(profile.avatar);
  const displayName = getPsychologistDisplayName(profile) || profile.name || "Profissional";

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border-media-foreground bg-surface-muted font-extrabold text-primary shadow-lectum-soft dark:border-background",
        compact
          ? "h-9 w-9 rounded-full border-2 text-xs"
          : "h-[76px] w-[76px] rounded-[18px] border-[4px] text-2xl",
      )}
      data-profile-avatar="true"
    >
      {avatarSrc ? (
        <Image
          alt={displayName}
          className="object-cover"
          fill
          priority
          sizes={compact ? "36px" : "76px"}
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
  contactAnchorRef,
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
  contactAnchorRef?: Ref<HTMLDivElement>;
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

  return (
    <header
      className="overflow-hidden rounded-b-[28px] bg-surface pb-[18px] shadow-none dark:bg-surface"
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

      <div className="relative px-[18px] max-[359px]:px-[14px] lg:px-8">
        <div className="-mt-8 flex items-start justify-between gap-4">
          <ProfileAvatar profile={profile} />

          <div className="mt-8 shrink-0">
            <ProfileFavoriteButton
              canFavorite={canFavorite}
              favoriteDisabledReason={favoriteDisabledReason}
              favoritePending={favoritePending}
              onToggleFavorite={onToggleFavorite}
              profile={profile}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <h1 className="min-w-0 break-words text-[1.55rem] font-black leading-[1.4] tracking-normal text-foreground dark:text-foreground">
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
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-muted">
              {getPsychologistTitle(profile.gender)}
              <span aria-hidden="true">•</span>
              <span>{formattedCrp}</span>
              {experienceLabel ? (
                <>
                  <span aria-hidden="true">•</span>
                  <span className="whitespace-nowrap">{experienceLabel}</span>
                </>
              ) : null}
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
              <ExpandableAboutText
                containerClassName="mt-1 max-w-2xl"
                textClassName="text-[13px] sm:text-[13px]"
                text={shortBio}
              />
            </div>
          ) : null}

          {benefitTags.length > 0 ? (
            <div
              className="mt-1 flex items-center justify-start gap-2.5 overflow-x-auto text-[11px] font-extrabold text-muted max-[359px]:text-[9px] lg:text-xs"
              data-profile-benefit-tags="true"
            >
              {benefitTags.map((tag) => {
                const Icon = tag.icon;

                return (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
                    key={tag.label}
                  >
                    <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{tag.label}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
        {profile.whatsapp_url && !profile.read_only ? (
          <div className="mt-[17px]" ref={contactAnchorRef} data-profile-contact-anchor>
            <WhatsAppCta profile={profile} />
          </div>
        ) : null}
      </div>
    </header>
  );
};

"use client";

import { ArrowLeft, Heart, PencilLine, Share2, Star } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
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
  type ProfileTab,
  type ProfileTabNavigationOptions,
  PSYCHOLOGIST_DEFAULT_COVER_BACKGROUND,
  scrollProfileContentIntoView,
  tabs,
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
        className="relative h-[132px] overflow-hidden"
        data-profile-default-cover="psychologist"
        style={{ background: PSYCHOLOGIST_DEFAULT_COVER_BACKGROUND }}
      >
        <span
          aria-hidden="true"
          className="-top-16 -left-10 absolute h-36 w-36 rounded-full bg-surface/55 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="-right-12 absolute top-4 h-32 w-32 rounded-full bg-primary/18 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="absolute right-1/4 -bottom-16 h-28 w-48 rounded-full bg-primary/14 blur-3xl"
        />
        <div className="psychologist-default-cover-overlay absolute inset-0" />
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
  const headline = (profile.headline?.trim() || profile.bio?.trim() || "").trim();
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
            aria-label={favoriteButtonLabel}
            aria-pressed={displayedFavorited}
            className={cn(
              "mt-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border text-muted shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
              displayedFavorited
                ? "border-danger-border bg-danger-soft text-danger"
                : "border-border bg-surface text-muted hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:border-border dark:bg-surface-muted",
            )}
            disabled={favoritePending || !canFavorite}
            onClick={onToggleFavorite}
            title={!canFavorite ? favoriteButtonLabel : undefined}
            type="button"
          >
            <Heart
              className={cn(
                "h-5 w-5",
                displayedFavorited ? "fill-danger text-danger" : "fill-none",
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <h1 className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[1.55rem] font-black leading-tight tracking-[-0.03em] text-foreground dark:text-foreground">
            <span className="break-words">{displayName}</span>
            {profile.verified ? (
              <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-[18px] w-[18px]" />
            ) : null}
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

          {headline ? (
            <ExpandableAboutText containerClassName="mt-0.5 max-w-2xl" text={headline} />
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

export const ProfileMobileStickyHeader = ({
  activeTab,
  onTabChange,
  profile,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab, options?: ProfileTabNavigationOptions) => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const stickyName = getPsychologistDisplayName(profile) || profile.name || "Profissional";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let animationFrame = 0;

    const updateVisibility = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (window.innerWidth >= 1024) {
          setVisible(false);
          return;
        }

        const presentationVideo = document.querySelector<HTMLElement>(
          '[data-presentation-video="true"]',
        );
        const profileHero = document.querySelector<HTMLElement>('[data-profile-hero="true"]');
        const thresholdNode = presentationVideo || profileHero;
        const thresholdBottom = thresholdNode?.getBoundingClientRect().bottom ?? 0;
        const nextVisible = thresholdBottom <= 84;

        setVisible((current) => (current === nextVisible ? current : nextVisible));
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  const handleTabChange = (tab: ProfileTab) => {
    onTabChange(tab);
    window.requestAnimationFrame(scrollProfileContentIntoView);
  };

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-border border-b bg-surface/92 shadow-lectum-soft backdrop-blur-xl transition-[transform,opacity] duration-300 ease-out supports-[backdrop-filter]:bg-surface/82 dark:border-border dark:bg-background/86 lg:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
      )}
      data-profile-mobile-sticky-header="true"
    >
      <div
        className="mx-auto w-full max-w-[430px] px-3 pb-2"
        style={{ paddingTop: "calc(0.45rem + env(safe-area-inset-top))" }}
      >
        <div className="flex min-w-0 items-center justify-center gap-1.5 px-2 pb-1">
          <span className="min-w-0 truncate text-[13.5px] font-extrabold leading-[1.25] tracking-[-0.02em] text-foreground dark:text-foreground">
            {stickyName}
          </span>
          {profile.verified ? (
            <VerifiedBadgeIcon
              aria-label="Perfil verificado"
              className="h-[14px] w-[14px] shrink-0"
            />
          ) : null}
        </div>

        <nav
          aria-label="Seções do perfil profissional"
          className="grid grid-cols-3 gap-1 rounded-full border border-border bg-surface/72 p-1 shadow-lectum-soft"
        >
          {tabs.map((tab) => {
            const active = tab.value === activeTab;

            return (
              <button
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center justify-center rounded-full px-2 text-[12.8px] font-semibold tracking-[-0.015em] transition",
                  active
                    ? "bg-foreground text-primary-foreground shadow-lectum-soft"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                tabIndex={visible ? undefined : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

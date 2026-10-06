"use client";

import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
import { FavoriteHeart } from "@/components/ui/favorite-heart";
import { cn } from "@/lib/utils";
import { getPsychologistDisplayName } from "../modules/support";

export type ProfileFavoriteProps = {
  canFavorite: boolean;
  favoriteDisabledReason?: string | null;
  favoritePending: boolean;
  onToggleFavorite: () => void;
  profile: DirectoryPsychologistProfile;
};

export const ProfileFavoriteButton = ({
  canFavorite,
  favoriteDisabledReason,
  favoritePending,
  onToggleFavorite,
  profile,
}: ProfileFavoriteProps) => {
  const displayName = getPsychologistDisplayName(profile) || profile.name || "Profissional";
  const displayedFavorited = canFavorite && profile.favorited;
  const label =
    favoriteDisabledReason ??
    (displayedFavorited ? `Remover ${displayName} dos favoritos` : `Favoritar ${displayName}`);

  return (
    <button
      aria-busy={favoritePending}
      aria-label={label}
      aria-pressed={displayedFavorited}
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center rounded-full border text-muted shadow-sm transition-[width,gap,background-color,border-color] duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        displayedFavorited
          ? "w-10 gap-0 border-favorite-border bg-favorite-soft"
          : "w-[112px] gap-2 border-border bg-surface hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:bg-surface-muted",
      )}
      disabled={favoritePending || !canFavorite}
      onClick={onToggleFavorite}
      title={label}
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
  );
};

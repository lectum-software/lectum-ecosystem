"use client";

import { Heart, Plus } from "lucide-react";
import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
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
        "inline-flex h-[44px] shrink-0 items-center justify-center gap-1 bg-transparent text-xs font-semibold text-primary transition-colors hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        displayedFavorited ? "w-[44px]" : "px-0",
      )}
      disabled={favoritePending || !canFavorite}
      onClick={onToggleFavorite}
      title={label}
      type="button"
    >
      {displayedFavorited ? (
        <Heart aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current" />
      ) : (
        <>
          <Plus aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span aria-hidden="true">Favoritar</span>
        </>
      )}
    </button>
  );
};

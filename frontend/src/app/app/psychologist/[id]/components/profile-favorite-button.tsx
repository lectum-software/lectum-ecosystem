"use client";

import { Plus } from "lucide-react";
import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
import { FavoriteHeart } from "@/components/ui/favorite-heart";
import { RelationshipButton } from "@/components/ui/relationship-button";
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
    <RelationshipButton
      aria-busy={favoritePending}
      aria-label={label}
      aria-pressed={displayedFavorited}
      className={cn(
        "h-[44px] gap-1 border-0 bg-transparent px-0 text-primary transition-colors hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-60",
        displayedFavorited ? "w-[44px]" : "w-auto",
      )}
      disabled={favoritePending || !canFavorite}
      onClick={onToggleFavorite}
      size="compact"
      title={label}
      type="button"
    >
      {displayedFavorited ? (
        <FavoriteHeart active className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <>
          <Plus aria-hidden="true" className="h-3 w-3 shrink-0" />
          <span aria-hidden="true">Favoritar</span>
        </>
      )}
    </RelationshipButton>
  );
};

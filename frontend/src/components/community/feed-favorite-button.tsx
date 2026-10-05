"use client";

import { useIsMutating, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCallback, useEffect } from "react";
import keys from "@/api/cache/keys";
import { usePatient } from "@/api/callers/patient";
import { loadFavoriteIds } from "@/api/callers/patient/favorite-ids";
import type { CommunityAuthor } from "@/api/generator/types/community";
import { getFavoritePsychologists } from "@/api/req/patient";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { FavoriteHeart } from "@/components/ui/favorite-heart";
import { RelationshipButton } from "@/components/ui/relationship-button";
import { useAppSelector } from "@/hooks/redux";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";

export const FeedFavoriteButton = ({ author }: { author: CommunityAuthor }) => {
  const { id } = author;
  const name = getCommunityAuthorDisplayName(author);
  const conversion = useProgressiveConversion();
  const viewerId = useAppSelector((state) => state.user?.id);
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({ enableProfile: false });
  const favorites = useQuery({
    queryKey: keys.patient.favoriteIds(viewerId ?? "guest"),
    queryFn: ({ signal }) => loadFavoriteIds(getFavoritePsychologists, signal),
    enabled: conversion.isAuthenticated && Boolean(viewerId),
    staleTime: 60_000,
    retry: false,
  });
  const pending =
    useIsMutating({
      mutationKey: keys.patient.favoriteMutation(viewerId ?? "guest"),
      predicate: (mutation) => mutation.state.variables === id,
    }) > 0 || unfavoritePsychologist.isPending;
  const ownProfile = viewerId === id;
  const favorited = favorites.data?.includes(id) ?? false;
  const ready = !conversion.isAuthenticated || (Boolean(viewerId) && favorites.isSuccess);

  const favorite = useCallback(() => {
    if (ownProfile || pending || !ready) return;
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_favorito", {
        intent: { type: "favorite_psychologist", payload: { psychologistId: id } },
      });
      return;
    }
    const mutation = favorited ? unfavoritePsychologist : favoritePsychologist;
    mutation.mutate(id);
  }, [
    conversion,
    favoritePsychologist,
    favorited,
    id,
    ownProfile,
    pending,
    ready,
    unfavoritePsychologist,
  ]);

  useEffect(() => {
    if (!conversion.isAuthenticated || !ready || pending || favorited) return;
    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "favorite_psychologist" && candidate.payload?.psychologistId === id,
    );
    if (intent) window.setTimeout(favorite, 0);
  }, [conversion, favorite, favorited, id, pending, ready]);

  if (author.role !== "psicologo" || !ready || ownProfile) {
    return null;
  }
  return (
    <RelationshipButton
      aria-busy={pending}
      aria-label={favorited ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
      aria-pressed={favorited}
      className="favorite-toggle pointer-events-auto border-0"
      disabled={pending}
      size="compact"
      title={favorited ? `Remover ${name} dos favoritos` : undefined}
      onClick={(event) => {
        event.stopPropagation();
        favorite();
      }}
      type="button"
    >
      <span aria-hidden="true" className="favorite-toggle-label gap-1">
        <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />
        Favoritar
      </span>
      <span aria-hidden="true" className="favorite-toggle-heart">
        <FavoriteHeart active className="h-4 w-4" />
      </span>
    </RelationshipButton>
  );
};

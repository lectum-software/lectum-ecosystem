"use client";

import { useIsMutating, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import keys from "@/api/cache/keys";
import { usePatient } from "@/api/callers/patient";
import { loadFavoriteIds } from "@/api/callers/patient/favorite-ids";
import type { CommunityAuthor } from "@/api/generator/types/community";
import { getFavoritePsychologists } from "@/api/req/patient";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { useAppSelector } from "@/hooks/redux";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";

export const FeedFavoriteButton = ({ author }: { author: CommunityAuthor }) => {
  const { id } = author;
  const name = getCommunityAuthorDisplayName(author);
  const conversion = useProgressiveConversion();
  const viewerId = useAppSelector((state) => state.user?.id);
  const { favoritePsychologist } = usePatient({ enableProfile: false });
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
    }) > 0;
  const ownProfile = viewerId === id;
  const favorited = favorites.data?.includes(id) ?? false;
  const ready = !conversion.isAuthenticated || (Boolean(viewerId) && favorites.isSuccess);

  const favorite = useCallback(() => {
    if (ownProfile || favorited || pending || !ready) return;
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_favorito", {
        intent: { type: "favorite_psychologist", payload: { psychologistId: id } },
      });
      return;
    }
    favoritePsychologist.mutate(id);
  }, [conversion, favoritePsychologist, favorited, id, ownProfile, pending, ready]);

  useEffect(() => {
    if (!conversion.isAuthenticated || !ready || pending) return;
    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "favorite_psychologist" && candidate.payload?.psychologistId === id,
    );
    if (intent) window.setTimeout(favorite, 0);
  }, [conversion, favorite, id, pending, ready]);

  if (!ready || ownProfile || favorited) return null;
  return (
    <button
      aria-busy={pending}
      aria-label={`Favoritar ${name}`}
      className="pointer-events-auto inline-flex h-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary/45 bg-surface px-2 text-[11px] font-semibold leading-none tracking-normal text-primary hover:bg-primary-soft/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      style={{ fontSize: 11, fontWeight: 600 }}
      onClick={(event) => {
        event.stopPropagation();
        favorite();
      }}
      type="button"
    >
      Favoritar
    </button>
  );
};

"use client";

import { useIsMutating, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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

export const FeedFavoriteButton = ({
  author,
  heartClassName,
}: {
  author: CommunityAuthor;
  heartClassName?: string;
}) => {
  const { id } = author;
  const name = getCommunityAuthorDisplayName(author);
  const conversion = useProgressiveConversion();
  const viewerId = useAppSelector((state) => state.user?.id);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const confirmationKey = `${viewerId}:${id}`;
  const confirming = confirmation === confirmationKey;
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
    if (author.favorite_available === false) return;
    if (author.read_only) return;
    if (ownProfile || pending || !ready || favorited || confirming) return;
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_favorito", {
        intent: { type: "favorite_psychologist", payload: { psychologistId: id } },
      });
      return;
    }
    favoritePsychologist.mutate(id, {
      onSuccess: (data) => {
        if (data.favorited) setConfirmation(confirmationKey);
      },
      onError: () => toast.error("Não foi possível favoritar. Tente novamente."),
    });
  }, [
    author.favorite_available,
    author.read_only,
    conversion,
    confirmationKey,
    confirming,
    favoritePsychologist,
    favorited,
    id,
    ownProfile,
    pending,
    ready,
  ]);

  useEffect(() => {
    if (!confirmation) return;
    const timer = window.setTimeout(() => setConfirmation(null), 900);
    return () => window.clearTimeout(timer);
  }, [confirmation]);

  useEffect(() => {
    if (!conversion.isAuthenticated || !ready || pending || favorited) return;
    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "favorite_psychologist" && candidate.payload?.psychologistId === id,
    );
    if (intent) window.setTimeout(favorite, 0);
  }, [conversion, favorite, favorited, id, pending, ready]);

  if (author.role !== "psicologo" || author.favorite_available === false || !ready || ownProfile) {
    return null;
  }
  if (confirming) {
    return (
      <span
        className="favorite-confirmation inline-flex h-5 w-6 items-center justify-center"
        role="status"
      >
        <span className="sr-only">Psicólogo adicionado aos favoritos</span>
        <FavoriteHeart active className={heartClassName ?? "h-4 w-4"} />
      </span>
    );
  }
  if (favorited) return null;
  return (
    <RelationshipButton
      aria-busy={pending}
      aria-label={`Favoritar ${name}`}
      aria-pressed={false}
      className="favorite-toggle pointer-events-auto border-0"
      disabled={pending || author.read_only}
      size="compact"
      onClick={(event) => {
        event.stopPropagation();
        favorite();
      }}
      type="button"
    >
      <span aria-hidden="true" className="favorite-toggle-label gap-1">
        <Plus className="h-3 w-3 shrink-0" />
        Favoritar
      </span>
    </RelationshipButton>
  );
};

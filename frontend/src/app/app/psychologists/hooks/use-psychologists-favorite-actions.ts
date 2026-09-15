"use client";

import { useCallback, useEffect } from "react";
import type { DirectoryPsychologist } from "@/api/generator/types/directory";
import { usePsychologistsSetupContext } from "./setup-context";
import type { PsychologistsDirectory } from "./use-psychologists-directory";

export const usePsychologistsFavoriteActions = ({
  directory,
}: {
  directory: PsychologistsDirectory;
}) => {
  const setup = usePsychologistsSetupContext();
  const {
    conversion,
    currentUserId,
    favoriteOverrides,
    favoritePsychologist,
    isSharing,
    setFavoriteOverrides,
    setIsSharing,
    setShareFeedback,
    unfavoritePsychologist,
  } = setup;

  const { isMobileSearchFocusMode, psychologists, trackPresentationVideoAction } = directory;

  const toggleFavorite = useCallback(
    (psychologist: DirectoryPsychologist) => {
      if (isMobileSearchFocusMode) return;

      const psychologistId = psychologist.id;

      if (currentUserId && currentUserId === psychologistId) return;

      if (!conversion.isAuthenticated) {
        conversion.requestConversion("trigger_favorito", {
          intent: {
            payload: {
              psychologistId,
            },
            type: "favorite_psychologist",
          },
        });
        return;
      }

      const currentFavorited = favoriteOverrides[psychologistId] ?? Boolean(psychologist.favorited);
      const nextFavorited = !currentFavorited;
      const clearFavoriteOverride = () => {
        setFavoriteOverrides((current) => {
          const next = { ...current };
          delete next[psychologistId];
          return next;
        });
      };

      setFavoriteOverrides((current) => ({
        ...current,
        [psychologistId]: nextFavorited,
      }));

      if (nextFavorited) {
        favoritePsychologist.mutate(psychologistId, {
          onError: clearFavoriteOverride,
          onSuccess: () => {
            clearFavoriteOverride();
            trackPresentationVideoAction("psychologist_video_favorite", psychologistId);
          },
        });
        return;
      }

      unfavoritePsychologist.mutate(psychologistId, {
        onError: clearFavoriteOverride,
        onSuccess: clearFavoriteOverride,
      });
    },
    [
      isMobileSearchFocusMode,
      currentUserId,
      conversion,
      favoriteOverrides,
      setFavoriteOverrides,
      unfavoritePsychologist,
      favoritePsychologist,
      trackPresentationVideoAction,
    ],
  );

  useEffect(() => {
    if (!conversion.isAuthenticated || psychologists.length === 0) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "favorite_psychologist" &&
        psychologists.some((item) => item.id === String(candidate.payload?.psychologistId ?? "")),
    );
    const psychologistId = String(intent?.payload?.psychologistId ?? "");
    if (!psychologistId) return;
    if (currentUserId && currentUserId === psychologistId) return;

    const psychologist = psychologists.find((item) => item.id === psychologistId);
    if (!psychologist) return;
    if (favoriteOverrides[psychologistId] ?? psychologist.favorited) return;

    window.setTimeout(() => toggleFavorite(psychologist), 0);
  }, [conversion, currentUserId, favoriteOverrides, psychologists, toggleFavorite]);

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;

  const shareCurrent = useCallback(
    async (psychologist: DirectoryPsychologist) => {
      if (isSharing) return;

      const url =
        typeof window === "undefined"
          ? ""
          : `${window.location.origin}/psicologos/${psychologist.id}`;

      try {
        setIsSharing(true);
        if (typeof window !== "undefined" && "share" in navigator) {
          await navigator.share({
            title: `Perfil de ${psychologist.name}`,
            text: psychologist.headline || "Perfis de Psicólogos na Lectum",
            url,
          });
          trackPresentationVideoAction("psychologist_video_share", psychologist.id);
          return;
        }

        if (url) {
          await navigator.clipboard.writeText(url);
          trackPresentationVideoAction("psychologist_video_share", psychologist.id);
          setShareFeedback(true);
          window.setTimeout(() => setShareFeedback(false), 1800);
        }
      } finally {
        setIsSharing(false);
      }
    },
    [isSharing, setIsSharing, setShareFeedback, trackPresentationVideoAction],
  );

  return {
    favoritePendingId,
    shareCurrent,
    toggleFavorite,
  };
};

export type PsychologistsFavoriteActions = ReturnType<typeof usePsychologistsFavoriteActions>;

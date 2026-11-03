"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import { useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import { VERIFICATION_VIDEO } from "./verification-video-policy";

const storageKey = `lectum.video.${VERIFICATION_VIDEO.id}.guest.watched`;
const changedEvent = "lectum-verification-video-watched";
let guestWatchedInMemory = false;
const readGuest = () => {
  try {
    return guestWatchedInMemory || window.localStorage.getItem(storageKey) === "true";
  } catch {
    return guestWatchedInMemory;
  }
};
const subscribe = (notify: () => void) => {
  window.addEventListener("storage", notify);
  window.addEventListener(changedEvent, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(changedEvent, notify);
  };
};
const route = "/api/private/notification/verification-video";

export const useVerificationVideo = () => {
  const hasToken = useAuthTokenPresence();
  const userId = useAppSelector((state) => state.user?.id);
  const client = useQueryClient();
  const guestWatched = useSyncExternalStore(subscribe, readGuest, () => false);
  const queryKey = ["verification-video", VERIFICATION_VIDEO.id, userId];
  const status = useQuery({
    queryKey,
    enabled: hasToken && Boolean(userId),
    queryFn: () => handleReq<{ watched: boolean }>(callEndpoint({ route })),
    staleTime: 60_000,
  });
  const update = useMutation({
    mutationFn: (ownerId: string) => {
      if (!ownerId) throw new Error("Missing account");
      return handleReq<{ watched: boolean }>(callEndpoint({ route, method: "POST" }));
    },
    retry: 2,
    onSuccess: (data, ownerId) =>
      client.setQueryData(["verification-video", VERIFICATION_VIDEO.id, ownerId], data),
  });
  const watched = hasToken ? status.data?.watched === true : guestWatched;
  const markWatched = () => {
    if (watched || update.isPending) return;
    if (hasToken) {
      if (userId) update.mutate(userId);
      return;
    }
    guestWatchedInMemory = true;
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Storage may be disabled; preserve the completed state for this page session.
    }
    window.dispatchEvent(new Event(changedEvent));
  };
  return { watched, markWatched };
};

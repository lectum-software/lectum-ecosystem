"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "@/api/callers/account";
import { useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import {
  hasSeenCommunityPublishTip,
  markCommunityPublishTipSeen,
} from "@/utils/community-publish-tip";

export const useCommunityPublishTip = () => {
  const currentUser = useAppSelector((state) => state.user);
  const hasToken = useAuthTokenPresence();
  const userId = hasToken ? currentUser?.id : null;
  const isPsychologist = Boolean(hasToken && currentUser?.role === "psicologo");
  const account = useAccount({ enableSecurity: false, enableTips: hasToken && !isPsychologist });
  const { mutate } = account.updateOnboardingTips;
  const remoteSeen = account.onboardingTips.data?.has_seen_community_post_tip;
  const syncedUserRef = useRef<string | null>(null);
  const identity = hasToken ? (userId ?? "pending") : "anonymous";
  const [visibleFor, setVisibleFor] = useState<string | null>(null);

  const persistSeen = useCallback(() => {
    if (isPsychologist || (hasToken && !userId)) return;
    markCommunityPublishTipSeen(userId);
    if (!userId || remoteSeen || syncedUserRef.current === userId) return;
    syncedUserRef.current = userId;
    mutate(
      { has_seen_community_post_tip: true },
      {
        onError: () => {
          syncedUserRef.current = null;
        },
      },
    );
  }, [hasToken, isPsychologist, mutate, remoteSeen, userId]);

  useEffect(() => {
    if (isPsychologist || (hasToken && (!userId || !account.onboardingTips.isSuccess))) return;

    if (hasSeenCommunityPublishTip(userId)) {
      // Reconcile an anonymous/local completion without reopening the tip after login.
      if (userId && remoteSeen === false) persistSeen();
      return;
    }
    if (hasToken && remoteSeen) {
      markCommunityPublishTipSeen(userId);
      return;
    }

    let timeout: number | undefined;
    const schedule = () => {
      window.clearTimeout(timeout);
      if (document.visibilityState !== "visible") return;
      timeout = window.setTimeout(() => {
        if (document.visibilityState !== "visible" || hasSeenCommunityPublishTip(userId)) return;
        setVisibleFor(identity);
        persistSeen();
      }, 450);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [
    account.onboardingTips.isSuccess,
    hasToken,
    identity,
    isPsychologist,
    persistSeen,
    remoteSeen,
    userId,
  ]);

  const dismiss = useCallback(() => {
    persistSeen();
    setVisibleFor(null);
  }, [persistSeen]);

  return { dismiss, isVisible: !isPsychologist && visibleFor === identity };
};

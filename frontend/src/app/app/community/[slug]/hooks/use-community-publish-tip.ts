"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "@/api/callers/account";
import { hasVisibleModalLayer } from "@/components/onboarding/modal-layer";
import {
  COMMUNITY_TIP_DELAY_MS,
  communityTimeKey,
  trackCommunityTipOpen,
  trackVisibleNavigation,
} from "@/components/onboarding/navigation-prompt-timing";
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

    return trackVisibleNavigation(communityTimeKey(identity), (elapsedMs) => {
      if (elapsedMs < COMMUNITY_TIP_DELAY_MS || hasVisibleModalLayer()) return;
      if (document.visibilityState !== "visible" || hasSeenCommunityPublishTip(userId)) return;
      setVisibleFor(identity);
      persistSeen();
    });
  }, [
    account.onboardingTips.isSuccess,
    hasToken,
    identity,
    isPsychologist,
    persistSeen,
    remoteSeen,
    userId,
  ]);

  const isVisible = !isPsychologist && visibleFor === identity;
  useEffect(() => {
    if (isVisible) return trackCommunityTipOpen();
  }, [isVisible]);

  const dismiss = useCallback(() => {
    persistSeen();
    setVisibleFor(null);
  }, [persistSeen]);

  return { dismiss, isVisible };
};

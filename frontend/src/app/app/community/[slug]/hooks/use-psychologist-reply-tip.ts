"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAccount } from "@/api/callers/account";
import type { CommunityPost } from "@/api/generator/types/community";
import { useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import {
  hasSeenPsychologistReplyTip,
  isReplyTipPost,
  markPsychologistReplyTipSeen,
  prioritizeReplyTipPost,
  subscribePsychologistReplyTip,
} from "@/utils/psychologist-reply-tip";

export const usePsychologistReplyTip = (posts: CommunityPost[], listKey: string) => {
  const user = useAppSelector((state) => state.user);
  const hasToken = useAuthTokenPresence();
  const userId = hasToken && user?.role === "psicologo" ? user.id : null;
  const account = useAccount({ enableSecurity: false, enableTips: Boolean(userId) });
  const { mutate } = account.updateOnboardingTips;
  const remoteSeen = account.onboardingTips.data?.has_seen_psychologist_reply_tip;
  const localSeen = useSyncExternalStore(
    subscribePsychologistReplyTip,
    () => hasSeenPsychologistReplyTip(userId),
    () => false,
  );
  const syncedUser = useRef<string | null>(null);
  const identity = JSON.stringify([userId, listKey]);
  const [selection, setSelection] = useState<{ identity: string; postId: string } | null>(null);
  const pending = Boolean(userId && account.onboardingTips.isSuccess && !remoteSeen && !localSeen);
  const candidate = pending ? posts.find(isReplyTipPost) : undefined;
  const selectedId =
    userId &&
    selection?.identity === identity &&
    posts.some((post) => post.id === selection.postId && isReplyTipPost(post))
      ? selection.postId
      : null;

  const dismiss = useCallback(() => {
    if (!userId) return;
    markPsychologistReplyTipSeen(userId);
    if (remoteSeen || syncedUser.current === userId) return;
    syncedUser.current = userId;
    mutate({ has_seen_psychologist_reply_tip: true });
  }, [mutate, remoteSeen, userId]);

  useEffect(() => {
    if (!userId || !account.onboardingTips.isSuccess) return;
    if (localSeen && remoteSeen === false) dismiss();
  }, [account.onboardingTips.isSuccess, dismiss, localSeen, remoteSeen, userId]);

  useEffect(() => {
    if (!candidate || selectedId) return;
    const timeout = window.setTimeout(() => {
      setSelection({ identity, postId: candidate.id });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [candidate, identity, selectedId]);

  return {
    dismiss,
    isPreparing: Boolean(
      userId && (account.onboardingTips.isPending || (candidate && !selectedId)),
    ),
    // Keep this visit's order after dismissal, so the post does not jump under the pointer.
    posts: prioritizeReplyTipPost(posts, selectedId),
    targetPostId: pending ? selectedId : null,
  };
};

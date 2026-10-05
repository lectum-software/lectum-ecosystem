"use client";

import { useCallback, useEffect } from "react";
import { useFollowCommunity, useUnfollowCommunity } from "@/api/callers/community";
import { CommunityFollowButton } from "@/components/community/community-follow-button";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { useAppSelector } from "@/hooks/redux";
import { useInteractionSnapshot } from "./use-interaction-snapshot";

type CommunityFollowToggleProps = {
  className?: string;
  followVariant?: "primary" | "secondary";
  initialFollowing?: boolean;
  hideFollowing?: boolean;
  size?: "compact" | "hero" | "recommendation";
  communityName?: string;
  slug: string;
};

export const CommunityFollowToggle = ({
  className,
  communityName,
  followVariant,
  initialFollowing = false,
  hideFollowing = false,
  size,
  slug,
}: CommunityFollowToggleProps) => {
  const viewerId = useAppSelector((state) => state.user?.id);
  const { snapshot, begin } = useInteractionSnapshot(`${viewerId ?? "guest"}:${slug}`, {
    following: initialFollowing,
  });
  const { following } = snapshot;
  const followMutation = useFollowCommunity();
  const unfollowMutation = useUnfollowCommunity();
  const conversion = useProgressiveConversion();
  const pending = followMutation.isPending || unfollowMutation.isPending;

  const handleToggle = useCallback(() => {
    if (pending) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_comunidade", {
        intent: {
          payload: {
            communitySlug: slug,
          },
          type: "follow_community",
        },
      });
      return;
    }

    const previousFollowing = following;
    const nextFollowing = !previousFollowing;
    const interaction = begin({ following: nextFollowing });

    const mutation = previousFollowing ? unfollowMutation : followMutation;
    mutation.mutate(slug, {
      onError: () => {
        interaction.onError();
      },
      onSuccess: (data) => {
        interaction.onSuccess({ following: data.following });
      },
    });
  }, [begin, conversion, followMutation, following, pending, slug, unfollowMutation]);

  useEffect(() => {
    if (!conversion.isAuthenticated || following || pending) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "follow_community" &&
        String(candidate.payload?.communitySlug ?? "") === slug,
    );

    if (!intent) return;

    window.setTimeout(handleToggle, 0);
  }, [conversion, following, handleToggle, pending, slug]);

  if (hideFollowing && following) return null;

  return (
    <CommunityFollowButton
      aria-label={
        communityName ? `${following ? "Deixar de seguir" : "Seguir"} ${communityName}` : undefined
      }
      className={className}
      followVariant={followVariant}
      following={following}
      onClick={handleToggle}
      pending={pending}
      size={size}
    />
  );
};

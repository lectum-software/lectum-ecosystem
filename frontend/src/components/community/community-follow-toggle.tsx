"use client";

import { useCallback, useEffect, useState } from "react";
import { useFollowCommunity, useUnfollowCommunity } from "@/api/callers/community";
import { CommunityFollowButton } from "@/components/community/community-follow-button";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";

type CommunityFollowToggleProps = {
  className?: string;
  followVariant?: "primary" | "secondary";
  initialFollowing?: boolean;
  size?: "compact" | "hero";
  slug: string;
};

export const CommunityFollowToggle = ({
  className,
  followVariant,
  initialFollowing = false,
  size,
  slug,
}: CommunityFollowToggleProps) => {
  const [following, setFollowing] = useState(initialFollowing);
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
    setFollowing(nextFollowing);

    const mutation = previousFollowing ? unfollowMutation : followMutation;
    mutation.mutate(slug, {
      onError: () => {
        setFollowing(previousFollowing);
      },
      onSuccess: (data) => {
        setFollowing(data.following);
      },
    });
  }, [conversion, followMutation, following, pending, slug, unfollowMutation]);

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

  return (
    <CommunityFollowButton
      className={className}
      followVariant={followVariant}
      following={following}
      onClick={handleToggle}
      pending={pending}
      size={size}
    />
  );
};

"use client";

import { useState } from "react";
import { useFollowCommunity, useUnfollowCommunity } from "@/api/callers/community";
import { CommunityFollowButton } from "@/components/community/community-follow-button";

type CommunityFollowToggleProps = {
  className?: string;
  initialFollowing?: boolean;
  slug: string;
};

export const CommunityFollowToggle = ({
  className,
  initialFollowing = false,
  slug,
}: CommunityFollowToggleProps) => {
  const [following, setFollowing] = useState(initialFollowing);
  const followMutation = useFollowCommunity();
  const unfollowMutation = useUnfollowCommunity();
  const pending = followMutation.isPending || unfollowMutation.isPending;

  const handleToggle = () => {
    if (pending) return;

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
  };

  return (
    <CommunityFollowButton
      className={className}
      following={following}
      onClick={handleToggle}
      pending={pending}
    />
  );
};

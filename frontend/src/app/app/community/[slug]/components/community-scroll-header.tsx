"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import { CommunityFollowButton } from "@/components/community/community-follow-button";
import { cn } from "@/lib/utils";
import { useCommunityVisualPalette } from "../modules/palette";
import { CommunityHeader, CommunityLogo } from "./community-header";

type CommunityHeaderProps = ComponentProps<typeof CommunityHeader>;

export const CommunityStickyBar = ({
  community,
  following,
  membershipPending,
  onToggleFollow,
  visible,
}: Pick<
  CommunityHeaderProps,
  "community" | "following" | "membershipPending" | "onToggleFollow"
> & {
  visible: boolean;
}) => {
  const palette = useCommunityVisualPalette(community);

  return (
    <div className="pointer-events-none sticky top-0 z-30 -mx-5 -mb-4 h-0 min-w-0 self-start">
      <div
        aria-hidden={!visible}
        inert={!visible}
        data-community-sticky-bar
        className={cn(
          "flex h-16 min-w-0 items-center gap-3 border-b border-border bg-surface px-5 shadow-sm",
          visible ? "pointer-events-auto visible" : "invisible",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <CommunityLogo compact community={community} palette={palette} />
          <span className="truncate text-sm font-bold text-foreground" title={community.name}>
            {community.name}
          </span>
        </div>
        <CommunityFollowButton
          disabled={membershipPending}
          following={following}
          onClick={onToggleFollow}
          pending={membershipPending}
          size="hero"
        />
      </div>
    </div>
  );
};

export const CommunityScrollHeader = (props: CommunityHeaderProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    // Match the profile: hand off the action only after its original row leaves the top.
    const update = () => setVisible(anchor.getBoundingClientRect().bottom <= 0);
    update();
    const observer = new IntersectionObserver(update, { threshold: 0 });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <CommunityStickyBar {...props} visible={visible} />
      <CommunityHeader {...props} followAnchorRef={anchorRef} />
    </>
  );
};

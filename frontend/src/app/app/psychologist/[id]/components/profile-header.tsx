"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { getPsychologistDisplayName } from "../modules/support";
import { ProfileAvatar, ProfileHero } from "./hero";
import { ProfileFavoriteButton, type ProfileFavoriteProps } from "./profile-favorite-button";

export const ProfileStickyBar = ({
  visible,
  ...favoriteProps
}: ProfileFavoriteProps & { visible: boolean }) => {
  const { profile, canFavorite } = favoriteProps;
  const displayName = getPsychologistDisplayName(profile) || profile.name || "Profissional";

  return (
    <div className="pointer-events-none sticky top-0 z-30 h-0 min-w-0">
      <div
        aria-hidden={!visible}
        inert={!visible}
        data-profile-sticky-bar
        className={cn(
          "flex h-16 min-w-0 items-center gap-3 border-b border-border bg-surface px-5 shadow-sm",
          visible ? "pointer-events-auto visible" : "invisible",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ProfileAvatar compact profile={profile} />
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-bold text-foreground" title={displayName}>
              {displayName}
            </span>
            {profile.verified ? (
              <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-4 w-4 shrink-0" />
            ) : null}
          </div>
        </div>
        {canFavorite ? <ProfileFavoriteButton {...favoriteProps} /> : null}
      </div>
    </div>
  );
};

export const ProfileHeader = (props: ComponentProps<typeof ProfileHero>) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    // Only hand off the action after its original button has left the top of the viewport.
    const update = () => setVisible(anchor.getBoundingClientRect().bottom <= 0);
    update();
    const observer = new IntersectionObserver(update, { threshold: 0 });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <ProfileStickyBar {...props} visible={visible} />
      <ProfileHero {...props} favoriteAnchorRef={anchorRef} />
    </>
  );
};

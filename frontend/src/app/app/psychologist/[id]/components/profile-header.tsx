"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
import { cn } from "@/lib/utils";
import { getPsychologistDisplayName } from "../modules/support";
import { ProfileHero } from "./hero";
import { WhatsAppCta } from "./whatsapp-cta";

export const ProfileStickyBar = ({
  visible,
  profile,
}: {
  visible: boolean;
  profile: DirectoryPsychologistProfile;
}) => {
  const displayName = getPsychologistDisplayName(profile) || profile.name || "Profissional";
  const showContact = visible && Boolean(profile.whatsapp_url) && !profile.read_only;

  return (
    <div className="pointer-events-none sticky top-0 z-30 h-0 min-w-0">
      <div
        aria-hidden={!showContact}
        inert={!showContact}
        data-profile-sticky-bar
        className={cn(
          "flex h-16 min-w-0 items-center gap-3 border-b border-border bg-surface px-[18px] shadow-sm lg:px-8",
          showContact ? "pointer-events-auto visible" : "invisible",
        )}
      >
        <span
          className="line-clamp-2 min-w-0 flex-1 break-words text-xs font-bold text-foreground lg:text-sm"
          title={displayName}
        >
          {displayName}
        </span>
        <WhatsAppCta compact profile={profile} />
      </div>
    </div>
  );
};

export const ProfileHeader = (props: ComponentProps<typeof ProfileHero>) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const hasContact = Boolean(props.profile.whatsapp_url) && !props.profile.read_only;

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !hasContact) return;

    // A button below the viewport must not activate the sticky contact.
    const update = () => setVisible(anchor.getBoundingClientRect().bottom <= 0);
    update();
    const observer = new IntersectionObserver(update, { threshold: [0, 1] });
    observer.observe(anchor);
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hasContact]);

  return (
    <>
      <ProfileStickyBar profile={props.profile} visible={visible} />
      <ProfileHero {...props} contactAnchorRef={anchorRef} />
    </>
  );
};

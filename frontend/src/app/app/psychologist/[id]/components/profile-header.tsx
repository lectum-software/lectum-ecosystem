"use client";

import { ChevronLeft } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { getPsychologistDisplayName } from "../modules/support";
import { ProfileHero } from "./hero";
import { WhatsAppCta } from "./whatsapp-cta";

export const ProfileStickyBar = ({
  visible,
  profile,
  onBack,
}: {
  visible: boolean;
  profile: DirectoryPsychologistProfile;
  onBack: () => void;
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
          "flex h-[56px] min-w-0 items-center gap-1 border-b border-border bg-surface pr-3 shadow-sm lg:pr-8",
          showContact ? "pointer-events-auto visible" : "invisible",
        )}
      >
        <button
          aria-label="Voltar"
          className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft className="h-5 w-5 translate-x-1" aria-hidden="true" />
        </button>
        <span className="-ml-1 flex min-w-0 flex-1 items-center gap-1" data-profile-sticky-identity>
          <span
            className="min-w-0 truncate text-[15px] font-semibold leading-[20px] text-foreground"
            data-profile-sticky-name
            title={displayName}
          >
            {displayName}
          </span>
          {profile.verified ? (
            <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-4 w-4 shrink-0" />
          ) : null}
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
      <ProfileStickyBar onBack={props.onBack} profile={props.profile} visible={visible} />
      <ProfileHero {...props} contactAnchorRef={anchorRef} />
    </>
  );
};

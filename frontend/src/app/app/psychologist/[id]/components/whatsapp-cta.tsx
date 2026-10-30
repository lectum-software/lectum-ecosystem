"use client";

import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppButtonContent,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { toPsychologistWhatsAppIdentity } from "../modules/support";

export const WhatsAppCta = ({
  profile,
  compact = false,
}: {
  profile: DirectoryPsychologistProfile;
  compact?: boolean;
}) => {
  if (!profile.whatsapp_url || profile.read_only) return null;

  const whatsappIdentity = toPsychologistWhatsAppIdentity(profile);
  const label = `Chamar ${getPsychologistWhatsappDisplayName(whatsappIdentity)} no WhatsApp`;

  return (
    <PsychologistWhatsAppRedirectButton
      aria-label={label}
      data-profile-whatsapp-cta={compact ? "sticky" : "hero"}
      className={cn(
        "inline-flex h-[44px] shrink-0 items-center justify-center rounded-full text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-contact focus-visible:ring-offset-2",
        compact
          ? "relative isolate gap-1.5 bg-transparent px-3 before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-[5px] before:-z-10 before:rounded-full before:bg-whatsapp-contact before:content-[''] hover:before:bg-whatsapp-contact/90"
          : "w-full min-w-0 gap-2 bg-whatsapp-contact px-3 hover:bg-whatsapp-contact/90",
      )}
      psychologist={whatsappIdentity}
      title={label}
      trackingContext={{
        pageKind: "psychologist_profile",
        targetId: profile.id,
        targetType: "psychologist",
      }}
    >
      {compact ? (
        <>
          <WhatsAppIcon
            className="h-[18px] w-[18px] shrink-0 overflow-visible"
            viewBox="-0.75 -0.75 21.5 21.5"
            aria-hidden="true"
          />
          <span className="py-[2px] text-[13px] font-semibold leading-[20px]">WhatsApp</span>
        </>
      ) : (
        <PsychologistWhatsAppButtonContent
          iconClassName="h-[18px] w-[18px]"
          label="Chamar no WhatsApp"
          labelClassName="py-[2px] text-[14px] font-semibold leading-[22px]"
        />
      )}
    </PsychologistWhatsAppRedirectButton>
  );
};

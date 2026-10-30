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
        "inline-flex h-[44px] shrink-0 items-center justify-center rounded-full bg-whatsapp-contact text-primary-foreground transition-colors hover:bg-whatsapp-contact/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-contact focus-visible:ring-offset-2",
        compact
          ? "gap-2 px-3 text-[11px] font-semibold"
          : "w-full min-w-0 gap-2 px-3 text-sm font-semibold",
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
          <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
          <span>WhatsApp</span>
        </>
      ) : (
        <PsychologistWhatsAppButtonContent
          iconClassName="h-[18px] w-[18px]"
          label="Chamar no WhatsApp"
        />
      )}
    </PsychologistWhatsAppRedirectButton>
  );
};

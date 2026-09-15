"use client";
import type { DirectoryPsychologistProfile } from "@/api/generator/types/directory";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppButtonContent,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

import { toPsychologistWhatsAppIdentity } from "../modules/support";

export const WhatsAppCta = ({
  profile,
  trafficOrigin,
}: {
  profile: DirectoryPsychologistProfile;
  trafficOrigin?: string | null;
}) => {
  if (!profile.whatsapp_url) {
    return null;
  }

  const whatsappIdentity = toPsychologistWhatsAppIdentity(profile);
  const whatsappName = getPsychologistWhatsappDisplayName(whatsappIdentity);
  const whatsappTrackingPath =
    trafficOrigin === "community_top_mentors" ? "/comunidades/top-mentores" : undefined;
  const whatsappTrackingContext = {
    pageKind: "psychologist_profile",
    ...(whatsappTrackingPath ? { path: whatsappTrackingPath } : {}),
    targetId: profile.id,
    targetType: "psychologist",
  };

  return (
    <>
      <div
        className="fixed inset-x-3 z-30 rounded-[18px] border border-border bg-surface/96 p-2 shadow-lectum-soft backdrop-blur sm:inset-x-4 lg:hidden"
        style={{ bottom: "var(--lectum-mobile-nav-aware-fab-bottom)" }}
      >
        <div className="mx-auto w-full max-w-[430px]">
          <PsychologistWhatsAppRedirectButton
            className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-[8px] bg-success px-3 text-[13px] font-bold text-primary-foreground transition hover:bg-success/90"
            psychologist={whatsappIdentity}
            trackingContext={whatsappTrackingContext}
          >
            <PsychologistWhatsAppButtonContent
              iconClassName="h-4 w-4"
              label={`Fale com ${whatsappName}`}
            />
          </PsychologistWhatsAppRedirectButton>
        </div>
      </div>

      <PsychologistWhatsAppRedirectButton
        aria-label={`Fale com ${whatsappName} no WhatsApp`}
        className="group fixed right-5 bottom-10 z-40 hidden h-14 w-14 place-items-center rounded-full border-[5px] border-media-foreground bg-success text-primary-foreground shadow-lectum-soft transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:bg-success hover:shadow-lectum-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:animate-[lectum-desktop-create-float_4.2s_ease-in-out_infinite] lg:grid lg:h-16 lg:w-16 xl:right-20 2xl:right-28"
        psychologist={whatsappIdentity}
        title={`Fale com ${whatsappName}`}
        trackingContext={whatsappTrackingContext}
      >
        <WhatsAppIcon
          className="h-7 w-7 transition group-hover:scale-105 lg:h-8 lg:w-8"
          aria-hidden="true"
        />
        <span className="sr-only">Fale com {whatsappName}</span>
      </PsychologistWhatsAppRedirectButton>
    </>
  );
};

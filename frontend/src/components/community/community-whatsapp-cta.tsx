"use client";

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppButtonContent,
  type PsychologistWhatsAppIdentity,
  PsychologistWhatsAppRedirectButton,
  type PsychologistWhatsAppTrackingContext,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";

export type CommunityWhatsAppAuthor = {
  avatar?: string | null;
  crp?: string | null;
  id: string;
  name: string;
  type_label?: string | null;
  whatsapp_name?: string | null;
  whatsapp_url?: string | null;
};

type CommunityWhatsAppCtaProps = {
  attached?: boolean;
  overVideo?: boolean;
  videoLabelExpanded?: boolean;
  className?: string;
  size?: "xs" | "sm";
  psychologist: PsychologistWhatsAppIdentity;
  stopPropagation?: boolean;
  trackingContext?: PsychologistWhatsAppTrackingContext;
};

const WHATSAPP_CTA_FORWARD_ICON_SRC =
  "/svg/arrow_forward_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg";

export const toCommunityWhatsAppIdentity = (
  author: CommunityWhatsAppAuthor,
): PsychologistWhatsAppIdentity => ({
  avatar: author.avatar,
  crp: author.crp,
  id: author.id,
  name: normalizeProfessionalDisplayName(author.name) || author.name,
  typeLabel: author.type_label,
  whatsappName: author.whatsapp_name,
  whatsappUrl: author.whatsapp_url,
});

export const CommunityWhatsAppCta = ({
  attached = false,
  overVideo = false,
  videoLabelExpanded = true,
  className,
  size = "sm",
  psychologist,
  stopPropagation = false,
  trackingContext,
}: CommunityWhatsAppCtaProps) => {
  const headingLabel = "WhatsApp";
  const actionLabel = `Fale com ${getPsychologistWhatsappDisplayName(psychologist)}`;

  if (overVideo) {
    return (
      <PsychologistWhatsAppRedirectButton
        aria-label={`${actionLabel} pelo WhatsApp`}
        className={cn(
          "relative isolate flex h-12 w-full min-w-0 items-center gap-2 overflow-hidden rounded-none border-0 bg-media-background/10 px-3.5 py-0 text-left text-media-foreground shadow-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-media-foreground disabled:opacity-60",
          className,
        )}
        data-post-card-ignore-click="true"
        data-community-video-contact="true"
        data-contact-expanded={videoLabelExpanded}
        psychologist={psychologist}
        stopPropagation
        trackingContext={trackingContext}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 origin-left bg-whatsapp-contact transition-transform duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            videoLabelExpanded ? "scale-x-100" : "scale-x-0",
          )}
        />
        <WhatsAppIcon
          aria-hidden="true"
          className="h-[18px] w-[18px] shrink-0 overflow-visible text-media-foreground"
          viewBox="-0.75 -0.75 21.5 21.5"
        />
        <span
          aria-hidden="true"
          className="min-w-0 flex-1 truncate text-[13px] font-normal leading-5 text-media-foreground"
        >
          {actionLabel}
        </span>
        <ChevronRight aria-hidden="true" className="h-[21px] w-[21px] shrink-0" />
      </PsychologistWhatsAppRedirectButton>
    );
  }

  if (!attached) {
    return (
      <PsychologistWhatsAppRedirectButton
        aria-label={`${actionLabel} pelo WhatsApp`}
        title={`${actionLabel} pelo WhatsApp`}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full p-0 text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-60",
          size === "xs" ? "h-7 w-7" : "h-9 w-9",
          className,
        )}
        data-post-card-ignore-click="true"
        psychologist={psychologist}
        stopPropagation={stopPropagation}
        trackingContext={trackingContext}
      >
        <WhatsAppIcon aria-hidden="true" className="h-[17px] w-[17px] shrink-0" />
      </PsychologistWhatsAppRedirectButton>
    );
  }

  return (
    <PsychologistWhatsAppRedirectButton
      className={cn(
        "grid min-w-0 max-w-full grid-cols-1 content-center justify-items-start border border-border bg-surface text-left text-foreground shadow-none transition hover:border-border hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.995] dark:border-border dark:bg-surface dark:text-foreground dark:hover:bg-surface-muted",
        attached
          ? "-mt-px w-full gap-1.5 rounded-t-none rounded-b-[15px] border-t-0 px-3.5 pt-3.5 pb-4"
          : "w-fit gap-1.5 rounded-[15px] px-3.5 py-3",
        className,
      )}
      data-post-card-ignore-click="true"
      psychologist={psychologist}
      stopPropagation={stopPropagation}
      trackingContext={trackingContext}
    >
      <span className="min-w-0 max-w-full overflow-visible whitespace-nowrap text-[12px] font-medium leading-[1.35] text-muted dark:text-muted">
        {headingLabel}
      </span>
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 overflow-visible text-[13px] font-semibold leading-[1.35] text-foreground dark:text-foreground">
        <PsychologistWhatsAppButtonContent
          iconClassName="h-4 w-4 text-muted dark:text-muted"
          label={actionLabel}
          labelClassName="text-left leading-[1.35] text-current"
        />
        <Image
          alt=""
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0"
          height={14}
          src={WHATSAPP_CTA_FORWARD_ICON_SRC}
          width={14}
        />
      </span>
    </PsychologistWhatsAppRedirectButton>
  );
};

"use client";

import Image from "next/image";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppButtonContent,
  type PsychologistWhatsAppIdentity,
  PsychologistWhatsAppRedirectButton,
  type PsychologistWhatsAppTrackingContext,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
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
  className?: string;
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
  className,
  psychologist,
  stopPropagation = false,
  trackingContext,
}: CommunityWhatsAppCtaProps) => {
  const headingLabel = "WhatsApp";
  const actionLabel = `Fale com ${getPsychologistWhatsappDisplayName(psychologist)}`;

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

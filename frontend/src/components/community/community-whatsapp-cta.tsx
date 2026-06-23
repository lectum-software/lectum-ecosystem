"use client";

import {
  PsychologistWhatsAppButtonContent,
  type PsychologistWhatsAppIdentity,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { cn } from "@/lib/utils";

export type CommunityWhatsAppAuthor = {
  avatar?: string | null;
  crp?: string | null;
  id: string;
  name: string;
  type_label?: string | null;
  whatsapp_url?: string | null;
};

type CommunityWhatsAppCtaProps = {
  attached?: boolean;
  className?: string;
  psychologist: PsychologistWhatsAppIdentity;
  stopPropagation?: boolean;
};

export const toCommunityWhatsAppIdentity = (
  author: CommunityWhatsAppAuthor,
): PsychologistWhatsAppIdentity => ({
  avatar: author.avatar,
  crp: author.crp,
  id: author.id,
  name: author.name,
  typeLabel: author.type_label,
  whatsappUrl: author.whatsapp_url,
});

export const CommunityWhatsAppCta = ({
  attached = false,
  className,
  psychologist,
  stopPropagation = false,
}: CommunityWhatsAppCtaProps) => (
  <PsychologistWhatsAppRedirectButton
    className={cn(
      "grid min-w-0 max-w-full grid-cols-1 content-center justify-items-start gap-1 rounded-[15px] border border-[#D7DEE8] bg-white px-3.5 py-2.5 text-left text-[#1F2A3D] shadow-none transition hover:border-[#BFC9D7] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.995] dark:border-border dark:bg-surface dark:text-foreground dark:hover:bg-surface-muted",
      attached ? "w-full" : "w-fit",
      className,
    )}
    data-post-card-ignore-click="true"
    psychologist={psychologist}
    stopPropagation={stopPropagation}
  >
    <span className="min-w-0 max-w-full truncate text-[12px] font-extrabold leading-none text-[#64748B] dark:text-muted">
      {psychologist.name}
    </span>
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13px] font-black leading-none text-[#1F2A3D] dark:text-foreground">
      <PsychologistWhatsAppButtonContent
        iconClassName="h-4 w-4 text-[#64748B] dark:text-muted"
        labelClassName="text-left text-current"
      />
    </span>
  </PsychologistWhatsAppRedirectButton>
);

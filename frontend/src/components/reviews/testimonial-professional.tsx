"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
import type { DirectoryPsychologist } from "@/api/generator/types/directory";
import { getPsychologistTitle } from "@/app/app/psychologist/[id]/modules/support";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";

export type TestimonialProfessional = Pick<
  DirectoryPsychologist,
  "id" | "name" | "avatar" | "gender" | "verified"
>;

export const TestimonialProfessionalIdentity = ({
  professional,
  fallbackName = "Psicólogo",
  compact = false,
}: {
  professional?: TestimonialProfessional;
  fallbackName?: string;
  compact?: boolean;
}) => {
  const name = professional
    ? normalizeProfessionalDisplayName(professional.name) || professional.name
    : fallbackName;
  const avatar = resolvePublicMediaUrl(professional?.avatar);
  return (
    <div className="flex min-w-0 items-center gap-2.5" data-testimonial-professional>
      <span
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-muted",
          compact ? "size-8" : "size-11",
        )}
      >
        {avatar ? (
          <Image
            alt={name}
            src={avatar}
            fill
            sizes={compact ? "32px" : "44px"}
            className="object-cover"
            unoptimized={isPublicMediaUrl(professional?.avatar)}
          />
        ) : (
          <UserRound aria-hidden className={compact ? "size-4" : "size-5"} />
        )}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 break-words text-sm font-semibold leading-5">{name}</span>
          {professional?.verified ? (
            <VerifiedBadgeIcon aria-label="Perfil verificado" className="size-4 shrink-0" />
          ) : null}
        </div>
        {professional ? (
          <p className="text-xs leading-5 text-muted">
            {getPsychologistTitle(professional.gender)}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export const TESTIMONIAL_DESCRIPTION = "Relatos sobre experiências com este psicólogo na Lectum";

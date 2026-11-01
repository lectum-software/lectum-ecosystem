"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
import type { DirectoryPsychologist } from "@/api/generator/types/directory";
import type { FreeProfessionalProfile } from "@/api/generator/types/free-profile";
import type { user } from "@/api/generator/types/user";
import { getPsychologistTitle } from "@/app/app/psychologist/[id]/modules/support";
import { AuthorAvatar } from "@/components/community/community-post-card-author";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { formatCommunityPostTime } from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";

export type TestimonialProfessional = Pick<
  DirectoryPsychologist,
  "id" | "name" | "avatar" | "gender" | "verified"
>;

export const getOwnTestimonialProfessional = (
  account: user | null,
  privateProfile?: FreeProfessionalProfile,
): TestimonialProfessional | undefined => {
  if (account?.role !== "psicologo" || !account.id) return undefined;
  const ownProfile = privateProfile?.user.id === account.id ? privateProfile : undefined;
  return {
    id: account.id,
    name: ownProfile?.user.name || account.name || "Psicólogo",
    avatar: ownProfile ? ownProfile.user.avatar : (account.avatar ?? null),
    gender: ownProfile?.profile.gender ?? null,
    verified: Boolean(
      ownProfile &&
        !ownProfile.plan.is_free &&
        (ownProfile.profile.crp_status === "aprovado" ||
          ownProfile.profile.cfp_verified_at ||
          ownProfile.plan.is_courtesy),
    ),
  };
};

export const TestimonialProfessionalIdentity = ({
  professional,
  fallbackName = "Psicólogo",
  compact = false,
  date,
}: {
  professional?: TestimonialProfessional;
  fallbackName?: string;
  compact?: boolean;
  date?: string | null;
}) => {
  const name = professional
    ? normalizeProfessionalDisplayName(professional.name) || professional.name
    : fallbackName;
  const avatar = resolvePublicMediaUrl(professional?.avatar);
  if (compact) {
    return (
      <div
        className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-2"
        data-testimonial-professional
      >
        <div className="relative [&>span]:size-6">
          <AuthorAvatar avatar={professional?.avatar ?? null} name={name} />
        </div>
        <div className="grid min-w-0 gap-0.5 px-0.5 py-0.5">
          <div className="flex min-w-0 items-center gap-1">
            <span className="min-w-0 break-words text-xs font-bold leading-tight">{name}</span>
            {professional?.verified ? (
              <VerifiedBadgeIcon aria-label="Perfil verificado" className="size-2.5 shrink-0" />
            ) : null}
          </div>
          <p className="text-[10px] font-semibold leading-tight text-muted">
            {professional ? getPsychologistTitle(professional.gender) : null}
            {professional && date ? " • " : null}
            {date ? (
              <time className="inline-block whitespace-nowrap" dateTime={date}>
                {formatCommunityPostTime(date)}
              </time>
            ) : null}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-2.5 text-left" data-testimonial-professional>
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
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 break-words text-sm font-black leading-5">{name}</span>
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

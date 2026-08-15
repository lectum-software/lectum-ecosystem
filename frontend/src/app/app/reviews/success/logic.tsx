"use client";

import { CheckCircle2, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useReviewEligibility } from "@/api/callers/reviews";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psicóloga" : "Psicólogo";
};

const getInitials = (name?: string | null) => {
  const parts = String(name ?? "")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const ReviewSuccessProfessionalAvatar = ({
  avatar,
  name,
}: {
  avatar?: string | null;
  name?: string | null;
}) => {
  const avatarSrc = resolvePublicMediaUrl(avatar ?? null);
  const displayName = name?.trim() || "profissional avaliado";

  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-primary">
      {avatarSrc ? (
        <Image
          alt={`Foto de perfil de ${displayName}`}
          className="object-cover"
          fill
          sizes="48px"
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(avatar ?? null)}
        />
      ) : name ? (
        <span className="text-sm font-extrabold" aria-hidden="true">
          {getInitials(name)}
        </span>
      ) : (
        <UserRound className="h-5 w-5" aria-hidden="true" />
      )}
    </span>
  );
};

export const ReviewsSuccessLogic = () => {
  const psychologistId = useSearchParams().get("psychologist_id");
  const eligibility = useReviewEligibility(psychologistId ?? "", Boolean(psychologistId));
  const professional = eligibility.data;
  const professionalInfo = professional
    ? `${getPsychologistTitle(professional.psychologist_gender)} • ${formatCrpLabel(
        professional.psychologist_crp,
      )}`
    : null;

  return (
    <PrivateTemplate>
      <section className="mx-auto grid min-h-[70vh] w-full max-w-[390px] place-items-center gap-8 text-center sm:max-w-[430px]">
        <div className="grid justify-items-center gap-5">
          <span className="grid h-40 w-40 place-items-center rounded-full bg-primary-soft text-primary">
            <CheckCircle2 className="h-20 w-20" aria-hidden />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Avaliação enviada!</h1>
            <p className="mt-4 text-base leading-7 text-muted">
              Obrigado por compartilhar. Seu depoimento valoriza o trabalho do profissional e ajuda
              outros pacientes.
            </p>
          </div>
          <section className="flex w-full items-center gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 text-left shadow-[var(--lectum-shadow-soft)]">
            <ReviewSuccessProfessionalAvatar
              avatar={professional?.psychologist_avatar}
              name={professional?.psychologist_name}
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-primary">AVALIAÇÃO CONCLUÍDA</p>
              <p className="mt-1 inline-flex max-w-full items-center gap-1.5 font-semibold text-foreground">
                <span className="min-w-0 truncate">
                  {professional?.psychologist_name ??
                    (eligibility.isLoading ? "Carregando profissional" : "Profissional avaliado")}
                </span>
                {professional?.psychologist_verified ? (
                  <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-4 w-4" />
                ) : null}
              </p>
              {professionalInfo ? (
                <p className="mt-0.5 truncate text-sm font-medium text-muted">{professionalInfo}</p>
              ) : null}
            </div>
          </section>
        </div>
        <div className="grid w-full gap-3">
          <Button asChild>
            <Link href={DEFAULT_COMMUNITY_FEED_HREF}>Finalizar</Link>
          </Button>
        </div>
      </section>
    </PrivateTemplate>
  );
};

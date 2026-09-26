"use client";

import { ArrowLeft, Medal, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useCommunityTopMentors } from "@/api/callers/community";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { CommunityTopMentor } from "@/api/generator/types/community";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { getCommunityInitials } from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import { publicTopMentorsHref } from "@/utils/public-routes";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveRankingError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Comunidade não encontrada ou indisponível para o ranking.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar o ranking de mentores.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar o ranking de mentores agora.";
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getMentorProfessionalDisplayName = (mentor: CommunityTopMentor) =>
  normalizeProfessionalDisplayName(mentor.professional.name) || mentor.professional.name;

const rankTone = (position: number) => {
  if (position === 1) {
    return {
      listAccent: "text-top-mentor-gold",
      metal: "top-mentor-metal--gold",
      name: "text-top-mentor-gold",
      positionMedal: "top-mentor-position-medal top-mentor-metal--gold",
      podiumColumn: "top-mentor-podium-column--gold",
    };
  }

  if (position === 2) {
    return {
      listAccent: "text-muted",
      metal: "top-mentor-metal--silver",
      name: "text-muted",
      positionMedal: "top-mentor-position-medal top-mentor-metal--silver",
      podiumColumn: "top-mentor-podium-column--silver",
    };
  }

  if (position === 3) {
    return {
      listAccent: "text-top-mentor-bronze",
      metal: "top-mentor-metal--bronze",
      name: "text-top-mentor-bronze",
      positionMedal: "top-mentor-position-medal top-mentor-metal--bronze",
      podiumColumn: "top-mentor-podium-column--bronze",
    };
  }

  return {
    listAccent: "text-subtle",
    metal: "",
    name: "text-foreground dark:text-foreground",
    positionMedal: "border border-border bg-background text-muted",
    podiumColumn: "",
  };
};

const professionLabel = (mentor: CommunityTopMentor) =>
  mentor.professional.type_label || "Psicólogo(a)";

const topMentorProfileUrl = (profileUrl: string) => {
  const safeProfileUrl = normalizeSafeInternalRedirect(profileUrl, "/psicologos") || "/psicologos";
  const url = new URL(safeProfileUrl, "https://lectum.local");
  url.searchParams.set("traffic_origin", "community_top_mentors");

  return `${url.pathname}${url.search}${url.hash}`;
};

const Avatar = ({
  className,
  mentor,
  ringed = false,
  ringVariant = "podium",
  size = 56,
}: {
  className?: string;
  mentor: CommunityTopMentor;
  ringed?: boolean;
  ringVariant?: "podium" | "list";
  size?: number;
}) => {
  const avatarSrc = resolvePublicMediaUrl(mentor.professional.avatar);
  const displayName = getMentorProfessionalDisplayName(mentor);
  const tone = rankTone(mentor.position);
  const avatarContent = avatarSrc ? (
    <Image
      alt={displayName}
      className="object-cover"
      fill
      sizes={`${size}px`}
      src={avatarSrc}
      unoptimized={isPublicMediaUrl(mentor.professional.avatar)}
    />
  ) : (
    <span className="relative z-10">{getInitials(displayName)}</span>
  );

  if (ringed && tone.metal) {
    return (
      <span
        className={cn(
          "top-mentor-metal-ring grid shrink-0 place-items-center",
          ringVariant === "list" ? "p-[2px]" : "p-[5px]",
          tone.metal,
          className,
        )}
        style={{ aspectRatio: "1", maxWidth: "100%", width: size }}
      >
        <span
          className={cn(
            "relative z-10 grid h-full w-full place-items-center overflow-hidden rounded-full border-media-foreground bg-primary-soft text-sm font-black text-primary",
            ringVariant === "list" ? "border-2" : "border-[3px]",
          )}
        >
          {avatarContent}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border-4 border-media-foreground bg-primary-soft text-sm font-black text-primary shadow-[var(--lectum-shadow-soft)]",
        className,
      )}
      style={{ height: size, width: size }}
    >
      {avatarContent}
    </span>
  );
};

const PodiumMentor = ({
  columnClassName,
  className,
  delay = "0s",
  mentor,
  size,
}: {
  columnClassName?: string;
  className?: string;
  delay?: string;
  mentor: CommunityTopMentor;
  size: number;
}) => {
  const tone = rankTone(mentor.position);
  const isWinner = mentor.position === 1;
  const displayName = getMentorProfessionalDisplayName(mentor);
  // The API derives whatsapp_name from the configured professional_first_name.
  const firstName = mentor.professional.whatsapp_name?.trim() || displayName;

  return (
    <Link
      aria-label={`${mentor.position}º lugar: ${displayName}`}
      className={cn(
        "group grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-center text-center",
        className,
      )}
      href={topMentorProfileUrl(mentor.professional.profile_url)}
    >
      <span
        className={cn(
          "lectum-top-mentor-float relative z-10 grid min-w-0 grid-cols-[minmax(0,1fr)] overflow-visible place-items-center",
          "w-full gap-2 pb-1",
        )}
        style={{ animationDelay: delay }}
      >
        <Avatar mentor={mentor} ringed size={size} />
        <span className="min-h-5 max-w-full break-words text-sm font-medium leading-5 text-foreground [overflow-wrap:anywhere]">
          {firstName}
        </span>
      </span>
      <span
        className={cn(
          "top-mentor-podium-column relative grid w-full place-items-center",
          tone.podiumColumn,
          tone.metal,
          columnClassName,
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "top-mentor-column-number font-semibold leading-none tabular-nums",
            isWinner ? "text-4xl" : "text-3xl",
            tone.name,
          )}
        >
          {mentor.position}
        </span>
      </span>
    </Link>
  );
};

const RankingHero = ({
  communityAvatar,
  communityName,
  mentors,
}: {
  communityAvatar: string | null;
  communityName: string;
  mentors: CommunityTopMentor[];
}) => {
  const first = mentors[0];
  const second = mentors[1];
  const third = mentors[2];
  const communityAvatarSrc = resolvePublicMediaUrl(communityAvatar);

  return (
    <section className="relative box-border w-full min-w-0 max-w-full px-1 sm:px-6">
      <div className="relative z-10 grid w-full min-w-0 justify-items-center gap-7 overflow-visible text-center sm:gap-9">
        <div className="grid w-full justify-items-center gap-4">
          <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border-2 border-media-foreground bg-surface text-base font-semibold text-muted sm:h-16 sm:w-16">
            {communityAvatarSrc ? (
              <Image
                alt={`Avatar da comunidade ${communityName}`}
                className="object-cover"
                fill
                sizes="(min-width: 640px) 64px, 56px"
                src={communityAvatarSrc}
                unoptimized={isPublicMediaUrl(communityAvatar)}
              />
            ) : (
              getCommunityInitials(communityName)
            )}
          </span>
          <h1
            aria-label={`Top 5 mentores em ${communityName}`}
            className="grid w-full min-w-0 max-w-[24rem] gap-2 sm:max-w-2xl"
          >
            <span className="text-lg font-medium leading-tight tracking-normal text-muted dark:text-muted sm:text-xl">
              Top 5 Mentores em
            </span>
            <span className="max-w-full break-words text-balance text-3xl font-black leading-[1.08] tracking-normal text-foreground [overflow-wrap:anywhere] sm:text-5xl dark:text-foreground">
              {communityName}
            </span>
          </h1>
        </div>

        {first ? (
          <div className="grid w-full max-w-[430px] grid-cols-[1fr_1.34fr_1fr] items-end justify-center gap-2 overflow-visible sm:gap-3">
            <div className="flex min-w-0 justify-center overflow-visible">
              {second ? (
                <PodiumMentor
                  className="w-full"
                  columnClassName="h-[8.4rem] sm:h-[9rem]"
                  mentor={second}
                  size={124}
                  delay="0.35s"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 justify-center overflow-visible">
              <PodiumMentor
                className="w-full"
                columnClassName="h-[11rem] sm:h-[11.8rem]"
                mentor={first}
                size={166}
              />
            </div>
            <div className="flex min-w-0 justify-center overflow-visible">
              {third ? (
                <PodiumMentor
                  className="w-full"
                  columnClassName="h-[8.2rem] sm:h-[8.8rem]"
                  mentor={third}
                  size={124}
                  delay="0.7s"
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const RankingCard = ({ mentor }: { mentor: CommunityTopMentor }) => {
  const isTopThree = mentor.position <= 3;
  const professionalType = professionLabel(mentor);
  const canOpenWhatsApp = Boolean(mentor.professional.whatsapp_url);
  const displayName = getMentorProfessionalDisplayName(mentor);
  const whatsappName = getPsychologistWhatsappDisplayName({
    id: mentor.professional.id,
    name: displayName,
    whatsappName: mentor.professional.whatsapp_name,
  });

  return (
    <article className="flex w-full min-w-0 max-w-full items-center gap-2 border-b border-border/50 py-4 last:border-b-0">
      <Link
        aria-label={`Ver perfil de ${displayName}`}
        className="group/profile flex min-w-0 flex-1 items-center gap-2"
        href={topMentorProfileUrl(mentor.professional.profile_url)}
      >
        <span
          className="grid h-7 w-5 shrink-0 place-items-center text-sm font-medium tabular-nums text-muted"
          aria-hidden="true"
        >
          <span>{mentor.position}</span>
        </span>
        <Avatar mentor={mentor} ringed={isTopThree} ringVariant="list" size={50} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <strong className="break-words text-base font-bold leading-snug tracking-normal text-foreground transition group-hover/profile:text-primary dark:text-foreground">
              {displayName}
            </strong>
            <VerifiedBadgeIcon className="h-3 w-3 shrink-0" aria-label="Perfil verificado" />
          </span>
          <span className="mt-0.5 block truncate font-sans text-[0.82rem] font-semibold leading-5 tracking-[-0.01em] text-muted dark:text-muted">
            {professionalType}
          </span>
        </span>
      </Link>
      <PsychologistWhatsAppRedirectButton
        aria-label={`Fale com ${whatsappName || displayName} no WhatsApp`}
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition focus:outline-none focus:ring-4 focus:ring-success/15",
          canOpenWhatsApp
            ? "border-transparent bg-transparent text-success hover:border-success/20 hover:bg-transparent"
            : "cursor-not-allowed border-transparent bg-transparent text-subtle",
        )}
        psychologist={{
          avatar: mentor.professional.avatar,
          crp: mentor.professional.crp,
          id: mentor.professional.id,
          name: displayName,
          typeLabel: professionalType,
          whatsappName,
          whatsappUrl: mentor.professional.whatsapp_url,
        }}
        stopPropagation
        trackingContext={{
          pageKind: "community_top_mentors",
          targetId: mentor.professional.id,
          targetType: "psychologist",
        }}
      >
        <WhatsAppIcon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
      </PsychologistWhatsAppRedirectButton>
    </article>
  );
};

export const CommunityTopMentorsLogic = () => {
  const searchParams = useSearchParams();
  const community = searchParams.get("community") || undefined;
  const query = useMemo(() => ({ community, limit: 5, period: "all" as const }), [community]);
  const ranking = useCommunityTopMentors(query);
  const mentors = (ranking.data?.data ?? []).slice(0, 5);
  const communityData = ranking.data?.community ?? null;
  const communityName = communityData?.name ?? "Comunidades Lectum";
  const [shareFeedback, setShareFeedback] = useState("");
  const shareRanking = async () => {
    const url = new URL(publicTopMentorsHref(community), window.location.origin).toString();
    setShareFeedback("");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Top 5 Mentores em ${communityName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareFeedback("Link copiado.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setShareFeedback("Não foi possível compartilhar. Tente novamente.");
      }
    }
  };
  const errorMessage = ranking.isError ? resolveRankingError(ranking.error) : null;
  const pageStyle: CSSProperties & { "--top-mentor-backdrop": string } = {
    "--top-mentor-backdrop": communityData?.visual_soft_color ?? "var(--background)",
  };

  return (
    <PrivateTemplate contentClassName="max-w-none overflow-x-hidden bg-background px-0 py-0 sm:py-0 lg:pb-0">
      <section className="mx-auto grid min-h-screen w-full min-w-0 max-w-full content-start gap-0 bg-background sm:max-w-2xl lg:max-w-3xl">
        <header
          className="top-mentor-ranking-header grid min-w-0 content-start px-4 pt-4"
          style={pageStyle}
        >
          <nav aria-label="Ações do ranking" className="mb-4 flex items-center justify-between">
            <Link
              aria-label="Voltar para a comunidade"
              title="Voltar para a comunidade"
              href={community ? `/comunidades/${encodeURIComponent(community)}` : "/comunidades"}
              className="grid h-10 w-10 place-items-center rounded-full bg-media-background/15 text-primary-foreground backdrop-blur transition hover:bg-media-background/25 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <button
              aria-label="Compartilhar Top Mentores"
              title="Compartilhar Top Mentores"
              className="grid h-10 w-10 place-items-center rounded-full bg-media-background/15 text-primary-foreground backdrop-blur transition hover:bg-media-background/25 focus-visible:outline-2 focus-visible:outline-primary"
              onClick={shareRanking}
              type="button"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
          <p
            role="status"
            className={shareFeedback ? "mb-3 text-center text-sm text-muted" : "sr-only"}
          >
            {shareFeedback}
          </p>
          <RankingHero
            communityAvatar={communityData?.avatar_url ?? null}
            communityName={communityName}
            mentors={mentors}
          />
          {mentors.length > 0 ? (
            <p className="mx-auto max-w-sm px-2 pt-3 pb-5 text-center text-sm font-medium leading-relaxed text-muted sm:pt-4 sm:pb-6">
              Profissionais que mais acolhem e contribuem com a comunidade.
            </p>
          ) : null}
        </header>

        {ranking.isLoading || ranking.isPending ? (
          <div className="grid min-h-52 place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)] dark:bg-surface">
            <LoadingState label="Carregando mentores" />
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Não foi possível carregar" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {!ranking.isLoading && !ranking.isPending && !errorMessage && mentors.length === 0 ? (
          <EmptyState
            action={
              <Button asChild>
                <Link href={community ? `/comunidades/${community}` : "/comunidades"}>
                  Explorar comunidade
                </Link>
              </Button>
            }
            description="Ainda não há participação suficiente de profissionais elegíveis para formar o Top 5 desta comunidade."
            icon={Medal}
            title="Ranking sem dados suficientes"
          />
        ) : null}

        {mentors.length > 0 ? (
          <section
            aria-label="Ranking de mentores"
            className="mx-4 mb-6 grid min-w-0 rounded-[22px] border border-border bg-surface px-4 pt-3 pb-7 shadow-lectum-soft sm:mx-6 sm:px-6 sm:pt-4"
          >
            <div className="grid min-w-0">
              {mentors.map((mentor) => (
                <RankingCard key={mentor.professional.id} mentor={mentor} />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

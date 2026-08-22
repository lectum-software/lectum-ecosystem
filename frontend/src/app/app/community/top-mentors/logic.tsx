"use client";

import { ArrowLeft, Medal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useCommunityTopMentors } from "@/api/callers/community";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { CommunityTopMentor } from "@/api/generator/types/community";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { navigateBackWithFallback } from "@/utils/navigation-history";
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

const rankTone = (position: number) => {
  if (position === 1) {
    return {
      listAccent: "text-top-mentor-gold",
      metal: "top-mentor-metal--gold",
      name: "text-top-mentor-gold",
      positionMedal: "top-mentor-position-medal top-mentor-metal--gold",
    };
  }

  if (position === 2) {
    return {
      listAccent: "text-muted",
      metal: "top-mentor-metal--silver",
      name: "text-muted",
      positionMedal: "top-mentor-position-medal top-mentor-metal--silver",
    };
  }

  if (position === 3) {
    return {
      listAccent: "text-top-mentor-bronze",
      metal: "top-mentor-metal--bronze",
      name: "text-top-mentor-bronze",
      positionMedal: "top-mentor-position-medal top-mentor-metal--bronze",
    };
  }

  return {
    listAccent: "text-subtle",
    metal: "",
    name: "text-foreground dark:text-foreground",
    positionMedal: "border border-border bg-background text-muted",
  };
};

const professionLabel = (mentor: CommunityTopMentor) => {
  const headline = mentor.professional.headline ?? "";
  const match = headline.match(/psic[oó]log[ao]/i);

  if (!match) return "Psicólogo";

  const normalized = match[0].toLowerCase();
  return normalized.endsWith("a") ? "Psicóloga" : "Psicólogo";
};

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
  const tone = rankTone(mentor.position);
  const avatarContent = avatarSrc ? (
    <Image
      alt={mentor.professional.name}
      className="object-cover"
      fill
      sizes={`${size}px`}
      src={avatarSrc}
      unoptimized={isPublicMediaUrl(mentor.professional.avatar)}
    />
  ) : (
    <span className="relative z-10">{getInitials(mentor.professional.name)}</span>
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
        style={{ height: size, width: size }}
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
  className,
  delay = "0s",
  mentor,
  size,
}: {
  className?: string;
  delay?: string;
  mentor: CommunityTopMentor;
  size: number;
}) => {
  const tone = rankTone(mentor.position);
  const isWinner = mentor.position === 1;

  return (
    <Link
      className={cn(
        "group grid min-w-0 justify-items-center gap-2 text-center transition hover:-translate-y-1",
        className,
      )}
      href={topMentorProfileUrl(mentor.professional.profile_url)}
    >
      <span
        className="lectum-top-mentor-float relative grid overflow-visible place-items-center"
        style={{ animationDelay: delay }}
      >
        <Avatar mentor={mentor} ringed size={size} />
        <span
          className={cn(
            "absolute grid place-items-center rounded-full border-2 border-media-foreground text-[0.68rem] font-black",
            isWinner ? "-right-1 top-2 h-9 w-9" : "-right-2 -top-1 h-8 w-8",
            tone.positionMedal,
          )}
        >
          <span>{mentor.position}º</span>
        </span>
      </span>
      <span
        className={cn(
          "max-w-full truncate font-black tracking-[-0.02em] transition",
          isWinner ? "text-lg" : "text-xs",
          tone.name,
        )}
      >
        {mentor.professional.name}
      </span>
    </Link>
  );
};

const RankingHero = ({
  communityName,
  mentors,
}: {
  communityName: string;
  mentors: CommunityTopMentor[];
}) => {
  const first = mentors[0];
  const second = mentors[1];
  const third = mentors[2];

  return (
    <section className="relative box-border w-full min-w-0 max-w-full overflow-visible px-1 pt-5 pb-8 sm:px-6 sm:pt-8">
      <div className="relative grid w-full min-w-0 justify-items-center gap-8 overflow-visible text-center sm:gap-10">
        <h1
          aria-label={`Top 5 mentores em ${communityName}`}
          className="grid w-full min-w-0 max-w-[24rem] gap-2 sm:max-w-2xl"
        >
          <span className="text-[0.72rem] font-black uppercase leading-none tracking-[0.22em] text-muted dark:text-muted">
            Top 5 mentores em
          </span>
          <span className="max-w-full break-words text-balance text-3xl font-black leading-[1.02] tracking-[-0.045em] text-foreground [overflow-wrap:anywhere] sm:text-5xl dark:text-foreground">
            {communityName}
          </span>
        </h1>

        {first ? (
          <div className="grid w-[340px] max-w-full grid-cols-[86px_144px_86px] items-end justify-center gap-3 overflow-visible sm:w-[420px] sm:grid-cols-[96px_156px_96px] sm:gap-9">
            <div className="flex min-w-0 justify-center overflow-visible">
              {second ? (
                <PodiumMentor
                  className="mb-7 max-w-[6.4rem] sm:max-w-[7.5rem]"
                  mentor={second}
                  size={86}
                  delay="0.35s"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 justify-center overflow-visible">
              <PodiumMentor className="max-w-[10rem] sm:max-w-[12rem]" mentor={first} size={144} />
            </div>
            <div className="flex min-w-0 justify-center overflow-visible">
              {third ? (
                <PodiumMentor
                  className="mb-7 max-w-[6.4rem] sm:max-w-[7.5rem]"
                  mentor={third}
                  size={86}
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

  return (
    <article className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-visible rounded-[1.35rem] border border-border bg-surface px-3.5 py-3.5 shadow-none transition hover:-translate-y-0.5 hover:border-primary/30 dark:border-border dark:bg-surface">
      <Link
        aria-label={`Ver perfil de ${mentor.professional.name}`}
        className="group/profile flex min-w-0 flex-1 items-center gap-3"
        href={topMentorProfileUrl(mentor.professional.profile_url)}
      >
        <Avatar mentor={mentor} ringed={isTopThree} ringVariant="list" size={62} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <strong className="truncate text-base font-black tracking-[-0.02em] text-foreground transition group-hover/profile:text-primary dark:text-foreground">
              {mentor.professional.name}
            </strong>
            <VerifiedBadgeIcon className="h-3 w-3 shrink-0" aria-label="Perfil verificado" />
          </span>
          <span className="mt-0.5 block truncate font-sans text-[0.82rem] font-semibold leading-5 tracking-[-0.01em] text-muted dark:text-muted">
            {professionalType}
          </span>
        </span>
      </Link>
      <PsychologistWhatsAppRedirectButton
        aria-label={`Fale com ${
          mentor.professional.whatsapp_name || mentor.professional.name
        } no WhatsApp`}
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition focus:outline-none focus:ring-4 focus:ring-success/15",
          canOpenWhatsApp
            ? "border-transparent bg-transparent text-success hover:border-success/20 hover:bg-transparent"
            : "cursor-not-allowed border-transparent bg-transparent text-subtle",
        )}
        psychologist={{
          avatar: mentor.professional.avatar,
          crp: mentor.professional.crp,
          id: mentor.professional.id,
          name: mentor.professional.name,
          typeLabel: professionalType,
          whatsappName: mentor.professional.whatsapp_name,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const community = searchParams.get("community") || undefined;
  const query = useMemo(() => ({ community, limit: 5, period: "all" as const }), [community]);
  const ranking = useCommunityTopMentors(query);
  const mentors = (ranking.data?.data ?? []).slice(0, 5);
  const communityName = ranking.data?.community?.name ?? "Comunidades Lectum";
  const errorMessage = ranking.isError ? resolveRankingError(ranking.error) : null;

  return (
    <PrivateTemplate contentClassName="max-w-none overflow-x-hidden bg-background px-0">
      <section className="mx-auto grid w-full min-w-0 max-w-full gap-6 px-4 py-5 sm:max-w-2xl sm:px-0 lg:max-w-3xl">
        <header className="grid min-w-0 gap-5">
          <Button
            className="w-fit rounded-full"
            onClick={() => navigateBackWithFallback(router)}
            type="button"
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Button>

          <RankingHero communityName={communityName} mentors={mentors} />
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
          <section className="mx-auto grid w-full min-w-0 max-w-[680px] gap-4">
            <div className="grid min-w-0 gap-1.5">
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-foreground dark:text-foreground">
                Classificação geral
              </h2>
              <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted dark:text-muted">
                Profissionais que mais acolhem e contribuem com a comunidade.
              </p>
            </div>

            <div className="grid min-w-0 gap-3">
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

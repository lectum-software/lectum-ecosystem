"use client";

import { ArrowLeft, BadgeCheck, ChevronRight, Medal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useCommunityTopMentors } from "@/api/callers/community";
import type { CommunityTopMentor } from "@/api/generator/types/community";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { navigateBackWithFallback } from "@/utils/navigation-history";

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
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Comunidade não encontrada ou indisponível para o ranking.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar o ranking de mentores.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
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
      listRank: "top-mentor-list-medal top-mentor-metal--gold",
      metal: "top-mentor-metal--gold",
      name: "text-[#9C7924]",
      positionMedal: "top-mentor-position-medal top-mentor-metal--gold",
      soft: "bg-[#FFF8E5] text-[#9C7924]",
    };
  }

  if (position === 2) {
    return {
      listRank: "top-mentor-list-medal top-mentor-metal--silver",
      metal: "top-mentor-metal--silver",
      name: "text-[#64748B]",
      positionMedal: "top-mentor-position-medal top-mentor-metal--silver",
      soft: "bg-[#F4F6F8] text-[#64748B]",
    };
  }

  if (position === 3) {
    return {
      listRank: "top-mentor-list-medal top-mentor-metal--bronze",
      metal: "top-mentor-metal--bronze",
      name: "text-[#A8703A]",
      positionMedal: "top-mentor-position-medal top-mentor-metal--bronze",
      soft: "bg-[#FFF1E8] text-[#A8703A]",
    };
  }

  return {
    listRank: "bg-background text-muted",
    metal: "",
    name: "text-[#182033] dark:text-foreground",
    positionMedal: "border border-border bg-background text-muted",
    soft: "bg-background text-muted",
  };
};

const professionLabel = (mentor: CommunityTopMentor) => {
  const headline = mentor.professional.headline ?? "";
  const match = headline.match(/psic[oó]log[ao]/i);

  if (!match) return "Psicólogo";

  const normalized = match[0].toLowerCase();
  return normalized.endsWith("a") ? "Psicóloga" : "Psicólogo";
};

const Avatar = ({
  className,
  mentor,
  ringed = false,
  size = 56,
}: {
  className?: string;
  mentor: CommunityTopMentor;
  ringed?: boolean;
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
          "top-mentor-metal-ring grid shrink-0 place-items-center p-[5px]",
          tone.metal,
          className,
        )}
        style={{ height: size, width: size }}
      >
        <span className="relative z-10 grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-white bg-primary-soft text-sm font-black text-primary">
          {avatarContent}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-primary-soft text-sm font-black text-primary shadow-[var(--lectum-shadow-soft)]",
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
      href={mentor.professional.profile_url}
    >
      <span
        className="lectum-top-mentor-float relative grid overflow-visible place-items-center"
        style={{ animationDelay: delay }}
      >
        <Avatar mentor={mentor} ringed size={size} />
        <span
          className={cn(
            "absolute grid place-items-center rounded-full border-2 border-white text-[0.68rem] font-black",
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
      <div className="relative grid w-full min-w-0 justify-items-center gap-9 overflow-visible text-center">
        <div className="grid w-full min-w-0 gap-1.5">
          <h1 className="min-w-0 max-w-full text-2xl font-black leading-tight tracking-[-0.04em] text-[#182033] sm:text-3xl dark:text-foreground">
            Top 5 Mentores em
          </h1>
          <p className="max-w-full break-words font-serif text-3xl font-bold italic leading-tight text-primary [overflow-wrap:anywhere] sm:text-4xl">
            {communityName}
          </p>
        </div>

        {first ? (
          <div className="flex w-full min-w-0 max-w-full items-end justify-center gap-3 overflow-visible sm:gap-10">
            {second ? (
              <PodiumMentor
                className="mb-7 max-w-[6.2rem] sm:max-w-[7.5rem]"
                mentor={second}
                size={84}
                delay="0.35s"
              />
            ) : null}
            <PodiumMentor className="max-w-[10.5rem] sm:max-w-[12rem]" mentor={first} size={142} />
            {third ? (
              <PodiumMentor
                className="mb-7 max-w-[6.2rem] sm:max-w-[7.5rem]"
                mentor={third}
                size={84}
                delay="0.7s"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
};

const RankingCard = ({ mentor }: { mentor: CommunityTopMentor }) => {
  const tone = rankTone(mentor.position);
  const isTopThree = mentor.position <= 3;

  return (
    <Link
      className="group flex w-full min-w-0 max-w-full items-center gap-3 overflow-visible rounded-[1.35rem] border border-[#E5EAF0] bg-white px-3.5 py-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_16px_36px_rgba(15,23,42,0.09)] dark:border-border dark:bg-surface"
      href={mentor.professional.profile_url}
    >
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center gap-0.5 rounded-2xl text-xs font-black",
          isTopThree ? tone.listRank : tone.soft,
        )}
      >
        {isTopThree ? <Medal className="h-4 w-4" aria-hidden="true" /> : null}
        <span>{String(mentor.position).padStart(2, "0")}</span>
      </span>
      <Avatar mentor={mentor} ringed={isTopThree} size={62} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <strong className="truncate text-base font-black tracking-[-0.02em] text-[#182033] dark:text-foreground">
            {mentor.professional.name}
          </strong>
          <BadgeCheck
            className="h-4.5 w-4.5 shrink-0 fill-[#2da7ff] text-white"
            aria-label="Profissional verificado"
          />
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-black uppercase tracking-[0.08em] text-[#64748B] dark:text-muted">
          {professionLabel(mentor)}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#CBD5E1] transition group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
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
    <PrivateTemplate contentClassName="overflow-x-hidden bg-[#F6F8FB]">
      <section className="mx-auto grid w-full min-w-0 max-w-full gap-6 px-4 py-5 sm:max-w-2xl sm:px-0 lg:max-w-4xl">
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
          <div className="grid min-h-52 place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-white shadow-[var(--lectum-shadow-soft)] dark:bg-surface">
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
                <Link href={community ? `/app/community/${community}` : "/app/community"}>
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
          <section className="grid min-w-0 gap-4">
            <div className="grid min-w-0 gap-1.5">
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[#182033] dark:text-foreground">
                Classificação geral
              </h2>
              <p className="max-w-2xl text-sm font-medium leading-relaxed text-[#64748B] dark:text-muted">
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

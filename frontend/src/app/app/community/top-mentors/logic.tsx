"use client";

import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BarChart3,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Medal,
  MessageCircle,
  PhoneCall,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useCommunityTopMentors } from "@/api/callers/community";
import type {
  CommunityTopMentor,
  CommunityTopMentorsPeriodValue,
} from "@/api/generator/types/community";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PERIOD_OPTIONS: Array<{ label: string; value: CommunityTopMentorsPeriodValue }> = [
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
  { label: "Histórico", value: "all" },
];

const periodLabels: Record<CommunityTopMentorsPeriodValue, string> = {
  "30d": "últimos 30 dias",
  "90d": "últimos 90 dias",
  all: "histórico completo",
};

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

const formatNumber = (value: number) => value.toLocaleString("pt-BR");

const formatRating = (value: number) => {
  if (!value) return "Sem avaliações";

  return (value / 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const positionTone = (position: number) => {
  if (position === 1) return "text-warning bg-warning-soft border-warning/25";
  if (position === 2) return "text-muted bg-surface-muted border-border";
  if (position === 3) return "text-primary bg-primary-soft border-primary/25";

  return "text-muted bg-background border-border";
};

const Avatar = ({ mentor, size = 56 }: { mentor: CommunityTopMentor; size?: number }) => {
  const avatarSrc = resolvePublicMediaUrl(mentor.professional.avatar);

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-background bg-primary-soft text-sm font-black text-primary shadow-[var(--lectum-shadow-soft)]"
      style={{ height: size, width: size }}
    >
      {avatarSrc ? (
        <Image
          alt={mentor.professional.name}
          className="object-cover"
          fill
          sizes={`${size}px`}
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(mentor.professional.avatar)}
        />
      ) : (
        getInitials(mentor.professional.name)
      )}
    </span>
  );
};

const PodiumMentor = ({ mentor, size }: { mentor: CommunityTopMentor; size: number }) => (
  <Link
    className="group grid min-w-0 max-w-20 justify-items-center gap-2"
    href={mentor.professional.profile_url}
  >
    <span className="relative">
      <Avatar mentor={mentor} size={size} />
      <span
        className={cn(
          "absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border text-[0.68rem] font-black shadow-sm sm:h-8 sm:w-8 sm:text-xs",
          positionTone(mentor.position),
        )}
      >
        {mentor.position}º
      </span>
    </span>
    <span className="max-w-full truncate text-center text-xs font-bold text-muted transition group-hover:text-primary">
      {mentor.professional.name}
    </span>
  </Link>
);

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
    <section className="relative box-border w-full min-w-0 max-w-full overflow-hidden rounded-[2rem] border border-border bg-surface px-4 py-7 shadow-[var(--lectum-shadow-soft)] sm:px-5 sm:py-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-4 top-20 h-32 rounded-full bg-primary-soft blur-3xl sm:inset-x-8"
      />
      <div className="relative grid w-full min-w-0 justify-items-center gap-7 text-center">
        <div className="grid w-full min-w-0 gap-2">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
            Top 5 Mentores
          </p>
          <h1 className="min-w-0 max-w-full text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl">
            Mentores em
            <span className="mt-1 block max-w-full break-words font-serif text-2xl font-bold italic text-primary [overflow-wrap:anywhere] sm:text-3xl">
              {communityName}
            </span>
          </h1>
        </div>

        {first ? (
          <div className="flex w-full min-w-0 max-w-full items-end justify-center gap-1.5 overflow-hidden sm:gap-6">
            {second ? <PodiumMentor mentor={second} size={58} /> : null}
            <div className="grid min-w-0 max-w-[9rem] justify-items-center gap-3">
              <span className="relative">
                <span
                  className="absolute -inset-2 rounded-full bg-warning-soft sm:-inset-3"
                  aria-hidden="true"
                />
                <Avatar mentor={first} size={108} />
                <span className="absolute -right-1 top-1 grid h-9 w-9 place-items-center rounded-full border border-warning/25 bg-warning-soft text-xs font-black text-warning shadow-sm sm:-right-2 sm:h-10 sm:w-10 sm:text-sm">
                  1º
                </span>
              </span>
              <div className="grid min-w-0 max-w-full gap-1">
                <Link
                  className="max-w-full truncate text-lg font-black text-warning transition hover:text-primary"
                  href={first.professional.profile_url}
                >
                  {first.professional.name}
                </Link>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  {formatNumber(first.score)} pontos
                </span>
              </div>
            </div>
            {third ? <PodiumMentor mentor={third} size={58} /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
};

const MetricPill = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ThumbsUp;
  label: string;
  value: string;
}) => (
  <span className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold leading-4 text-muted">
    <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
    {value} {label}
  </span>
);

const RankingCard = ({ mentor }: { mentor: CommunityTopMentor }) => (
  <Link
    className="group grid w-full min-w-0 max-w-full gap-4 overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    href={mentor.professional.profile_url}
  >
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-sm font-black",
          positionTone(mentor.position),
        )}
      >
        {String(mentor.position).padStart(2, "0")}
      </span>
      <Avatar mentor={mentor} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <strong className="truncate text-base font-black text-foreground">
            {mentor.professional.name}
          </strong>
          <BadgeCheck
            className="h-4 w-4 shrink-0 text-primary"
            aria-label="Profissional verificado"
          />
        </span>
        <span className="mt-0.5 block truncate text-xs font-bold uppercase tracking-[0.08em] text-muted">
          {mentor.professional.headline ||
            (mentor.professional.crp ? formatCrpLabel(mentor.professional.crp) : null) ||
            "Psicólogo(a)"}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-subtle transition group-hover:translate-x-1 group-hover:text-primary" />
    </div>

    <div className="grid min-w-0 gap-3 rounded-2xl border border-border bg-background p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
          <Trophy className="h-4 w-4 text-warning" aria-hidden="true" />
          {formatNumber(mentor.score)} pontos
        </span>
        {mentor.badge ? (
          <span className="max-w-full rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary">
            {mentor.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <MetricPill
          icon={ThumbsUp}
          label="upvotes"
          value={formatNumber(mentor.metrics.upvotes_received)}
        />
        <MetricPill
          icon={ThumbsDown}
          label="downvotes"
          value={formatNumber(mentor.metrics.downvotes_received)}
        />
        <MetricPill
          icon={MessageCircle}
          label="comentários recebidos"
          value={formatNumber(mentor.metrics.comments_received)}
        />
        <MetricPill
          icon={Share2}
          label="compartilhamentos"
          value={formatNumber(mentor.metrics.shares_received)}
        />
        <MetricPill
          icon={Bookmark}
          label="salvamentos"
          value={formatNumber(mentor.metrics.saves_received)}
        />
        <MetricPill
          icon={PhoneCall}
          label="cliques WhatsApp"
          value={formatNumber(mentor.metrics.community_whatsapp_clicks)}
        />
        <MetricPill
          icon={CalendarDays}
          label="dias ativos"
          value={formatNumber(mentor.metrics.active_days)}
        />
        <MetricPill
          icon={UsersRound}
          label="posts"
          value={formatNumber(mentor.metrics.posts_published)}
        />
        <MetricPill
          icon={MessageCircle}
          label="respostas"
          value={formatNumber(mentor.metrics.replies_published)}
        />
        <MetricPill
          icon={ShieldAlert}
          label="posts removidos"
          value={formatNumber(mentor.metrics.removed_posts)}
        />
        <MetricPill icon={Star} label="nota" value={formatRating(mentor.professional.rating_avg)} />
      </div>
    </div>
  </Link>
);

const FormulaWeightCard = ({
  icon: Icon,
  label,
  value,
  tone = "positive",
}: {
  icon: typeof ThumbsUp;
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) => (
  <span className="min-w-0 rounded-2xl border border-border bg-background p-3 text-sm font-bold leading-5 text-muted">
    <Icon
      className={cn("mb-2 h-4 w-4", tone === "negative" ? "text-warning" : "text-primary")}
      aria-hidden="true"
    />
    {label} {value}
  </span>
);

export const CommunityTopMentorsLogic = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") || "30d") as CommunityTopMentorsPeriodValue;
  const safePeriod: CommunityTopMentorsPeriodValue = PERIOD_OPTIONS.some(
    (item) => item.value === period,
  )
    ? period
    : "30d";
  const community = searchParams.get("community") || undefined;
  const query = useMemo(
    () => ({ community, limit: 5, period: safePeriod }),
    [community, safePeriod],
  );
  const ranking = useCommunityTopMentors(query);
  const mentors = ranking.data?.data ?? [];
  const communityName = ranking.data?.community?.name ?? "Comunidades Lectum";
  const errorMessage = ranking.isError ? resolveRankingError(ranking.error) : null;

  const updatePeriod = (value: CommunityTopMentorsPeriodValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    if (community) params.set("community", community);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <PrivateTemplate contentClassName="overflow-x-hidden">
      <section className="mx-auto grid w-full min-w-0 max-w-full gap-6 sm:max-w-2xl lg:max-w-4xl">
        <header className="grid min-w-0 gap-5">
          <Button asChild className="w-fit rounded-full" variant="ghost">
            <Link href={community ? `/app/community/${community}` : "/app/community"}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </Link>
          </Button>

          <RankingHero communityName={communityName} mentors={mentors} />
        </header>

        <nav
          aria-label="Período do ranking"
          className="w-full min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-max gap-2 pb-1">
            {PERIOD_OPTIONS.map((item) => {
              const active = safePeriod === item.value;

              return (
                <button
                  aria-pressed={active}
                  className={cn(
                    "min-h-10 rounded-full border px-4 text-sm font-black transition",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-muted hover:border-primary/50 hover:bg-primary-soft hover:text-primary",
                  )}
                  key={item.value}
                  onClick={() => updatePeriod(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {ranking.isLoading || ranking.isPending ? (
          <div className="grid min-h-52 place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Calculando ranking real de mentores" />
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
            description="Ainda não há votos positivos ou participação suficiente de profissionais elegíveis para formar um Top 5 real neste período."
            icon={Medal}
            title="Ranking sem dados suficientes"
          />
        ) : null}

        {mentors.length > 0 ? (
          <section className="grid min-w-0 gap-4">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="grid min-w-0 gap-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                  Classificação geral
                </p>
                <h2 className="break-words text-2xl font-black tracking-tight text-foreground [overflow-wrap:anywhere]">
                  Profissionais que mais acolhem e contribuem
                </h2>
                <p className="text-sm leading-6 text-muted">
                  Pontuação derivada de eventos persistidos no {periodLabels[safePeriod]}.
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <div className="grid min-w-0 gap-3">
              {mentors.map((mentor) => (
                <RankingCard key={mentor.professional.id} mentor={mentor} />
              ))}
            </div>
          </section>
        ) : null}

        {ranking.data ? (
          <section className="grid w-full min-w-0 max-w-full gap-3 overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
            <div className="flex min-w-0 items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="min-w-0 text-lg font-black text-foreground">
                Como a pontuação é calculada
              </h2>
            </div>
            <p className="break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]">
              {ranking.data.formula.description}.
            </p>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <FormulaWeightCard
                icon={ThumbsUp}
                label="Upvote recebido"
                value={`+${ranking.data.formula.upvote_weight} pontos`}
              />
              <FormulaWeightCard
                icon={ThumbsDown}
                label="Downvote recebido"
                tone="negative"
                value={`-${ranking.data.formula.downvote_weight} pontos`}
              />
              <FormulaWeightCard
                icon={MessageCircle}
                label="Comentário recebido"
                value={`+${ranking.data.formula.comment_weight} pontos`}
              />
              <FormulaWeightCard
                icon={Share2}
                label="Compartilhamento"
                value={`+${ranking.data.formula.share_weight} pontos`}
              />
              <FormulaWeightCard
                icon={Bookmark}
                label="Salvamento"
                value={`+${ranking.data.formula.save_weight} pontos`}
              />
              <FormulaWeightCard
                icon={PhoneCall}
                label="Clique WhatsApp da comunidade"
                value={`+${ranking.data.formula.community_whatsapp_weight} pontos`}
              />
              <FormulaWeightCard
                icon={Award}
                label="Post publicado"
                value={`+${ranking.data.formula.post_weight} ponto`}
              />
              <FormulaWeightCard
                icon={MessageCircle}
                label="Resposta publicada"
                value={`+${ranking.data.formula.reply_weight} ponto`}
              />
              <FormulaWeightCard
                icon={CalendarDays}
                label="Dia ativo"
                value={`+${ranking.data.formula.active_day_weight} ponto`}
              />
              <FormulaWeightCard
                icon={ShieldAlert}
                label="Post removido"
                tone="negative"
                value={`penalidade progressiva de ${ranking.data.formula.removed_post_penalty_step} pontos`}
              />
            </div>
            {ranking.data.formula.notes.length > 0 ? (
              <div className="grid gap-2 rounded-2xl border border-warning/25 bg-warning-soft p-3 text-xs font-semibold leading-5 text-warning">
                {ranking.data.formula.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

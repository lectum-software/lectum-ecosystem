"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Copy,
  Eye,
  Heart,
  Info,
  Lightbulb,
  type LucideIcon,
  MessageSquare,
  PlayCircle,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePsychologistAnalytics } from "@/api/callers/psychologist-analytics";
import type {
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPeriodKey,
  PsychologistAnalyticsResponse,
} from "@/api/generator/types/psychologist-analytics";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

const PERIOD_OPTIONS: Array<{ label: string; value: PsychologistAnalyticsPeriodKey }> = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "3 meses", value: "90d" },
  { label: "Anual", value: "365d" },
  { label: "Período", value: "custom" },
];

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDefaultCustomRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  return {
    end_at: toInputDate(end),
    start_at: toInputDate(start),
  };
};

type AnalyticsCardView = {
  description: string;
  icon: LucideIcon;
  id: string;
  isUnavailable?: boolean;
  label: string;
  source?: PsychologistAnalyticsMetric["source"] | "untracked";
  value: string;
};

const resolveApiError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Não foi possível conectar à API agora. Tente novamente em instantes.";
};

const toCount = (value?: number) => (value ?? 0).toLocaleString("pt-BR");

const hasAnyRealEvent = (data?: PsychologistAnalyticsResponse) => {
  if (!data) return false;

  return (
    data.metrics.whatsapp_clicks > 0 ||
    data.metrics.reviews_received > 0 ||
    data.metrics.posts_published > 0 ||
    data.metrics.post_engagement > 0 ||
    data.metrics.rating_count_total > 0
  );
};

const metricCards = (data?: PsychologistAnalyticsResponse): AnalyticsCardView[] => [
  {
    id: "search_results",
    icon: Search,
    label: "Resultados de busca",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Quando houver rastreio de busca, o desempenho aparecerá aqui.",
  },
  {
    id: "profile_views",
    icon: Eye,
    label: "Aberturas de perfil",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Visualizações reais do perfil serão exibidas após o evento persistido.",
  },
  {
    id: "video_views",
    icon: PlayCircle,
    label: "Video views",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Engajamento do vídeo profissional quando a captura estiver disponível.",
  },
  {
    id: "whatsapp_clicks",
    icon: MessageSquare,
    label: "Conversões WhatsApp",
    value: toCount(data?.metrics.whatsapp_clicks),
    source: "contact_request",
    description: "Cliques reais no contato profissional dentro do período.",
  },
  {
    id: "reviews_received",
    icon: Star,
    label: "Avaliações",
    value: toCount(data?.metrics.reviews_received),
    source: "professional_review",
    description: "Avaliações publicadas que fortalecem sua reputação.",
  },
  {
    id: "favorited",
    icon: Heart,
    label: "Favoritado",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Sinais de interesse serão conectados a fontes reais futuras.",
  },
];

const ProfessionalPageHeader = ({ title }: { title: string }) => (
  <header className="grid h-14 grid-cols-[44px_1fr_44px] items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface px-2 shadow-[var(--lectum-shadow-soft)]">
    <Link
      aria-label="Voltar para perfil"
      className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary transition hover:bg-primary-soft/80"
      href="/app/profile"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden />
    </Link>
    <h1 className="min-w-0 text-center text-base font-extrabold tracking-[-0.02em] text-foreground">
      {title}
    </h1>
    <span aria-hidden />
  </header>
);

const PeriodTabs = ({
  current,
  disabled,
  onChange,
}: {
  current: PsychologistAnalyticsPeriodKey;
  disabled?: boolean;
  onChange: (period: PsychologistAnalyticsPeriodKey) => void;
}) => (
  <div
    className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    role="tablist"
  >
    <div className="flex min-w-max gap-1 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-1 shadow-[var(--lectum-shadow-soft)] sm:gap-2 md:min-w-0 md:justify-between">
      {PERIOD_OPTIONS.map((option) => {
        const active = option.value === current;

        return (
          <button
            aria-selected={active}
            className={cn(
              "h-9 whitespace-nowrap rounded-full px-2 text-[0.78rem] font-extrabold transition disabled:opacity-60 sm:h-10 sm:px-3 sm:text-sm md:flex-1",
              active
                ? "bg-primary text-surface shadow-[var(--lectum-shadow-soft)]"
                : "text-muted hover:bg-primary-soft/70 hover:text-primary",
            )}
            disabled={disabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

const PremiumAnalyticsBanner = () => (
  <section className="relative overflow-hidden rounded-[var(--lectum-card-radius)] border border-primary/20 bg-primary-soft p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
    <div
      aria-hidden
      className="-right-10 -top-12 absolute h-32 w-32 rounded-full bg-surface/70 blur-3xl"
    />
    <div className="relative grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-primary shadow-[var(--lectum-shadow-soft)] md:h-16 md:w-16">
        <BarChart3 className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
          Recurso profissional
        </p>
        <h2 className="mt-2 text-xl font-extrabold leading-7 text-foreground">
          Desbloqueie seus Analytics
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted md:text-base md:leading-7">
          Assine o plano profissional para acompanhar visualizações, cliques, desempenho do perfil e
          evolução dos seus resultados na Lectum.
        </p>
      </div>
      <Button asChild className="h-12 w-full rounded-full px-6 text-base md:w-auto">
        <Link href="/app/professional/billing/subscription">
          Fazer upgrade
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </div>
  </section>
);

const CustomPeriodFields = ({
  disabled,
  endAt,
  onChange,
  startAt,
}: {
  disabled?: boolean;
  endAt: string;
  onChange: (range: { end_at: string; start_at: string }) => void;
  startAt: string;
}) => (
  <div className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-3 shadow-[var(--lectum-shadow-soft)] sm:grid-cols-2">
    <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-subtle">
      Início
      <input
        className="h-11 min-w-0 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary disabled:opacity-60"
        disabled={disabled}
        max={endAt || undefined}
        onChange={(event) => onChange({ start_at: event.target.value, end_at: endAt })}
        type="date"
        value={startAt}
      />
    </label>
    <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-subtle">
      Fim
      <input
        className="h-11 min-w-0 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary disabled:opacity-60"
        disabled={disabled}
        min={startAt || undefined}
        onChange={(event) => onChange({ start_at: startAt, end_at: event.target.value })}
        type="date"
        value={endAt}
      />
    </label>
  </div>
);

const MetricCard = ({ locked, metric }: { locked?: boolean; metric: AnalyticsCardView }) => {
  const Icon = metric.icon;

  return (
    <article className="min-w-0 overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {locked ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/10 bg-primary-soft px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em] text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            Prévia
          </span>
        ) : null}
      </div>

      <h2 className="mt-4 text-base font-extrabold leading-6 text-foreground">{metric.label}</h2>
      <p className="mt-1 min-h-10 text-sm leading-5 text-muted">{metric.description}</p>

      <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/10 bg-primary-soft/70 px-3 py-2">
        <span
          className={cn(
            "min-w-0 text-2xl font-extrabold leading-none tracking-[-0.04em] text-foreground",
            locked && "select-none blur-[5px]",
          )}
        >
          {metric.value}
        </span>
        {metric.isUnavailable ? (
          <span className={cn("text-xs font-bold text-muted", locked && "select-none blur-[4px]")}>
            sem evento
          </span>
        ) : null}
      </div>
    </article>
  );
};

const ReviewsLinkCard = ({ link, locked }: { link: string; locked?: boolean }) => {
  const copyLink = async () => {
    if (locked) return;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link agora.");
    }
  };

  return (
    <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Star className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold leading-6 text-foreground">
            Link da minha página de avaliações
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Compartilhe com pacientes e fortaleça sua autoridade com depoimentos reais.
          </p>
        </div>
      </div>

      <div className="mt-4 flex h-12 min-w-0 items-center gap-3 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3">
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-semibold text-muted",
            locked && "select-none blur-[5px]",
          )}
        >
          {link}
        </p>
        <button
          aria-label="Copiar link de avaliações"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/10 bg-surface text-primary transition hover:bg-primary-soft disabled:opacity-50"
          disabled={locked}
          onClick={copyLink}
          type="button"
        >
          <Copy className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        {locked
          ? "O link e a coleta de avaliações ficam totalmente liberados após o upgrade."
          : "Incentive os pacientes a te avaliarem para aparecer nos primeiros resultados de busca."}
      </p>
    </section>
  );
};

const SpecialtySearchCard = () => (
  <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Search className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold tracking-[-0.02em] text-foreground">
          Busca por especialidades
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Entenda como sua presença aparece nas buscas por temas e especialidades.
        </p>
      </div>
      <Info className="ml-auto h-5 w-5 shrink-0 text-subtle" aria-hidden />
    </div>
    <div className="mt-4 rounded-[var(--lectum-control-radius)] border border-dashed border-primary/20 bg-primary-soft/40 p-4 text-sm leading-6 text-muted">
      Esta seção seguirá o layout do protótipo quando houver evento persistido de busca por
      especialidade. Nenhum percentual é simulado.
    </div>
  </section>
);

const ProTipCard = () => (
  <section className="flex gap-3 rounded-[var(--lectum-card-radius)] border border-primary/20 bg-primary-soft p-5 text-muted shadow-[var(--lectum-shadow-soft)]">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary">
      <Lightbulb className="h-5 w-5" aria-hidden />
    </span>
    <div className="min-w-0">
      <h2 className="text-base font-extrabold text-foreground">Dica Pro</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Vídeos de apresentação com alto engajamento geram até 3x mais conversões para o WhatsApp.
        Faça testes e descubra o que funciona melhor para você!
      </p>
    </div>
  </section>
);

export const ProfessionalAnalyticsLogic = () => {
  const [period, setPeriod] = useState<PsychologistAnalyticsPeriodKey>("30d");
  const [customRange, setCustomRange] = useState(getDefaultCustomRange);
  const user = useAppSelector((state) => state.user);
  const query = useMemo(
    () => (period === "custom" ? { period, ...customRange } : { period }),
    [customRange, period],
  );
  const analytics = usePsychologistAnalytics(query);
  const data = analytics.data;
  const errorMessage = analytics.isError ? resolveApiError(analytics.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const shouldShowError = Boolean(errorMessage && !isProfessionalPlanError);
  const isAnalyticsPreview = data?.access.mode === "preview" || isProfessionalPlanError;
  const hasEvents = hasAnyRealEvent(data);
  const reviewLink =
    typeof window === "undefined"
      ? "lectum.com.br/app/reviews/new"
      : `${window.location.origin}/app/reviews/new${user?.id ? `?psychologist_id=${user.id}` : ""}`;

  return (
    <PrivateTemplate showNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl">
        <ProfessionalPageHeader title="Meus Analytics" />

        <PeriodTabs current={period} disabled={analytics.isFetching} onChange={setPeriod} />
        {period === "custom" ? (
          <CustomPeriodFields
            disabled={analytics.isFetching}
            endAt={customRange.end_at}
            onChange={setCustomRange}
            startAt={customRange.start_at}
          />
        ) : null}

        {analytics.isLoading ? <LoadingState label="Carregando analytics reais" /> : null}

        {shouldShowError ? (
          <InlineAlert title="Erro ao consultar dados" variant="error">
            <p>{errorMessage}</p>
          </InlineAlert>
        ) : null}

        {isAnalyticsPreview ? <PremiumAnalyticsBanner /> : null}

        {!shouldShowError ? (
          <section
            className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"
            aria-label="Cards de analytics"
          >
            {metricCards(data).map((metric) => (
              <MetricCard key={metric.id} locked={isAnalyticsPreview} metric={metric} />
            ))}
          </section>
        ) : null}

        {data && !isAnalyticsPreview && !analytics.isError && !hasEvents ? (
          <EmptyState
            className="rounded-[var(--lectum-card-radius)] bg-surface"
            icon={BarChart3}
            title="Ainda não há eventos reais neste período"
            description="Contatos por WhatsApp, avaliações e posts aparecerão aqui sem dados simulados."
          />
        ) : null}

        {!shouldShowError ? (
          <ReviewsLinkCard link={reviewLink} locked={isAnalyticsPreview} />
        ) : null}
        {!shouldShowError ? <SpecialtySearchCard /> : null}
        {!shouldShowError ? <ProTipCard /> : null}
      </section>
    </PrivateTemplate>
  );
};

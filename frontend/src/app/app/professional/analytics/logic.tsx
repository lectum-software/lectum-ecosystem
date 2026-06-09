"use client";

import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ExternalLink,
  EyeOff,
  MessageCircle,
  MessageSquareText,
  RefreshCcw,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePsychologistAnalytics } from "@/api/callers/psychologist-analytics";
import type {
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPeriodKey,
  PsychologistAnalyticsResponse,
} from "@/api/generator/types/psychologist-analytics";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

const PERIOD_OPTIONS: Array<{ label: string; value: PsychologistAnalyticsPeriodKey }> = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "3 meses", value: "90d" },
  { label: "Anual", value: "365d" },
];

const metricIcons = {
  whatsapp_clicks: MessageCircle,
  reviews_received: Star,
  rating_average: TrendingUp,
  posts_published: MessageSquareText,
  post_engagement: BarChart3,
} satisfies Record<PsychologistAnalyticsMetric["id"], typeof BarChart3>;

const sourceLabels = {
  contact_request: "contact_request",
  professional_review: "professional_review",
  psychologist_profile: "psychologist_profile",
  community_post: "community_post",
} satisfies Record<PsychologistAnalyticsMetric["source"], string>;

const resolveApiError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Não foi possível conectar à API agora. Tente novamente em instantes.";
};

const formatDate = (value?: string) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatMetricValue = (metric: PsychologistAnalyticsMetric) => {
  if (metric.unit === "rating") {
    return (metric.value / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  return metric.value.toLocaleString("pt-BR");
};

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

const PeriodTabs = ({
  current,
  disabled,
  onChange,
}: {
  current: PsychologistAnalyticsPeriodKey;
  disabled?: boolean;
  onChange: (period: PsychologistAnalyticsPeriodKey) => void;
}) => (
  <div className="grid grid-cols-4 border-b border-border bg-surface" role="tablist">
    {PERIOD_OPTIONS.map((option) => {
      const active = option.value === current;

      return (
        <button
          aria-selected={active}
          className={cn(
            "relative h-14 text-sm font-semibold transition disabled:opacity-60",
            active ? "text-primary" : "text-muted hover:text-foreground",
          )}
          disabled={disabled}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="tab"
          type="button"
        >
          {option.label}
          {active ? (
            <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary" />
          ) : null}
        </button>
      );
    })}
  </div>
);

const MetricCard = ({ metric }: { metric: PsychologistAnalyticsMetric }) => {
  const Icon = metricIcons[metric.id];

  return (
    <article className="grid min-h-36 gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[0.72rem] font-black uppercase leading-4 tracking-[0.14em] text-subtle">
            {metric.label}
          </h2>
          <p className="mt-2 text-3xl font-black tracking-tight text-foreground">
            {formatMetricValue(metric)}
          </p>
        </div>
      </div>
      <p className="text-xs leading-5 text-muted">{metric.description}</p>
      <p className="mt-auto text-[0.68rem] font-bold uppercase tracking-wide text-subtle">
        Fonte: {sourceLabels[metric.source]}
      </p>
    </article>
  );
};

const MetricGrid = ({ cards }: { cards: PsychologistAnalyticsMetric[] }) => (
  <section className="grid grid-cols-2 gap-4" aria-label="Cards de analytics">
    {cards.map((metric) => (
      <MetricCard key={metric.id} metric={metric} />
    ))}
  </section>
);

const EngagementBreakdown = ({ data }: { data: PsychologistAnalyticsResponse }) => {
  const total = data.metrics.post_engagement;
  const rows = [
    { label: "Votos positivos", value: data.metrics.post_upvotes },
    { label: "Respostas", value: data.metrics.post_replies },
  ];

  return (
    <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-subtle">Comunidade</p>
          <h2 className="mt-1 text-lg font-extrabold text-foreground">Engajamento dos posts</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
          <BarChart3 className="h-5 w-5" aria-hidden />
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        {rows.map((row) => {
          const width = total > 0 ? Math.max(6, Math.round((row.value / total) * 100)) : 0;

          return (
            <div className="grid gap-2" key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-foreground">{row.label}</span>
                <span className="font-bold text-muted">{row.value.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ReviewsLinkCard = () => (
  <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold text-foreground">
          Link da minha página de avaliações
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use a tela de avaliações para responder depoimentos e acompanhar a reputação pública.
        </p>
      </div>
      <Star className="h-5 w-5 shrink-0 text-primary" aria-hidden />
    </div>

    <Button asChild className="mt-4 w-full rounded-full" variant="outline">
      <Link href="/app/professional/reviews">
        Abrir minhas avaliações
        <ExternalLink className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  </section>
);

export const ProfessionalAnalyticsLogic = () => {
  const [period, setPeriod] = useState<PsychologistAnalyticsPeriodKey>("30d");
  const query = useMemo(() => ({ period }), [period]);
  const analytics = usePsychologistAnalytics(query);
  const data = analytics.data;
  const errorMessage = analytics.isError ? resolveApiError(analytics.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const hasEvents = hasAnyRealEvent(data);

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <header className="flex items-center justify-between border-b border-border bg-surface px-1 pb-4">
          <Button asChild variant="ghost" className="h-10 w-10 px-0">
            <Link aria-label="Voltar para perfil" href="/app/profile">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          </Button>
          <h1 className="text-lg font-extrabold text-foreground">Meus Analytics</h1>
          <Button
            aria-label="Atualizar analytics"
            className="h-10 w-10 px-0"
            disabled={analytics.isFetching}
            onClick={() => analytics.refetch()}
            type="button"
            variant="ghost"
          >
            <RefreshCcw
              className={cn("h-5 w-5", analytics.isFetching && "animate-spin")}
              aria-hidden
            />
          </Button>
        </header>

        <section className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
          <PeriodTabs current={period} disabled={analytics.isFetching} onChange={setPeriod} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted">
            <span className="inline-flex items-center gap-2 font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
              {data?.period.label || "Período selecionado"}
            </span>
            {data ? (
              <span>
                {formatDate(data.period.start_at)} a {formatDate(data.period.end_at)}
              </span>
            ) : null}
          </div>
        </section>

        {analytics.isLoading ? <LoadingState label="Carregando analytics reais" /> : null}

        {errorMessage ? (
          <InlineAlert
            title="Não foi possível carregar os analytics"
            variant={isProfessionalPlanError ? "warning" : "error"}
          >
            <div className="grid gap-3">
              <p>{errorMessage}</p>
              {isProfessionalPlanError ? (
                <Button asChild className="h-10 rounded-full px-4" variant="outline">
                  <Link href="/app/professional/billing/subscription">Ver assinatura</Link>
                </Button>
              ) : null}
            </div>
          </InlineAlert>
        ) : null}

        {data && !analytics.isError ? (
          <InlineAlert title="Dados atualizados" variant="success">
            Métricas carregadas a partir de tabelas persistidas. Percentuais de crescimento não são
            exibidos porque não há série histórica comparável nesta task.
          </InlineAlert>
        ) : null}

        {data && !analytics.isError ? <MetricGrid cards={data.cards} /> : null}

        {data && !analytics.isError && !hasEvents ? (
          <EmptyState
            icon={BarChart3}
            title="Ainda não há eventos reais neste período"
            description="Quando houver contatos por WhatsApp, avaliações públicas ou posts publicados, os números aparecerão aqui sem dados simulados."
          />
        ) : null}

        {data && !analytics.isError ? <ReviewsLinkCard /> : null}

        {data && !analytics.isError ? <EngagementBreakdown data={data} /> : null}

        {data?.unavailable?.map((metric) => (
          <InlineAlert key={metric.id} title={`${metric.label} não exibida`} variant="info">
            <span className="inline-flex items-start gap-2">
              <EyeOff className="mt-1 h-4 w-4 shrink-0" aria-hidden />
              <span>
                {metric.description} Fonte esperada: <strong>{metric.source}</strong>.
              </span>
            </span>
          </InlineAlert>
        ))}
      </section>
    </PrivateTemplate>
  );
};

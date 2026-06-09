"use client";

import {
  ArrowLeft,
  BarChart3,
  Copy,
  Eye,
  Heart,
  Info,
  Lightbulb,
  MessageSquare,
  PlayCircle,
  Search,
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
];

type AnalyticsCardView = {
  description?: string;
  icon: typeof BarChart3;
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
    label: "RESULTADOS\nDE BUSCA",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Busca ainda não possui evento persistido.",
  },
  {
    id: "profile_views",
    icon: Eye,
    label: "ABERTURA DE\nPERFIL",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Visualização de perfil aguarda profile_view_event.",
  },
  {
    id: "video_views",
    icon: PlayCircle,
    label: "VIDEO VIEWS",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Views do vídeo ainda não são rastreadas.",
  },
  {
    id: "whatsapp_clicks",
    icon: MessageSquare,
    label: "CONVERSÕES\nWHATSAPP",
    value: toCount(data?.metrics.whatsapp_clicks),
    source: "contact_request",
  },
  {
    id: "reviews_received",
    icon: Star,
    label: "AVALIAÇÕES",
    value: toCount(data?.metrics.reviews_received),
    source: "professional_review",
  },
  {
    id: "favorited",
    icon: Heart,
    label: "FAVORITADO",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Favoritos não fazem parte do contrato real desta tela.",
  },
];

const PeriodTabs = ({
  current,
  disabled,
  onChange,
}: {
  current: PsychologistAnalyticsPeriodKey;
  disabled?: boolean;
  onChange: (period: PsychologistAnalyticsPeriodKey) => void;
}) => (
  <div className="grid h-[52px] grid-cols-4 border-b border-[#e5e7eb] bg-white" role="tablist">
    {PERIOD_OPTIONS.map((option) => {
      const active = option.value === current;

      return (
        <button
          aria-selected={active}
          className={cn(
            "relative text-[13px] font-semibold transition disabled:opacity-60",
            active ? "text-[#308ce8]" : "text-[#64748b] hover:text-[#111827]",
          )}
          disabled={disabled}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="tab"
          type="button"
        >
          {option.label}
          {active ? <span className="absolute inset-x-7 bottom-0 h-0.5 bg-[#308ce8]" /> : null}
        </button>
      );
    })}
  </div>
);

const MetricCard = ({ metric }: { metric: AnalyticsCardView }) => {
  const Icon = metric.icon;

  return (
    <article className="h-[113px] rounded-[19px] border border-[#e2e8f0] bg-white px-[19px] py-[21px] shadow-[0_2px_8px_rgb(15_23_42_/_5%)]">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-[17px] w-[17px] shrink-0 text-[#6f7f95]" aria-hidden />
        <h2 className="whitespace-pre-line text-[11px] font-bold uppercase leading-[14px] tracking-[0.05em] text-[#6f7f95]">
          {metric.label}
        </h2>
      </div>
      <div className="mt-[14px] flex items-end gap-2">
        <p className="text-[24px] font-extrabold leading-none tracking-[-0.03em] text-[#111827]">
          {metric.value}
        </p>
        {metric.isUnavailable ? (
          <span className="pb-0.5 text-[10px] font-semibold text-[#94a3b8]">sem evento</span>
        ) : null}
      </div>
    </article>
  );
};

const ReviewsLinkCard = ({ link }: { link: string }) => {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link agora.");
    }
  };

  return (
    <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-5 shadow-[0_2px_8px_rgb(15_23_42_/_5%)]">
      <h2 className="text-[16px] font-semibold text-[#111827]">
        Link da minha página de avaliações
      </h2>
      <div className="mt-4 flex h-[50px] items-center gap-3 rounded-[14px] border border-[#e5e7eb] bg-[#fbfcfe] px-4">
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#64748b]">{link}</p>
        <button
          aria-label="Copiar link de avaliações"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#308ce8] transition hover:bg-[#eaf5ff]"
          onClick={copyLink}
          type="button"
        >
          <Copy className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
      <p className="mt-3 text-[12px] leading-[17px] text-[#64748b]">
        Incentive os pacientes a te avaliarem para aparecer nos primeiros resultados de busca
      </p>
    </section>
  );
};

const SpecialtySearchCard = () => (
  <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-5 shadow-[0_2px_8px_rgb(15_23_42_/_5%)]">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-[#111827]">
        Busca por especialidades
      </h2>
      <Info className="h-5 w-5 text-[#94a3b8]" aria-hidden />
    </div>
    <div className="mt-5 rounded-[16px] border border-dashed border-[#cfe1f5] bg-[#f8fbff] p-4 text-[13px] leading-5 text-[#64748b]">
      Esta seção seguirá o layout do protótipo quando houver evento persistido de busca por
      especialidade. Nenhum percentual é simulado.
    </div>
  </section>
);

const ProTipCard = () => (
  <section className="flex gap-3 rounded-[21px] border border-[#c9dff6] bg-[#eaf5ff] px-5 py-[18px] text-[#1f5f97]">
    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#308ce8]" aria-hidden />
    <div>
      <h2 className="text-[14px] font-extrabold text-[#308ce8]">Dica Pro</h2>
      <p className="mt-1 text-[14px] leading-[22px] text-[#40546a]">
        Vídeos de apresentação com alto engajamento geram até 3x mais conversões para o WhatsApp.
        Faça testes e descubra o que funciona melhor para você!
      </p>
    </div>
  </section>
);

export const ProfessionalAnalyticsLogic = () => {
  const [period, setPeriod] = useState<PsychologistAnalyticsPeriodKey>("30d");
  const user = useAppSelector((state) => state.user);
  const query = useMemo(() => ({ period }), [period]);
  const analytics = usePsychologistAnalytics(query);
  const data = analytics.data;
  const errorMessage = analytics.isError ? resolveApiError(analytics.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const hasEvents = hasAnyRealEvent(data);
  const reviewLink =
    typeof window === "undefined"
      ? "lectum.com.br/app/reviews/new"
      : `${window.location.origin}/app/reviews/new${user?.id ? `?psychologist_id=${user.id}` : ""}`;

  return (
    <PrivateTemplate showNavigation={false}>
      <section className="mx-[-1.25rem] my-[-1.5rem] min-h-screen bg-[#f5f6f8] pb-8 md:mx-auto md:my-0 md:w-[390px] md:overflow-hidden md:rounded-[24px] md:border md:border-[#e5e7eb]">
        <header className="grid h-[72px] grid-cols-[72px_1fr_72px] items-center border-b border-[#e5e7eb] bg-white">
          <Link
            aria-label="Voltar para perfil"
            className="grid h-full place-items-center text-[#64748b]"
            href="/app/profile"
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden />
          </Link>
          <h1 className="text-center text-[18px] font-extrabold tracking-[-0.02em] text-[#111827]">
            Meus Analytics
          </h1>
          <span />
        </header>

        <PeriodTabs current={period} disabled={analytics.isFetching} onChange={setPeriod} />

        <div className="grid gap-[17px] px-4 pt-[17px]">
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

          {!analytics.isError ? (
            <section className="grid grid-cols-2 gap-[17px]" aria-label="Cards de analytics">
              {metricCards(data).map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </section>
          ) : null}

          {data && !analytics.isError && !hasEvents ? (
            <EmptyState
              className="rounded-[22px] bg-white"
              icon={BarChart3}
              title="Ainda não há eventos reais neste período"
              description="Contatos por WhatsApp, avaliações e posts aparecerão aqui sem dados simulados."
            />
          ) : null}

          {!analytics.isError ? <ReviewsLinkCard link={reviewLink} /> : null}
          {!analytics.isError ? <SpecialtySearchCard /> : null}
          {!analytics.isError ? <ProTipCard /> : null}
        </div>
      </section>
    </PrivateTemplate>
  );
};

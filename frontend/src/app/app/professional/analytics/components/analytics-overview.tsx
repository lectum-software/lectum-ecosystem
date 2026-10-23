"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsTrafficSources,
} from "@/api/generator/types/psychologist-analytics";
import { cn } from "@/lib/utils";
import { ANALYTICS_METRICS, analyticsRequestedMetric } from "@/utils/analytics-return";
import type { AnalyticsCardView } from "../modules/support";
import { WHATSAPP_ORIGIN_COLORS } from "../modules/timeline";
import { comparisonForMetric, MetricComparison } from "./metric-comparison";
import { MetricTimeline } from "./metric-timeline";

const order = ANALYTICS_METRICS;
export function AnalyticsOverview({
  cards,
  data,
  locked,
  loading,
  initialSelected,
  onMetricChange,
}: {
  cards: AnalyticsCardView[];
  data?: PsychologistAnalyticsResponse;
  traffic: PsychologistAnalyticsTrafficSources;
  locked?: boolean;
  loading?: boolean;
  initialSelected?: string;
  onMetricChange?: (id: string) => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(analyticsRequestedMetric(initialSelected));
  useEffect(() => {
    const carousel = carouselRef.current;
    const active = carousel?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!carousel || !active) return;
    // Reveal the selected metric without moving the page away from its header.
    carousel.scrollTo({
      left:
        carousel.scrollLeft +
        active.getBoundingClientRect().left -
        carousel.getBoundingClientRect().left,
      behavior: "instant",
    });
  }, []);
  const ordered = [...cards].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const current = ordered.find((card) => card.id === selected) ?? ordered[0];
  const CurrentIcon = current?.icon;
  const restricted = locked && selected !== "acquired_patients";
  const periodTotal =
    selected === "video_views"
      ? data?.presentation_video?.metrics.views
      : data?.metrics[selected as keyof NonNullable<typeof data>["metrics"]];
  if (!current) return null;
  return (
    <section className="min-w-0" aria-label="Resumo de analytics" aria-busy={loading}>
      <div className="mb-1 hidden justify-end gap-1 md:flex">
        {[-1, 1].map((direction) => (
          <button
            key={direction}
            type="button"
            aria-label={direction < 0 ? "Métricas anteriores" : "Próximas métricas"}
            onClick={() => {
              const carousel = carouselRef.current;
              carousel?.scrollBy({
                left: direction * carousel.clientWidth * 0.7,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "auto"
                  : "smooth",
              });
            }}
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
          >
            {direction < 0 ? (
              <ChevronLeft className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
          </button>
        ))}
      </div>
      <div
        ref={carouselRef}
        id="analytics-metric-carousel"
        className="touch-auto flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pt-1 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ordered.map((card) => {
          const active = selected === card.id;
          const showComparison = !loading && !locked && comparisonForMetric(data, card.id);
          return (
            <div
              key={card.id}
              className="relative w-[46%] shrink-0 snap-start sm:w-[30%] md:w-[20%]"
            >
              <button
                type="button"
                aria-pressed={active}
                aria-controls="analytics-selected-metric"
                data-metric-id={card.id}
                onClick={(event) => {
                  setSelected(card.id);
                  onMetricChange?.(card.id);
                  event.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "start",
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                      ? "auto"
                      : "smooth",
                  });
                }}
                className={cn(
                  "relative flex min-h-20 w-full flex-col items-start rounded-xl border bg-surface p-3 text-left transition focus-visible:outline-2 focus-visible:outline-primary",
                  active
                    ? "border-primary ring-1 ring-primary/20"
                    : "border-primary/10 hover:border-primary/40",
                )}
              >
                <span className="min-h-8 text-xs font-semibold leading-4 text-muted">
                  {card.id === "video_views" ? "Vídeo de apresentação" : card.label}
                </span>
                <span
                  className={cn(
                    "mt-1.5 block w-full truncate text-xl font-semibold leading-none tracking-[-0.03em] text-foreground",
                    showComparison && "pr-14",
                  )}
                  title={card.value}
                >
                  {loading || (locked && card.id !== "acquired_patients") ? "—" : card.value}
                </span>
              </button>
              {showComparison && data ? (
                <MetricComparison
                  key={data.period.start_at + data.period.end_at}
                  data={data}
                  id={card.id}
                  label={card.label}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div
        id="analytics-selected-metric"
        className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            {CurrentIcon ? <CurrentIcon className="h-6 w-6" aria-hidden /> : null}
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold leading-7 tracking-[-0.03em]">{current.label}</h2>
          </div>
        </div>
        {current.description ? (
          <p className="mt-3 text-sm leading-6 text-muted">{current.description}</p>
        ) : null}
        <div className="mt-5">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted">Carregando gráfico…</p>
          ) : restricted ? (
            <p className="py-10 text-center text-sm text-muted">
              Disponível no plano profissional.
            </p>
          ) : (
            <MetricTimeline
              key={selected + data?.period.start_at + data?.period.end_at}
              timeline={data?.chart_data?.timelines[selected]}
              showLegend={!["acquired_patients", "reviews_received"].includes(selected)}
              seriesColors={selected === "whatsapp_clicks" ? WHATSAPP_ORIGIN_COLORS : undefined}
              period={data?.period}
              total={typeof periodTotal === "number" ? periodTotal : undefined}
            />
          )}
        </div>
        {selected === "whatsapp_clicks" ? (
          <dl
            className="mt-5 grid gap-2 border-t border-border pt-4 text-sm font-bold leading-6 text-muted"
            aria-label="Resumo de cliques no período"
          >
            {[
              ["Total de cliques", data?.metrics.whatsapp_clicks],
              ["Pessoas únicas", data?.metrics.whatsapp_unique_people],
              ["Média de cliques por pessoa", data?.metrics.whatsapp_clicks_per_person],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap items-baseline gap-x-2">
                <dt>{label}:</dt>
                <dd className="font-semibold text-foreground">
                  {loading || restricted || typeof value !== "number"
                    ? "—"
                    : value.toLocaleString(
                        "pt-BR",
                        label === "Média de cliques por pessoa"
                          ? { minimumFractionDigits: 1, maximumFractionDigits: 1 }
                          : undefined,
                      )}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {!loading && !restricted && selected === "video_views" ? (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-base font-extrabold tracking-[-0.02em]">
              Buscas que levaram até você
            </h3>
            {data?.chart_data?.video_search_terms.length ? (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th scope="col" className="pb-2">
                      Termo buscado
                    </th>
                    <th scope="col" className="pb-2 text-right">
                      Visualizações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.chart_data.video_search_terms.map((term) => (
                    <tr key={term.term} className="border-b border-border last:border-0">
                      <th scope="row" className="py-3 pr-3 text-left font-medium break-words">
                        {term.term}
                      </th>
                      <td className="py-3 text-right font-bold">
                        {term.views.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Ainda não há visualizações associadas a buscas neste período.
              </p>
            )}
          </div>
        ) : null}
        {selected === "acquired_patients" ? (
          <Link
            href="/app/profissional/pacientes-adquiridos"
            className="mt-5 flex min-h-12 items-center justify-between gap-3 border-t border-border pt-4 text-sm font-bold text-muted"
          >
            Gerenciar pacientes adquiridos
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

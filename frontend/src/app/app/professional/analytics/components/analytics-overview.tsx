"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type {
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsTrafficSources,
} from "@/api/generator/types/psychologist-analytics";
import { cn } from "@/lib/utils";
import { type AnalyticsCardView, trafficSourceIcons } from "../modules/support";
import { WHATSAPP_ORIGIN_COLORS } from "../modules/timeline";
import { MetricTimeline } from "./metric-timeline";

const order = [
  "whatsapp_clicks",
  "video_views",
  "profile_views",
  "favorites_received",
  "acquired_patients",
  "reviews_received",
];
export function AnalyticsOverview({
  cards,
  data,
  traffic,
  locked,
  loading,
}: {
  cards: AnalyticsCardView[];
  data?: PsychologistAnalyticsResponse;
  traffic: PsychologistAnalyticsTrafficSources;
  locked?: boolean;
  loading?: boolean;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("whatsapp_clicks");
  const ordered = [...cards].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const current = ordered.find((card) => card.id === selected) ?? ordered[0];
  const CurrentIcon = current?.icon;
  const restricted = locked && selected !== "acquired_patients";
  const sources = [...traffic.sources].sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks);
  const principalOrigin = sources.find((source) => source.whatsapp_clicks > 0)?.id;
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
          const Icon = card.icon;
          const active = selected === card.id;
          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={active}
              aria-controls="analytics-selected-metric"
              onClick={(event) => {
                setSelected(card.id);
                event.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "start",
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "auto"
                    : "smooth",
                });
              }}
              className={cn(
                "relative flex min-h-40 w-[65%] shrink-0 snap-start flex-col items-start rounded-[20px] border bg-surface p-4 text-left shadow-[var(--lectum-shadow-soft)] transition focus-visible:outline-2 focus-visible:outline-primary sm:w-[40%] sm:rounded-[22px] md:w-[30%]",
                active
                  ? "border-primary ring-1 ring-primary/20"
                  : "border-primary/10 hover:border-primary/40",
              )}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="mt-3 min-h-10 text-sm font-extrabold leading-5 text-muted">
                {card.label}
              </span>
              <span className="mt-2 text-[1.75rem] font-black leading-none tracking-[-0.03em] text-foreground">
                {loading || (locked && card.id !== "acquired_patients") ? "—" : card.value}
              </span>
            </button>
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
        <div className="mt-3">
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
              showLegend={
                !["whatsapp_clicks", "acquired_patients", "reviews_received"].includes(selected)
              }
              seriesColors={selected === "whatsapp_clicks" ? WHATSAPP_ORIGIN_COLORS : undefined}
              period={data?.period}
              total={typeof periodTotal === "number" ? periodTotal : undefined}
            />
          )}
        </div>
        {!loading && !restricted && selected === "whatsapp_clicks" ? (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-base font-extrabold tracking-[-0.02em]">
              De onde vieram os cliques
            </h3>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th scope="col" className="pb-2">
                    Origem
                  </th>
                  <th scope="col" className="pb-2 text-right">
                    Cliques
                  </th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const SourceIcon = trafficSourceIcons[source.id];
                  return (
                    <tr key={source.id} className="border-b border-border last:border-0">
                      <th scope="row" className="py-3 pr-2 text-left font-medium">
                        <span className="flex items-center gap-3">
                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                            style={{
                              color: WHATSAPP_ORIGIN_COLORS[source.id],
                              backgroundColor: `color-mix(in srgb, ${WHATSAPP_ORIGIN_COLORS[source.id]} 10%, var(--lectum-surface))`,
                            }}
                          >
                            <SourceIcon className="h-[18px] w-[18px]" aria-hidden />
                          </span>
                          <span>
                            <span className="font-bold">{source.label}</span>
                            <span className="mt-1 block text-xs font-normal leading-5 text-muted">
                              {source.description}
                            </span>
                          </span>
                        </span>
                        {source.id === principalOrigin ? (
                          <span className="mt-2 ml-12 block w-fit rounded-full border border-primary/10 bg-primary-soft px-2 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
                            Principal origem
                          </span>
                        ) : null}
                      </th>
                      <td className="py-3 text-right font-bold">
                        {source.whatsapp_clicks.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

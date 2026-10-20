"use client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsTrafficSources,
} from "@/api/generator/types/psychologist-analytics";
import { cn } from "@/lib/utils";
import type { AnalyticsCardView } from "../modules/support";
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
  const [selected, setSelected] = useState("whatsapp_clicks");
  const ordered = [...cards].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const current = ordered.find((card) => card.id === selected) ?? ordered[0];
  const restricted = locked && selected !== "acquired_patients";
  const sources = [...traffic.sources].sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks);
  const highest = Math.max(0, ...sources.map((source) => source.whatsapp_clicks));
  if (!current) return null;
  return (
    <section className="min-w-0" aria-label="Resumo de analytics" aria-busy={loading}>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:thin]">
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
                "flex min-h-40 w-[65%] shrink-0 snap-start flex-col items-start rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-primary sm:w-[40%] md:w-[30%]",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="mt-3 min-h-10 text-sm font-bold">{card.label}</span>
              <span className="mt-2 text-3xl font-black">
                {loading || (locked && card.id !== "acquired_patients") ? "—" : card.value}
              </span>
            </button>
          );
        })}
      </div>
      <div
        id="analytics-selected-metric"
        className="mt-1 rounded-2xl border border-border bg-surface p-4 sm:p-6"
      >
        <h2 className="text-lg font-extrabold">{current.label}</h2>
        {current.description ? (
          <p className="mt-1 text-xs text-muted">{current.description}</p>
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
              period={data?.period}
            />
          )}
        </div>
        {!loading && !restricted && selected === "whatsapp_clicks" ? (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="font-bold">De onde vieram os cliques</h3>
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
                {sources.map((source) => (
                  <tr key={source.id} className="border-b border-border last:border-0">
                    <th scope="row" className="py-3 pr-2 text-left font-medium">
                      {source.label}
                      {highest > 0 && source.whatsapp_clicks === highest ? (
                        <span className="mt-1 block w-fit rounded-full bg-primary-soft px-2 py-1 text-[10px] font-bold text-primary">
                          Principal origem
                        </span>
                      ) : null}
                    </th>
                    <td className="py-3 text-right font-bold">
                      {source.whatsapp_clicks.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              Pessoas únicas por origem. Uma pessoa pode aparecer em mais de uma origem ou dia.
            </p>
          </div>
        ) : null}
        {!loading && !restricted && selected === "video_views" ? (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="font-bold">Buscas que levaram até você</h3>
            {data?.chart_data?.video_search_terms.length ? (
              <>
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
                <p className="mt-3 text-xs text-muted">
                  Uma visualização pode estar associada a mais de um termo ou filtro.
                </p>
              </>
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
            className="mt-5 flex min-h-12 items-center justify-between gap-3 border-t border-border pt-4 text-sm font-bold text-primary"
          >
            Gerenciar pacientes adquiridos
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

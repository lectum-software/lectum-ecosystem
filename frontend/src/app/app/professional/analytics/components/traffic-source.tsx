"use client";

import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import type { PsychologistAnalyticsTrafficSources } from "@/api/generator/types/psychologist-analytics";
import { cn } from "@/lib/utils";

import {
  type TrafficSourceWithDisplay,
  toCount,
  toTrafficSourceDisplay,
  trafficSourceIcons,
} from "../modules/support";

export const TrafficBadge = ({ type }: { type: TrafficSourceWithDisplay["displayBadge"] }) => {
  if (!type) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-primary/10 bg-primary-soft px-2 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-primary">
      Principal origem
    </span>
  );
};

export const TrafficSourceSection = ({
  locked,
  traffic,
}: {
  locked?: boolean;
  traffic: PsychologistAnalyticsTrafficSources;
}) => {
  const sources = useMemo(() => toTrafficSourceDisplay(traffic.sources), [traffic.sources]);

  return (
    <section className="grid min-w-0 gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <BarChart3 className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Origem do tráfego
          </p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-foreground">
            Canais que levam pacientes até você
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{traffic.description}</p>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-[22px] border border-primary/10 bg-surface md:block">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(92px,0.28fr)] gap-3 border-border border-b bg-surface-muted px-4 py-3 text-[0.7rem] font-black uppercase tracking-[0.1em] text-subtle">
          <span>Fonte</span>
          <span className="text-center">WhatsApp</span>
        </div>
        <div className="divide-y divide-border">
          {sources.map((source) => {
            const Icon = trafficSourceIcons[source.id];

            return (
              <div
                className="grid grid-cols-[minmax(0,1fr)_minmax(92px,0.28fr)] items-center gap-3 px-4 py-4"
                key={source.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-foreground">
                        {source.label}
                      </p>
                      <TrafficBadge type={source.displayBadge} />
                    </div>
                    {source.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {source.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p
                  className={cn(
                    "text-center text-lg font-black tracking-[-0.04em] text-foreground",
                    locked && "select-none blur-[5px]",
                  )}
                >
                  {toCount(source.whatsapp_clicks)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {sources.map((source) => {
          const Icon = trafficSourceIcons[source.id];

          return (
            <article
              className={cn(
                "overflow-hidden rounded-[22px] border border-primary/10 bg-surface-muted",
                source.displayBadge && "border-primary/25 bg-primary-soft/35",
              )}
              key={source.id}
            >
              <div className="flex min-w-0 items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-foreground">
                        {source.label}
                      </p>
                      {source.description ? (
                        <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                          {source.description}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <TrafficBadge type={source.displayBadge} />
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-black leading-none tracking-[-0.04em] text-foreground",
                        locked && "select-none blur-[5px]",
                      )}
                    >
                      {toCount(source.whatsapp_clicks)}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

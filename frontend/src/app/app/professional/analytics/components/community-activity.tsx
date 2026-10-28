"use client";

import { useState } from "react";
import type { PsychologistAnalyticsCommunities } from "@/api/generator/types/psychologist-analytics";
import { cn } from "@/lib/utils";
import { toCount } from "../modules/support";
import { CommunityHighlights } from "./community-highlights";

const originStyles = {
  post_with_video: { color: "var(--lectum-primary)" },
  post_without_video: { color: "var(--lectum-chart-sky)" },
  reply_with_video: { color: "var(--lectum-chart-lilac)" },
  reply_without_video: { color: "var(--lectum-chart-indigo)" },
  top_mentors: { color: "var(--lectum-chart-slate)" },
};

const originOrder = Object.keys(originStyles);
const percentageFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export const CommunityActivitySection = ({
  communities,
  locked,
  returnTo,
  periodLabel,
}: {
  communities: PsychologistAnalyticsCommunities;
  locked?: boolean;
  returnTo?: string;
  periodLabel?: string;
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const items = [
    ...communities.content.whatsapp_clicks_by_content.map((item) => ({
      id: item.id,
      label: item.label,
      value: item.whatsapp_clicks,
      description: "",
    })),
    {
      id: "top_mentors" as const,
      label: "Ranking Top Mentores",
      value: communities.top_mentors.whatsapp_clicks,
      description: communities.top_mentors.message,
    },
  ].sort((a, b) => b.value - a.value || originOrder.indexOf(a.id) - originOrder.indexOf(b.id));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const toggle = (id: string) => setSelected((current) => (current === id ? null : id));
  const segments = items.map((item, index) => {
    const precedingValue = items.slice(0, index).reduce((sum, previous) => sum + previous.value, 0);
    const start = total > 0 ? (precedingValue / total) * 100 : 0;
    const share = total > 0 ? (item.value / total) * 100 : 0;
    return { ...item, start, share };
  });

  return (
    <section className="grid min-w-0 gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Comunidade</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-foreground">
            Desempenho de conteúdo
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{periodLabel}</p>
        </div>
      </div>

      <div className="relative mx-auto h-52 w-52">
        <svg viewBox="0 0 200 200" className={cn("h-full w-full", locked && "blur-[5px]")}>
          <title>Cliques no WhatsApp por conteúdo</title>
          <circle
            cx="100"
            cy="100"
            r="74"
            fill="none"
            stroke="var(--lectum-border)"
            strokeWidth="20"
          />
          {!locked &&
            segments
              .filter((item) => item.value > 0)
              .map((item) => (
                // biome-ignore lint/a11y/useSemanticElements: fatia SVG interativa com teclado; button não é válido dentro de svg.
                <circle
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.label}: ${toCount(item.value)} cliques`}
                  aria-pressed={selected === item.id}
                  cx="100"
                  cy="100"
                  r="74"
                  pathLength="100"
                  fill="none"
                  stroke={originStyles[item.id].color}
                  strokeWidth={selected === item.id ? 26 : 20}
                  strokeDasharray={`${item.share} ${100 - item.share}`}
                  strokeDashoffset={-item.start}
                  transform="rotate(-90 100 100)"
                  className="cursor-pointer focus-visible:outline-none focus-visible:stroke-[28]"
                  style={{ opacity: selected && selected !== item.id ? 0.3 : 1 }}
                  onClick={() => toggle(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggle(item.id);
                    }
                  }}
                />
              ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <p
            className={cn(
              "text-3xl font-black tracking-[-0.05em] text-foreground",
              locked && "select-none blur-[5px]",
            )}
          >
            {toCount(total)}
          </p>
          <p className="mt-1 text-xs font-extrabold text-muted">Cliques</p>
        </div>
      </div>

      <ul
        className="min-w-0 divide-y divide-border text-sm leading-5"
        aria-label="Origens dos cliques"
      >
        {segments.map((item) => {
          const { color } = originStyles[item.id];
          return (
            <li key={item.id} data-content-origin={item.id}>
              <button
                type="button"
                disabled={locked}
                aria-pressed={selected === item.id}
                onClick={() => toggle(item.id)}
                className={cn(
                  "grid min-h-14 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded py-3 text-left text-foreground focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                  selected === item.id && "bg-surface-muted",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                  aria-hidden
                />
                <span className="min-w-0 break-words font-medium">{item.label}</span>
                <strong
                  className={cn(
                    "whitespace-nowrap text-right font-semibold tabular-nums",
                    locked && "select-none blur-[5px]",
                  )}
                >
                  {toCount(item.value)}{" "}
                  <span className="font-normal text-muted">
                    (
                    {item.share > 0 && item.share < 0.1
                      ? "<0,1"
                      : percentageFormat.format(item.share)}
                    %)
                  </span>
                </strong>
              </button>
            </li>
          );
        })}
      </ul>
      <CommunityHighlights returnTo={returnTo} items={communities.highlights} locked={locked} />
    </section>
  );
};

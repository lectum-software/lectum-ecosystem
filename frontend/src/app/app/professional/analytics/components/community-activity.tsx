"use client";

import { FileText, MessageCircle, Trophy, UsersRound } from "lucide-react";
import { useState } from "react";
import type { PsychologistAnalyticsCommunities } from "@/api/generator/types/psychologist-analytics";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { toCount } from "../modules/support";

const originStyles = {
  post_with_video: { color: "var(--lectum-primary)", icon: FileText },
  post_without_video: { color: "var(--lectum-success)", icon: FileText },
  reply_with_video: { color: "var(--lectum-warning)", icon: MessageCircle },
  reply_without_video: { color: "var(--lectum-primary-strong)", icon: MessageCircle },
  top_mentors: { color: "var(--lectum-muted)", icon: Trophy },
};

export const CommunityActivitySection = ({
  communities,
  locked,
}: {
  communities: PsychologistAnalyticsCommunities;
  locked?: boolean;
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
      label: "Top Mentores",
      value: communities.top_mentors.whatsapp_clicks,
      description: communities.top_mentors.message,
    },
  ];
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const toggle = (id: string) => setSelected((current) => (current === id ? null : id));
  let offset = 0;
  const segments = items.map((item) => {
    const start = offset;
    const share = total > 0 ? (item.value / total) * 100 : 0;
    offset += share;
    return { ...item, start, share };
  });

  return (
    <section className="grid min-w-0 gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <UsersRound className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Comunidade</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-foreground">
            Participação nas comunidades
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Veja quais conteúdos levam mais pacientes ao seu WhatsApp.
          </p>
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

      <article className="overflow-hidden rounded-[24px] border border-primary/10 bg-surface">
        <div className="flex items-center gap-2 border-b border-border bg-surface-muted/70 px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <WhatsAppIcon className="h-4 w-4" aria-hidden />
          </span>
          <h3 className="text-sm font-black text-foreground">Cliques por conteúdo</h3>
        </div>
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-subtle">
              <th className="px-4 py-3">Conteúdo</th>
              <th className="px-4 py-3 text-right">Cliques</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const { icon: Icon, color } = originStyles[item.id];
              return (
                <tr key={item.id} className={cn(selected === item.id && "bg-surface-muted")}>
                  <td className="border-t border-border">
                    <button
                      type="button"
                      disabled={locked}
                      aria-pressed={selected === item.id}
                      onClick={() => toggle(item.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                        style={{
                          color,
                          backgroundColor: `color-mix(in srgb, ${color} 10%, var(--lectum-surface))`,
                        }}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        {item.label}
                        {item.description ? (
                          <span className="mt-1 block text-xs font-semibold leading-5 text-muted">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </td>
                  <td
                    className={cn(
                      "border-t border-border px-4 py-3 text-right text-lg font-black text-foreground",
                      locked && "select-none blur-[5px]",
                    )}
                  >
                    {toCount(item.value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </section>
  );
};

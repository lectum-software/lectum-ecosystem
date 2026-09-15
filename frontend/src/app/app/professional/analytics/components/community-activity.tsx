"use client";

import { FileText, MessageCircle, UsersRound } from "lucide-react";
import type { PsychologistAnalyticsCommunities } from "@/api/generator/types/psychologist-analytics";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";

import { type AnalyticsCardIcon, clampPercent, toCount } from "../modules/support";

export const CommunityContentDonut = ({
  icon: Icon,
  label,
  locked,
  totals,
}: {
  icon: AnalyticsCardIcon;
  label: string;
  locked?: boolean;
  totals: PsychologistAnalyticsCommunities["content"]["posts"];
}) => {
  const withVideoRate =
    totals.total > 0 ? clampPercent((totals.with_video / totals.total) * 100) : 0;
  const roundedWithVideoRate = Math.round(withVideoRate);
  const donutBackground =
    totals.total > 0
      ? `conic-gradient(var(--lectum-primary) 0 ${withVideoRate}%, var(--lectum-border-strong) ${withVideoRate}% 100%)`
      : "conic-gradient(var(--lectum-border) 0 100%)";

  return (
    <article className="grid min-w-0 gap-3 rounded-[24px] border border-primary/10 bg-surface p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="truncate text-sm font-black tracking-[-0.03em] text-foreground">{label}</p>
      </div>

      <div className="grid justify-items-center gap-3">
        <div
          aria-label={`${label}: ${toCount(totals.with_video)} com vídeo e ${toCount(
            totals.without_video,
          )} sem vídeo`}
          className="grid h-28 w-28 place-items-center rounded-full p-3"
          role="img"
          style={{ background: donutBackground }}
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-surface text-center">
            <div>
              <p
                className={cn(
                  "text-2xl font-black leading-none tracking-[-0.06em] text-foreground",
                  locked && "select-none blur-[5px]",
                )}
              >
                {toCount(totals.total)}
              </p>
              <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-subtle">
                total
              </p>
            </div>
          </div>
        </div>

        <div className="grid w-full gap-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex min-w-0 items-center gap-2 font-extrabold text-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              Com vídeo
            </span>
            <span className={cn("font-black text-foreground", locked && "select-none blur-[5px]")}>
              {toCount(totals.with_video)} ({roundedWithVideoRate}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex min-w-0 items-center gap-2 font-extrabold text-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-border-strong" />
              Sem vídeo
            </span>
            <span className={cn("font-black text-foreground", locked && "select-none blur-[5px]")}>
              {toCount(totals.without_video)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export const CommunityWhatsappContentTable = ({
  items,
  locked,
  topMentors,
}: {
  items: PsychologistAnalyticsCommunities["content"]["whatsapp_clicks_by_content"];
  locked?: boolean;
  topMentors: PsychologistAnalyticsCommunities["top_mentors"];
}) => (
  <article className="overflow-hidden rounded-[24px] border border-primary/10 bg-surface">
    <div className="flex min-w-0 items-center gap-2 border-border border-b bg-surface-muted/70 px-4 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <WhatsAppIcon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black tracking-[-0.03em] text-foreground">
          Cliques por conteúdo
        </p>
      </div>
    </div>

    <table className="w-full border-separate border-spacing-0 text-left">
      <thead>
        <tr className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-subtle">
          <th className="px-4 py-3">Conteúdo</th>
          <th className="px-4 py-3 text-right">WhatsApp</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr className="border-border border-t" key={item.id}>
            <td className="border-border border-t px-4 py-3 text-sm font-extrabold text-foreground">
              {item.label}
            </td>
            <td
              className={cn(
                "border-border border-t px-4 py-3 text-right text-lg font-black tracking-[-0.04em] text-foreground",
                locked && "select-none blur-[5px]",
              )}
            >
              {toCount(item.whatsapp_clicks)}
            </td>
          </tr>
        ))}
        <tr className="border-border border-t" key="top-mentors">
          <td className="border-border border-t px-4 py-3 text-sm text-foreground">
            <span className="font-extrabold">Top Mentores</span>
            <p
              className={cn(
                "mt-1 text-xs font-semibold leading-5",
                topMentors.status === "in_top_5" ? "text-muted" : "text-subtle",
              )}
            >
              {topMentors.message}
            </p>
          </td>
          <td
            className={cn(
              "border-border border-t px-4 py-3 text-right text-lg font-black tracking-[-0.04em] text-foreground",
              locked && "select-none blur-[5px]",
            )}
          >
            {toCount(topMentors.whatsapp_clicks)}
          </td>
        </tr>
      </tbody>
    </table>
  </article>
);

export const CommunityActivitySection = ({
  communities,
  locked,
}: {
  communities: PsychologistAnalyticsCommunities;
  locked?: boolean;
}) => {
  const content = communities.content;

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
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{communities.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CommunityContentDonut
          icon={FileText}
          label="Posts"
          locked={locked}
          totals={content.posts}
        />
        <CommunityContentDonut
          icon={MessageCircle}
          label="Respostas"
          locked={locked}
          totals={content.replies}
        />
      </div>

      <CommunityWhatsappContentTable
        items={content.whatsapp_clicks_by_content}
        locked={locked}
        topMentors={communities.top_mentors}
      />
    </section>
  );
};

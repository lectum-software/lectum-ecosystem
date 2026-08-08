"use client";

import { CalendarDays, Flag, type LucideIcon } from "lucide-react";
import type { DashboardPendingReport } from "@/api/req/dashboard";
import { cn } from "@/lib/utils";
import { formatDateTime, numberFormatter } from "../modules/dashboard-support";
import { CardShell } from "./common";

export const ChartCard = ({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm font-medium leading-6 text-muted">{description}</p>
        ) : null}
      </div>
    </div>
    {children}
  </CardShell>
);

export const PendingReportsCard = ({
  reports,
  total,
}: {
  reports: DashboardPendingReport[];
  total: number;
}) => {
  const severityClasses: Record<DashboardPendingReport["severity"], string> = {
    alta: "bg-danger/10 text-danger",
    baixa: "bg-surface-muted text-muted",
    media: "bg-warning/10 text-warning",
  };

  return (
    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-danger/10 text-danger">
          <Flag aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Denúncias pendentes</h2>
          <p className="text-xs font-semibold text-muted">
            {numberFormatter.format(total)} no período
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {reports.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-medium text-muted">
            Nenhuma denúncia pendente foi encontrada neste período.
          </p>
        ) : (
          reports.map((report) => (
            <article
              className="rounded-2xl border border-border/70 bg-surface-muted p-4"
              key={report.id}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">{report.reason}</h3>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[0.65rem] font-bold",
                    severityClasses[report.severity],
                  )}
                >
                  {report.severity}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-muted">{report.target_title}</p>
              {report.community_name ? (
                <p className="mt-1 text-xs text-muted">Comunidade: {report.community_name}</p>
              ) : null}
              <p className="mt-3 text-xs font-bold text-foreground">
                {formatDateTime(report.created_at)}
              </p>
              <p className="mt-2 text-[0.7rem] text-muted">
                Caminho futuro: abrir este ID na moderação de comunidades ({report.id}).
              </p>
            </article>
          ))
        )}
      </div>
    </CardShell>
  );
};

export const DashboardOverviewPanel = ({
  children,
  periodControls,
  periodDescription,
}: {
  children: React.ReactNode;
  periodControls: React.ReactNode;
  periodDescription: string;
}) => (
  <CardShell className="min-w-0 p-5 md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Visão geral</h2>
        </div>
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      </div>
      {periodControls}
    </div>
    <div className="mt-5">{children}</div>
  </CardShell>
);

export const ChartLegend = ({
  items,
}: {
  items: Array<{
    color: string;
    label: string;
  }>;
}) => (
  <div className="mt-5 grid gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-center">
    {items.map((item) => (
      <span
        className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-muted"
        key={item.label}
      >
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span className="min-w-0 break-words">{item.label}</span>
      </span>
    ))}
  </div>
);

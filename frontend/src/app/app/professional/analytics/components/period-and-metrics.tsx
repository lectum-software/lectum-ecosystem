"use client";

import { ArrowRight, BarChart3, X } from "lucide-react";
import Link from "next/link";
import { useId, useRef } from "react";
import type { PsychologistAnalyticsPeriodKey } from "@/api/generator/types/psychologist-analytics";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PSYCHOLOGIST_ONBOARDING_PATHS } from "@/utils/psychologist-onboarding";

import { type AnalyticsCardView, PERIOD_OPTIONS } from "../modules/support";
import { CustomPeriodForm } from "./custom-period-form";

export const PeriodTabs = ({
  customPopoverOpen,
  customRange,
  current,
  disabled,
  onChange,
  onCustomPopoverOpenChange,
  onCustomRangeApply,
}: {
  customPopoverOpen: boolean;
  customRange: { end_at: string; start_at: string };
  current: PsychologistAnalyticsPeriodKey;
  disabled?: boolean;
  onChange: (period: PsychologistAnalyticsPeriodKey) => void;
  onCustomPopoverOpenChange: (open: boolean) => void;
  onCustomRangeApply: (range: { end_at: string; start_at: string }) => void;
}) => {
  const customTabRef = useRef<HTMLButtonElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const titleId = useId();

  const handlePeriodClick = (nextPeriod: PsychologistAnalyticsPeriodKey) => {
    if (nextPeriod === "custom") {
      onCustomPopoverOpenChange(true);
      return;
    }

    onCustomPopoverOpenChange(false);
    onChange(nextPeriod);
  };

  const applyCustomRange = (range: { end_at: string; start_at: string }) => {
    onCustomRangeApply(range);
    onCustomPopoverOpenChange(false);
  };

  return (
    <div className="min-w-0">
      <div
        className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        <div className="flex min-w-max gap-1 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-1 shadow-[var(--lectum-shadow-soft)] sm:gap-2 md:min-w-0 md:justify-between">
          {PERIOD_OPTIONS.map((option) => {
            const active = !customPopoverOpen && option.value === current;
            const customActive = option.value === "custom" && customPopoverOpen;

            return (
              <button
                aria-expanded={option.value === "custom" ? customPopoverOpen : undefined}
                aria-haspopup={option.value === "custom" ? "dialog" : undefined}
                aria-selected={active || customActive}
                className={cn(
                  "h-9 whitespace-nowrap rounded-full px-2 text-[0.78rem] font-extrabold transition disabled:opacity-60 sm:h-10 sm:px-3 sm:text-sm md:flex-1",
                  active || customActive
                    ? "bg-primary text-primary-foreground shadow-[var(--lectum-shadow-soft)]"
                    : "text-muted hover:bg-primary-soft/70 hover:text-primary",
                )}
                disabled={disabled}
                key={option.value}
                ref={option.value === "custom" ? customTabRef : undefined}
                onClick={() => handlePeriodClick(option.value)}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        open={customPopoverOpen}
        onClose={() => onCustomPopoverOpenChange(false)}
        initialFocusRef={titleRef}
        returnFocusRef={customTabRef}
        labelledBy={titleId}
      >
        <div className="w-full min-w-0 max-w-md rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-lectum-soft sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2
              id={titleId}
              ref={titleRef}
              tabIndex={-1}
              className="min-w-0 pt-2 text-lg font-bold text-foreground outline-none"
            >
              Período personalizado
            </h2>
            <Button
              aria-label="Fechar período personalizado"
              variant="ghost"
              type="button"
              className="h-10 w-10 shrink-0 p-0"
              onClick={() => onCustomPopoverOpenChange(false)}
            >
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </div>

          {customPopoverOpen ? (
            <CustomPeriodForm range={customRange} disabled={disabled} onApply={applyCustomRange} />
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export const PremiumAnalyticsBanner = () => (
  <section className="border-y border-primary/20 bg-primary-soft p-5 md:p-6">
    <div className="relative grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-primary shadow-[var(--lectum-shadow-soft)] md:h-16 md:w-16">
        <BarChart3 className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
          Disponível para assinantes
        </p>
        <h2 className="mt-2 text-xl font-extrabold leading-7 text-foreground">
          Desbloqueie seus Analytics
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted md:text-base md:leading-7">
          Assine o plano profissional para acompanhar seus resultados.
        </p>
      </div>
      <Button asChild className="h-12 w-full rounded-full px-6 text-base md:w-auto">
        <Link href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}>
          Fazer upgrade
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </div>
  </section>
);

export const MetricCard = ({ locked, metric }: { locked?: boolean; metric: AnalyticsCardView }) => {
  const Icon = metric.icon;

  if (metric.layout === "wide") {
    return (
      <article className="col-span-2 flex min-h-[124px] min-w-0 flex-col overflow-hidden rounded-[20px] border border-primary/10 bg-surface p-4 shadow-[var(--lectum-shadow-soft)] sm:min-h-[136px] sm:rounded-[22px]">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <p
            className={cn(
              "shrink-0 text-[2rem] font-black leading-none tracking-[-0.06em] text-foreground sm:text-[2.25rem]",
              locked && "select-none blur-[5px]",
            )}
          >
            {metric.value}
          </p>
        </div>

        <div className="mt-3 min-w-0">
          <h2 className="break-words text-[0.84rem] font-extrabold leading-5 text-muted sm:text-sm">
            {metric.label}
          </h2>
          {metric.description ? (
            <p className="mt-1.5 max-w-[18rem] text-xs font-semibold leading-5 text-subtle sm:text-sm">
              {metric.description}
            </p>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="flex min-h-[132px] min-w-0 flex-col overflow-hidden rounded-[20px] border border-primary/10 bg-surface p-3 shadow-[var(--lectum-shadow-soft)] sm:min-h-[150px] sm:rounded-[22px] sm:p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary sm:h-10 sm:w-10">
        <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
      </span>

      <h2 className="mt-3 min-h-10 break-words text-[0.78rem] font-extrabold leading-5 text-muted sm:mt-4 sm:text-sm">
        {metric.label}
      </h2>

      <p
        className={cn(
          "mt-auto pt-2 text-2xl font-black leading-none text-foreground sm:text-[1.75rem]",
          locked && "select-none blur-[5px]",
        )}
      >
        {metric.value}
      </p>
      {metric.description ? (
        <p className="mt-2 text-xs leading-4 text-subtle">{metric.description}</p>
      ) : null}
    </article>
  );
};

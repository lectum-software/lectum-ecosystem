"use client";
import { useId, useRef, useState } from "react";
import type { PsychologistAnalyticsResponse } from "@/api/generator/types/psychologist-analytics";
import { Modal } from "@/components/ui/modal";
import { metricChange } from "../modules/comparison";

export function comparisonForMetric(data: PsychologistAnalyticsResponse | undefined, id: string) {
  if (!data?.comparison || data.period.key === "all") return null;
  if (id === "acquired_patients" && data.metrics.unanswered_weeks) return null;
  const current =
    id === "video_views"
      ? data.presentation_video.metrics.views
      : data.metrics[id as keyof typeof data.metrics];
  const previous =
    data.comparison.previous_values[id as keyof typeof data.comparison.previous_values];
  const change = metricChange(current, previous);
  return change && current != null && previous != null ? { ...change, current, previous } : null;
}

const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export function MetricComparison({
  data,
  id,
  label,
}: {
  data: PsychologistAnalyticsResponse;
  id: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const change = comparisonForMetric(data, id);
  if (!change || !data.comparison) return null;
  const direction =
    change.direction === "up" ? "Aumento" : change.direction === "down" ? "Queda" : "Sem variação";
  return (
    <>
      <span className="absolute bottom-2 right-2 text-[10px] leading-4">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${label}: ${direction} ${change.label}. Ver comparação de períodos`}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={
            "rounded px-1 py-1 text-[10px] font-semibold leading-4 focus-visible:outline-2 focus-visible:outline-primary " +
            (change.direction === "up"
              ? "text-success"
              : change.direction === "down"
                ? "text-danger"
                : "text-muted")
          }
        >
          <span aria-hidden>
            {change.label === "Novo"
              ? ""
              : change.direction === "up"
                ? "↑ "
                : change.direction === "down"
                  ? "↓ "
                  : ""}
          </span>
          {change.label}
        </button>
      </span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        initialFocusRef={closeRef}
        returnFocusRef={triggerRef}
        labelledBy={titleId}
      >
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-lg">
          <h2 id={titleId} className="text-base font-bold">
            {label}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Comparação com o período anterior de mesma duração.
          </p>
          <dl className="mt-4 grid gap-4 text-sm">
            <div>
              <dt className="font-semibold">
                Período atual · {change.current.toLocaleString("pt-BR")}
              </dt>
              <dd className="mt-1 text-xs text-muted">
                {date(data.period.start_at)} a {date(data.period.end_at)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                Período anterior · {change.previous.toLocaleString("pt-BR")}
              </dt>
              <dd className="mt-1 text-xs text-muted">
                {date(data.comparison.previous_period.start_at)} a{" "}
                {date(data.comparison.previous_period.end_at)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted">
            {change.label === "Novo"
              ? "O período anterior não teve registros; não há percentual calculável."
              : `${direction}: ${change.label}`}
            {" · Horário de Brasília."}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 min-h-11 w-full rounded-xl border border-border text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary"
          >
            Fechar
          </button>
        </div>
      </Modal>
    </>
  );
}

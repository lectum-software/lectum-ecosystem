"use client";
import { useState } from "react";
import type {
  AnalyticsTimeline,
  PsychologistAnalyticsPeriod,
} from "@/api/generator/types/psychologist-analytics";
import { dayLabel, pointerDayIndex, timelineDates } from "../modules/timeline";

const colors = ["var(--lectum-primary)", "var(--lectum-success)", "var(--lectum-muted)"];
export function MetricTimeline({
  timeline,
  period,
}: {
  timeline?: AnalyticsTimeline;
  period?: PsychologistAnalyticsPeriod;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!timeline)
    return <p className="py-10 text-center text-sm text-muted">Histórico ainda não disponível.</p>;
  const dates = timelineDates(timeline, period);
  if (!dates.length)
    return (
      <p className="py-10 text-center text-sm text-muted">Ainda não há dados neste período.</p>
    );
  const series = timeline.series.filter(
    (s) => s.id !== "unknown" || s.points.some((p) => p.value > 0),
  );
  const values = series.map((s) => {
    const map = new Map(s.points.map((p) => [p.date, p.value]));
    return dates.map((date) => map.get(date) ?? 0);
  });
  const max = Math.max(1, ...values.flat());
  const index = Math.min(selected ?? dates.length - 1, dates.length - 1);
  const x = (i: number) => (dates.length === 1 ? 150 : (i / (dates.length - 1)) * 300);
  const y = (value: number) => 140 - (value / max) * 120;
  const description = series.map((s, i) => `${s.label}: ${values[i][index]}`).join("; ");
  return (
    <div className="min-w-0">
      <div className="min-h-16 text-sm" aria-live="polite" aria-atomic="true">
        <p className="font-bold">
          {timeline.granularity === "week" ? "Semana de " : ""}
          {dayLabel(dates[index])}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s, i) => (
            <span key={s.id} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: colors[i] }} />
              {s.label}: <strong className="text-foreground">{values[i][index]}</strong>
            </span>
          ))}
        </div>
      </div>
      <div
        className="relative mt-4 touch-pan-y rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
        role="slider"
        tabIndex={0}
        aria-label={
          timeline.granularity === "week"
            ? "Selecionar semana no gráfico"
            : "Selecionar dia no gráfico"
        }
        aria-valuemin={0}
        aria-valuemax={dates.length - 1}
        aria-valuenow={index}
        aria-valuetext={`${dayLabel(dates[index])}; ${description}`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.getBoundingClientRect();
          setSelected(pointerDayIndex(event.clientX, rect.left, rect.width, dates.length));
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setSelected(pointerDayIndex(event.clientX, rect.left, rect.width, dates.length));
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          const next =
            event.key === "ArrowRight"
              ? index + 1
              : event.key === "ArrowLeft"
                ? index - 1
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? dates.length - 1
                    : null;
          if (next === null) return;
          event.preventDefault();
          setSelected(Math.max(0, Math.min(dates.length - 1, next)));
        }}
      >
        <svg
          viewBox="0 0 300 160"
          className="h-48 w-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[0, max].map((value) => (
            <g key={value}>
              <line
                x1="0"
                x2="300"
                y1={y(value)}
                y2={y(value)}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="3 4"
              />
              <text x="1" y={y(value) - 5} fontSize="9" fill="currentColor" className="text-muted">
                {value}
              </text>
            </g>
          ))}
          {values.map((points, i) => (
            <g key={series[i].id}>
              <path
                d={points
                  .map((value, j) => `${(j === 0 ? "M" : "L") + x(j)},${y(value)}`)
                  .join(" ")}
                fill="none"
                stroke={colors[i]}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={x(index)} cy={y(points[index])} r="3" fill={colors[i]} />
            </g>
          ))}
          <line
            x1={x(index)}
            x2={x(index)}
            y1="15"
            y2="140"
            stroke="currentColor"
            className="text-muted"
            strokeDasharray="3 4"
          />
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{dayLabel(dates[0])}</span>
        <span>{dayLabel(dates[dates.length - 1])}</span>
      </div>
      <p className="mt-3 text-xs text-muted">
        {timeline.granularity === "week"
          ? "Dados informados por semana. Semanas sem resposta não aparecem no gráfico."
          : "Deslize sobre o gráfico para consultar cada dia."}
      </p>
    </div>
  );
}

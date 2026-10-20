"use client";
import { useCallback, useState } from "react";
import type {
  AnalyticsTimeline,
  PsychologistAnalyticsPeriod,
} from "@/api/generator/types/psychologist-analytics";
import { dayLabel, pointerDayIndex, timelineDates } from "../modules/timeline";

const palette = [
  "var(--lectum-primary)",
  "var(--lectum-success)",
  "var(--lectum-warning)",
  "var(--lectum-primary-strong)",
  "var(--lectum-muted)",
];
export function MetricTimeline({
  timeline,
  period,
  total,
  showLegend = true,
  seriesColors = {},
}: {
  timeline?: AnalyticsTimeline;
  period?: PsychologistAnalyticsPeriod;
  total?: number;
  showLegend?: boolean;
  seriesColors?: Record<string, string>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [width, setWidth] = useState(300);
  const measurePlot = useCallback((plot: HTMLDivElement | null) => {
    if (!plot) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(1, entry.contentRect.width)),
    );
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);
  const height = Math.max(192, Math.min(320, width * 0.42));
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
  const colors = series.map((s, i) => seriesColors[s.id] ?? palette[i % palette.length]);
  const values = series.map((s) => {
    const map = new Map(s.points.map((p) => [p.date, p.value]));
    return dates.map((date) => map.get(date) ?? 0);
  });
  const max = Math.max(1, ...values.flat());
  const index = Math.min(selected ?? dates.length - 1, dates.length - 1);
  const x = (i: number) => (dates.length === 1 ? width / 2 : (i / (dates.length - 1)) * width);
  const y = (value: number) => height - 20 - (value / max) * (height - 45);
  const totals = values.map(
    (points, i) => series[i].total ?? points.reduce((sum, value) => sum + value, 0),
  );
  const description = series.map((s, i) => `${s.label}: ${values[i][index]}`).join("; ");
  return (
    <div className="min-w-0">
      {showLegend ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2" data-testid="period-totals">
          {series.map((s, i) => (
            <span key={s.id} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: colors[i] }} />
              {series.length === 1 ? "Total no período" : s.label}:{" "}
              <strong className="text-foreground">
                {(series.length === 1 ? (total ?? totals[i]) : totals[i]).toLocaleString("pt-BR")}
              </strong>
            </span>
          ))}
        </div>
      ) : null}
      <div
        className="relative mt-4 pt-16 touch-pan-y rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
        ref={measurePlot}
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
        {selected !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 w-max max-w-full rounded-xl bg-foreground px-3 py-2 text-xs text-background shadow-[var(--lectum-shadow-soft)]"
            style={{
              left: `${(x(index) / width) * 100}%`,
              transform: `translateX(-${(x(index) / width) * 100}%)`,
            }}
          >
            <p className="font-extrabold">
              {timeline.granularity === "week" ? "Semana de " : ""}
              {dayLabel(dates[index])}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {series.map((s, i) => (
                <span key={s.id}>
                  {series.length > 1 ? `${s.label}: ` : ""}
                  <strong>{values[i][index].toLocaleString("pt-BR")}</strong>
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible"
          style={{ height }}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {[0, max].map((value) => (
            <g key={value}>
              <line
                x1="0"
                x2={width}
                y1={y(value)}
                y2={y(value)}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="3 4"
              />
              <text x="1" y={y(value) - 5} fontSize="11" fill="currentColor" className="text-muted">
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
              {selected !== null || dates.length === 1 ? (
                <circle cx={x(index)} cy={y(points[index])} r="3" fill={colors[i]} />
              ) : null}
            </g>
          ))}
          {selected !== null ? (
            <line
              x1={x(index)}
              x2={x(index)}
              y1="15"
              y2={height - 20}
              stroke="currentColor"
              className="text-muted"
              strokeDasharray="3 4"
            />
          ) : null}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{dayLabel(dates[0])}</span>
        <span>{dayLabel(dates[dates.length - 1])}</span>
      </div>
    </div>
  );
}

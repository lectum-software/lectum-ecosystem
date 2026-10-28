"use client";
import { X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import type {
  AnalyticsTimeline,
  PsychologistAnalyticsPeriod,
} from "@/api/generator/types/psychologist-analytics";
import { dayLabel, pointerDayIndex, smoothTimelinePath, timelineValues } from "../modules/timeline";

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
  const sliderRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();
  const closeSelection = () => {
    setSelected(null);
    sliderRef.current?.focus({ preventScroll: true });
  };
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
  const { dates, series, values, totals: pointTotals } = timelineValues(timeline, period);
  if (!dates.length)
    return (
      <p className="py-10 text-center text-sm text-muted">Ainda não há dados neste período.</p>
    );
  const colors = series.map((s, i) => seriesColors[s.id] ?? palette[i % palette.length]);
  const max = Math.max(1, ...pointTotals);
  const index = Math.min(selected ?? dates.length - 1, dates.length - 1);
  const x = (i: number) => (dates.length === 1 ? width / 2 : (i / (dates.length - 1)) * width);
  const y = (value: number) => height - 20 - (value / max) * (height - 45);
  const totals = values.map(
    (points, i) => series[i].total ?? points.reduce((sum, value) => sum + value, 0),
  );
  const description =
    `Total: ${pointTotals[index]}; ` +
    series.map((s, i) => `${s.label}: ${values[i][index]}`).join("; ");
  const path = smoothTimelinePath(
    pointTotals.map((value, index) => ({ x: x(index), y: y(value) })),
  );
  return (
    <div className="min-w-0">
      {showLegend ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2" data-testid="period-totals">
          {series.map((s, i) => (
            <span
              key={s.id}
              className="flex items-center gap-1.5 text-xs font-semibold leading-4 text-muted"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: colors[i] }} />
              {series.length === 1 ? "Total no período" : s.label}:{" "}
              <strong className="text-foreground">
                {(series.length === 1 ? (total ?? totals[i]) : totals[i]).toLocaleString("pt-BR")}
              </strong>
            </span>
          ))}
        </div>
      ) : null}
      <div className={`relative ${showLegend ? "mt-5" : "mt-2"}`} ref={measurePlot}>
        {selected !== null ? (
          <div
            role="status"
            className="absolute top-0 z-10 w-max max-w-full rounded-xl bg-foreground pl-3 pr-11 py-2 text-xs text-background shadow-[var(--lectum-shadow-soft)]"
            style={{
              left: `${(x(index) / width) * 100}%`,
              transform: `translateX(-${(x(index) / width) * 100}%)`,
            }}
          >
            <button
              type="button"
              aria-label="Fechar detalhes do gráfico"
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-xl text-background hover:bg-background/10 focus-visible:outline-2 focus-visible:outline-background"
              onClick={closeSelection}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeSelection();
                }
              }}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <p className="font-extrabold">
              {timeline.granularity === "week" ? "Semana de " : ""}
              {dayLabel(dates[index])}
            </p>
            <p className="mt-1 font-bold">Total: {pointTotals[index].toLocaleString("pt-BR")}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {series.length > 1
                ? series.map((s, i) => (
                    <span key={s.id}>
                      {series.length > 1 ? `${s.label}: ` : ""}
                      <strong>{values[i][index].toLocaleString("pt-BR")}</strong>
                    </span>
                  ))
                : null}
            </div>
          </div>
        ) : null}
        <div
          className={`touch-pan-y rounded-xl focus-visible:outline-2 focus-visible:outline-primary`}
          ref={sliderRef}
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
            if (event.key === "Escape") {
              event.preventDefault();
              setSelected(null);
              return;
            }
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
            viewBox={`0 0 ${width} ${height}`}
            className="w-full overflow-visible"
            style={{ height }}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--lectum-primary)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--lectum-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${path} L ${x(dates.length - 1)},${y(0)} L ${x(0)},${y(0)} Z`}
              fill={`url(#${gradientId})`}
            />
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
                <text
                  x="1"
                  y={y(value) - 5}
                  fontSize="11"
                  fill="currentColor"
                  className="text-muted"
                >
                  {value}
                </text>
              </g>
            ))}
            <g>
              <path
                data-testid="total-curve"
                d={path}
                fill="none"
                stroke="var(--lectum-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {selected !== null || dates.length === 1 ? (
                <circle
                  cx={x(index)}
                  cy={y(pointTotals[index])}
                  r="4"
                  fill="var(--lectum-primary)"
                />
              ) : null}
            </g>
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
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{dayLabel(dates[0])}</span>
        <span>{dayLabel(dates[dates.length - 1])}</span>
      </div>
    </div>
  );
}

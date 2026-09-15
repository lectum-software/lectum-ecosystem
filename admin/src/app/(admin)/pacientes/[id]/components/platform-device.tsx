"use client";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminPatientDetail } from "@/api/req/patients";
import { numberFormatter } from "../modules/detail-config";
import { formatDateTime, formatPlatformDuration } from "../modules/detail-support";
import {
  buildPieSlicePath,
  formatDevicePercentage,
  formatDeviceSessionCount,
  getPiePoint,
  hexToRgba,
  type PatientPlatformDeviceUsage,
  type PatientPlatformDeviceUsageItem,
  patientPlatformDeviceChartColors,
} from "../modules/platform-support";
import { CardShell } from "./common";

export const PlatformDevicePiePercentageLabel = ({
  color,
  label,
  x,
  y,
}: {
  color: string;
  label: string;
  x: number;
  y: number;
}) => {
  const width = 39;
  const height = 16;

  return (
    <g>
      <rect
        fill={hexToRgba(color, 0.86)}
        height={height}
        rx={height / 2}
        width={width}
        x={x - width / 2}
        y={y - height / 2}
      />
      <text
        dominantBaseline="middle"
        fill="var(--admin-surface)"
        fontSize="8.5"
        fontWeight="900"
        textAnchor="middle"
        x={x}
        y={y + 0.25}
      >
        {label}
      </text>
    </g>
  );
};

export const PatientPlatformDeviceUsageSection = ({
  deviceUsage,
}: {
  deviceUsage?: PatientPlatformDeviceUsage;
}) => {
  const items = deviceUsage?.items ?? [];
  const totalSessions = deviceUsage?.total_sessions ?? 0;
  const center = 60;
  const radius = 48;
  const innerRadius = 31;
  const visibleItems = items.filter((item) => item.count > 0);
  const hasDeviceSessions = totalSessions > 0 && visibleItems.length > 0;
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: PatientPlatformDeviceUsageItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = totalSessions > 0 ? item.count / totalSessions : 0;
      if (share <= 0) return accumulator;

      const startAngle = accumulator.currentAngle;
      const endAngle = startAngle + share * 360;

      return {
        currentAngle: endAngle,
        items: accumulator.items.concat({
          endAngle,
          item,
          share,
          startAngle,
        }),
      };
    },
    { currentAngle: -90, items: [] },
  ).items;
  const ariaLabel = hasDeviceSessions
    ? `Gráfico de donut dos devices usados pelo paciente: ${items
        .map(
          (item) =>
            `${item.label}: ${formatDeviceSessionCount(item.count)}, ${formatDevicePercentage(
              item.percentage,
            )}`,
        )
        .join("; ")}.`
    : `Gráfico de donut dos devices usados pelo paciente: ${
        deviceUsage?.unavailable_reason ??
        "sem sessões autenticadas por dispositivo no período selecionado."
      }`;

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Devices</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            Sessões autenticadas do paciente por tipo de dispositivo no período.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-black text-muted">
          {formatDeviceSessionCount(totalSessions)}
        </span>
      </div>

      <figure className="mt-3 grid gap-4 sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:items-center">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-36 sm:w-40"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx={center}
            cy={center}
            fill="var(--admin-surface-muted)"
            r={radius}
            stroke="var(--admin-border)"
            strokeWidth="1"
          />
          {segments.map((segment) => {
            const color = patientPlatformDeviceChartColors[segment.item.device_type];
            const labelPoint = getPiePoint(
              center,
              radius * 0.58,
              (segment.startAngle + segment.endAngle) / 2,
            );
            const percentageLabel = formatDevicePercentage(segment.item.percentage);

            if (segment.share >= 0.999) {
              return (
                <g key={segment.item.device_type}>
                  <circle
                    cx={center}
                    cy={center}
                    fill={color}
                    r={radius}
                    stroke="var(--admin-surface)"
                    strokeWidth="1.4"
                  />
                  <PlatformDevicePiePercentageLabel
                    color={color}
                    label={percentageLabel}
                    x={center}
                    y={center}
                  />
                </g>
              );
            }

            return (
              <g key={segment.item.device_type}>
                <path
                  d={buildPieSlicePath(center, radius, segment.startAngle, segment.endAngle)}
                  fill={color}
                  stroke="var(--admin-surface)"
                  strokeWidth="1.4"
                />
                {segment.share > 1 ? (
                  <PlatformDevicePiePercentageLabel
                    color={color}
                    label={percentageLabel}
                    x={labelPoint.x}
                    y={labelPoint.y}
                  />
                ) : null}
              </g>
            );
          })}
          <circle
            aria-hidden
            cx={center}
            cy={center}
            fill="var(--admin-surface)"
            r={innerRadius}
            stroke="var(--admin-surface)"
            strokeWidth="1"
          />
          <text
            fill="var(--admin-foreground)"
            fontSize="15"
            fontWeight="900"
            textAnchor="middle"
            x={center}
            y={center - 2}
          >
            {numberFormatter.format(totalSessions)}
          </text>
          <text
            fill="var(--admin-muted)"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
            x={center}
            y={center + 12}
          >
            total
          </text>
        </svg>
        <figcaption className="space-y-3">
          {hasDeviceSessions ? (
            items.map((device) => {
              const operatingSystems = (device.operating_systems ?? []).filter(
                (item) => item.count > 0,
              );

              return (
                <div className="rounded-2xl bg-surface-muted p-3" key={device.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: patientPlatformDeviceChartColors[device.device_type],
                        }}
                      />
                      <span className="truncate">{device.label}</span>
                    </span>
                    <span className="text-sm font-black text-foreground">
                      {formatDevicePercentage(device.percentage)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-muted">
                    {formatDeviceSessionCount(device.count)}
                  </p>
                  {operatingSystems.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {operatingSystems.map((operatingSystem) => (
                        <span
                          className="text-[0.68rem] font-black text-muted"
                          key={operatingSystem.id}
                        >
                          {operatingSystem.label}: {formatDeviceSessionCount(operatingSystem.count)}{" "}
                          · {formatDevicePercentage(operatingSystem.percentage)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[0.68rem] font-bold text-subtle">
                      Sistema operacional não identificado.
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
              {deviceUsage?.unavailable_reason ??
                "Sem sessões autenticadas por dispositivo no período selecionado."}
            </p>
          )}
        </figcaption>
      </figure>
    </section>
  );
};

export const PatientPlatformUsageCard = ({
  detail,
  isRefreshing = false,
  periodControls,
}: {
  detail: AdminPatientDetail;
  isRefreshing?: boolean;
  periodControls: ReactNode;
}) => {
  const usage = detail.platform_usage;

  return (
    <CardShell className="p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Uso da plataforma</h2>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            Acessos, sessões, duração média e instalação PWA do paciente no período.
          </p>
        </div>
        {periodControls}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Último acesso", formatDateTime(usage.last_access_at)],
          ["Dias com acesso", numberFormatter.format(usage.access_days_count)],
          ["Sessões", numberFormatter.format(usage.sessions_count)],
          ["Tempo médio", formatPlatformDuration(usage.average_duration_seconds)],
          ["PWA instalado", usage.pwa_installation_recorded ? "Sim" : "Não registrado"],
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-surface-muted p-3" key={label}>
            <p className="text-xs font-black text-muted">{label}</p>
            <p className="mt-1 text-lg font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {usage.duration_unavailable_reason ? (
        <p className="mt-3 text-xs font-bold text-subtle">{usage.duration_unavailable_reason}</p>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">Páginas mais acessadas</h3>
          {usage.unavailable_reason ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
              {usage.unavailable_reason}
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {usage.top_pages.map((page) => (
                <div className="rounded-2xl border border-border/70 p-3" key={page.label}>
                  <div className="flex items-center justify-between gap-3 text-xs font-black">
                    <span className="text-muted">{page.label}</span>
                    <span className="text-foreground">
                      {numberFormatter.format(page.count)} ·{" "}
                      {page.percentage.toLocaleString("pt-BR")}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      aria-hidden
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, page.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <PatientPlatformDeviceUsageSection deviceUsage={usage.device_usage} />
      </div>
    </CardShell>
  );
};

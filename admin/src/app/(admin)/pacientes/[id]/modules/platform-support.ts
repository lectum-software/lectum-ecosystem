import { buildPieSlicePath, getPiePoint } from "@/lib/chart-geometry";

export { buildPieSlicePath, getPiePoint };

import type { AdminPatientDetail } from "@/api/req/patients";
import { colorWithAlpha } from "@/lib/visual-tokens";

import { numberFormatter } from "./detail-config";

export type PatientPlatformHourlyActivityPoint =
  AdminPatientDetail["platform_usage"]["hourly_activity"][number];

export type PatientPlatformHourlyActivityMetricKey =
  | "accesses"
  | "engagement"
  | "posts"
  | "replies"
  | "reviews";

export type PatientPlatformHourlyActivitySelection = "all" | `${number}`;

export const patientPlatformHourlyActivityBreakdown: {
  className: string;
  key: PatientPlatformHourlyActivityMetricKey;
  label: string;
}[] = [
  { className: "bg-primary", key: "accesses", label: "Acessos" },
  { className: "bg-success", key: "posts", label: "Posts" },
  { className: "bg-warning", key: "replies", label: "Comentários" },
  { className: "bg-info", key: "engagement", label: "Interações" },
  { className: "bg-chart-accent", key: "reviews", label: "Avaliações" },
];

export const patientPlatformWeekdayDisplayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

export const patientPlatformWeekdayLabel = (day: number) =>
  day === 0
    ? "Dom"
    : day === 1
      ? "Seg"
      : day === 2
        ? "Ter"
        : day === 3
          ? "Qua"
          : day === 4
            ? "Qui"
            : day === 5
              ? "Sex"
              : "Sáb";

export const formatPatientPlatformActivityHourRange = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const nextHour = (normalizedHour + 1) % 24;

  return `${String(normalizedHour).padStart(2, "0")}h-${String(nextHour).padStart(2, "0")}h`;
};

export const safePatientPlatformActivityCount = (value: number | null | undefined) =>
  numberFormatter.format(typeof value === "number" ? value : 0);

export const normalizePatientPlatformHourlyActivityPoint = (
  point: Partial<PatientPlatformHourlyActivityPoint> | undefined,
  hour: number,
): PatientPlatformHourlyActivityPoint => {
  const accesses = Math.max(0, Number(point?.accesses ?? point?.count ?? 0));
  const engagement = Math.max(0, Number(point?.engagement ?? 0));
  const posts = Math.max(0, Number(point?.posts ?? 0));
  const replies = Math.max(0, Number(point?.replies ?? 0));
  const reviews = Math.max(0, Number(point?.reviews ?? 0));
  const total = Math.max(
    0,
    Number(point?.total ?? accesses + engagement + posts + replies + reviews),
  );

  return {
    accesses,
    count: Math.max(0, Number(point?.count ?? total)),
    engagement,
    hour,
    label: point?.label || formatPatientPlatformActivityHourRange(hour),
    percentage: Math.max(0, Number(point?.percentage ?? 0)),
    posts,
    replies,
    reviews,
    total,
  };
};

export type PatientPlatformDeviceUsage = AdminPatientDetail["platform_usage"]["device_usage"];

export type PatientPlatformDeviceUsageItem = PatientPlatformDeviceUsage["items"][number];

export const formatDeviceSessionCount = (count: number) =>
  `${numberFormatter.format(count)} ${count === 1 ? "sessão" : "sessões"}`;

export const formatDevicePercentage = (percentage: number) =>
  `${percentage.toLocaleString("pt-BR")}%`;

export const patientPlatformDeviceChartColors = {
  desktop: "var(--admin-success)",
  mobile: "var(--admin-primary)",
  tablet: "var(--admin-chart-accent)",
  unknown: "var(--admin-subtle)",
} satisfies Record<PatientPlatformDeviceUsageItem["device_type"], string>;

export const hexToRgba = colorWithAlpha;

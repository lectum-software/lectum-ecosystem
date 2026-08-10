"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  type LucideIcon,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ComponentPropsWithoutRef, type FocusEvent, type ReactNode, useMemo } from "react";
import { useAdminPatientReports } from "@/api/callers/patients";
import type {
  AdminPatientDetail,
  AdminPatientReportsQuery,
  PatientsDetailMetric,
} from "@/api/req/patients";
import {
  AdminMetricCarousel,
  adminSixColumnMetricItemClassName,
} from "@/components/admin-metric-carousel";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";

import {
  CARD,
  metricIcons,
  numberFormatter,
  PATIENT_DETAIL_TABS,
  PATIENT_STATISTICS_PERIOD_OPTIONS,
  type PatientDetailTab,
  type PatientStatisticsChartMetric,
  type PatientStatisticsCustomRange,
  type PatientStatisticsPeriodPreset,
  type PatientStatisticsPeriodValue,
  patientMetricDisplayLabels,
} from "../modules/detail-config";

import {
  formatChange,
  formatDayMonth,
  formatLastAccess,
  initialsFromName,
  isApiMediaSrc,
  patientTabHref,
  safeAvatarSrc,
} from "../modules/detail-support";

export const CardShell = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) => (
  <section className={cn(CARD, className)} {...props}>
    {children}
  </section>
);

export const Badge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      className,
    )}
  >
    {children}
  </span>
);

export const IconCircle = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
    <Icon aria-hidden className="h-5 w-5" />
  </span>
);

export const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const imageSrc = safeAvatarSrc(src);
  if (!imageSrc) {
    return (
      <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary-soft text-3xl font-black text-primary sm:h-32 sm:w-32">
        {initialsFromName(name)}
      </span>
    );
  }
  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-24 w-24 shrink-0 rounded-full object-cover sm:h-32 sm:w-32"
      height={128}
      priority
      src={imageSrc}
      unoptimized={isApiMediaSrc(imageSrc)}
      width={128}
    />
  );
};

export const TrendBadge = ({ metric }: { metric: PatientsDetailMetric }) => (
  <span
    className={cn(
      "text-xs font-semibold",
      metric.trend === "up" && "text-success",
      metric.trend === "down" && "text-danger",
      ["flat", "unavailable"].includes(metric.trend) && "text-muted",
    )}
  >
    {formatChange(metric.change_percent)}
  </span>
);

export const MetricCard = ({ metric }: { metric: PatientsDetailMetric }) => {
  const Icon = metricIcons[metric.id] ?? ShieldCheck;
  const label = patientMetricDisplayLabels[metric.id] ?? metric.label;

  return (
    <CardShell className="h-full min-h-[10rem] w-full p-4">
      <IconCircle icon={Icon} />
      <p className="mt-4 text-sm font-extrabold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
        {numberFormatter.format(metric.value)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TrendBadge metric={metric} />
        <span className="text-xs font-bold text-muted">vs. período anterior</span>
      </div>
    </CardShell>
  );
};

export type PatientStatisticsPeriodControlsProps = {
  className?: string;
  idPrefix: string;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof PatientStatisticsCustomRange, value: string) => void;
  onPeriodChange: (period: PatientStatisticsPeriodPreset) => void;
  period: PatientStatisticsPeriodValue;
  range: PatientStatisticsCustomRange;
  rangeError: string | null;
};

export const PatientStatisticsPeriodControls = ({
  className,
  idPrefix,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  range,
  rangeError,
}: PatientStatisticsPeriodControlsProps) => (
  <div className={cn("w-full lg:w-[min(720px,52vw)]", className)} onBlur={onDateControlsBlur}>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-period`}>
        Período
        <span className="relative mt-2 block">
          <select
            className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id={`${idPrefix}-period`}
            onChange={(event) =>
              onPeriodChange(event.target.value as PatientStatisticsPeriodPreset)
            }
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {PATIENT_STATISTICS_PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
          />
        </span>
      </label>

      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-from`}>
        De
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-from`}
          onChange={(event) => onDateChange("from", event.target.value)}
          type="date"
          value={range.from ?? ""}
        />
      </label>
      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-to`}>
        Até
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-to`}
          onChange={(event) => onDateChange("to", event.target.value)}
          type="date"
          value={range.to ?? ""}
        />
      </label>
    </div>
    {rangeError ? (
      <p className="mt-2 max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

export const formatPatientPreviousPeriod = (period: AdminPatientDetail["period"]) =>
  period.previous_from && period.previous_to
    ? `${formatDayMonth(period.previous_from)} - ${formatDayMonth(period.previous_to)}`
    : "período anterior";

export const PatientMetricComparisonLine = ({
  metric,
  period,
}: {
  metric: Pick<PatientsDetailMetric, "change_percent" | "trend">;
  period: AdminPatientDetail["period"];
}) => {
  const hasArrow = metric.trend === "up" || metric.trend === "down";
  const TrendIcon = metric.trend === "down" ? ArrowDown : ArrowUp;

  return (
    <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-[0.68rem]">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-black",
          metric.trend === "up" && "text-success",
          metric.trend === "down" && "text-danger",
          (metric.trend === "flat" || metric.trend === "unavailable") && "text-muted",
        )}
      >
        {hasArrow ? <TrendIcon aria-hidden className="h-3 w-3" /> : null}
        {formatChange(metric.change_percent)}
      </span>
      <span className="min-w-0 break-words font-bold text-muted">
        vs. {formatPatientPreviousPeriod(period)}
      </span>
    </div>
  );
};

export const PatientStatisticsMetricToggleCard = ({
  active,
  config,
  metric,
  onToggle,
  period,
}: {
  active: boolean;
  config: PatientStatisticsChartMetric;
  metric: PatientsDetailMetric;
  onToggle: () => void;
  period: AdminPatientDetail["period"];
}) => {
  const Icon = config.icon;
  const label = config.label;
  const displayValue = numberFormatter.format(metric.value);

  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-full w-full min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={onToggle}
      title={`${label}: ${displayValue}. ${active ? "Visível no gráfico" : "Oculto no gráfico"}`}
      type="button"
    >
      <span className="block min-w-0 max-w-full">
        <span className="block">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full",
              config.iconToneClassName,
              config.iconClassName,
            )}
          >
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        </span>
        <span className="mt-4 block min-w-0 max-w-full">
          <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
            {label}
          </span>
          <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
            {displayValue}
          </span>
        </span>
      </span>
      <PatientMetricComparisonLine metric={metric} period={period} />
      <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
    </button>
  );
};

export const PatientStatisticsMetricCarousel = ({
  items,
  title,
}: {
  items: { content: ReactNode; id: string }[];
  title: string;
}) => {
  return (
    <AdminMetricCarousel
      constrainWidth
      itemClassName={adminSixColumnMetricItemClassName}
      items={items}
      title={title}
    />
  );
};

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar o paciente"
  />
);

export const Header = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPatientDetail;
  id: string;
  tab: PatientDetailTab;
}) => {
  const reportsAlertInput = useMemo<AdminPatientReportsQuery>(
    () => ({ limit: 1, page: 1, status: "all", type: "all" }),
    [],
  );
  const reportsAlertQuery = useAdminPatientReports(id, reportsAlertInput);
  const reportsCount =
    reportsAlertQuery.data?.cards.find((card) => card.id === "total")?.value ?? 0;
  const location = detail.header.location
    ? [detail.header.location.city, detail.header.location.state, detail.header.location.country]
        .filter(Boolean)
        .join(", ")
    : "Não informado";
  return (
    <CardShell className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-7">
        <div className="flex flex-col gap-5 sm:flex-1 sm:flex-row sm:items-center">
          <Avatar name={detail.header.name} src={detail.header.avatar} />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {detail.header.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
              <span>Paciente</span>
            </div>
            <div className="mt-4 flex min-w-0 flex-nowrap items-center gap-x-5 overflow-x-auto text-sm text-muted sm:gap-x-6 md:overflow-visible xl:gap-x-8">
              <span
                className="inline-flex min-w-0 max-w-80 shrink items-center gap-2 whitespace-nowrap"
                title={detail.header.email}
              >
                <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 truncate">{detail.header.email}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{detail.header.status === "active" ? "Conta ativa" : "Conta inativa"}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <MapPin aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{location}</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              {"\u00daltimo acesso"}: {formatLastAccess(detail.header.last_access_at)}
            </p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-border bg-surface-muted/40 px-3">
        <nav aria-label="Abas do detalhe do paciente" className="flex min-w-max gap-1 py-1">
          {PATIENT_DETAIL_TABS.map((item) => {
            const active = item.id === tab;
            const showReportsAlert = item.id === "denuncias" && reportsCount > 0;
            const reportsAlertLabel =
              reportsCount === 1
                ? "Há 1 denúncia vinculada ao paciente"
                : `Há ${numberFormatter.format(reportsCount)} denúncias vinculadas ao paciente`;

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-black transition",
                  active ? "text-primary" : "text-foreground hover:text-primary",
                )}
                href={patientTabHref(id, item.id)}
                key={item.id}
              >
                <span>{item.label}</span>
                {showReportsAlert ? (
                  <AlertTriangle aria-label={reportsAlertLabel} className="h-4 w-4 text-danger" />
                ) : null}
                {active ? (
                  <span className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </CardShell>
  );
};

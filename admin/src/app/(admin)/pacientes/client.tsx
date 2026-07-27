"use client";

import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  Flame,
  Loader2,
  type LucideIcon,
  MapPin,
  MessageCircle,
  RefreshCw,
  Smartphone,
  Snowflake,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { type FocusEvent, type ReactNode, useMemo, useState, useSyncExternalStore } from "react";
import { useAdminPatientsDashboard } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientsDashboard,
  PatientsDashboardBreakdownItem,
  PatientsDashboardDailyPoint,
  PatientsDashboardIntentFilterId,
  PatientsDashboardIntentFilterOption,
  PatientsDashboardIntentSegment,
  PatientsDashboardMetric,
  PatientsDashboardQuery,
} from "@/api/req/patients";
import { BRAZIL_STATE_MAP_PATHS } from "@/lib/brazil-state-map";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";
import { WORLD_COUNTRY_MAP_PATHS } from "@/lib/world-country-map";

const CARD_ORDER = [
  "total_patients",
  "active_patients",
  "inactive_patients",
  "new_signups",
] as const;
type DeviceUsageItem = AdminPatientsDashboard["device_usage"]["items"][number];
type PatientsDashboardPeriodValue = NonNullable<PatientsDashboardQuery["period"]>;
type PatientsDashboardPeriodPreset = Exclude<PatientsDashboardPeriodValue, "custom">;
type PatientsDashboardRange = Pick<PatientsDashboardQuery, "from" | "to">;
type PatientsStatisticsIntentFilterKey =
  | "deviceUsage"
  | "gender"
  | "locations"
  | "platformUsage"
  | "signupSources";
type PatientsStatisticsIntentFilters = Record<
  PatientsStatisticsIntentFilterKey,
  PatientsDashboardIntentFilterId
>;

const PATIENTS_DASHBOARD_PERIOD_OPTIONS: {
  id: PatientsDashboardPeriodPreset;
  label: string;
}[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
];
const DEFAULT_PATIENTS_STATISTICS_INTENT_FILTERS: PatientsStatisticsIntentFilters = {
  deviceUsage: "all",
  gender: "all",
  locations: "all",
  platformUsage: "all",
  signupSources: "all",
};
const CHART_COLORS = ["#308ce8", "#13a85b", "#64748b", "#f59f00"];
const SIGNUP_SOURCE_CHART_COLORS: Record<string, string> = {
  email_password: "#13a85b",
  google: "#308ce8",
};
const GENDER_CHART_COLORS: Record<string, string> = {
  feminino: "#13a85b",
  male: "#64748b",
  masculina: "#64748b",
  masculino: "#64748b",
  nao_binario: "#8b5cf6",
  nao_informado: "#308ce8",
  outro: "#f59f00",
};
const DEVICE_USAGE_CHART_COLORS = {
  desktop: "#13a85b",
  mobile: "#308ce8",
  tablet: "#8b5cf6",
  unknown: "#94a3b8",
} satisfies Record<DeviceUsageItem["device_type"], string>;
const PATIENT_INTENT_CHART_COLORS = {
  cold: "#64748b",
  curious: "#308ce8",
  objective: "#f59f00",
  very_qualified: "#13a85b",
} satisfies Record<PatientsDashboardIntentSegment["id"], string>;
const PATIENT_INTENT_ICONS = {
  cold: Snowflake,
  curious: Eye,
  objective: Target,
  very_qualified: Flame,
} satisfies Record<PatientsDashboardIntentSegment["id"], LucideIcon>;
const PATIENT_INTENT_TONE_CLASS_NAMES = {
  cold: "bg-surface-muted text-muted",
  curious: "bg-primary-soft text-primary",
  objective: "bg-warning/10 text-warning",
  very_qualified: "bg-success/10 text-success",
} satisfies Record<PatientsDashboardIntentSegment["id"], string>;
const LOCATION_RANKING_LIMIT = 5;
const BRAZIL_STATE_CODES = new Set([
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
]);
const BRAZIL_STATE_NAME_TO_CODE: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapá: "AP",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceará: "CE",
  ceara: "CE",
  "distrito federal": "DF",
  "espírito santo": "ES",
  "espirito santo": "ES",
  goiás: "GO",
  goias: "GO",
  maranhão: "MA",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  pará: "PA",
  para: "PA",
  paraíba: "PB",
  paraiba: "PB",
  paraná: "PR",
  parana: "PR",
  pernambuco: "PE",
  piauí: "PI",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondônia: "RO",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "são paulo": "SP",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};
const LOCAL_LOCATION_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_PREVIEW_LOCATION_DATA = {
  cities: [
    { count: 9, id: "preview-city:sao-paulo-sp", label: "São Paulo, SP", percentage: 27.3 },
    {
      count: 7,
      id: "preview-city:rio-de-janeiro-rj",
      label: "Rio de Janeiro, RJ",
      percentage: 21.2,
    },
    {
      count: 5,
      id: "preview-city:belo-horizonte-mg",
      label: "Belo Horizonte, MG",
      percentage: 15.2,
    },
    { count: 4, id: "preview-city:curitiba-pr", label: "Curitiba, PR", percentage: 12.1 },
    { count: 3, id: "preview-city:porto-alegre-rs", label: "Porto Alegre, RS", percentage: 9.1 },
    { count: 2, id: "preview-city:campinas-sp", label: "Campinas, SP", percentage: 6.1 },
    { count: 3, id: "preview-city:outras", label: "Outras cidades", percentage: 9.1 },
  ],
  countries: [{ count: 33, id: "preview-country:br", label: "Brasil", percentage: 100 }],
  source: "visitor_location",
  states: [
    { count: 12, id: "SP", label: "SP", percentage: 36.4 },
    { count: 8, id: "RJ", label: "RJ", percentage: 24.2 },
    { count: 6, id: "MG", label: "MG", percentage: 18.2 },
    { count: 4, id: "PR", label: "PR", percentage: 12.1 },
    { count: 3, id: "RS", label: "RS", percentage: 9.1 },
  ],
  total: 33,
} satisfies AdminPatientsDashboard["locations"];
const LOCAL_PREVIEW_DEVICE_USAGE = {
  items: [
    {
      active_patients_count: 19,
      count: 24,
      device_type: "mobile",
      id: "mobile",
      label: "Mobile",
      operating_systems: [
        {
          active_patients_count: 15,
          count: 18,
          id: "android",
          label: "Android",
          operating_system: "android",
          percentage: 75,
        },
        {
          active_patients_count: 5,
          count: 6,
          id: "ios",
          label: "iOS",
          operating_system: "ios",
          percentage: 25,
        },
      ],
      percentage: 60,
    },
    {
      active_patients_count: 8,
      count: 10,
      device_type: "desktop",
      id: "desktop",
      label: "Desktop",
      operating_systems: [
        {
          active_patients_count: 6,
          count: 7,
          id: "windows",
          label: "Windows",
          operating_system: "windows",
          percentage: 70,
        },
        {
          active_patients_count: 2,
          count: 3,
          id: "macos",
          label: "macOS",
          operating_system: "macos",
          percentage: 30,
        },
      ],
      percentage: 25,
    },
    {
      active_patients_count: 4,
      count: 4,
      device_type: "tablet",
      id: "tablet",
      label: "Tablet",
      operating_systems: [
        {
          active_patients_count: 4,
          count: 4,
          id: "ipados",
          label: "iPadOS",
          operating_system: "ipados",
          percentage: 100,
        },
      ],
      percentage: 10,
    },
    {
      active_patients_count: 2,
      count: 2,
      device_type: "unknown",
      id: "unknown",
      label: "Não identificado",
      operating_systems: [
        {
          active_patients_count: 2,
          count: 2,
          id: "unknown",
          label: "Não identificado",
          operating_system: "unknown",
          percentage: 100,
        },
      ],
      percentage: 5,
    },
  ],
  source: "visitor_session.device_type+visitor_session.os+user.role=paciente",
  total_active_patients: 30,
  total_sessions: 40,
  unavailable_reason: null,
} satisfies AdminPatientsDashboard["device_usage"];
type LocationMapScope = "countries" | "states";
const LOCATION_MAP_SCOPE_LABELS = {
  countries: "Países",
  states: "Estados",
} satisfies Record<LocationMapScope, string>;
const COUNTRY_WORLD_MAP_ID_BY_KEY: Record<string, string> = {
  alemanha: "276",
  argentina: "032",
  australia: "036",
  br: "076",
  brasil: "076",
  brazil: "076",
  ca: "124",
  canada: "124",
  chile: "152",
  china: "156",
  de: "276",
  "estados unidos": "840",
  espanha: "724",
  es: "724",
  franca: "250",
  france: "250",
  germany: "276",
  india: "356",
  it: "380",
  italia: "380",
  japao: "392",
  japan: "392",
  mexico: "484",
  portugal: "620",
  pt: "620",
  "reino unido": "826",
  uk: "826",
  "united kingdom": "826",
  "united states": "840",
  "united states of america": "840",
  us: "840",
  usa: "840",
};
type DashboardMetricKey = (typeof CARD_ORDER)[number];

const DASHBOARD_METRIC_CONFIG: Record<DashboardMetricKey, { color: string; icon: LucideIcon }> = {
  active_patients: { color: CHART_COLORS[1], icon: UserCheck },
  inactive_patients: { color: CHART_COLORS[2], icon: UserRound },
  new_signups: { color: CHART_COLORS[3], icon: UserPlus },
  total_patients: { color: CHART_COLORS[0], icon: UsersRound },
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};

const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

const getDashboardRangeForPeriod = (
  period: PatientsDashboardPeriodPreset,
): PatientsDashboardRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };
  if (period === "7d") return { from: toInputDate(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toInputDate(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toInputDate(startOfLastDays(90)), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

const buildDashboardPeriodQuery = (
  period: PatientsDashboardPeriodValue,
  range: PatientsDashboardRange,
): PatientsDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatSelectedPeriod = (period: AdminPatientsDashboard["period"]) => {
  if (!period.from || !period.to) return period.label;

  return `${period.label} · ${formatDate(period.from)} a ${formatDate(period.to)}`;
};

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatPercentageValue = (value: number) => `${numberFormatter.format(value)}%`;

const formatNullablePercentage = (value: number | null) =>
  typeof value === "number" ? formatPercentageValue(value) : "Indisponível";

const formatDaysMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";
  if (value === 0) return "Mesmo dia";

  return `${numberFormatter.format(value)} dias`;
};

const formatDecimalMetric = (value: number | null) =>
  typeof value === "number" ? numberFormatter.format(value) : "Indisponível";

const formatSecondsMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) return `${seconds}s`;

  return `${minutes}min ${String(remainder).padStart(2, "0")}s`;
};

const isValidRange = (range: PatientsDashboardRange) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const CardShell = ({
  children,
  className,
  id,
}: {
  children?: ReactNode;
  className?: string;
  id?: string;
}) => (
  <section
    className={cn(
      "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
    id={id}
  >
    {children}
  </section>
);

const PanelTitle = ({
  action,
  description,
  icon: Icon,
  source,
  title,
}: {
  action?: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  source?: string;
  title: string;
}) => (
  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <h3 className="min-w-0 whitespace-nowrap text-lg font-black text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-full text-sm font-bold leading-5 text-muted">{description}</p>
        ) : null}
      </div>
    </div>
    {source || action ? (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:items-end">
        {source ? (
          <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {source}
          </span>
        ) : null}
        {action}
      </div>
    ) : null}
  </div>
);

const IntentFilterSelect = ({
  id,
  onChange,
  options,
  value,
}: {
  id: string;
  onChange: (value: PatientsDashboardIntentFilterId) => void;
  options: PatientsDashboardIntentFilterOption[];
  value: PatientsDashboardIntentFilterId;
}) => (
  <label className="grid w-full gap-1 text-xs font-semibold text-muted sm:w-auto" htmlFor={id}>
    <span className="sr-only">Filtrar por intenção do paciente</span>
    <span className="relative">
      <select
        className="h-10 w-full min-w-[7.75rem] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-8 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-[7.75rem]"
        id={id}
        onChange={(event) => onChange(event.target.value as PatientsDashboardIntentFilterId)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </span>
  </label>
);

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const normalizeLocationLookupKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const resolveBrazilStateCode = (item: PatientsDashboardBreakdownItem) => {
  const candidates = [item.id.split(":")[0], item.label.split(",")[0], item.label].map((value) =>
    value.trim(),
  );

  for (const candidate of candidates) {
    const upper = candidate.toUpperCase();
    if (BRAZIL_STATE_CODES.has(upper)) return upper;

    const normalized = normalizeLocationLookupKey(candidate);
    const code = BRAZIL_STATE_NAME_TO_CODE[normalized];
    if (code) return code;
  }

  return null;
};

const formatLocationCaptureCount = (count: number) =>
  `${numberFormatter.format(count)} ${count === 1 ? "captura" : "capturas"}`;

const subscribeToLocationPreviewSnapshot = () => () => undefined;
const getLocalLocationPreviewSnapshot = () =>
  typeof window !== "undefined" && LOCAL_LOCATION_PREVIEW_HOSTS.has(window.location.hostname);
const getServerLocationPreviewSnapshot = () => false;
const useLocalLocationPreviewEnabled = () =>
  useSyncExternalStore(
    subscribeToLocationPreviewSnapshot,
    getLocalLocationPreviewSnapshot,
    getServerLocationPreviewSnapshot,
  );

const TrendBadge = ({ metric }: { metric: PatientsDashboardMetric }) => {
  if (metric.unavailable) {
    return (
      <span className="whitespace-nowrap text-[0.68rem] font-bold text-warning">Indisponível</span>
    );
  }

  return (
    <span
      className={cn(
        "whitespace-nowrap text-[0.68rem] font-semibold",
        metric.trend === "up" && "text-success",
        metric.trend === "down" && "text-danger",
        metric.trend === "flat" && "text-muted",
        metric.trend === "unavailable" && "text-muted",
      )}
    >
      {formatChange(metric.change_percent)}
    </span>
  );
};

const MetricCard = ({
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: PatientsDashboardMetric;
  onToggle: () => void;
}) => {
  const formattedValue = numberFormatter.format(metric.value);

  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={onToggle}
      title={`${metric.label}: ${formattedValue}. ${
        active ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-full xl:h-8 xl:w-8"
          style={{ backgroundColor: hexToRgba(color, 0.1), color }}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-1.5 xl:mt-3">
        <p
          className="truncate whitespace-nowrap text-xs font-semibold text-foreground"
          title={metric.label}
        >
          {metric.label}
        </p>
        <p className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.65rem]">
          <span className="min-w-0 truncate">{formattedValue}</span>
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <TrendBadge metric={metric} />
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            vs. período anterior
          </span>
        </div>
        <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
      </div>
    </button>
  );
};

const LoadingGrid = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {CARD_ORDER.map((key) => (
      <CardShell
        className="h-[8.75rem] animate-pulse bg-surface-muted xl:h-[8.25rem]"
        key={`patients-${key}`}
      />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar Pacientes</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const PatientsPeriodControls = ({
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
}: {
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: PatientsDashboardPeriodPreset) => void;
  displayRange: PatientsDashboardRange;
  period: PatientsDashboardPeriodValue;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="patients-period">
        Período
        <span className="relative">
          <select
            className="h-11 min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="patients-period"
            onChange={(event) =>
              onPeriodChange(event.target.value as PatientsDashboardPeriodPreset)
            }
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {PATIENTS_DASHBOARD_PERIOD_OPTIONS.map((option) => (
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
      <div className="grid gap-3 sm:grid-cols-2" onBlur={onDateControlsBlur}>
        <label className="text-xs font-semibold text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={displayRange.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from ?? ""}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={displayRange.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={displayRange.to ?? ""}
          />
        </label>
      </div>
    </div>
    {period === "custom" && rangeError ? (
      <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

const PatientsHeader = () => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Pacientes</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
      Dashboard de Pacientes
    </h1>
    <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
      Gerencie crescimento, status de conta e acompanhamento básico dos pacientes da plataforma.
    </p>
  </section>
);

const CardsGrid = ({
  activeMetricKeys,
  onToggleMetric,
  summary,
}: {
  activeMetricKeys: DashboardMetricKey[];
  onToggleMetric: (key: DashboardMetricKey) => void;
  summary: AdminPatientsDashboard;
}) => {
  const cards = summary.cards;

  return (
    <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <legend className="sr-only">Contadores exibidos no gráfico da visão geral</legend>
      {CARD_ORDER.map((key) => {
        const config = DASHBOARD_METRIC_CONFIG[key];

        return (
          <MetricCard
            active={activeMetricKeys.includes(key)}
            key={key}
            metric={cards[key]}
            onToggle={() => onToggleMetric(key)}
            {...config}
          />
        );
      })}
    </fieldset>
  );
};

const TimelineChart = ({
  points,
  visibleMetricKeys,
}: {
  points: PatientsDashboardDailyPoint[];
  visibleMetricKeys: DashboardMetricKey[];
}) => {
  const width = 1120;
  const height = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const series = visibleMetricKeys.map((key) => ({
    color: DASHBOARD_METRIC_CONFIG[key].color,
    key,
  }));

  if (series.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador para visualizar a evolução.
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto real de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartPoints = aggregateCalendarChartPoints(points, CARD_ORDER, {
    metricAggregations: {
      active_patients: "last",
      inactive_patients: "last",
      total_patients: "last",
    },
  });

  if (chartPoints.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto real de evolução foi encontrado para o período.
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => series.map((item) => point[item.key])),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? chartWidth / 2 : (index * chartWidth) / (chartPoints.length - 1));
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <figure className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Gráfico temporal dos contadores de pacientes"
          className="block h-auto w-full"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`patients-grid-${value}-${y}`}>
                <line
                  opacity="0.58"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="var(--admin-muted)" fontSize="11" fontWeight="500" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}

          {series.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: getX(index),
              y: getY(point[item.key]),
            }));
            const path = buildSmoothSvgPath(linePoints);

            return (
              <g key={item.key}>
                <path
                  d={path}
                  fill="none"
                  opacity="0.88"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.05"
                />
                {linePoints.map((point, index) => (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="var(--admin-surface)"
                    key={`${item.key}-${chartPoints[index].date}`}
                    opacity={index === linePoints.length - 1 ? "1" : "0.72"}
                    r={index === linePoints.length - 1 ? "3.1" : "2.1"}
                    stroke={item.color}
                    strokeWidth="1.45"
                  />
                ))}
              </g>
            );
          })}
        </svg>
        <div
          className="mt-1 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${dateLabels.length}, 1fr)` }}
        >
          {dateLabels.map(({ date, label }) => (
            <span className="min-w-0 text-center text-[10px] font-bold text-subtle" key={date}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
};

const MiniBar = ({
  label,
  percentage,
  value,
}: {
  label: string;
  percentage: number;
  value: ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-xs font-black">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
      <div
        aria-hidden
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  </div>
);

const PatientIntentSegmentCard = ({ segment }: { segment: PatientsDashboardIntentSegment }) => {
  const Icon = PATIENT_INTENT_ICONS[segment.id];
  const color = PATIENT_INTENT_CHART_COLORS[segment.id];

  return (
    <div className="min-w-0 rounded-2xl border border-border/75 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full",
            PATIENT_INTENT_TONE_CLASS_NAMES[segment.id],
          )}
        >
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-black text-foreground">
          {formatPercentageValue(segment.percentage)}
        </span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-muted">
        {segment.label}
      </p>
      <p className="mt-1 text-2xl font-black text-foreground">
        {numberFormatter.format(segment.count)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          aria-hidden
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: `${segment.percentage}%` }}
        />
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-muted">{segment.description}</p>
    </div>
  );
};

const PatientIntentDistributionBar = ({
  items,
  total,
}: {
  items: PatientsDashboardIntentSegment[];
  total: number;
}) => (
  <div
    aria-label="Distribuição percentual de intenção dos pacientes"
    className="flex h-3 overflow-hidden rounded-full bg-surface-muted"
    role="img"
  >
    {total > 0 ? (
      items.map((segment) =>
        segment.count > 0 ? (
          <span
            className="h-full"
            key={segment.id}
            style={{
              backgroundColor: PATIENT_INTENT_CHART_COLORS[segment.id],
              width: `${segment.percentage}%`,
            }}
            title={`${segment.label}: ${formatPercentageValue(segment.percentage)}`}
          />
        ) : null,
      )
    ) : (
      <span className="h-full w-full bg-surface-muted" />
    )}
  </div>
);

const PatientIntentAnalysisCard = ({ summary }: { summary: AdminPatientsDashboard }) => {
  const intent = summary.intent_analysis;

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target aria-hidden className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Análise da intenção dos pacientes</h2>
          </div>
          <p className="mt-2 text-sm font-bold leading-6 text-muted">
            {formatSelectedPeriod(summary.period)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-[1.6rem] border border-border/75 bg-surface-muted/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">
                Distribuição geral
              </p>
              <p className="mt-1 text-3xl font-black text-foreground">
                {numberFormatter.format(intent.total_patients)}
              </p>
              <p className="mt-1 text-sm font-bold text-muted">pacientes considerados</p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-success">
              <MessageCircle aria-hidden className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-5">
            <PatientIntentDistributionBar items={intent.items} total={intent.total_patients} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs font-black text-muted">Aberturas de perfil</p>
              <p className="mt-1 text-lg font-black text-foreground">
                {numberFormatter.format(intent.signal_totals.profile_views)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs font-black text-muted">Favoritos ativos</p>
              <p className="mt-1 text-lg font-black text-foreground">
                {numberFormatter.format(intent.signal_totals.favorites)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs font-black text-muted">Cliques no WhatsApp</p>
              <p className="mt-1 text-lg font-black text-foreground">
                {numberFormatter.format(intent.signal_totals.whatsapp_clicks)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs font-black text-muted">Retornos ao perfil</p>
              <p className="mt-1 text-lg font-black text-foreground">
                {numberFormatter.format(intent.signal_totals.repeated_profile_views)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 sm:grid-cols-2">
          {intent.items.map((segment) => (
            <PatientIntentSegmentCard key={segment.id} segment={segment} />
          ))}
        </section>
      </div>
    </CardShell>
  );
};

const AnonymousConversionCard = ({ summary }: { summary: AdminPatientsDashboard }) => {
  const conversion = summary.anonymous_conversion;

  return (
    <CardShell className="p-5">
      <PanelTitle
        description={formatSelectedPeriod(summary.period)}
        icon={TrendingUp}
        title="Trilha pré-cadastro dos pacientes"
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            description: "Coorte de pacientes reais cadastrados no período.",
            label: "Pacientes cadastrados",
            value: numberFormatter.format(conversion.registered_patients_count),
          },
          {
            description: "Pacientes com uso sem login capturado antes do cadastro.",
            label: "Com trilha prévia",
            value: numberFormatter.format(conversion.patients_with_anonymous_history_count),
          },
          {
            description: "Pacientes sem pageview ou sessão anônima vinculada ao mesmo visitor_id.",
            label: "Sem trilha capturada",
            value: numberFormatter.format(conversion.patients_without_anonymous_history_count),
          },
          {
            description: "Pacientes com trilha prévia ÷ pacientes cadastrados.",
            label: "Cobertura da trilha",
            value: formatNullablePercentage(conversion.history_coverage_rate),
          },
          { label: "Média", value: formatDaysMetric(conversion.average_days) },
          { label: "Mediana", value: formatDaysMetric(conversion.median_days) },
          {
            description: "75% dos pacientes com trilha cadastram até esse prazo",
            label: "P75",
            value: formatDaysMetric(conversion.p75_days),
          },
          {
            description: "90% dos pacientes com trilha cadastram até esse prazo",
            label: "P90",
            value: formatDaysMetric(conversion.p90_days),
          },
        ].map(({ description, label, value }) => (
          <div className="rounded-2xl bg-surface-muted p-3" key={label}>
            <p className="text-xs font-black text-muted">{label}</p>
            <p className="mt-1 text-xl font-black text-foreground">{value}</p>
            {description ? (
              <p className="mt-1 text-[0.68rem] font-bold leading-snug text-subtle">
                {description}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {conversion.unavailable_reason ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
          {conversion.unavailable_reason}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-black text-foreground">Distribuição do tempo até cadastro</h3>
          <div className="mt-4 space-y-3">
            {conversion.buckets.map((bucket) => (
              <MiniBar
                key={bucket.id}
                label={bucket.label}
                percentage={bucket.percentage}
                value={`${numberFormatter.format(bucket.count)} · ${formatPercentageValue(
                  bucket.percentage,
                )}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-black text-foreground">Primeira página antes do cadastro</h3>
          {conversion.first_touch_pages.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm font-bold text-muted">
              Sem primeira página anônima vinculada aos pacientes cadastrados no período.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {conversion.first_touch_pages.map((item) => (
                <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">{item.label}</p>
                      <p className="text-xs font-bold text-muted">
                        {numberFormatter.format(item.patients_count)} pacientes com trilha
                      </p>
                    </div>
                    <span className="text-sm font-black text-primary">
                      {formatPercentageValue(item.percentage)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-muted">
                    Tempo médio até cadastro: {formatDaysMetric(item.average_days)}
                  </p>
                  {item.unavailable_reason ? (
                    <p className="mt-2 text-xs font-bold text-subtle">{item.unavailable_reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs font-bold leading-5 text-subtle">{conversion.coverage_note}</p>
    </CardShell>
  );
};

type PatientsDonutChartItem = {
  color: string;
  count: number;
  id: string;
  label: string;
  percentage: number;
  sublabel?: string | null;
};

const DonutChart = ({
  ariaLabel,
  emptyMessage,
  items,
  total,
}: {
  ariaLabel: string;
  emptyMessage: string;
  items: PatientsDonutChartItem[];
  total: number;
}) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const visibleItems = items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: PatientsDonutChartItem;
      strokeDashoffset: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      const dash = share * circumference;

      return {
        cumulative: accumulator.cumulative + dash,
        items: [
          ...accumulator.items,
          {
            dash,
            item,
            strokeDashoffset: -accumulator.cumulative,
          },
        ],
      };
    },
    { cumulative: 0, items: [] },
  ).items;

  if (items.length === 0 || visibleItems.length === 0 || total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <figure className="mt-5">
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[170px_minmax(0,1fr)] 2xl:items-center">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-full max-w-[12rem] min-w-0"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--admin-surface-muted)"
            strokeWidth="18"
          />
          {segments.map(({ dash, item, strokeDashoffset }) => (
            <circle
              cx="60"
              cy="60"
              fill="none"
              key={item.id}
              r={radius}
              stroke={item.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={strokeDashoffset}
              strokeWidth="18"
              transform="rotate(-90 60 60)"
            />
          ))}
          <text
            fill="var(--admin-foreground)"
            fontSize="15"
            fontWeight="900"
            textAnchor="middle"
            x="60"
            y="58"
          >
            {numberFormatter.format(total)}
          </text>
          <text
            fill="var(--admin-muted)"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
            x="60"
            y="72"
          >
            total
          </text>
        </svg>

        <div className="min-w-0 space-y-3">
          {items.map((item) => (
            <div
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
              key={item.id}
            >
              <span className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-foreground">
                <span
                  aria-hidden
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block whitespace-normal break-words",
                      item.id === "nao_informado" && "whitespace-nowrap break-normal",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.sublabel ? (
                    <span className="mt-1 block whitespace-nowrap text-xs font-semibold leading-5 text-subtle">
                      {item.sublabel}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 text-right text-sm font-semibold text-foreground">
                {numberFormatter.format(item.count)}{" "}
                <span className="text-xs font-medium text-muted">
                  ({formatPercentageValue(item.percentage)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">
        {items
          .map(
            (item) =>
              `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
                item.percentage,
              )})`,
          )
          .join("; ")}
      </figcaption>
    </figure>
  );
};

const BreakdownPieChart = ({
  colorForItem,
  countLabel = "cadastro(s)",
  emptyMessage = "Sem dados reais.",
  items,
  total,
}: {
  colorForItem: (item: PatientsDashboardBreakdownItem, index: number) => string;
  countLabel?: string;
  emptyMessage?: string;
  items: PatientsDashboardBreakdownItem[];
  total: number;
}) => {
  const chartItems = items.map((item, index) => ({
    color: colorForItem(item, index),
    count: item.count,
    id: item.id,
    label: item.label,
    percentage: item.percentage,
  }));
  const ariaLabel =
    items.length > 0
      ? `Gráfico de pizza: ${items
          .map(
            (item) =>
              `${item.label}: ${numberFormatter.format(item.count)} ${countLabel}, ${formatPercentageValue(
                item.percentage,
              )}`,
          )
          .join("; ")}.`
      : emptyMessage;

  return (
    <DonutChart
      ariaLabel={ariaLabel}
      emptyMessage={emptyMessage}
      items={chartItems}
      total={total}
    />
  );
};

const DeviceUsagePieChart = ({
  deviceUsage,
}: {
  deviceUsage: AdminPatientsDashboard["device_usage"];
}) => {
  const total = Math.max(0, deviceUsage.total_sessions);
  const emptyMessage =
    deviceUsage.unavailable_reason ??
    "Sem sessões autenticadas de pacientes no período selecionado.";
  const chartItems = deviceUsage.items.map((item) => {
    const operatingSystems = item.device_type === "unknown" ? [] : (item.operating_systems ?? []);
    const operatingSystemSummary = operatingSystems
      .map(
        (operatingSystem) =>
          `${operatingSystem.label} ${formatPercentageValue(operatingSystem.percentage)}`,
      )
      .join(" · ");

    return {
      color: DEVICE_USAGE_CHART_COLORS[item.device_type],
      count: item.count,
      id: item.device_type,
      label: item.label,
      percentage: item.percentage,
      sublabel: operatingSystemSummary || null,
    };
  });
  const ariaLabel = `Gráfico de pizza dos devices usados por pacientes: ${deviceUsage.items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} sessão(ões), ${formatPercentageValue(
          item.percentage,
        )}`,
    )
    .join("; ")}.`;

  return (
    <DonutChart
      ariaLabel={ariaLabel}
      emptyMessage={emptyMessage}
      items={chartItems}
      total={total}
    />
  );
};
const getLocationCountRange = (items: PatientsDashboardBreakdownItem[]) => {
  const counts = items.filter((item) => item.count > 0).map((item) => item.count);

  if (counts.length === 0) return { max: 0, min: 0 };

  return {
    max: Math.max(...counts),
    min: Math.min(...counts),
  };
};

const getLocationIntensity = (count: number, min: number, max: number) => {
  if (count <= 0) return 0;
  if (max <= min) return 1;

  return (count - min) / (max - min);
};

const LocationMapLegend = ({ items }: { items: PatientsDashboardBreakdownItem[] }) => {
  const { max, min } = getLocationCountRange(items);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 text-[0.68rem] font-bold text-muted">
      <span className="whitespace-nowrap">{numberFormatter.format(min)}</span>
      <span
        aria-hidden
        className="h-2 min-w-24 flex-1 rounded-full"
        style={{
          background: "linear-gradient(90deg, rgba(48, 140, 232, 0.18), rgba(48, 140, 232, 0.9))",
        }}
      />
      <span className="whitespace-nowrap">{numberFormatter.format(max)}</span>
    </div>
  );
};

const LocationBarRanking = ({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: PatientsDashboardBreakdownItem[];
  title: string;
}) => {
  const topItems = items.slice(0, LOCATION_RANKING_LIMIT);
  const maxCount = Math.max(1, ...topItems.map((item) => item.count));

  return (
    <div className="min-w-0">
      <h4 className="text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</h4>
      <div className="mt-5 space-y-4">
        {topItems.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
            {emptyMessage}
          </p>
        ) : (
          topItems.map((item) => (
            <div className="min-w-0" key={item.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />
                </span>
                <span className="shrink-0 font-black text-foreground">
                  {numberFormatter.format(item.count)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70">
                <div
                  aria-hidden
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LocationRankingList = ({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: PatientsDashboardBreakdownItem[];
  title: string;
}) => (
  <div className="rounded-[1.35rem] border border-border/70 bg-surface p-4">
    <h4 className="text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</h4>
    <div className="mt-3 space-y-3">
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold text-muted">
          {emptyMessage}
        </p>
      ) : (
        items.slice(0, LOCATION_RANKING_LIMIT).map((item, index) => (
          <div key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.68rem] font-black text-primary">
                  {index + 1}
                </span>
                <span className="truncate">{item.label}</span>
              </span>
              <span className="whitespace-nowrap text-xs font-black text-foreground">
                {formatLocationCaptureCount(item.count)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                aria-hidden
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const BrazilStateChoroplethMap = ({ states }: { states: PatientsDashboardBreakdownItem[] }) => {
  const statesByCode = new Map<string, PatientsDashboardBreakdownItem>();

  for (const state of states) {
    const code = resolveBrazilStateCode(state);
    if (code) statesByCode.set(code, state);
  }

  const { max, min } = getLocationCountRange([...statesByCode.values()]);
  const highlightedStates = [...statesByCode.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, LOCATION_RANKING_LIMIT)
    .map((item) => item.label)
    .join(", ");
  const ariaLabel = highlightedStates
    ? `Mapa do Brasil por UF com destaque para ${highlightedStates}.`
    : "Mapa do Brasil sem estados brasileiros identificados no período.";

  return (
    <figure className="min-w-0">
      <svg
        aria-label={ariaLabel}
        className="mx-auto h-auto max-h-[20rem] w-full max-w-[22rem]"
        role="img"
        viewBox="0 0 360 380"
      >
        {BRAZIL_STATE_MAP_PATHS.map((statePath) => {
          const item = statesByCode.get(statePath.code);
          const intensity = item ? getLocationIntensity(item.count, min, max) : 0;
          const fill = item
            ? hexToRgba("#308ce8", 0.28 + intensity * 0.62)
            : "var(--admin-surface-muted)";
          const stroke = item ? hexToRgba("#308ce8", 0.74) : "var(--admin-border)";

          return (
            <path
              d={statePath.d}
              fill={fill}
              key={statePath.code}
              stroke={stroke}
              strokeLinejoin="round"
              strokeWidth={item ? "1.2" : "0.9"}
            >
              <title>
                {item
                  ? `${statePath.name}: ${formatLocationCaptureCount(item.count)}`
                  : `${statePath.name}: sem captura`}
              </title>
            </path>
          );
        })}
      </svg>
      {statesByCode.size === 0 ? (
        <figcaption className="mt-2 text-center text-xs font-bold leading-5 text-muted">
          Sem estados brasileiros identificados. Locais fora do Brasil continuam nos rankings.
        </figcaption>
      ) : null}
    </figure>
  );
};

const resolveWorldCountryMapPath = (item: PatientsDashboardBreakdownItem) => {
  const idParts = item.id.split(":");
  const candidates = [item.id, idParts[idParts.length - 1], item.label];

  for (const candidate of candidates) {
    const normalized = normalizeLocationLookupKey(candidate);
    const mappedId = COUNTRY_WORLD_MAP_ID_BY_KEY[normalized];
    const mappedCountry = mappedId
      ? WORLD_COUNTRY_MAP_PATHS.find((country) => country.id === mappedId)
      : null;
    if (mappedCountry) return mappedCountry;

    const countryByName = WORLD_COUNTRY_MAP_PATHS.find(
      (country) => normalizeLocationLookupKey(country.name) === normalized,
    );
    if (countryByName) return countryByName;
  }

  return null;
};

const WorldCountryMap = ({ countries }: { countries: PatientsDashboardBreakdownItem[] }) => {
  const { max, min } = getLocationCountRange(countries);
  const countriesByMapId = new Map<string, PatientsDashboardBreakdownItem>();

  for (const item of countries) {
    const countryPath = resolveWorldCountryMapPath(item);
    if (countryPath) countriesByMapId.set(countryPath.id, item);
  }

  const highlightedCountries = countries
    .slice(0, LOCATION_RANKING_LIMIT)
    .map((item) => item.label)
    .join(", ");
  const ariaLabel = highlightedCountries
    ? `Mapa-múndi com destaque para ${highlightedCountries}.`
    : "Mapa-múndi sem países identificados no período.";

  return (
    <figure className="min-w-0">
      <svg
        aria-label={ariaLabel}
        className="mx-auto h-auto max-h-[18rem] w-full max-w-[30rem]"
        role="img"
        viewBox="0 0 520 270"
      >
        {WORLD_COUNTRY_MAP_PATHS.map((country) => {
          const item = countriesByMapId.get(country.id);
          const intensity = item ? getLocationIntensity(item.count, min, max) : 0;
          const fill = item
            ? hexToRgba("#308ce8", 0.32 + intensity * 0.6)
            : "var(--admin-surface-muted)";
          const stroke = item ? hexToRgba("#308ce8", 0.78) : "var(--admin-border)";

          return (
            <path
              d={country.d}
              fill={fill}
              key={country.id}
              stroke={stroke}
              strokeLinejoin="round"
              strokeWidth={item ? "0.85" : "0.45"}
            >
              <title>
                {item
                  ? `${country.name}: ${formatLocationCaptureCount(item.count)}`
                  : `${country.name}: sem captura`}
              </title>
            </path>
          );
        })}
      </svg>
      {countries.length > 0 && countriesByMapId.size === 0 ? (
        <figcaption className="mt-2 text-center text-xs font-bold leading-5 text-muted">
          Países não encontrados na malha continuam no ranking agregado.
        </figcaption>
      ) : null}
    </figure>
  );
};

const LocationMapScopeToggle = ({
  hasCountries,
  hasStates,
  onScopeChange,
  scope,
}: {
  hasCountries: boolean;
  hasStates: boolean;
  onScopeChange: (scope: LocationMapScope) => void;
  scope: LocationMapScope;
}) => {
  const options: LocationMapScope[] = ["states", "countries"];

  return (
    <fieldset
      aria-label="Alternar mapa de localização"
      className="grid grid-cols-2 rounded-full bg-surface-muted p-1 text-xs font-black"
    >
      {options.map((option) => {
        const disabled = option === "states" ? !hasStates : !hasCountries;

        return (
          <button
            aria-pressed={scope === option}
            className={cn(
              "rounded-full px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45",
              scope === option
                ? "bg-surface text-primary shadow-control"
                : "text-muted hover:text-foreground",
            )}
            disabled={disabled}
            key={option}
            onClick={() => onScopeChange(option)}
            type="button"
          >
            {LOCATION_MAP_SCOPE_LABELS[option]}
          </button>
        );
      })}
    </fieldset>
  );
};

const LocationMapPanel = ({
  countries,
  onScopeChange,
  scope,
  states,
}: {
  countries: PatientsDashboardBreakdownItem[];
  onScopeChange: (scope: LocationMapScope) => void;
  scope: LocationMapScope;
  states: PatientsDashboardBreakdownItem[];
}) => {
  const activeItems = scope === "states" ? states : countries;
  const title = scope === "states" ? "Capturas por Estado" : "Capturas por País";
  const rankingTitle = scope === "states" ? "Estados" : "Países";
  const emptyMessage =
    scope === "states" ? "Nenhum estado real capturado." : "Nenhum país real capturado.";

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-surface">
      <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-base font-black text-foreground">{title}</h4>
        <LocationMapScopeToggle
          hasCountries={countries.length > 0}
          hasStates={states.length > 0}
          onScopeChange={onScopeChange}
          scope={scope}
        />
      </div>
      <div className="grid gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(12rem,0.9fr)] lg:items-center">
        <div className="min-h-[16rem] min-w-0">
          {scope === "states" ? (
            <BrazilStateChoroplethMap states={states} />
          ) : (
            <WorldCountryMap countries={countries} />
          )}
        </div>
        <LocationBarRanking emptyMessage={emptyMessage} items={activeItems} title={rankingTitle} />
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <LocationMapLegend items={activeItems} />
        <span className="text-[0.68rem] font-bold text-subtle">intensidade por agregados</span>
      </div>
    </div>
  );
};

const LocationOverview = ({
  locations,
  preview = false,
}: {
  locations: AdminPatientsDashboard["locations"];
  preview?: boolean;
}) => {
  const [preferredScope, setPreferredScope] = useState<LocationMapScope>("states");
  const hasCountries = locations.countries.length > 0;
  const hasStates = locations.states.length > 0;
  const scope =
    preferredScope === "states" && !hasStates && hasCountries ? "countries" : preferredScope;
  const secondaryItems = scope === "states" ? locations.countries : locations.states;
  const secondaryTitle = scope === "states" ? "Países" : "Top estados";
  const secondaryEmptyMessage =
    scope === "states" ? "Nenhum país real capturado." : "Nenhum estado real capturado.";

  return (
    <div className="mt-5 space-y-4">
      {locations.total === 0 && !preview ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Nenhuma localização agregada real foi capturada para pacientes no período selecionado.
        </p>
      ) : (
        <>
          <LocationMapPanel
            countries={locations.countries}
            onScopeChange={setPreferredScope}
            scope={scope}
            states={locations.states}
          />
          <div className="grid gap-3 2xl:grid-cols-2">
            <LocationRankingList
              emptyMessage="Nenhuma cidade real capturada."
              items={locations.cities}
              title="Top cidades"
            />
            <LocationRankingList
              emptyMessage={secondaryEmptyMessage}
              items={secondaryItems}
              title={secondaryTitle}
            />
          </div>
          <p className="text-xs font-bold leading-5 text-muted">
            {preview ? (
              <>Preview local: {formatLocationCaptureCount(locations.total)} para validar layout.</>
            ) : (
              <>
                Total considerado: {formatLocationCaptureCount(locations.total)} de
                visitor_location. Cidades com frequência muito baixa podem aparecer agrupadas para
                reduzir exposição.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
};

const Statistics = ({
  allowLocalLocationPreview,
  summary,
}: {
  allowLocalLocationPreview: boolean;
  summary: AdminPatientsDashboard;
}) => {
  const [intentFilters, setIntentFilters] = useState<PatientsStatisticsIntentFilters>(
    DEFAULT_PATIENTS_STATISTICS_INTENT_FILTERS,
  );
  const getFilteredMetrics = (filterId: PatientsDashboardIntentFilterId) =>
    summary.intent_filters.breakdowns[filterId] ??
    summary.intent_filters.breakdowns[summary.intent_filters.default_filter];
  const setIntentFilter =
    (key: PatientsStatisticsIntentFilterKey) => (value: PatientsDashboardIntentFilterId) => {
      setIntentFilters((current) => ({ ...current, [key]: value }));
    };
  const genderMetrics = getFilteredMetrics(intentFilters.gender).demographics.gender;
  const signupSourceMetrics = getFilteredMetrics(intentFilters.signupSources).demographics
    .signup_sources;
  const deviceUsage = getFilteredMetrics(intentFilters.deviceUsage).device_usage;
  const platformUsage = getFilteredMetrics(intentFilters.platformUsage).platform_usage;
  const locations = getFilteredMetrics(intentFilters.locations).locations;
  const showLocationPreview =
    intentFilters.locations === "all" && allowLocalLocationPreview && locations.total === 0;
  const displayLocations = showLocationPreview ? LOCAL_PREVIEW_LOCATION_DATA : locations;

  return (
    <section aria-label="Estatísticas agregadas de pacientes">
      <div className="grid gap-4 xl:grid-cols-3">
        <CardShell className="p-5">
          <PanelTitle
            action={
              <IntentFilterSelect
                id="patients-gender-intent-filter"
                onChange={setIntentFilter("gender")}
                options={summary.intent_filters.options}
                value={intentFilters.gender}
              />
            }
            description={formatSelectedPeriod(summary.period)}
            icon={UserRound}
            title="Gênero"
          />
          <BreakdownPieChart
            colorForItem={(item, index) =>
              GENDER_CHART_COLORS[item.id] ?? CHART_COLORS[index % CHART_COLORS.length]
            }
            countLabel="paciente(s)"
            emptyMessage="Sem dados reais de gênero para pacientes."
            items={genderMetrics.items}
            total={genderMetrics.total}
          />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle
            action={
              <IntentFilterSelect
                id="patients-signup-source-intent-filter"
                onChange={setIntentFilter("signupSources")}
                options={summary.intent_filters.options}
                value={intentFilters.signupSources}
              />
            }
            description={formatSelectedPeriod(summary.period)}
            icon={UserPlus}
            title="Forma de cadastro"
          />
          <BreakdownPieChart
            colorForItem={(item, index) =>
              SIGNUP_SOURCE_CHART_COLORS[item.id] ?? CHART_COLORS[index % CHART_COLORS.length]
            }
            emptyMessage="Sem dados reais de forma de cadastro para pacientes."
            items={signupSourceMetrics.items}
            total={signupSourceMetrics.total}
          />
        </CardShell>
        <DeviceUsageCard
          allowLocalDevicePreview={intentFilters.deviceUsage === "all" && allowLocalLocationPreview}
          deviceUsage={deviceUsage}
          intentFilter={intentFilters.deviceUsage}
          onIntentFilterChange={setIntentFilter("deviceUsage")}
          period={summary.period}
          summary={summary}
        />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <CardShell className="p-5">
          <PanelTitle
            action={
              <IntentFilterSelect
                id="patients-location-intent-filter"
                onChange={setIntentFilter("locations")}
                options={summary.intent_filters.options}
                value={intentFilters.locations}
              />
            }
            description={formatSelectedPeriod(summary.period)}
            icon={MapPin}
            title="Localização"
          />
          <LocationOverview locations={displayLocations} preview={showLocationPreview} />
        </CardShell>
        <PlatformUsageCard
          intentFilter={intentFilters.platformUsage}
          onIntentFilterChange={setIntentFilter("platformUsage")}
          platformUsage={platformUsage}
          summary={summary}
        />
      </div>
    </section>
  );
};

const DeviceUsageCard = ({
  allowLocalDevicePreview,
  deviceUsage,
  intentFilter,
  onIntentFilterChange,
  period,
  summary,
}: {
  allowLocalDevicePreview: boolean;
  deviceUsage: AdminPatientsDashboard["device_usage"];
  intentFilter: PatientsDashboardIntentFilterId;
  onIntentFilterChange: (value: PatientsDashboardIntentFilterId) => void;
  period: AdminPatientsDashboard["period"];
  summary: AdminPatientsDashboard;
}) => {
  const showDevicePreview = allowLocalDevicePreview && deviceUsage.total_sessions === 0;
  const displayDeviceUsage = showDevicePreview ? LOCAL_PREVIEW_DEVICE_USAGE : deviceUsage;

  return (
    <CardShell className="p-5">
      <PanelTitle
        action={
          <IntentFilterSelect
            id="patients-device-intent-filter"
            onChange={onIntentFilterChange}
            options={summary.intent_filters.options}
            value={intentFilter}
          />
        }
        description={formatSelectedPeriod(period)}
        icon={Smartphone}
        title="Devices e sistemas"
      />
      <DeviceUsagePieChart deviceUsage={displayDeviceUsage} />
    </CardShell>
  );
};

const PlatformUsageCard = ({
  intentFilter,
  onIntentFilterChange,
  platformUsage,
  summary,
}: {
  intentFilter: PatientsDashboardIntentFilterId;
  onIntentFilterChange: (value: PatientsDashboardIntentFilterId) => void;
  platformUsage: AdminPatientsDashboard["platform_usage"];
  summary: AdminPatientsDashboard;
}) => {
  return (
    <CardShell className="p-5">
      <PanelTitle
        action={
          <IntentFilterSelect
            id="patients-platform-usage-intent-filter"
            onChange={onIntentFilterChange}
            options={summary.intent_filters.options}
            value={intentFilter}
          />
        }
        description={formatSelectedPeriod(summary.period)}
        icon={Activity}
        title="Uso da plataforma"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["Ativos", numberFormatter.format(platformUsage.active_patients_count)],
          ["Taxa ativa", formatNullablePercentage(platformUsage.active_patients_rate)],
          ["PWA instalado", formatNullablePercentage(platformUsage.pwa_installed_patients_rate)],
          ["Dias médios", formatDaysMetric(platformUsage.average_access_days)],
          ["Sessões médias", formatDecimalMetric(platformUsage.average_sessions)],
          ["Tempo médio", formatSecondsMetric(platformUsage.average_duration_seconds)],
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-surface-muted p-3" key={label}>
            <p className="text-xs font-black text-muted">{label}</p>
            <p className="mt-1 text-lg font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>
      {platformUsage.duration_unavailable_reason ? (
        <p className="mt-3 text-xs font-bold text-subtle">
          {platformUsage.duration_unavailable_reason}
        </p>
      ) : null}
      {platformUsage.unavailable_reason ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
          {platformUsage.unavailable_reason}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-black text-foreground">Páginas mais acessadas</h3>
          {platformUsage.top_pages.map((page) => (
            <MiniBar
              key={page.label}
              label={page.label}
              percentage={page.percentage}
              value={`${numberFormatter.format(page.count)} · ${formatPercentageValue(
                page.percentage,
              )}`}
            />
          ))}
        </div>
      )}
    </CardShell>
  );
};

const DashboardContent = ({
  allowLocalLocationPreview,
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
  summary,
}: {
  allowLocalLocationPreview: boolean;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: PatientsDashboardPeriodPreset) => void;
  displayRange: PatientsDashboardRange;
  period: PatientsDashboardPeriodValue;
  rangeError: string | null;
  summary: AdminPatientsDashboard;
}) => {
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<DashboardMetricKey[]>(() => [
    ...CARD_ORDER,
  ]);
  const activeMetricKeys = CARD_ORDER.filter((key) => visibleMetricKeys.includes(key));
  const toggleMetric = (metricKey: DashboardMetricKey) => {
    setVisibleMetricKeys((current) => {
      if (!current.includes(metricKey)) return [...current, metricKey];

      const next = current.filter((item) => item !== metricKey);
      return next.length > 0 ? next : current;
    });
  };

  return (
    <div className="space-y-7">
      <CardShell className="min-w-0 p-5">
        <div className="mb-5 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground">Visão Geral</h2>
            <p className="mt-1 text-sm font-bold leading-6 text-muted">
              {summary.period.label} · {formatDate(summary.period.from)} a{" "}
              {formatDate(summary.period.to)}
            </p>
          </div>
          <PatientsPeriodControls
            displayRange={displayRange}
            onDateChange={onDateChange}
            onDateControlsBlur={onDateControlsBlur}
            onPeriodChange={onPeriodChange}
            period={period}
            rangeError={rangeError}
          />
        </div>
        <CardsGrid
          activeMetricKeys={activeMetricKeys}
          onToggleMetric={toggleMetric}
          summary={summary}
        />
        <TimelineChart points={summary.series.points} visibleMetricKeys={activeMetricKeys} />
      </CardShell>

      <AnonymousConversionCard summary={summary} />

      <PatientIntentAnalysisCard summary={summary} />

      <Statistics allowLocalLocationPreview={allowLocalLocationPreview} summary={summary} />
    </div>
  );
};

export const AdminPatientsClient = () => {
  const allowLocalLocationPreview = useLocalLocationPreviewEnabled();
  const [selectedPeriod, setSelectedPeriod] = useState<PatientsDashboardPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<PatientsDashboardPeriodValue>("all");
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [draftRange, setDraftRange] = useState<PatientsDashboardRange>(() =>
    getDashboardRangeForPeriod("all"),
  );
  const [appliedRange, setAppliedRange] = useState<PatientsDashboardRange>(() =>
    getDashboardRangeForPeriod("all"),
  );
  const queryInput = useMemo(
    () => buildDashboardPeriodQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const validRange = appliedPeriod !== "custom" || isValidRange(appliedRange);
  const validDraftRange = isValidRange(draftRange);
  const query = useAdminPatientsDashboard(queryInput, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const displayRange =
    selectedPeriod !== "custom" && query.data
      ? { from: query.data.period.from, to: query.data.period.to }
      : draftRange;
  const handlePeriodChange = (nextPeriod: PatientsDashboardPeriodPreset) => {
    const nextRange = getDashboardRangeForPeriod(nextPeriod);
    setCustomRangeError(null);
    setSelectedPeriod(nextPeriod);
    setAppliedPeriod(nextPeriod);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  };
  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    setCustomRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange({ ...displayRange, [field]: value });
  };
  const commitCustomRange = () => {
    if (selectedPeriod !== "custom") return;

    if (!validDraftRange) {
      setCustomRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setCustomRangeError(null);
    setSelectedPeriod("custom");
    setAppliedPeriod("custom");
    setAppliedRange(draftRange);
  };
  const handleDateControlsBlur = (event: FocusEvent<HTMLDivElement>) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitCustomRange();
    }, 0);
  };
  const resetPeriod = () => {
    const defaultRange = getDashboardRangeForPeriod("all");
    setCustomRangeError(null);
    setSelectedPeriod("all");
    setAppliedPeriod("all");
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
  };

  return (
    <div className="space-y-6">
      <PatientsHeader />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
        />
      ) : null}

      {validRange && query.isLoading ? <LoadingGrid /> : null}

      {validRange && query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais...
        </p>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <DashboardContent
          allowLocalLocationPreview={allowLocalLocationPreview}
          displayRange={displayRange}
          onDateChange={handleCustomDateChange}
          onDateControlsBlur={handleDateControlsBlur}
          onPeriodChange={handlePeriodChange}
          period={selectedPeriod}
          rangeError={customRangeError}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};

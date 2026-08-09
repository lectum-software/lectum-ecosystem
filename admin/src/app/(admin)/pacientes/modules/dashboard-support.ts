import { startOfCurrentWeek } from "@/lib/date-period";

export { startOfCurrentWeek };

import { type LucideIcon, UserCheck, UserPlus, UserRound, UsersRound } from "lucide-react";
import type {
  AdminPatientsDashboard,
  PatientsDashboardEngagementSegment,
  PatientsDashboardIntentFilterId,
  PatientsDashboardIntentSegment,
  PatientsDashboardQuery,
} from "@/api/req/patients";

export const CARD_ORDER = [
  "total_patients",
  "active_patients",
  "inactive_patients",
  "new_signups",
] as const;

export type DeviceUsageItem = AdminPatientsDashboard["device_usage"]["items"][number];

export type PatientIntentEngagementCell =
  AdminPatientsDashboard["intent_engagement"]["cells"][number];

export type PatientIntentSegmentId = PatientsDashboardIntentSegment["id"];

export type PatientEngagementSegmentId = PatientsDashboardEngagementSegment["id"];

export type PatientsDashboardPeriodValue = NonNullable<PatientsDashboardQuery["period"]>;

export type PatientsDashboardPeriodPreset = Exclude<PatientsDashboardPeriodValue, "custom">;

export type PatientsDashboardRange = Pick<PatientsDashboardQuery, "from" | "to">;

export type PatientsStatisticsIntentFilterKey =
  | "deviceUsage"
  | "gender"
  | "locations"
  | "platformUsage"
  | "signupSources";

export type PatientsStatisticsIntentFilters = Record<
  PatientsStatisticsIntentFilterKey,
  PatientsDashboardIntentFilterId
>;

export type PlatformPagesView = "accesses" | "average_duration";

export const PATIENTS_DASHBOARD_PERIOD_OPTIONS: {
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

export const DEFAULT_PATIENTS_STATISTICS_INTENT_FILTERS: PatientsStatisticsIntentFilters = {
  deviceUsage: "all",
  gender: "all",
  locations: "all",
  platformUsage: "all",
  signupSources: "all",
};

export const PLATFORM_PAGES_VIEW_OPTIONS: { id: PlatformPagesView; label: string }[] = [
  { id: "accesses", label: "Páginas mais acessadas" },
  { id: "average_duration", label: "Páginas com maior tempo médio" },
];

export const CHART_COLORS = [
  "var(--admin-primary)",
  "var(--admin-success)",
  "var(--admin-muted)",
  "var(--admin-warning)",
];

export const SIGNUP_SOURCE_CHART_COLORS: Record<string, string> = {
  email_password: "var(--admin-success)",
  google: "var(--admin-primary)",
};

export const GENDER_CHART_COLORS: Record<string, string> = {
  feminino: "var(--admin-success)",
  male: "var(--admin-muted)",
  masculina: "var(--admin-muted)",
  masculino: "var(--admin-muted)",
  nao_binario: "var(--admin-chart-accent)",
  nao_informado: "var(--admin-primary)",
  outro: "var(--admin-warning)",
};

export const DEVICE_USAGE_CHART_COLORS = {
  desktop: "var(--admin-success)",
  mobile: "var(--admin-primary)",
  tablet: "var(--admin-chart-accent)",
  unknown: "var(--admin-subtle)",
} satisfies Record<DeviceUsageItem["device_type"], string>;

export const PATIENT_INTENT_CHART_COLORS = {
  cold: "var(--admin-muted)",
  curious: "var(--admin-primary)",
  objective: "var(--admin-warning)",
  very_qualified: "var(--admin-success)",
} satisfies Record<PatientsDashboardIntentSegment["id"], string>;

export const PATIENT_ENGAGEMENT_CHART_COLORS = {
  engaged: "var(--admin-warning)",
  low_engagement: "var(--admin-primary)",
  no_engagement: "var(--admin-muted)",
  very_engaged: "var(--admin-success)",
} satisfies Record<PatientsDashboardEngagementSegment["id"], string>;

export const PATIENT_INTENT_ENGAGEMENT_ROW_ORDER: PatientIntentSegmentId[] = [
  "very_qualified",
  "objective",
  "curious",
  "cold",
];

export const PATIENT_INTENT_ENGAGEMENT_COLUMN_ORDER: PatientEngagementSegmentId[] = [
  "very_engaged",
  "engaged",
  "low_engagement",
  "no_engagement",
];

export const LOCATION_RANKING_LIMIT = 5;

export const BRAZIL_STATE_CODES = new Set([
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

export const BRAZIL_STATE_NAME_TO_CODE: Record<string, string> = {
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

export type LocationMapScope = "countries" | "states";

export const LOCATION_MAP_SCOPE_LABELS = {
  countries: "Países",
  states: "Estados",
} satisfies Record<LocationMapScope, string>;

export const COUNTRY_WORLD_MAP_ID_BY_KEY: Record<string, string> = {
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

export type DashboardMetricKey = (typeof CARD_ORDER)[number];

export const DASHBOARD_METRIC_CONFIG: Record<
  DashboardMetricKey,
  { color: string; icon: LucideIcon }
> = {
  active_patients: { color: CHART_COLORS[1], icon: UserCheck },
  inactive_patients: { color: CHART_COLORS[2], icon: UserRound },
  new_signups: { color: CHART_COLORS[3], icon: UserPlus },
  total_patients: { color: CHART_COLORS[0], icon: UsersRound },
};

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const pad = (value: number) => String(value).padStart(2, "0");

export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

export const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

export const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

export const getDashboardRangeForPeriod = (
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

export const buildDashboardPeriodQuery = (
  period: PatientsDashboardPeriodValue,
  range: PatientsDashboardRange,
): PatientsDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

export const formatSelectedPeriod = (period: AdminPatientsDashboard["period"]) => {
  if (!period.from || !period.to) return period.label;

  return `${period.label} · ${formatDate(period.from)} a ${formatDate(period.to)}`;
};

export const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const formatPercentageValue = (value: number) => `${numberFormatter.format(value)}%`;

export const formatNullablePercentage = (value: number | null) =>
  typeof value === "number" ? formatPercentageValue(value) : "Indisponível";

export const formatRateDifference = (value: number | null) => {
  if (typeof value !== "number") return "Sem base";
  if (value === 0) return "0 p.p.";

  const prefix = value > 0 ? "+" : "-";

  return `${prefix}${numberFormatter.format(Math.abs(value))} p.p.`;
};

export const formatDaysMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";
  if (value === 0) return "Mesmo dia";

  return `${numberFormatter.format(value)} dias`;
};

export const formatDecimalMetric = (value: number | null) =>
  typeof value === "number" ? numberFormatter.format(value) : "Indisponível";

export const formatSecondsMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) return `${seconds}s`;

  return `${minutes}min ${String(remainder).padStart(2, "0")}s`;
};

export const isValidRange = (range: PatientsDashboardRange) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

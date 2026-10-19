import { error, msg } from "@/helpers/translate";
import type {
  IPsychologistAnalyticsIndexDTO,
  PsychologistAnalyticsPeriod,
  PsychologistAnalyticsPeriodKey,
} from "../DTOs/IAnalyticsDTO";
import { PsychologistAnalyticsRepository } from "../repositories/AnalyticsRepository";

const RELATIVE_PERIODS: Record<
  Extract<PsychologistAnalyticsPeriodKey, "7d" | "30d" | "90d" | "365d">,
  { days: number; label: string }
> = {
  "7d": { days: 7, label: "Últimos 7 dias" },
  "30d": { days: 30, label: "Últimos 30 dias" },
  "90d": { days: 90, label: "Últimos 3 meses" },
  "365d": { days: 365, label: "Últimos 12 meses" },
};

const PERIOD_KEYS = new Set<PsychologistAnalyticsPeriodKey>([
  ...Object.keys(RELATIVE_PERIODS),
  "year",
  "all",
  "custom",
] as PsychologistAnalyticsPeriodKey[]);

const DEFAULT_PERIOD: PsychologistAnalyticsPeriodKey = "all";
const ALL_PERIOD_START_AT = new Date("1970-01-01T00:00:00.000Z");

const ensurePsychologist = (data: { auth: { role?: string | null } }) => {
  if (data.auth.role === "psicologo") return null;
  return { status: 403, ...error("role_not_authorized", {}) };
};

const normalizePeriod = (period?: string): PsychologistAnalyticsPeriodKey => {
  if (period && PERIOD_KEYS.has(period as PsychologistAnalyticsPeriodKey)) {
    return period as PsychologistAnalyticsPeriodKey;
  }

  return DEFAULT_PERIOD;
};

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  const date = new Date(`${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}-03:00`);

  if (Number.isNaN(date.getTime())) return null;
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const buildPeriod = (
  key: PsychologistAnalyticsPeriodKey,
  query: IPsychologistAnalyticsIndexDTO["q"],
): PsychologistAnalyticsPeriod | null => {
  if (key === "custom") {
    const startAt = parseDateOnly(query.start_at, "start");
    const endAt = parseDateOnly(query.end_at, "end");

    if (!startAt || !endAt || startAt > endAt) return null;

    return {
      key,
      label: "Período personalizado",
      start_at: startAt,
      end_at: endAt,
    };
  }

  const endAt = new Date();

  if (key === "year") {
    return {
      key,
      label: "Este ano",
      start_at: parseDateOnly(
        `${new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(endAt)}-01-01`,
        "start",
      )!,
      end_at: endAt,
    };
  }

  if (key === "all") {
    return {
      key,
      label: "Todo o período",
      start_at: ALL_PERIOD_START_AT,
      end_at: endAt,
    };
  }

  const startAt = new Date(endAt);
  startAt.setDate(startAt.getDate() - RELATIVE_PERIODS[key].days);

  return {
    key,
    label: RELATIVE_PERIODS[key].label,
    start_at: startAt,
    end_at: endAt,
  };
};

export const index = async (data: IPsychologistAnalyticsIndexDTO) => {
  const unauthorized = ensurePsychologist(data);
  if (unauthorized) return unauthorized;

  if (!data.auth.id) {
    return { status: 403, ...error("token_not_authorized", {}) };
  }

  const repository = new PsychologistAnalyticsRepository();
  const hasEntitlement = await repository.hasProfessionalEntitlement(data.auth.id);
  if (!hasEntitlement) {
    return {
      status: 200,
      ...msg("index", {}),
      data: {
        access: { mode: "preview", has_professional_entitlement: false },
        presentation_video: await repository.presentationVideoPreview(data.auth.id),
      },
    };
  }

  const period = buildPeriod(normalizePeriod(data.q.period), data.q);
  if (!period) {
    return {
      status: 400,
      ...error("invalid_analytics_date_range", {}),
    };
  }

  const res = await repository.index(data, period, hasEntitlement);

  return { status: 200, ...msg("index", {}), data: res };
};

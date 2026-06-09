import { error, msg } from "@/helpers/translate";
import type {
  IPsychologistAnalyticsIndexDTO,
  PsychologistAnalyticsPeriod,
  PsychologistAnalyticsPeriodKey,
} from "../DTOs/IAnalyticsDTO";
import { PsychologistAnalyticsRepository } from "../repositories/AnalyticsRepository";

const PERIODS: Record<PsychologistAnalyticsPeriodKey, { days: number; label: string }> = {
  "7d": { days: 7, label: "Últimos 7 dias" },
  "30d": { days: 30, label: "Últimos 30 dias" },
  "90d": { days: 90, label: "Últimos 3 meses" },
  "365d": { days: 365, label: "Últimos 12 meses" },
  custom: { days: 0, label: "Período personalizado" },
};

const DEFAULT_PERIOD: PsychologistAnalyticsPeriodKey = "30d";

const ensurePsychologist = (data: { auth: { role?: string | null } }) => {
  if (data.auth.role === "psicologo") return null;
  return { status: 403, ...error("role_not_authorized", {}) };
};

const normalizePeriod = (period?: string): PsychologistAnalyticsPeriodKey => {
  if (period && period in PERIODS) return period as PsychologistAnalyticsPeriodKey;
  return DEFAULT_PERIOD;
};

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(
    year,
    month - 1,
    day,
    boundary === "start" ? 0 : 23,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 999,
  );

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
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
  const startAt = new Date(endAt);
  startAt.setDate(startAt.getDate() - PERIODS[key].days);

  return {
    key,
    label: PERIODS[key].label,
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
      status: 403,
      ...error("professional_analytics_professional_plan", {}),
    };
  }

  const period = buildPeriod(normalizePeriod(data.q.period), data.q);
  if (!period) {
    return {
      status: 400,
      ...error("invalid_analytics_date_range", {}),
    };
  }

  const res = await repository.index(data, period);

  return { status: 200, ...msg("index", {}), data: res };
};

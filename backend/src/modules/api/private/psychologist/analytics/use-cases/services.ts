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

const buildPeriod = (key: PsychologistAnalyticsPeriodKey): PsychologistAnalyticsPeriod => {
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

  const period = buildPeriod(normalizePeriod(data.q.period));
  const res = await repository.index(data, period);

  return { status: 200, ...msg("index", {}), data: res };
};

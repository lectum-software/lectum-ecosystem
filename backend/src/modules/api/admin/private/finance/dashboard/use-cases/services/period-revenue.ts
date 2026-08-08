import {
  addDays,
  endOfDate,
  resolveCalendarPeriod,
  startOfDate,
  startOfMonth,
  toDateKey,
} from "@/utils/date-range";
import type {
  AdminFinanceChargeItem,
  AdminFinanceDateRange,
  AdminFinanceGroupBy,
  AdminFinanceMetric,
  AdminFinancePaymentHealth,
  AdminFinancePeriod,
  AdminFinanceQuery,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import type { AdminFinanceDashboardRepository } from "../../repositories/AdminFinanceDashboardRepository";

export const DEFAULT_PERIOD_DAYS = 30;

export const MAX_PERIOD_DAYS = 3660;

export const DEFAULT_SUBSCRIPTION_TAKE = 50;

export const DEFAULT_LIST_LIMIT = 20;

export const MAX_LIST_LIMIT = 50;

export const DASHBOARD_TABLE_PREVIEW_TAKE = 5;

export const MAX_PAYMENT_HISTORY_ITEMS = 10;

export const DAYS_PER_AVERAGE_MONTH = 30.4375;

export const MILLISECONDS_PER_DAY = 86_400_000;

export const CHARGE_STATUS_FILTERS = new Set<AdminFinanceChargeItem["status"]>(["confirmed"]);

export const SUBSCRIPTION_STATUS_FILTERS = new Set(["ativa", "cancelada", "inadimplente"]);

export const PAYMENT_HEALTH_FILTERS = new Set<AdminFinancePaymentHealth["status"]>([
  "attention",
  "critical",
  "healthy",
  "insufficient_history",
  "risk",
]);

export const resolveGroupBy = (
  value: AdminFinanceQuery["groupBy"],
  days: number,
): AdminFinanceGroupBy => {
  if (value === "month" || value === "week") return value;
  if (days > 180) return "month";
  if (days > 62) return "week";

  return "day";
};

export type FinancePeriodResolution = {
  current: AdminFinanceDateRange;
  days: number;
  groupBy: AdminFinanceGroupBy;
  period: AdminFinancePeriod;
  previous: AdminFinanceDateRange;
};

export type PeriodResult =
  | {
      period: FinancePeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

export const resolveAdminFinancePeriod = (
  query: AdminFinanceQuery,
  allPeriodStartDate?: Date | null,
): PeriodResult => {
  const resolved = resolveCalendarPeriod(query, {
    allPeriodStartDate,
    clampFutureAllStart: true,
    defaultDays: DEFAULT_PERIOD_DAYS,
    maxDays: MAX_PERIOD_DAYS,
  });
  if (!resolved) return { code: "invalid_analytics_date_range", success: false };

  const { days, end, label, previousEnd, previousStart, start } = resolved;
  const groupBy = resolveGroupBy(query.groupBy, days);
  return {
    period: {
      current: { end, start },
      days,
      groupBy,
      period: {
        days,
        from: toDateKey(start),
        group_by: groupBy,
        label,
        max_days: MAX_PERIOD_DAYS,
        previous_from: toDateKey(previousStart),
        previous_to: toDateKey(previousEnd),
        timezone: "server-local",
        to: toDateKey(end),
      },
      previous: { end: previousEnd, start: previousStart },
    },
    success: true,
  };
};

export type Bucket = {
  end: Date;
  end_date: string;
  start: Date;
  start_date: string;
};

export const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

export const minDate = (left: Date, right: Date) => (left < right ? left : right);

export const maxDate = (left: Date, right: Date) => (left > right ? left : right);

export const buildBuckets = (
  range: AdminFinanceDateRange,
  groupBy: AdminFinanceGroupBy,
): Bucket[] => {
  const buckets: Bucket[] = [];
  let cursor = startOfDate(range.start);

  while (cursor <= range.end) {
    let bucketStart = cursor;
    let bucketEnd: Date;

    if (groupBy === "week") {
      bucketEnd = endOfDate(addDays(bucketStart, 6));
    } else if (groupBy === "month") {
      bucketStart = maxDate(startOfMonth(cursor), startOfDate(range.start));
      bucketEnd = endOfMonth(cursor);
    } else {
      bucketEnd = endOfDate(cursor);
    }

    const clippedEnd = minDate(bucketEnd, range.end);
    buckets.push({
      end: clippedEnd,
      end_date: toDateKey(clippedEnd),
      start: bucketStart,
      start_date: toDateKey(bucketStart),
    });

    cursor = startOfDate(addDays(clippedEnd, 1));
  }

  return buckets;
};

export const roundPercent = (value: number) => Math.round(value * 10) / 10;

export const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

export const metric = (params: {
  available?: boolean;
  current: number;
  description: string;
  id: AdminFinanceMetric["id"];
  label: string;
  previous: number;
  ratePercent?: number | null;
  source: string;
  unit: AdminFinanceMetric["unit"];
  unavailableReason?: string | null;
}): AdminFinanceMetric => {
  const available = params.available ?? true;
  const change = available ? percentageChange(params.current, params.previous) : null;

  return {
    available,
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    rate_percent: params.ratePercent ?? null,
    source: params.source,
    trend:
      !available || change === null
        ? "unavailable"
        : change > 0
          ? "up"
          : change < 0
            ? "down"
            : "flat",
    unit: params.unit,
    unavailable_reason: params.unavailableReason ?? null,
    value: params.current,
  };
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const stringifyPayload = (value: unknown) => {
  try {
    return JSON.stringify(value ?? "").toLowerCase();
  } catch {
    return String(value ?? "").toLowerCase();
  }
};

export const payloadContainsAnyReference = (payload: unknown, references: string[]) => {
  const text = stringifyPayload(payload);

  return references.some((reference) => text.includes(reference.toLowerCase()));
};

export const findPayloadValue = (value: unknown, keys: string[]): unknown => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPayloadValue(item, keys);
      if (found !== undefined) return found;
    }

    return undefined;
  }

  if (!isRecord(value)) return undefined;

  const normalizedKeys = keys.map((key) => key.toLowerCase());
  for (const [key, entry] of Object.entries(value)) {
    if (normalizedKeys.includes(key.toLowerCase())) return entry;
  }

  for (const entry of Object.values(value)) {
    const found = findPayloadValue(entry, keys);
    if (found !== undefined) return found;
  }

  return undefined;
};

export const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const formatFinanceOperationalCode = (prefix: "A" | "C", internalId: number) =>
  `${prefix}${String(internalId).padStart(5, "0")}`;

export const toAmountCents = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100);
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized =
    trimmed.includes(",") && !trimmed.includes(".") ? trimmed.replace(",", ".") : trimmed;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.round(parsed * 100);
};

export const extractPaymentAmountCents = (payload: unknown) =>
  toAmountCents(
    findPayloadValue(payload, [
      "transaction_amount",
      "total_paid_amount",
      "paid_amount",
      "amount",
      "value",
    ]),
  );

export const isConfirmedPaymentStatus = (payload: unknown) => {
  const status = normalizeText(
    findPayloadValue(payload, ["status", "status_detail", "action", "payment_status"]),
  );

  return ["approved", "accredited", "paid"].some((term) => status.includes(term));
};

export const isPaymentEvent = (type: string, payload: unknown) => {
  const typeText = normalizeText(type);
  if (typeText.includes("payment")) return true;

  const topic = normalizeText(findPayloadValue(payload, ["topic", "type", "action"]));
  return topic.includes("payment");
};

export type PaymentEventRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaymentEvents"]>
>[number];

export type LifetimeSubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listPaidSubscriptionsForLifetime"]>
>[number];

export type CancelledLifetimeSubscriptionRecord = Awaited<
  ReturnType<AdminFinanceDashboardRepository["listCancelledPaidSubscriptionsForLifetime"]>
>[number];

export type PaymentRevenue = {
  confirmed_count: number;
  missing_amount_count: number;
  revenue_cents: number;
};

export const summarizeRevenue = (events: PaymentEventRecord[]): PaymentRevenue =>
  events.reduce<PaymentRevenue>(
    (accumulator, event) => {
      if (!isPaymentEvent(event.type, event.payload) || !isConfirmedPaymentStatus(event.payload)) {
        return accumulator;
      }

      const amount = extractPaymentAmountCents(event.payload);
      accumulator.confirmed_count += 1;

      if (amount === null) {
        accumulator.missing_amount_count += 1;
        return accumulator;
      }

      accumulator.revenue_cents += amount;
      return accumulator;
    },
    { confirmed_count: 0, missing_amount_count: 0, revenue_cents: 0 },
  );

export const summarizeAverageLtv = (
  subscriptions: LifetimeSubscriptionRecord[],
  paymentEvents: PaymentEventRecord[],
) => {
  const paidPsychologistCount = new Set(
    subscriptions.map((subscription) => subscription.psychologist_id),
  ).size;
  const references = Array.from(
    new Set(
      subscriptions.flatMap((subscription) =>
        [subscription.id, subscription.gateway_subscription_id].filter(
          (reference): reference is string => Boolean(reference && reference.length > 3),
        ),
      ),
    ),
  );

  let linkedConfirmedPayments = 0;
  let missingAmountCount = 0;
  let revenueCents = 0;

  if (references.length > 0) {
    for (const event of paymentEvents) {
      if (!isPaymentEvent(event.type, event.payload)) continue;
      if (!isConfirmedPaymentStatus(event.payload)) continue;
      if (!payloadContainsAnyReference(event.payload, references)) continue;

      linkedConfirmedPayments += 1;
      const amount = extractPaymentAmountCents(event.payload);
      if (amount === null) {
        missingAmountCount += 1;
        continue;
      }

      revenueCents += amount;
    }
  }

  const available = missingAmountCount === 0;

  return {
    available,
    linkedConfirmedPayments,
    paidPsychologistCount,
    unavailableReason: available ? null : "payment_event_vinculado_sem_valor_monetario_extraivel",
    valueCents:
      available && paidPsychologistCount > 0 ? Math.round(revenueCents / paidPsychologistCount) : 0,
  };
};

export const summarizeAverageSubscriptionLifetime = (
  subscriptions: CancelledLifetimeSubscriptionRecord[],
) => {
  if (subscriptions.length === 0) {
    return {
      available: false,
      cancelledSubscriptionCount: 0,
      unavailableReason: "Sem assinaturas pagas canceladas em todo o período.",
      valueDays: 0,
      valueMonths: 0,
    };
  }

  const totalDays = subscriptions.reduce((sum, subscription) => {
    const durationInDays = Math.max(
      0,
      (subscription.updatedAt.getTime() - subscription.createdAt.getTime()) / MILLISECONDS_PER_DAY,
    );

    return sum + durationInDays;
  }, 0);
  const valueDays = roundPercent(totalDays / subscriptions.length);

  return {
    available: true,
    cancelledSubscriptionCount: subscriptions.length,
    unavailableReason: null,
    valueDays,
    valueMonths: roundPercent(valueDays / DAYS_PER_AVERAGE_MONTH),
  };
};

import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminFinanceChargeItem,
  AdminFinancePaymentHealth,
  AdminFinanceQuery,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import { AdminFinanceDashboardRepository } from "../../repositories/AdminFinanceDashboardRepository";

import {
  CHARGE_STATUS_FILTERS,
  DEFAULT_LIST_LIMIT,
  extractPaymentAmountCents,
  formatFinanceOperationalCode,
  isConfirmedPaymentStatus,
  isPaymentEvent,
  MAX_LIST_LIMIT,
  normalizeText,
  PAYMENT_HEALTH_FILTERS,
  type PaymentEventRecord,
  payloadContainsAnyReference,
  resolveAdminFinancePeriod,
  SUBSCRIPTION_STATUS_FILTERS,
} from "./period-revenue";

import {
  extractPaymentReference,
  mapSubscription,
  type PaymentReferenceSubscriptionRecord,
  type SubscriptionRelationRecord,
  subscriptionReferenceValues,
} from "./subscriptions";

export const findSubscriptionForPayment = (
  event: PaymentEventRecord,
  subscriptions: PaymentReferenceSubscriptionRecord[],
) =>
  subscriptions.find((subscription) =>
    payloadContainsAnyReference(event.payload, subscriptionReferenceValues(subscription)),
  ) ?? null;

export const mapCharge = (
  event: PaymentEventRecord,
  subscriptions: PaymentReferenceSubscriptionRecord[],
): AdminFinanceChargeItem | null => {
  if (!isPaymentEvent(event.type, event.payload)) return null;
  if (!isConfirmedPaymentStatus(event.payload)) return null;

  const amountCents = extractPaymentAmountCents(event.payload);
  const subscription = findSubscriptionForPayment(event, subscriptions);

  return {
    amount_available: amountCents !== null,
    amount_cents: amountCents,
    detail_url: subscription ? `/psicologos/${subscription.psychologist.user.id}` : null,
    event_id: event.id,
    event_type: event.type,
    external_id: event.external_id,
    gateway: "mercadopago",
    internal_id: event.internal_id,
    occurred_at: event.createdAt.toISOString(),
    reference:
      subscription?.gateway_subscription_id ??
      subscription?.id ??
      extractPaymentReference(event.payload),
    status: "confirmed",
    status_label: "Confirmada",
    subscription: subscription ? mapSubscription(subscription, [event]) : null,
    unavailable_reason:
      amountCents === null ? "payment_event_confirmado_sem_valor_monetario_extraivel" : null,
  };
};

export const buildChargeItems = (
  events: PaymentEventRecord[],
  subscriptions: PaymentReferenceSubscriptionRecord[],
) =>
  events
    .map((event) => mapCharge(event, subscriptions))
    .filter((item): item is AdminFinanceChargeItem => Boolean(item))
    .sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at));

export type ChargeServiceFilters = {
  q?: string;
  status?: AdminFinanceChargeItem["status"];
};

export const normalizeChargeFilters = (query: AdminFinanceQuery): ChargeServiceFilters => {
  const q = query.q?.trim();
  const status = query.status?.trim();
  const validStatus =
    status &&
    status !== "all" &&
    CHARGE_STATUS_FILTERS.has(status as AdminFinanceChargeItem["status"])
      ? (status as AdminFinanceChargeItem["status"])
      : undefined;

  return {
    ...(q ? { q } : {}),
    ...(validStatus ? { status: validStatus } : {}),
  };
};

export const matchesChargeSearch = (item: AdminFinanceChargeItem, q?: string) => {
  const needle = normalizeText(q);
  if (!needle) return true;

  const searchableValues = [
    item.event_id,
    String(item.internal_id),
    formatFinanceOperationalCode("C", item.internal_id),
    item.event_type,
    item.external_id,
    item.reference,
    item.status_label,
    item.subscription?.gateway_subscription_id,
    item.subscription?.id,
    item.subscription ? String(item.subscription.internal_id) : null,
    item.subscription ? formatFinanceOperationalCode("A", item.subscription.internal_id) : null,
    item.subscription?.plan.name,
    item.subscription?.plan.slug,
    item.subscription?.psychologist.crp,
    item.subscription?.psychologist.email,
    item.subscription?.psychologist.name,
  ];

  return searchableValues.some((value) => normalizeText(value).includes(needle));
};

export const filterChargeItems = (items: AdminFinanceChargeItem[], filters: ChargeServiceFilters) =>
  items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;

    return matchesChargeSearch(item, filters.q);
  });

export const normalizeFinancePagination = (query: AdminFinanceQuery) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIST_LIMIT)));

  return {
    limit,
    page,
    skip: (page - 1) * limit,
  };
};

export const paginateItems = <T>(items: T[], page: number, limit: number) => {
  const count = items.length;
  const pages = Math.max(1, Math.ceil(count / limit));
  const safePage = Math.min(page, pages);
  const skip = (safePage - 1) * limit;

  return {
    count,
    data: items.slice(skip, skip + limit),
    page: safePage,
    pages,
    per_page: limit,
  };
};

export const paginationForCount = (query: AdminFinanceQuery, count: number) => {
  const pagination = normalizeFinancePagination(query);
  const pages = Math.max(1, Math.ceil(count / pagination.limit));
  const page = Math.min(pagination.page, pages);

  return {
    ...pagination,
    page,
    pages,
    skip: (page - 1) * pagination.limit,
  };
};

export type SubscriptionRelationServiceFilters = {
  paymentHealth?: AdminFinancePaymentHealth["status"];
  q?: string;
  status?: string;
};

export const normalizeSubscriptionRelationFilters = (
  query: AdminFinanceQuery,
): SubscriptionRelationServiceFilters => {
  const paymentHealth = query.paymentHealth?.trim() as
    | AdminFinancePaymentHealth["status"]
    | undefined;
  const q = query.q?.trim();
  const status = query.status?.trim();

  return {
    ...(paymentHealth && PAYMENT_HEALTH_FILTERS.has(paymentHealth) ? { paymentHealth } : {}),
    ...(q ? { q } : {}),
    ...(status && status !== "all" && SUBSCRIPTION_STATUS_FILTERS.has(status) ? { status } : {}),
  };
};

export const resolveFinanceListPeriod = async (
  query: AdminFinanceQuery,
  repository: AdminFinanceDashboardRepository,
) => {
  const allPeriodStartDate =
    query.period === "all" ? await repository.findFinanceStartDate() : null;

  return resolveAdminFinancePeriod(query, allPeriodStartDate);
};

export const listAdminFinanceCharges = async (query: AdminFinanceQuery): Promise<Resolve> => {
  const repository = new AdminFinanceDashboardRepository();
  const resolvedPeriod = await resolveFinanceListPeriod(query ?? {}, repository);

  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, period } = resolvedPeriod.period;
  const [paymentEvents, paymentReferenceSubscriptions] = await Promise.all([
    repository.listPaymentEvents(current),
    repository.listPaidSubscriptionsForPaymentReferenceAt(current.end),
  ]);
  const pagination = normalizeFinancePagination(query ?? {});
  const filters = normalizeChargeFilters(query ?? {});
  const charges = filterChargeItems(
    buildChargeItems(paymentEvents, paymentReferenceSubscriptions),
    filters,
  );
  const page = paginateItems(charges, pagination.page, pagination.limit);

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      ...page,
      period,
      source: "payment_event+professional_subscription",
    },
  };
};

export const listAdminFinanceSubscriptions = async (query: AdminFinanceQuery): Promise<Resolve> => {
  const repository = new AdminFinanceDashboardRepository();
  const resolvedPeriod = await resolveFinanceListPeriod(query ?? {}, repository);

  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, period } = resolvedPeriod.period;
  const filters = normalizeSubscriptionRelationFilters(query ?? {});
  const { paymentHealth, ...databaseFilters } = filters;
  const baseCount = await repository.countPaidSubscriptionsForRelation(current, databaseFilters);

  if (paymentHealth) {
    const pagination = normalizeFinancePagination(query ?? {});
    const [subscriptions, lifetimePaymentEvents] = await Promise.all([
      baseCount > 0
        ? repository.listPaidSubscriptionsForRelation(
            current,
            {
              take: baseCount,
            },
            databaseFilters,
          )
        : Promise.resolve([] as SubscriptionRelationRecord[]),
      repository.listPaymentEventsForLifetime(),
    ]);
    const filteredItems = subscriptions
      .map((subscription) => mapSubscription(subscription, lifetimePaymentEvents))
      .filter((subscription) => subscription.payment_health.status === paymentHealth);
    const page = paginateItems(filteredItems, pagination.page, pagination.limit);

    return {
      status: 200,
      ...msg("index", {}),
      data: {
        ...page,
        period,
        source: "professional_subscription+subscription_plan+psychologist_profile+user",
      },
    };
  }

  const count = baseCount;
  const pagination = paginationForCount(query ?? {}, count);
  const [subscriptions, lifetimePaymentEvents] = await Promise.all([
    repository.listPaidSubscriptionsForRelation(
      current,
      {
        skip: pagination.skip,
        take: pagination.limit,
      },
      databaseFilters,
    ),
    repository.listPaymentEventsForLifetime(),
  ]);

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      count,
      data: subscriptions.map((subscription) =>
        mapSubscription(subscription, lifetimePaymentEvents),
      ),
      page: pagination.page,
      pages: pagination.pages,
      per_page: pagination.limit,
      period,
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
    },
  };
};

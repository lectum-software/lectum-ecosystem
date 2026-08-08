import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminFinanceDashboard,
  AdminFinanceQuery,
  AdminFinanceSeriesPoint,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import { AdminFinanceDashboardRepository } from "../../repositories/AdminFinanceDashboardRepository";
import { buildChargeItems } from "./charges-lists";
import {
  type Bucket,
  buildBuckets,
  DASHBOARD_TABLE_PREVIEW_TAKE,
  DEFAULT_SUBSCRIPTION_TAKE,
  metric,
  type PaymentEventRecord,
  type PaymentRevenue,
  resolveAdminFinancePeriod,
  summarizeAverageLtv,
  summarizeAverageSubscriptionLifetime,
  summarizeRevenue,
} from "./period-revenue";
import {
  calculateChurnRatePercent,
  mapSubscription,
  monthlyPriceCents,
  type NewSubscriptionValueRecord,
  recordsInBucket,
  sumSubscriptionPlanRevenueCents,
} from "./subscriptions";

export const buildSeries = async (
  buckets: Bucket[],
  paymentEvents: PaymentEventRecord[],
  newSubscriptionValues: NewSubscriptionValueRecord[],
  repository: AdminFinanceDashboardRepository,
): Promise<AdminFinanceSeriesPoint[]> =>
  Promise.all(
    buckets.map(async (bucket) => {
      const bucketNewSubscriptions = recordsInBucket(newSubscriptionValues, bucket);
      const [activeSubscriptions, cancellations] = await Promise.all([
        repository.countActivePaidSubscriptionsAt(bucket.end),
        repository.countCancelledPaidSubscriptions(bucket),
      ]);
      const revenue = summarizeRevenue(recordsInBucket(paymentEvents, bucket));

      return {
        active_subscriptions: activeSubscriptions,
        cancellations,
        confirmed_payments: revenue.confirmed_count,
        end_date: bucket.end_date,
        new_subscriptions: bucketNewSubscriptions.length,
        new_subscriptions_revenue_cents: sumSubscriptionPlanRevenueCents(bucketNewSubscriptions),
        revenue_cents: revenue.revenue_cents,
        start_date: bucket.start_date,
      };
    }),
  );

export const buildUnavailable = (
  currentRevenue: PaymentRevenue,
  previousRevenue: PaymentRevenue,
) => {
  const unavailable = [];

  if (currentRevenue.missing_amount_count > 0 || previousRevenue.missing_amount_count > 0) {
    unavailable.push({
      description:
        "Existem pagamentos confirmados sem valor informado pelo Mercado Pago; a receita total fica indisponível para evitar uma soma parcial.",
      id: "revenue_total",
      label: "Receita total",
      source: "payment_event.payload",
    });
  }

  return unavailable;
};

export const buildAdminFinanceDashboard = async (
  query: AdminFinanceQuery,
  options: { subscriptionTake?: number; tableTake?: number } = {},
): Promise<Resolve> => {
  const normalizedQuery = query ?? {};
  const repository = new AdminFinanceDashboardRepository();
  const allPeriodStartDate =
    normalizedQuery.period === "all" ? await repository.findFinanceStartDate() : null;
  const resolvedPeriod = resolveAdminFinancePeriod(normalizedQuery, allPeriodStartDate);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, groupBy, period, previous } = resolvedPeriod.period;
  const subscriptionTake = options.subscriptionTake ?? DEFAULT_SUBSCRIPTION_TAKE;
  const tableTake = options.tableTake ?? DASHBOARD_TABLE_PREVIEW_TAKE;

  const [
    currentPaymentEvents,
    previousPaymentEvents,
    currentNewSubscriptionValues,
    previousNewSubscriptionValues,
    currentActiveSubscriptionCount,
    previousActiveSubscriptionCount,
    currentCancellationCount,
    previousCancellationCount,
    currentChurnOpeningBaseCount,
    activeSubscriptions,
    lifetimeSubscriptions,
    cancelledLifetimeSubscriptions,
    lifetimePaymentEvents,
    newSubscriptions,
    paymentReferenceSubscriptions,
    subscriptionRelationTotal,
    subscriptionRelationItems,
  ] = await Promise.all([
    repository.listPaymentEvents(current),
    repository.listPaymentEvents(previous),
    repository.listNewPaidSubscriptionValues(current),
    repository.listNewPaidSubscriptionValues(previous),
    repository.countActivePaidSubscriptionsAt(current.end),
    repository.countActivePaidSubscriptionsAt(previous.end),
    repository.countCancelledPaidSubscriptions(current),
    repository.countCancelledPaidSubscriptions(previous),
    repository.countPaidSubscriptionsInOpeningBaseAt(current.start),
    repository.listActivePaidSubscriptionsAt(current.end),
    repository.listPaidSubscriptionsForLifetime(),
    repository.listCancelledPaidSubscriptionsForLifetime(),
    repository.listPaymentEventsForLifetime(),
    repository.listNewPaidSubscriptions(current, subscriptionTake),
    repository.listPaidSubscriptionsForPaymentReferenceAt(current.end),
    repository.countPaidSubscriptionsForRelation(current),
    repository.listPaidSubscriptionsForRelation(current, {
      take: tableTake,
    }),
  ]);

  const currentRevenue = summarizeRevenue(currentPaymentEvents);
  const previousRevenue = summarizeRevenue(previousPaymentEvents);
  const revenueAvailable =
    currentRevenue.missing_amount_count === 0 && previousRevenue.missing_amount_count === 0;
  const mrrCents = activeSubscriptions.reduce(
    (sum, subscription) => sum + monthlyPriceCents(subscription),
    0,
  );
  const currentNewSubscriptionCount = currentNewSubscriptionValues.length;
  const previousNewSubscriptionCount = previousNewSubscriptionValues.length;
  const currentNewSubscriptionRevenueCents = sumSubscriptionPlanRevenueCents(
    currentNewSubscriptionValues,
  );
  const previousNewSubscriptionRevenueCents = sumSubscriptionPlanRevenueCents(
    previousNewSubscriptionValues,
  );
  const currentChurnRatePercent = calculateChurnRatePercent(
    currentCancellationCount,
    currentChurnOpeningBaseCount,
  );
  const averageLtv = summarizeAverageLtv(lifetimeSubscriptions, lifetimePaymentEvents);
  const averageSubscriptionLifetime = summarizeAverageSubscriptionLifetime(
    cancelledLifetimeSubscriptions,
  );
  const nonMonthlyIntervals = activeSubscriptions.some(
    (subscription) => !subscription.plan.interval.toLowerCase().includes("month"),
  );
  const buckets = buildBuckets(current, groupBy);
  const series = await buildSeries(
    buckets,
    currentPaymentEvents,
    currentNewSubscriptionValues,
    repository,
  );
  const currentCharges = buildChargeItems(currentPaymentEvents, paymentReferenceSubscriptions);
  const unavailable = buildUnavailable(currentRevenue, previousRevenue);

  const dashboard: AdminFinanceDashboard = {
    average_ltv: {
      available: averageLtv.available,
      description:
        "Receita confirmada durante todo o histórico, dividida pelos psicólogos com assinatura paga pelo Mercado Pago.",
      linked_confirmed_payments: averageLtv.linkedConfirmedPayments,
      paid_psychologist_count: averageLtv.paidPsychologistCount,
      source: "payment_event_linked_to_paid_psychologists",
      unavailable_reason: averageLtv.unavailableReason,
      value_cents: averageLtv.valueCents,
    },
    average_subscription_lifetime: {
      available: averageSubscriptionLifetime.available,
      cancelled_subscription_count: averageSubscriptionLifetime.cancelledSubscriptionCount,
      description:
        "Tempo médio entre o início e o cancelamento das assinaturas pagas pelo Mercado Pago.",
      source: "cancelled_paid_subscriptions",
      unavailable_reason: averageSubscriptionLifetime.unavailableReason,
      value_days: averageSubscriptionLifetime.valueDays,
      value_months: averageSubscriptionLifetime.valueMonths,
    },
    cards: {
      revenue_total: metric({
        available: revenueAvailable,
        current: currentRevenue.revenue_cents,
        description: revenueAvailable
          ? "Somatório dos pagamentos confirmados com valor informado pelo Mercado Pago."
          : "Indisponível porque há pagamento confirmado sem valor informado pelo Mercado Pago.",
        id: "revenue_total",
        label: "Receita total",
        previous: previousRevenue.revenue_cents,
        source: "payment_event.gateway=mercadopago",
        unavailableReason: revenueAvailable
          ? null
          : "payment_event_confirmado_sem_valor_monetario_extraivel",
        unit: "currency_cents",
      }),
      active_subscriptions: metric({
        current: currentActiveSubscriptionCount,
        description:
          "Assinaturas profissionais pagas ativas ao final do período. Planos gratuitos e cortesias não entram no cálculo.",
        id: "active_subscriptions",
        label: "Assinaturas ativas",
        previous: previousActiveSubscriptionCount,
        source: "professional_subscription.status=ativa + source=mercadopago",
        unit: "count",
      }),
      new_subscriptions_revenue: metric({
        current: currentNewSubscriptionRevenueCents,
        description:
          "Soma do valor cadastrado para os planos pagos iniciados no período, sem plano gratuito ou cortesia.",
        id: "new_subscriptions_revenue",
        label: "Receita de novas assinaturas",
        previous: previousNewSubscriptionRevenueCents,
        source: "professional_subscription.createdAt + subscription_plan.price_cents",
        unit: "currency_cents",
      }),
      new_subscriptions: metric({
        current: currentNewSubscriptionCount,
        description:
          "Assinaturas profissionais pagas iniciadas no período, sem plano gratuito ou cortesia.",
        id: "new_subscriptions",
        label: "Novas assinaturas",
        previous: previousNewSubscriptionCount,
        source: "professional_subscription.createdAt + source=mercadopago",
        unit: "count",
      }),
      cancellations: metric({
        current: currentCancellationCount,
        description: "Cancelamentos confirmados de assinaturas profissionais pagas no período.",
        id: "cancellations",
        label: "Churn",
        previous: previousCancellationCount,
        ratePercent: currentChurnRatePercent,
        source: "professional_subscription.status=cancelada",
        unit: "count",
      }),
    },
    coverage_notes: [
      "A receita considera somente pagamentos confirmados com valor informado pelo Mercado Pago; não há projeção por quantidade de assinaturas.",
      "O LTV médio considera todo o histórico de pagamentos confirmados vinculados às assinaturas pagas.",
      "O tempo médio de permanência considera todo o histórico das assinaturas pagas já canceladas.",
      "Plano gratuito e cortesia administrativa não entram na receita, no MRR, no LTV médio, no tempo médio de permanência ou nos indicadores financeiros.",
      "O churn considera cancelamentos confirmados e divide as saídas pela base paga no início do período, sem inferir cancelamento por ausência de renovação.",
      nonMonthlyIntervals
        ? "Há planos ativos com intervalo não mensal; o MRR converte o valor anual para a média mensal."
        : "Todos os planos ativos usam o valor cadastrado na configuração do plano.",
    ],
    export: {
      available: true,
      format: "csv",
    },
    mrr: {
      description:
        "Soma mensal dos planos pagos ativos ao final do período, sem plano gratuito ou cortesia.",
      source: "active_paid_subscriptions",
      value_cents: mrrCents,
    },
    latest_charges: {
      items: currentCharges.slice(0, tableTake),
      source: "payment_event+professional_subscription",
      total: currentCharges.length,
    },
    new_subscriptions: {
      items: newSubscriptions.map((subscription) =>
        mapSubscription(subscription, lifetimePaymentEvents),
      ),
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
      total: currentNewSubscriptionCount,
    },
    period,
    series: {
      points: series,
      source: "payment_event+professional_subscription",
    },
    subscription_relation: {
      items: subscriptionRelationItems.map((subscription) =>
        mapSubscription(subscription, lifetimePaymentEvents),
      ),
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
      total: subscriptionRelationTotal,
    },
    unavailable,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: dashboard,
  };
};

export const isAdminFinanceDashboard = (data: unknown): data is AdminFinanceDashboard =>
  Boolean(data && typeof data === "object" && "period" in data && "cards" in data);

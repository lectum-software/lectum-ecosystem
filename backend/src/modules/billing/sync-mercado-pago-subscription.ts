import type { professional_subscription } from "@/interfaces/objects";
import {
  type BillingDunningUpdate,
  buildBillingDunningUpdate,
  resolveBillingDunningTransitionNotice,
  sendBillingDunningNotice,
} from "@/modules/billing/dunning";
import {
  type BillingSubscriptionStatus,
  type GatewaySubscription,
  getPaymentGateway,
} from "@/modules/billing/payment-gateway";

type LocalGatewaySubscription = Pick<
  professional_subscription,
  | "billing_downgraded_at"
  | "billing_grace_ends_at"
  | "billing_issue_started_at"
  | "billing_last_notice_key"
  | "current_period_end"
  | "gateway_subscription_id"
  | "id"
  | "source"
  | "status"
> & {
  plan?: {
    interval?: string | null;
  } | null;
};

type MercadoPagoSubscriptionSyncRepository = {
  updateSubscriptionStatus(data: {
    subscriptionId: string;
    gatewaySubscriptionId: string;
    status: BillingSubscriptionStatus;
    billingDunning?: BillingDunningUpdate;
    currentPeriodEnd?: Date | null;
  }): Promise<professional_subscription | null>;
};

type RawMercadoPagoSubscription = {
  auto_recurring?: {
    frequency?: unknown;
    frequency_type?: unknown;
    start_date?: unknown;
  };
  date_created?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toSafeString = (value: unknown) => (typeof value === "string" ? value : null);

const toSafeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const parseMercadoPagoSubscriptionDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeFrequencyType = ({
  frequencyType,
  planInterval,
}: {
  frequencyType?: string | null;
  planInterval?: string | null;
}) => {
  if (frequencyType) return frequencyType;

  switch (planInterval) {
    case "month":
    case "monthly":
      return "months";
    case "year":
    case "yearly":
      return "years";
    case "week":
    case "weekly":
      return "weeks";
    case "day":
    case "daily":
      return "days";
    default:
      return null;
  }
};

const addBillingInterval = ({
  date,
  frequency,
  frequencyType,
}: {
  date: Date;
  frequency: number;
  frequencyType?: string | null;
}) => {
  const result = new Date(date);

  switch (frequencyType) {
    case "months":
    case "month":
      result.setMonth(result.getMonth() + frequency);
      break;
    case "years":
    case "year":
      result.setFullYear(result.getFullYear() + frequency);
      break;
    case "weeks":
    case "week":
      result.setDate(result.getDate() + frequency * 7);
      break;
    case "days":
    case "day":
      result.setDate(result.getDate() + frequency);
      break;
    default:
      return null;
  }

  return result;
};

const getRawSubscription = (gatewaySubscription: GatewaySubscription) =>
  isRecord(gatewaySubscription.raw)
    ? (gatewaySubscription.raw as RawMercadoPagoSubscription)
    : null;

const resolveActiveCurrentPeriodEnd = ({
  gatewaySubscription,
  localSubscription,
}: {
  gatewaySubscription: GatewaySubscription;
  localSubscription: LocalGatewaySubscription;
}) => {
  const gatewayNextPaymentDate = parseMercadoPagoSubscriptionDate(
    gatewaySubscription.next_payment_date,
  );

  if (gatewaySubscription.status !== "ativa") return gatewayNextPaymentDate;
  if (gatewayNextPaymentDate && gatewayNextPaymentDate > new Date()) return gatewayNextPaymentDate;

  const raw = getRawSubscription(gatewaySubscription);
  const autoRecurring = raw?.auto_recurring;
  const startDate =
    parseMercadoPagoSubscriptionDate(toSafeString(autoRecurring?.start_date)) ||
    parseMercadoPagoSubscriptionDate(toSafeString(raw?.date_created));

  if (!startDate) return gatewayNextPaymentDate;

  const frequency = toSafeNumber(autoRecurring?.frequency) || 1;
  const frequencyType = normalizeFrequencyType({
    frequencyType: toSafeString(autoRecurring?.frequency_type),
    planInterval: localSubscription.plan?.interval ?? null,
  });

  return (
    addBillingInterval({
      date: startDate,
      frequency,
      frequencyType,
    }) || gatewayNextPaymentDate
  );
};

const resolveLocalSubscriptionStatus = (gatewaySubscription: GatewaySubscription) => {
  if (gatewaySubscription.status !== "ativa") return gatewaySubscription.status;

  const raw = getRawSubscription(gatewaySubscription);
  const startDate = parseMercadoPagoSubscriptionDate(toSafeString(raw?.auto_recurring?.start_date));

  if (startDate && startDate > new Date()) {
    return "inativa";
  }

  return gatewaySubscription.status;
};

export const syncMercadoPagoSubscriptionRecord = async ({
  gatewaySubscription: receivedGatewaySubscription,
  localSubscription,
  repository,
}: {
  gatewaySubscription?: GatewaySubscription | null;
  localSubscription: LocalGatewaySubscription;
  repository: MercadoPagoSubscriptionSyncRepository;
}) => {
  if (!localSubscription.id || !localSubscription.gateway_subscription_id) {
    return null;
  }

  const gateway = getPaymentGateway();
  const gatewaySubscription =
    receivedGatewaySubscription ??
    (await gateway.getSubscription(localSubscription.gateway_subscription_id));
  const status = resolveLocalSubscriptionStatus(gatewaySubscription);
  const now = new Date();
  const billingDunning = buildBillingDunningUpdate({
    now,
    previous: localSubscription,
    status,
  });
  const noticeStage = resolveBillingDunningTransitionNotice({
    previous: localSubscription,
    status,
  });

  const current = await repository.updateSubscriptionStatus({
    billingDunning,
    subscriptionId: localSubscription.id,
    gatewaySubscriptionId: gatewaySubscription.gateway_subscription_id,
    status,
    currentPeriodEnd:
      status === "ativa"
        ? resolveActiveCurrentPeriodEnd({
            gatewaySubscription,
            localSubscription,
          })
        : null,
  });

  if (noticeStage && current?.id) {
    await sendBillingDunningNotice({
      stage: noticeStage,
      subscriptionId: current.id,
    });
  }

  return {
    current,
    gatewaySubscription,
  };
};

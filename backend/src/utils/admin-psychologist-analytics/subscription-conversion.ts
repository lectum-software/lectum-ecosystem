export const MS_PER_DAY = 86_400_000;

export const FREE_PLAN_SLUG = "gratuito";

export const PAID_SOURCE = "mercadopago";

export const PAID_STATUSES = new Set(["ativa", "cancelada"]);

export const DURATION_RELIABILITY_THRESHOLD = 0.5;

export type AdminPsychologistAnalyticsSubscription = {
  createdAt: Date;
  current_period_end?: Date | null;
  gateway?: string | null;
  gateway_subscription_id?: string | null;
  grant_started_at?: Date | null;
  plan: {
    price_cents: number;
    slug: string;
  };
  source: string | null;
  status: string;
  updatedAt?: Date;
};

export type AdminPsychologistAnalyticsProfile = {
  subscriptions: AdminPsychologistAnalyticsSubscription[];
  user: {
    createdAt: Date;
    id: string;
    provider?: string | null;
  };
};

export type AdminPsychologistAnalyticsPageView = {
  duration_seconds: number | null;
  normalized_path: string;
  occurred_at: Date;
  page_kind: string;
  path: string;
  session_id: string;
  user_id: string | null;
};

export type AdminPsychologistTrafficOriginSourceId =
  | "communities"
  | "direct_link"
  | "explore"
  | "favorites"
  | "search_filters";

export type AdminPsychologistTrafficOriginPageView = {
  occurred_at: Date;
  session_id: string;
  traffic_source: string | null;
};

export type AdminPsychologistTrafficOriginSource = {
  badge: "primary_source" | null;
  conversion_rate: null;
  description: string;
  id: AdminPsychologistTrafficOriginSourceId;
  label: string;
  percentage: number;
  profile_views: number;
  sessions: number;
  whatsapp_clicks: null;
};

export type AdminPsychologistWhatsappTrafficOriginSourceId =
  | "community_post_text"
  | "community_post_video"
  | "community_reply_text"
  | "community_reply_video"
  | "community_top_mentors"
  | "explore"
  | "favorites"
  | "profile"
  | "search_filters";

export type AdminPsychologistWhatsappTrafficAction = {
  action_type: string;
  occurred_at: Date;
  page_kind: string;
  path: string | null;
  session_id: string;
  target_id: string | null;
  target_type: string | null;
  user_id: string | null;
};

export type AdminPsychologistWhatsappTrafficCommunityPost = {
  author_id: string;
  id: string;
  media_items?: Array<{ media_type: string | null }>;
  media_type: string | null;
};

export type AdminPsychologistWhatsappTrafficCommunityReply = {
  author_id: string;
  id: string;
  media_type: string | null;
};

export type AdminPsychologistWhatsappTrafficOriginSource = {
  badge: "primary_source" | null;
  considered_count: number | null;
  conversion_rate: null;
  description: string;
  id: AdminPsychologistWhatsappTrafficOriginSourceId;
  label: string;
  percentage: number;
  platform_metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] | null;
  profile_views: number;
  sessions: number;
  whatsapp_click_actor_breakdown: AdminPsychologistWhatsappTrafficClickActorBreakdown | null;
  whatsapp_clicks: number;
};

export type AdminPsychologistWhatsappTrafficClickActorBreakdown = {
  author_clicks: number;
  author_percentage: number;
  other_users_clicks: number;
  other_users_percentage: number;
  source: "important_action_event.user_id+community_post.author_id+post_reply.author_id";
};

export type AdminPsychologistWhatsappTrafficPlatformMetricId =
  | "average_visibility"
  | "average_retention"
  | "comments"
  | "downvotes"
  | "favorites"
  | "profile_accesses"
  | "profile_openings"
  | "profile_stay_time"
  | "profile_publications_tab_opens"
  | "profile_reviews_tab_opens"
  | "presentation_video_views"
  | "presentation_video_retention"
  | "replay_rate"
  | "saves"
  | "shares"
  | "upvotes"
  | "views";

export type AdminPsychologistWhatsappTrafficPlatformMetric = {
  id: AdminPsychologistWhatsappTrafficPlatformMetricId;
  label: string;
  source: string;
  unavailable_reason: string | null;
  unit: "count" | "percentage" | "seconds";
  value: number | null;
};

export type TimeToFirstPaidSubscriptionStatus =
  | "converted"
  | "courtesy_only"
  | "free_only"
  | "not_converted"
  | "unavailable";

export const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

export const toDateKey = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
};

export const daysBetweenDates = (from: Date, to: Date) =>
  Math.max(0, Math.floor((startOfDate(to).getTime() - startOfDate(from).getTime()) / MS_PER_DAY));

export const normalizeProvider = (provider?: string | null) =>
  (provider ?? "").trim().toLowerCase();

export const signupMethodFromProvider = (
  provider?: string | null,
): "email_password" | "google" | "unknown" => {
  const normalized = normalizeProvider(provider);
  if (normalized === "google") return "google";
  if (!normalized || normalized === "manual" || normalized === "email") return "email_password";

  return "unknown";
};

export const signupMethodLabel = (method: "email_password" | "google" | "unknown") => {
  if (method === "google") return "Google";
  if (method === "email_password") return "E-mail e senha";

  return "Indisponível";
};

export const isPaidProfessionalSubscription = (
  subscription: AdminPsychologistAnalyticsSubscription,
) => {
  const source = (subscription.source ?? "").toLowerCase();
  const gateway = (subscription.gateway ?? "").toLowerCase();
  const hasMercadoPagoOrigin =
    source === PAID_SOURCE ||
    gateway === PAID_SOURCE ||
    Boolean(subscription.gateway_subscription_id);

  return (
    hasMercadoPagoOrigin &&
    subscription.plan.slug !== FREE_PLAN_SLUG &&
    subscription.plan.price_cents > 0 &&
    PAID_STATUSES.has(subscription.status)
  );
};

export const firstPaidProfessionalSubscription = <T extends AdminPsychologistAnalyticsSubscription>(
  subscriptions: T[],
): T | null => {
  const paid = subscriptions
    .filter(isPaidProfessionalSubscription)
    .toSorted((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  return paid[0] ?? null;
};

export const timeToFirstPaidSubscription = (params: {
  currentSubscription?: AdminPsychologistAnalyticsSubscription | null;
  registeredAt?: Date | null;
  subscriptions: AdminPsychologistAnalyticsSubscription[];
}) => {
  const { currentSubscription, registeredAt, subscriptions } = params;
  if (!registeredAt || Number.isNaN(registeredAt.getTime())) {
    return {
      days: null,
      first_paid_subscription_at: null,
      label: "Indisponível",
      registered_at: null,
      status: "unavailable" as const satisfies TimeToFirstPaidSubscriptionStatus,
    };
  }

  const firstPaid = firstPaidProfessionalSubscription(subscriptions);
  if (firstPaid) {
    const days = daysBetweenDates(registeredAt, firstPaid.createdAt);

    return {
      days,
      first_paid_subscription_at: firstPaid.createdAt,
      label: days === 0 ? "Assinou no mesmo dia" : `${days} dias`,
      registered_at: registeredAt,
      status: "converted" as const satisfies TimeToFirstPaidSubscriptionStatus,
    };
  }

  if (currentSubscription?.source === "admin_grant") {
    return {
      days: null,
      first_paid_subscription_at: null,
      label: "Sem assinatura paga — cortesia",
      registered_at: registeredAt,
      status: "courtesy_only" as const satisfies TimeToFirstPaidSubscriptionStatus,
    };
  }

  if (currentSubscription?.plan.slug === FREE_PLAN_SLUG) {
    return {
      days: null,
      first_paid_subscription_at: null,
      label: "Sem assinatura paga — plano gratuito",
      registered_at: registeredAt,
      status: "free_only" as const satisfies TimeToFirstPaidSubscriptionStatus,
    };
  }

  return {
    days: null,
    first_paid_subscription_at: null,
    label: "Ainda não assinou plano pago",
    registered_at: registeredAt,
    status: "not_converted" as const satisfies TimeToFirstPaidSubscriptionStatus,
  };
};

export const percentile = (values: number[], percent: number) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percent / 100) * sorted.length) - 1;

  return sorted[Math.min(sorted.length - 1, Math.max(0, index))] ?? null;
};

export const average = (values: number[]) => {
  if (values.length === 0) return null;

  return roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length);
};

export const bucketForDays = (days: number) => {
  if (days === 0) return "same_day";
  if (days <= 3) return "days_1_3";
  if (days <= 7) return "days_4_7";
  if (days <= 30) return "days_8_30";

  return "over_30";
};

export const conversionBuckets = [
  { id: "same_day", label: "Mesmo dia" },
  { id: "days_1_3", label: "1-3 dias" },
  { id: "days_4_7", label: "4-7 dias" },
  { id: "days_8_30", label: "8-30 dias" },
  { id: "over_30", label: "Mais de 30 dias" },
  { id: "not_converted", label: "Ainda não assinou" },
] as const;

export const summarizeConversionCohort = (profiles: AdminPsychologistAnalyticsProfile[]) => {
  const converted = profiles.flatMap((profile) => {
    const firstPaid = firstPaidProfessionalSubscription(profile.subscriptions);
    if (!firstPaid) return [];

    return [daysBetweenDates(profile.user.createdAt, firstPaid.createdAt)];
  });
  const bucketCounts = new Map(conversionBuckets.map((bucket) => [bucket.id, 0]));

  for (const profile of profiles) {
    const firstPaid = firstPaidProfessionalSubscription(profile.subscriptions);
    const bucket = firstPaid
      ? bucketForDays(daysBetweenDates(profile.user.createdAt, firstPaid.createdAt))
      : "not_converted";
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  }

  const registeredCount = profiles.length;
  const convertedCount = converted.length;

  return {
    average_days: average(converted),
    buckets: conversionBuckets.map((bucket) => ({
      count: bucketCounts.get(bucket.id) ?? 0,
      id: bucket.id,
      label: bucket.label,
      percentage:
        registeredCount > 0
          ? roundOneDecimal(((bucketCounts.get(bucket.id) ?? 0) / registeredCount) * 100)
          : 0,
    })),
    conversion_rate:
      registeredCount > 0 ? roundOneDecimal((convertedCount / registeredCount) * 100) : null,
    converted_paid_count: convertedCount,
    median_days: percentile(converted, 50),
    p75_days: percentile(converted, 75),
    p90_days: percentile(converted, 90),
    registered_count: registeredCount,
    unavailable_reason:
      registeredCount === 0
        ? "Sem psicólogos cadastrados na coorte selecionada."
        : convertedCount === 0
          ? "Nenhum psicólogo do grupo realizou uma assinatura paga."
          : null,
  };
};

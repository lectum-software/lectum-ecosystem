const MS_PER_DAY = 86_400_000;
const FREE_PLAN_SLUG = "gratuito";
const PAID_SOURCE = "mercadopago";
const PAID_STATUSES = new Set(["ativa", "cancelada"]);
const DURATION_RELIABILITY_THRESHOLD = 0.5;

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

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
};

export const daysBetweenDates = (from: Date, to: Date) =>
  Math.max(0, Math.floor((startOfDate(to).getTime() - startOfDate(from).getTime()) / MS_PER_DAY));

const normalizeProvider = (provider?: string | null) => (provider ?? "").trim().toLowerCase();

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

const percentile = (values: number[], percent: number) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percent / 100) * sorted.length) - 1;

  return sorted[Math.min(sorted.length - 1, Math.max(0, index))] ?? null;
};

const average = (values: number[]) => {
  if (values.length === 0) return null;

  return roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const bucketForDays = (days: number) => {
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
          ? "Nenhum psicólogo da coorte realizou assinatura paga real."
          : null,
  };
};

const PAGE_KIND_LABELS: Record<string, string> = {
  billing: "Plano",
  community: "Comunidades",
  community_post: "Comunidades",
  home: "Início",
  login: "Login",
  psychologist_profile: "Perfil",
  psychologists: "Psicólogos",
  signup: "Cadastro",
};

export const platformPageLabel = (
  view: Pick<AdminPsychologistAnalyticsPageView, "normalized_path" | "page_kind" | "path">,
) => {
  const path = (view.normalized_path || view.path || "/").split("?")[0] ?? "/";
  const segments = path.split("/").filter(Boolean);
  const joined = segments.join("/");

  if (joined.includes("publication") || joined.includes("post")) return "Posts";
  if (joined.includes("community")) return "Comunidades";
  if (joined.includes("billing") || joined.includes("checkout") || joined.includes("plan")) {
    return "Plano";
  }
  if (
    joined.includes("analytics") ||
    joined.includes("estatisticas") ||
    joined.includes("statistics")
  ) {
    return "Analytics";
  }
  if (
    joined.includes("settings") ||
    joined.includes("configuracoes") ||
    joined.includes("account")
  ) {
    return "Configurações";
  }
  if (joined.includes("profile") || joined.includes("perfil") || joined.includes("psychologist")) {
    return "Perfil";
  }
  if (joined.startsWith("app")) return "Área do psicólogo";

  return PAGE_KIND_LABELS[view.page_kind] ?? "Outras páginas";
};

export const summarizePlatformUsage = (params: {
  eligiblePsychologistsCount?: number;
  labels?: string[];
  pageViews: AdminPsychologistAnalyticsPageView[];
}) => {
  const { eligiblePsychologistsCount = 0, labels = [], pageViews } = params;
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const users = new Set(viewsWithUser.map((view) => view.user_id as string));
  const sessionsByUser = new Map<string, Set<string>>();
  const daysByUser = new Map<string, Set<string>>();
  const pageCounts = new Map<string, number>();
  const seriesMap = new Map(
    labels.map((label) => [
      label,
      {
        activeUsers: new Set<string>(),
        pageviews: 0,
        sessions: new Set<string>(),
      },
    ]),
  );
  const durations = viewsWithUser
    .map((view) => view.duration_seconds)
    .filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    );

  for (const view of viewsWithUser) {
    const userId = view.user_id as string;
    const dateKey = toDateKey(view.occurred_at);

    if (!sessionsByUser.has(userId)) sessionsByUser.set(userId, new Set());
    sessionsByUser.get(userId)?.add(view.session_id);

    if (!daysByUser.has(userId)) daysByUser.set(userId, new Set());
    daysByUser.get(userId)?.add(dateKey);

    const label = platformPageLabel(view);
    pageCounts.set(label, (pageCounts.get(label) ?? 0) + 1);

    const point = seriesMap.get(dateKey);
    if (point) {
      point.activeUsers.add(userId);
      point.sessions.add(view.session_id);
      point.pageviews += 1;
    }
  }

  const activeCount = users.size;
  const totalAccessDays = [...daysByUser.values()].reduce((sum, days) => sum + days.size, 0);
  const totalSessions = [...sessionsByUser.values()].reduce(
    (sum, sessions) => sum + sessions.size,
    0,
  );
  const durationCoverage = viewsWithUser.length > 0 ? durations.length / viewsWithUser.length : 0;
  const averageDuration =
    durationCoverage >= DURATION_RELIABILITY_THRESHOLD ? average(durations) : null;

  return {
    active_psychologists_count: activeCount,
    active_psychologists_rate:
      eligiblePsychologistsCount > 0
        ? roundOneDecimal((activeCount / eligiblePsychologistsCount) * 100)
        : null,
    average_access_days: activeCount > 0 ? roundOneDecimal(totalAccessDays / activeCount) : null,
    average_duration_seconds: averageDuration,
    average_sessions: activeCount > 0 ? roundOneDecimal(totalSessions / activeCount) : null,
    duration_unavailable_reason:
      viewsWithUser.length === 0
        ? "Sem pageviews autenticados de psicólogos no período."
        : averageDuration === null
          ? "Duração indisponível: menos de 50% dos pageviews têm duration_seconds confiável."
          : null,
    series: labels.map((label) => {
      const point = seriesMap.get(label);

      return {
        active_psychologists: point?.activeUsers.size ?? 0,
        date: label,
        pageviews: point?.pageviews ?? 0,
        sessions: point?.sessions.size ?? 0,
      };
    }),
    top_pages: [...pageCounts.entries()]
      .map(([label, count]) => ({
        count,
        label,
        percentage:
          viewsWithUser.length > 0 ? roundOneDecimal((count / viewsWithUser.length) * 100) : 0,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;

        return left.label.localeCompare(right.label, "pt-BR");
      })
      .slice(0, 6),
    unavailable_reason:
      viewsWithUser.length === 0
        ? "Sem uso autenticado de psicólogos no período selecionado."
        : null,
  };
};

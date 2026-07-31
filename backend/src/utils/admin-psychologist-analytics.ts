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
  conversion_rate: null;
  description: string;
  id: AdminPsychologistWhatsappTrafficOriginSourceId;
  label: string;
  percentage: number;
  platform_metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] | null;
  profile_views: number;
  sessions: number;
  whatsapp_clicks: number;
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

export type AdminPsychologistPlatformPeakActivityHour = {
  count: number;
  hour: number;
  label: string;
  percentage: number;
};

export type AdminPsychologistPlatformHourlyActivityPoint =
  AdminPsychologistPlatformPeakActivityHour & {
    accesses: number;
    engagement: number;
    posts: number;
    replies: number;
    reports: number;
    total: number;
  };

export type AdminPsychologistPlatformWeekdayHourlyActivity = {
  day: number;
  hours: AdminPsychologistPlatformHourlyActivityPoint[];
  label: string;
};

type AdminPsychologistPlatformDateActivity = {
  createdAt: Date;
};

type AdminPsychologistPlatformHourlyActivityInput = {
  engagementEvents: AdminPsychologistPlatformDateActivity[];
  pageViews: AdminPsychologistAnalyticsPageView[];
  posts: AdminPsychologistPlatformDateActivity[];
  replies: AdminPsychologistPlatformDateActivity[];
  reportEvents: AdminPsychologistPlatformDateActivity[];
};

type AdminPsychologistPlatformHourlyActivityMetric =
  | "accesses"
  | "engagement"
  | "posts"
  | "replies"
  | "reports";

const platformActivityHourLabel = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.trunc(hour)));
  const nextHour = (normalizedHour + 1) % 24;
  const formatHour = (value: number) => String(value).padStart(2, "0");

  return `${formatHour(normalizedHour)}h-${formatHour(nextHour)}h`;
};

const platformWeekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const emptyPlatformHourlyActivityPoint = (
  hour: number,
): AdminPsychologistPlatformHourlyActivityPoint => ({
  accesses: 0,
  count: 0,
  engagement: 0,
  hour,
  label: platformActivityHourLabel(hour),
  percentage: 0,
  posts: 0,
  replies: 0,
  reports: 0,
  total: 0,
});

const createPlatformHourlyActivityMap = () =>
  new Map(Array.from({ length: 24 }, (_, hour) => [hour, emptyPlatformHourlyActivityPoint(hour)]));

const finalizePlatformHourlyActivityMap = (
  hourly: Map<number, AdminPsychologistPlatformHourlyActivityPoint>,
  options: { includeEmpty?: boolean } = {},
) => {
  const points = [...hourly.values()];
  const total = points.reduce((sum, point) => sum + point.total, 0);
  if (total === 0 && !options.includeEmpty) return [];

  return points.map((point) => ({
    ...point,
    count: point.total,
    percentage: total > 0 ? roundOneDecimal((point.total / total) * 100) : 0,
  }));
};

const incrementPlatformHourlyActivity = (
  hourly: Map<number, AdminPsychologistPlatformHourlyActivityPoint>,
  date: Date,
  field: AdminPsychologistPlatformHourlyActivityMetric,
) => {
  const point = hourly.get(date.getHours());
  if (!point) return;

  point[field] += 1;
  point.total += 1;
};

const incrementPlatformHourlyActivityCollections = (
  hourly: Map<number, AdminPsychologistPlatformHourlyActivityPoint>,
  hourlyByWeekday: Map<
    number,
    {
      hours: Map<number, AdminPsychologistPlatformHourlyActivityPoint>;
      label: string;
    }
  >,
  date: Date,
  field: AdminPsychologistPlatformHourlyActivityMetric,
) => {
  incrementPlatformHourlyActivity(hourly, date, field);
  const weekday = hourlyByWeekday.get(date.getDay());
  if (weekday) incrementPlatformHourlyActivity(weekday.hours, date, field);
};

const buildPlatformHourlyActivityCollections = (
  input: AdminPsychologistPlatformHourlyActivityInput,
) => {
  const hourly = createPlatformHourlyActivityMap();
  const hourlyByWeekday = new Map(
    platformWeekdayLabels.map((label, day) => [
      day,
      {
        hours: createPlatformHourlyActivityMap(),
        label,
      },
    ]),
  );

  for (const view of input.pageViews) {
    if (!view.user_id) continue;
    incrementPlatformHourlyActivityCollections(
      hourly,
      hourlyByWeekday,
      view.occurred_at,
      "accesses",
    );
  }
  for (const post of input.posts) {
    incrementPlatformHourlyActivityCollections(hourly, hourlyByWeekday, post.createdAt, "posts");
  }
  for (const reply of input.replies) {
    incrementPlatformHourlyActivityCollections(hourly, hourlyByWeekday, reply.createdAt, "replies");
  }
  for (const event of input.engagementEvents) {
    incrementPlatformHourlyActivityCollections(
      hourly,
      hourlyByWeekday,
      event.createdAt,
      "engagement",
    );
  }
  for (const event of input.reportEvents) {
    incrementPlatformHourlyActivityCollections(hourly, hourlyByWeekday, event.createdAt, "reports");
  }

  return { hourly, hourlyByWeekday };
};

const summarizePlatformAccessHourlyActivity = (
  pageViews: AdminPsychologistAnalyticsPageView[],
): AdminPsychologistPlatformPeakActivityHour[] => {
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const countsByHour = Array.from({ length: 24 }, () => 0);

  for (const view of viewsWithUser) {
    const hour = view.occurred_at.getHours();
    countsByHour[hour] += 1;
  }

  const total = viewsWithUser.length;
  if (total === 0) return [];

  return countsByHour.map((count, hour) => ({
    count,
    hour,
    label: platformActivityHourLabel(hour),
    percentage: roundOneDecimal((count / total) * 100),
  }));
};

export const summarizePlatformHourlyActivity = (
  input: AdminPsychologistPlatformHourlyActivityInput,
): AdminPsychologistPlatformHourlyActivityPoint[] => {
  return finalizePlatformHourlyActivityMap(buildPlatformHourlyActivityCollections(input).hourly);
};

export const summarizePlatformHourlyActivityByWeekday = (
  input: AdminPsychologistPlatformHourlyActivityInput,
): AdminPsychologistPlatformWeekdayHourlyActivity[] => {
  const { hourlyByWeekday } = buildPlatformHourlyActivityCollections(input);
  const hasActivity = [...hourlyByWeekday.values()].some((item) =>
    [...item.hours.values()].some((point) => point.total > 0),
  );

  if (!hasActivity) return [];

  return [...hourlyByWeekday.entries()].map(([day, item]) => ({
    day,
    hours: finalizePlatformHourlyActivityMap(item.hours, { includeEmpty: true }),
    label: item.label,
  }));
};

export const summarizePlatformPeakActivityHours = (
  pageViews: AdminPsychologistAnalyticsPageView[],
): AdminPsychologistPlatformPeakActivityHour[] => {
  return summarizePlatformAccessHourlyActivity(pageViews)
    .filter((point) => point.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.hour - right.hour;
    })
    .slice(0, 4);
};

export const psychologistTrafficOriginDefinitions: Array<
  Pick<AdminPsychologistTrafficOriginSource, "description" | "id" | "label">
> = [
  {
    description: "Acessos originados pela página de psicólogos e navegação pelos vídeos.",
    id: "explore",
    label: "Explorar",
  },
  {
    description:
      "Acessos originados por pesquisas de nome, especialidades, abordagem, convênio e demais filtros.",
    id: "search_filters",
    label: "Busca e filtros",
  },
  {
    description:
      "Acessos originados por posts, comentários, respostas, ranking Top Mentor e demais interações dentro das comunidades.",
    id: "communities",
    label: "Comunidades",
  },
  {
    description: "Acessos originados por links compartilhados externamente.",
    id: "direct_link",
    label: "Link direto",
  },
  {
    description:
      "Acessos originados a partir da área de psicólogos favoritos, retorno de usuários que já favoritaram seu perfil antes.",
    id: "favorites",
    label: "Favoritos",
  },
];

export const trafficOriginFromPageViewSource = (
  source?: string | null,
): AdminPsychologistTrafficOriginSourceId => {
  const normalized = (source ?? "").trim().toLowerCase();

  if (normalized === "lectum_community") return "communities";
  if (normalized === "lectum_profile" || normalized === "lectum_internal") return "explore";

  return "direct_link";
};

export const summarizePsychologistTrafficOrigins = (
  pageViews: AdminPsychologistTrafficOriginPageView[],
) => {
  const groups = new Map<
    AdminPsychologistTrafficOriginSourceId,
    { profileViews: number; sessions: Set<string> }
  >(
    psychologistTrafficOriginDefinitions.map((source) => [
      source.id,
      { profileViews: 0, sessions: new Set<string>() },
    ]),
  );

  for (const pageView of pageViews) {
    const sourceId = trafficOriginFromPageViewSource(pageView.traffic_source);
    const current = groups.get(sourceId);
    if (!current) continue;

    current.profileViews += 1;
    current.sessions.add(pageView.session_id);
  }

  const totalProfileViews = pageViews.length;
  const totalSessions = new Set(pageViews.map((pageView) => pageView.session_id)).size;
  const maxProfileViews = Math.max(0, ...[...groups.values()].map((group) => group.profileViews));
  const primarySourceId =
    totalProfileViews > 0
      ? (psychologistTrafficOriginDefinitions.find(
          (definition) => (groups.get(definition.id)?.profileViews ?? 0) === maxProfileViews,
        )?.id ?? null)
      : null;
  const updatedAt =
    pageViews.length > 0
      ? pageViews.reduce<Date | null>(
          (latest, pageView) =>
            !latest || pageView.occurred_at > latest ? pageView.occurred_at : latest,
          null,
        )
      : null;

  const sources = psychologistTrafficOriginDefinitions.map((definition) => {
    const group = groups.get(definition.id);
    const profileViews = group?.profileViews ?? 0;

    return {
      ...definition,
      badge: definition.id === primarySourceId ? ("primary_source" as const) : null,
      conversion_rate: null,
      percentage:
        totalProfileViews > 0 ? roundOneDecimal((profileViews / totalProfileViews) * 100) : 0,
      profile_views: profileViews,
      sessions: group?.sessions.size ?? 0,
      whatsapp_clicks: null,
    };
  });

  return {
    attribution_unavailable_reason:
      "Cliques no WhatsApp por origem ainda não têm atribuição first-party persistida; a tabela exibe visualizações reais dos perfis por origem.",
    description: "Entenda quais canais levam pacientes aos perfis públicos dos psicólogos.",
    sources,
    total_profile_views: totalProfileViews,
    total_sessions: totalSessions,
    unavailable_reason:
      totalProfileViews > 0
        ? null
        : "Nenhuma visita a perfil público de psicólogo com origem de tráfego foi registrada no período.",
    updated_at: updatedAt,
  };
};

const psychologistWhatsappTrafficOriginDefinitions: Array<
  Pick<AdminPsychologistWhatsappTrafficOriginSource, "description" | "id" | "label">
> = [
  {
    description: "Cliques realizados no CTA de WhatsApp dentro do perfil público do psicólogo.",
    id: "profile",
    label: "Perfil",
  },
  {
    description: "Cliques originados pela página de psicólogos e navegação pelos vídeos.",
    id: "explore",
    label: "Explorar",
  },
  {
    description:
      "Cliques originados após pesquisas de nome, especialidades, abordagem, convênio e demais filtros.",
    id: "search_filters",
    label: "Busca e filtros",
  },
  {
    description:
      "Cliques originados na área de psicólogos favoritos de usuários que já favoritaram perfis antes.",
    id: "favorites",
    label: "Favoritos",
  },
  {
    description: "Cliques em CTAs de posts profissionais com vídeo nas comunidades.",
    id: "community_post_video",
    label: "Comunidades · Posts com vídeo",
  },
  {
    description: "Cliques em CTAs de posts profissionais sem vídeo nas comunidades.",
    id: "community_post_text",
    label: "Comunidades · Posts sem vídeo",
  },
  {
    description: "Cliques em CTAs de respostas profissionais com vídeo nas comunidades.",
    id: "community_reply_video",
    label: "Comunidades · Respostas com vídeo",
  },
  {
    description: "Cliques em CTAs de respostas profissionais sem vídeo nas comunidades.",
    id: "community_reply_text",
    label: "Comunidades · Respostas sem vídeo",
  },
  {
    description: "Cliques originados pela navegação do Ranking Top Mentores.",
    id: "community_top_mentors",
    label: "Comunidades · Ranking Top Mentores",
  },
];

const WHATSAPP_TRAFFIC_DEFINITION_INDEX = new Map(
  psychologistWhatsappTrafficOriginDefinitions.map((definition, index) => [definition.id, index]),
);

const SEARCH_FILTER_TRAFFIC_PARAMS = new Set([
  "accepts_insurance",
  "approach",
  "available_today",
  "city",
  "discount_first_session",
  "gender",
  "language",
  "modality",
  "q",
  "race_color",
  "religion",
  "search",
  "service",
  "social_value",
  "specialty",
  "state",
  "target_audience",
]);

const normalizeTrafficActionPath = (path: string | null) => (path ?? "").toLowerCase();

const trafficActionPathIncludes = (action: AdminPsychologistWhatsappTrafficAction, value: string) =>
  normalizeTrafficActionPath(action.path).includes(value);

export const hasSearchFilterTrafficParams = (path: string | null) => {
  if (!path?.includes("?")) return false;

  try {
    const url = new URL(path, "https://lectum.local");

    return [...url.searchParams.entries()].some(([key, value]) => {
      if (!SEARCH_FILTER_TRAFFIC_PARAMS.has(key)) return false;

      const normalizedValue = value.trim().toLowerCase();
      return normalizedValue !== "" && normalizedValue !== "false";
    });
  } catch {
    return false;
  }
};

const isCommunityPostTarget = (targetType: string | null) =>
  targetType === "community_post" || targetType === "post";

const isCommunityReplyTarget = (targetType: string | null) =>
  targetType === "post_reply" || targetType === "reply";

const hasVideoMedia = (
  record:
    | AdminPsychologistWhatsappTrafficCommunityPost
    | AdminPsychologistWhatsappTrafficCommunityReply
    | null
    | undefined,
) => {
  if (!record) return false;
  if (record.media_type === "video") return true;

  return (
    "media_items" in record &&
    (record.media_items?.some((item) => item.media_type === "video") ?? false)
  );
};

const resolveWhatsappTrafficPsychologistId = (
  action: AdminPsychologistWhatsappTrafficAction,
  postsById: Map<string, AdminPsychologistWhatsappTrafficCommunityPost>,
  repliesById: Map<string, AdminPsychologistWhatsappTrafficCommunityReply>,
) => {
  const targetId = action.target_id;
  const targetType = action.target_type;

  if (targetType === "psychologist" && targetId) return targetId;
  if (targetId && isCommunityPostTarget(targetType))
    return postsById.get(targetId)?.author_id ?? null;
  if (targetId && isCommunityReplyTarget(targetType)) {
    return repliesById.get(targetId)?.author_id ?? null;
  }

  return null;
};

const classifyWhatsappTrafficAction = (
  action: AdminPsychologistWhatsappTrafficAction,
  postsById: Map<string, AdminPsychologistWhatsappTrafficCommunityPost>,
  repliesById: Map<string, AdminPsychologistWhatsappTrafficCommunityReply>,
): AdminPsychologistWhatsappTrafficOriginSourceId | null => {
  const targetId = action.target_id;
  const targetType = action.target_type;

  if (trafficActionPathIncludes(action, "/community/top-mentors")) return "community_top_mentors";

  if (targetId && isCommunityPostTarget(targetType)) {
    return hasVideoMedia(postsById.get(targetId)) ? "community_post_video" : "community_post_text";
  }

  if (targetId && isCommunityReplyTarget(targetType)) {
    return hasVideoMedia(repliesById.get(targetId))
      ? "community_reply_video"
      : "community_reply_text";
  }

  if (
    trafficActionPathIncludes(action, "/favorites") ||
    trafficActionPathIncludes(action, "/favoritos")
  ) {
    return "favorites";
  }

  if (action.page_kind === "psychologist_profile") return "profile";

  if (action.page_kind === "psychologists" && hasSearchFilterTrafficParams(action.path)) {
    return "search_filters";
  }

  if (
    action.action_type === "psychologist_video_whatsapp_click" ||
    action.page_kind === "psychologists"
  ) {
    return "explore";
  }

  return null;
};

export const summarizePsychologistWhatsappTrafficOrigins = (params: {
  actions: AdminPsychologistWhatsappTrafficAction[];
  allowedPsychologistIds?: Set<string> | null;
  communityPlatformMetrics?: Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    AdminPsychologistWhatsappTrafficPlatformMetric[]
  > | null;
  communityPosts: AdminPsychologistWhatsappTrafficCommunityPost[];
  communityReplies: AdminPsychologistWhatsappTrafficCommunityReply[];
}) => {
  const postsById = new Map(params.communityPosts.map((post) => [post.id, post]));
  const repliesById = new Map(params.communityReplies.map((reply) => [reply.id, reply]));
  const groups = new Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    { sessions: Set<string>; whatsappClicks: number }
  >(
    psychologistWhatsappTrafficOriginDefinitions.map((source) => [
      source.id,
      { sessions: new Set<string>(), whatsappClicks: 0 },
    ]),
  );

  for (const action of params.actions) {
    const sourceId = classifyWhatsappTrafficAction(action, postsById, repliesById);
    if (!sourceId) continue;

    if (params.allowedPsychologistIds) {
      const psychologistId = resolveWhatsappTrafficPsychologistId(action, postsById, repliesById);
      if (!psychologistId || !params.allowedPsychologistIds.has(psychologistId)) continue;
    }

    const group = groups.get(sourceId);
    if (!group) continue;

    group.whatsappClicks += 1;
    group.sessions.add(action.session_id);
  }

  const totalWhatsappClicks = [...groups.values()].reduce(
    (sum, group) => sum + group.whatsappClicks,
    0,
  );
  const totalSessions = new Set(
    [...groups.values()].flatMap((group) => [...group.sessions.values()]),
  ).size;
  const maxWhatsappClicks = Math.max(
    0,
    ...[...groups.values()].map((group) => group.whatsappClicks),
  );
  const primarySourceId =
    totalWhatsappClicks > 0
      ? (psychologistWhatsappTrafficOriginDefinitions.find(
          (definition) => (groups.get(definition.id)?.whatsappClicks ?? 0) === maxWhatsappClicks,
        )?.id ?? null)
      : null;
  const updatedAt =
    params.actions.length > 0
      ? params.actions.reduce<Date | null>(
          (latest, action) =>
            !latest || action.occurred_at > latest ? action.occurred_at : latest,
          null,
        )
      : null;

  const sources = psychologistWhatsappTrafficOriginDefinitions
    .map((definition) => {
      const group = groups.get(definition.id);
      const whatsappClicks = group?.whatsappClicks ?? 0;

      return {
        ...definition,
        badge: definition.id === primarySourceId ? ("primary_source" as const) : null,
        conversion_rate: null,
        percentage:
          totalWhatsappClicks > 0
            ? roundOneDecimal((whatsappClicks / totalWhatsappClicks) * 100)
            : 0,
        platform_metrics: params.communityPlatformMetrics?.get(definition.id) ?? null,
        profile_views: 0,
        sessions: group?.sessions.size ?? 0,
        whatsapp_clicks: whatsappClicks,
      };
    })
    .sort((left, right) => {
      if (right.whatsapp_clicks !== left.whatsapp_clicks) {
        return right.whatsapp_clicks - left.whatsapp_clicks;
      }

      return (
        (WHATSAPP_TRAFFIC_DEFINITION_INDEX.get(left.id) ?? 0) -
        (WHATSAPP_TRAFFIC_DEFINITION_INDEX.get(right.id) ?? 0)
      );
    });

  return {
    attribution_unavailable_reason:
      "A origem dos cliques usa eventos first-party de WhatsApp; cliques sem evento de ação importante não entram nesta tabela por origem.",
    description: "Entenda em quais superfícies os pacientes clicam no WhatsApp dos psicólogos.",
    sources,
    total_profile_views: 0,
    total_sessions: totalSessions,
    unavailable_reason:
      totalWhatsappClicks > 0
        ? null
        : "Nenhum clique de WhatsApp com origem first-party foi registrado no período.",
    updated_at: updatedAt,
  };
};

export const summarizePlatformUsage = (params: {
  eligiblePsychologistsCount?: number;
  labels?: string[];
  pageViews: AdminPsychologistAnalyticsPageView[];
  pwaInstalledUserIds?: string[];
}) => {
  const {
    eligiblePsychologistsCount = 0,
    labels = [],
    pageViews,
    pwaInstalledUserIds = [],
  } = params;
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const users = new Set(viewsWithUser.map((view) => view.user_id as string));
  const pwaInstalledUsers = new Set(pwaInstalledUserIds.filter(Boolean));
  const sessionsByUser = new Map<string, Set<string>>();
  const daysByUser = new Map<string, Set<string>>();
  const pageMetrics = new Map<
    string,
    {
      count: number;
      durationSamplesCount: number;
      durationTotalSeconds: number;
      label: string;
    }
  >();
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
    const pageMetric = pageMetrics.get(label) ?? {
      count: 0,
      durationSamplesCount: 0,
      durationTotalSeconds: 0,
      label,
    };
    const durationSeconds =
      typeof view.duration_seconds === "number" &&
      Number.isFinite(view.duration_seconds) &&
      view.duration_seconds > 0
        ? view.duration_seconds
        : null;

    pageMetric.count += 1;
    if (durationSeconds !== null) {
      pageMetric.durationSamplesCount += 1;
      pageMetric.durationTotalSeconds += durationSeconds;
    }
    pageMetrics.set(label, pageMetric);

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
    pwa_installed_psychologists_count: pwaInstalledUsers.size,
    pwa_installed_psychologists_rate:
      eligiblePsychologistsCount > 0
        ? roundOneDecimal((pwaInstalledUsers.size / eligiblePsychologistsCount) * 100)
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
    top_pages: [...pageMetrics.values()]
      .map((page) => ({
        count: page.count,
        label: page.label,
        percentage:
          viewsWithUser.length > 0 ? roundOneDecimal((page.count / viewsWithUser.length) * 100) : 0,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;

        return left.label.localeCompare(right.label, "pt-BR");
      })
      .slice(0, 6),
    top_pages_by_average_duration: [...pageMetrics.values()]
      .filter((page) => page.durationSamplesCount > 0)
      .map((page) => ({
        average_duration_seconds: roundOneDecimal(
          page.durationTotalSeconds / page.durationSamplesCount,
        ),
        count: page.count,
        duration_samples_count: page.durationSamplesCount,
        label: page.label,
      }))
      .sort((left, right) => {
        if (right.average_duration_seconds !== left.average_duration_seconds) {
          return right.average_duration_seconds - left.average_duration_seconds;
        }
        if (right.duration_samples_count !== left.duration_samples_count) {
          return right.duration_samples_count - left.duration_samples_count;
        }
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

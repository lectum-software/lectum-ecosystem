import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { diagnoseAdminCommunityEngagement } from "@/utils/admin-community-engagement-diagnosis";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type {
  AdminPatientDetailActivityItem,
  AdminPatientDetailCommunity,
  AdminPatientDetailDateRange,
  AdminPatientDetailDTO,
  AdminPatientDetailHeatmapCell,
  AdminPatientDetailMetric,
  AdminPatientDetailPeriod,
  AdminPatientDetailPublicationItem,
  AdminPatientDetailPublicationMetric,
  AdminPatientDetailQuery,
  AdminPatientDetailSeriesPoint,
  AdminPatientIntentAnalysis,
  AdminPatientIntentMetric,
  AdminPatientPlatformUsage,
  IAdminPatientDetailDTO,
} from "../DTOs/IAdminPatientDetailDTO";
import {
  type AdminPatientDetailPlatformPageViewRecord,
  type AdminPatientDetailPlatformSessionRecord,
  type AdminPatientDetailRecord,
  AdminPatientDetailRepository,
  type AdminPatientEngagementBundle,
} from "../repositories/AdminPatientDetailRepository";

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;
const DURATION_RELIABILITY_THRESHOLD = 0.5;
const TIMEZONE = "America/Sao_Paulo" as const;
const HEATMAP_DAYS = [
  { id: "mon", label: "Seg" },
  { id: "tue", label: "Ter" },
  { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" },
  { id: "fri", label: "Sex" },
  { id: "sat", label: "Sáb" },
  { id: "sun", label: "Dom" },
] as const;
const HEATMAP_HOURS = [0, 4, 8, 12, 16, 20] as const;
const PATIENT_PAGE_KIND_LABELS: Record<string, string> = {
  community: "Comunidades",
  community_post: "Comunidades",
  home: "Início",
  login: "Login",
  psychologist_profile: "Psicólogos",
  psychologists: "Psicólogos",
  signup: "Cadastro",
};
const PLATFORM_DEVICE_TYPES = ["desktop", "mobile", "tablet", "unknown"] as const;
type PlatformDeviceType = (typeof PLATFORM_DEVICE_TYPES)[number];
const PLATFORM_DEVICE_LABELS: Record<PlatformDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
};
const PLATFORM_WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const PATIENT_INTENT_SOURCE = "profile_view_event+psychologist_favorite+contact_request" as const;
const PATIENT_INTENT_METRIC_SOURCES = {
  favorites: "psychologist_favorite.user_id",
  profile_views: "profile_view_event.viewer_id+source=profile_page",
  repeated_profile_views: "profile_view_event.viewer_id+psychologist_id",
  whatsapp_clicks: "contact_request.user_id+channel=whatsapp",
} as const;
const PATIENT_INTENT_SCORE_WEIGHTS = {
  favorites: 20,
  profile_views: 3,
  repeated_profile_views: 5,
  whatsapp_clicks: 45,
} as const satisfies Record<AdminPatientIntentMetric["id"], number>;
const PATIENT_INTENT_SCORE_CAPS = {
  favorites: 40,
  profile_views: 30,
  repeated_profile_views: 20,
  whatsapp_clicks: 90,
} as const satisfies Record<AdminPatientIntentMetric["id"], number>;

type PeriodResolution = {
  current: AdminPatientDetailDateRange;
  days: number;
  labels: string[];
  period: AdminPatientDetailPeriod;
  previous: AdminPatientDetailDateRange;
};

type PeriodResult =
  | {
      period: PeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

type EngagementCounts = {
  comments_created: number;
  downvotes_received: number;
  posts_created: number;
  reports_received: number;
  saves_received: number;
  shares_received: number;
  verified_psychologist_responses: number;
  upvotes_received: number;
};

type PatientIntentSignals = Awaited<ReturnType<AdminPatientDetailRepository["listIntentSignals"]>>;

type PatientIntentCounts = {
  favorites: number;
  profile_views: number;
  repeated_profile_views: number;
  whatsapp_clicks: number;
};

type CommunityLike = {
  avatar_url: string | null;
  id: string;
  name: string;
  slug: string;
  visual_primary_color: string | null;
};

const providerLabel = (provider: string) =>
  provider.trim().toLowerCase() === "google" ? "Google" : "E-mail e senha";

const WEEKDAY_INDEX: Record<string, number> = {
  Fri: 4,
  Mon: 0,
  Sat: 5,
  Sun: 6,
  Thu: 3,
  Tue: 1,
  Wed: 2,
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);

  return next;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const pad = (value: number) => String(value).padStart(2, "0");

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return boundary === "start" ? startOfDate(date) : endOfDate(date);
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

const buildLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const resolvePeriod = (query: AdminPatientDetailQuery, allPeriodStartDate?: Date): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "\u00daltimos 30 dias";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
    label = "Per\u00edodo personalizado";
  } else if (preset === "today") {
    const today = new Date();
    start = startOfDate(today);
    end = endOfDate(today);
    label = "Hoje";
  } else if (preset === "week") {
    const today = new Date();
    start = startOfWeek(today);
    end = endOfDate(today);
    label = "Esta semana";
  } else if (preset === "month") {
    const today = new Date();
    start = startOfMonth(today);
    end = endOfDate(today);
    label = "Este m\u00eas";
  } else if (preset === "year") {
    const today = new Date();
    start = startOfYear(today);
    end = endOfDate(today);
    label = "Este ano";
  } else if (preset === "all") {
    const today = new Date();
    start = startOfDate(allPeriodStartDate ?? addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
    end = endOfDate(today);
    label = "Todo o per\u00edodo";
  } else if (preset) {
    return { success: false, code: "invalid_analytics_date_range" };
  } else {
    const today = new Date();
    end = endOfDate(today);
    start = startOfDate(addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const previousEnd = endOfDate(addDays(start, -1));
  const previousStart = startOfDate(addDays(start, -days));

  return {
    success: true,
    period: {
      current: { start, end },
      days,
      labels: buildLabels(start, days),
      period: {
        days,
        from: toDateKey(start),
        label,
        max_days: MAX_PERIOD_DAYS,
        previous_from: toDateKey(previousStart),
        previous_to: toDateKey(previousEnd),
        timezone: TIMEZONE,
        to: toDateKey(end),
      },
      previous: { start: previousStart, end: previousEnd },
    },
  };
};

const roundPercent = (value: number) => Math.round(value * 10) / 10;
const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

const normalizePlatformDeviceType = (value: string | null | undefined): PlatformDeviceType => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

const buildPlatformDeviceUsage = (sessions: AdminPatientDetailPlatformSessionRecord[]) => {
  const counts: Record<PlatformDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };

  for (const session of sessions) {
    counts[normalizePlatformDeviceType(session.device_type)] += 1;
  }

  const totalSessions = sessions.length;

  return {
    items: PLATFORM_DEVICE_TYPES.map((deviceType) => ({
      count: counts[deviceType],
      device_type: deviceType,
      id: deviceType,
      label: PLATFORM_DEVICE_LABELS[deviceType],
      percentage:
        totalSessions > 0 ? roundOneDecimal((counts[deviceType] / totalSessions) * 100) : 0,
    })).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    }),
    source: "visitor_session.device_type+user_id" as const,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas do paciente por dispositivo no período selecionado."
        : null,
  };
};

const latestPlatformAccessAt = (params: {
  pageViews: Array<{ occurred_at: Date }>;
  sessions: Array<{ last_seen_at: Date }>;
}) => {
  const dates = [
    ...params.pageViews.map((view) => view.occurred_at),
    ...params.sessions.map((session) => session.last_seen_at),
  ];

  return dates.reduce<Date | null>(
    (latest, current) => (!latest || current > latest ? current : latest),
    null,
  );
};

const average = (values: number[]) => {
  if (values.length === 0) return null;

  return roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const metric = (params: {
  current: number;
  description: string;
  id: AdminPatientDetailMetric["id"];
  label: string;
  previous: number;
  source: string;
}): AdminPatientDetailMetric => {
  const change = percentageChange(params.current, params.previous);

  return {
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    source: params.source,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    unit: "count",
    value: params.current,
  };
};

const uniqueCount = <T>(items: T[], getKey: (item: T) => string | null | undefined) =>
  new Set(items.map(getKey).filter((value): value is string => Boolean(value))).size;

const scoreContribution = (metricId: AdminPatientIntentMetric["id"], value: number) =>
  Math.min(
    PATIENT_INTENT_SCORE_CAPS[metricId],
    Math.max(0, value) * PATIENT_INTENT_SCORE_WEIGHTS[metricId],
  );

const patientIntentMetric = (params: {
  current: number;
  description: string;
  id: AdminPatientIntentMetric["id"];
  label: string;
  previous: number;
}): AdminPatientIntentMetric => {
  const change = percentageChange(params.current, params.previous);

  return {
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    score_contribution: scoreContribution(params.id, params.current),
    score_weight: PATIENT_INTENT_SCORE_WEIGHTS[params.id],
    source: PATIENT_INTENT_METRIC_SOURCES[params.id],
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    unit: "count",
    value: params.current,
  };
};

const countsFromIntentSignals = (signals: PatientIntentSignals): PatientIntentCounts => {
  const uniqueProfileViews = uniqueCount(signals.profileViews, (view) => view.psychologist_id);

  return {
    favorites: signals.favorites.length,
    profile_views: signals.profileViews.length,
    repeated_profile_views: Math.max(0, signals.profileViews.length - uniqueProfileViews),
    whatsapp_clicks: signals.whatsappClicks.length,
  };
};

const latestIntentSignalAt = (signals: PatientIntentSignals) =>
  [...signals.profileViews, ...signals.favorites, ...signals.whatsappClicks].reduce<Date | null>(
    (latest, signal) => (!latest || signal.createdAt > latest ? signal.createdAt : latest),
    null,
  );

const patientIntentLevel = (
  score: number,
  counts: PatientIntentCounts,
): AdminPatientIntentAnalysis["level"] => {
  if (score <= 0) {
    return {
      id: "no_signals",
      label: "Sem sinais",
      tone: "neutral",
    };
  }

  if (counts.whatsapp_clicks > 0 || score >= 45) {
    return {
      id: "high",
      label: "Alta intenção",
      tone: "hot",
    };
  }

  if (counts.favorites > 0 || score >= 20) {
    return {
      id: "medium",
      label: "Média intenção",
      tone: "warm",
    };
  }

  return {
    id: "low",
    label: "Baixa intenção",
    tone: "cool",
  };
};

const patientIntentSummary = (
  level: AdminPatientIntentAnalysis["level"],
  counts: PatientIntentCounts,
) => {
  if (level.id === "high") {
    return counts.whatsapp_clicks > 0
      ? "Paciente já acionou o CTA de WhatsApp no período, sinal forte de intenção de contato."
      : "Paciente combina múltiplos sinais de exploração e consideração no período.";
  }

  if (level.id === "medium") {
    return counts.favorites > 0
      ? "Paciente favoritou psicólogo(s) e demonstra consideração ativa antes do contato."
      : "Paciente demonstra exploração recorrente de perfis, mas ainda sem sinal forte de contato.";
  }

  if (level.id === "low") {
    return "Paciente abriu perfil(is) de psicólogos, mas ainda sem favorito ou clique no WhatsApp no período.";
  }

  return "Sem sinais reais de intenção de contato do paciente no período selecionado.";
};

const buildPatientIntentAnalysis = (
  currentSignals: PatientIntentSignals,
  previousSignals: PatientIntentSignals,
): AdminPatientIntentAnalysis => {
  const currentCounts = countsFromIntentSignals(currentSignals);
  const previousCounts = countsFromIntentSignals(previousSignals);
  const metrics: AdminPatientIntentMetric[] = [
    patientIntentMetric({
      current: currentCounts.profile_views,
      description: "Aberturas reais de perfis públicos de psicólogos pelo paciente.",
      id: "profile_views",
      label: "Perfis abertos",
      previous: previousCounts.profile_views,
    }),
    patientIntentMetric({
      current: currentCounts.favorites,
      description: "Psicólogos favoritados pelo paciente e ainda ativos no período.",
      id: "favorites",
      label: "Psicólogos favoritados",
      previous: previousCounts.favorites,
    }),
    patientIntentMetric({
      current: currentCounts.whatsapp_clicks,
      description: "Cliques reais no CTA de WhatsApp para psicólogos.",
      id: "whatsapp_clicks",
      label: "Cliques no WhatsApp",
      previous: previousCounts.whatsapp_clicks,
    }),
    patientIntentMetric({
      current: currentCounts.repeated_profile_views,
      description: "Aberturas repetidas em perfis de psicólogos já vistos no período.",
      id: "repeated_profile_views",
      label: "Retornos ao mesmo perfil",
      previous: previousCounts.repeated_profile_views,
    }),
  ];
  const score = Math.min(
    100,
    Math.round(metrics.reduce((total, item) => total + item.score_contribution, 0)),
  );
  const level = patientIntentLevel(score, currentCounts);

  return {
    coverage_note:
      "A análise usa apenas sinais reais de descoberta e contato dentro do site; o destino máximo observado é o clique no WhatsApp.",
    last_signal_at: latestIntentSignalAt(currentSignals),
    level,
    max_score: 100,
    metrics,
    privacy_note:
      "Indicador interno do Admin; não é exibido a pacientes ou psicólogos e não infere sessão, atendimento, diagnóstico ou conteúdo de conversa.",
    score,
    source: PATIENT_INTENT_SOURCE,
    summary: patientIntentSummary(level, currentCounts),
    total_signals:
      currentCounts.profile_views + currentCounts.favorites + currentCounts.whatsapp_clicks,
    unique_psychologists_contacted: uniqueCount(
      currentSignals.whatsappClicks,
      (click) => click.psychologist_id,
    ),
    unique_psychologists_favorited: uniqueCount(
      currentSignals.favorites,
      (favorite) => favorite.psychologist_id,
    ),
    unique_psychologists_viewed: uniqueCount(
      currentSignals.profileViews,
      (view) => view.psychologist_id,
    ),
  };
};

const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Paciente";

const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

const postUrl = (post: { community: { slug: string }; id: string }) =>
  `/community/${post.community.slug}/post/${post.id}`;

const replyUrl = (reply: { id: string; post: { community: { slug: string }; id: string } }) =>
  `/community/${reply.post.community.slug}/post/${reply.post.id}/thread/${reply.id}`;

const voteTargetUrl = (vote: AdminPatientEngagementBundle["votesMade"][number]) => {
  if (vote.reply) return replyUrl(vote.reply);
  if (vote.post) return postUrl(vote.post);

  return null;
};

const voteTargetTitle = (vote: AdminPatientEngagementBundle["votesMade"][number]) => {
  if (vote.reply) return vote.reply.post.title;
  if (vote.post) return vote.post.title;

  return "conteúdo";
};

const isVerifiedPsychologistResponse = (
  reply: AdminPatientEngagementBundle["responsesReceived"][number],
) =>
  reply.author.role === "psicologo" &&
  isVerifiedProfessionalEntitlement(reply.author.psychologist_profile);

const countsFromBundle = (bundle: AdminPatientEngagementBundle): EngagementCounts => ({
  comments_created: bundle.replies.length,
  downvotes_received: bundle.votesReceived.filter((vote) => vote.value < 0).length,
  posts_created: bundle.posts.length,
  reports_received: bundle.reportsReceived.length,
  saves_received: bundle.postSavesReceived.length + bundle.replySavesReceived.length,
  shares_received: bundle.sharesReceived.length,
  verified_psychologist_responses: bundle.responsesReceived.filter(isVerifiedPsychologistResponse)
    .length,
  upvotes_received: bundle.votesReceived.filter((vote) => vote.value > 0).length,
});

const buildMetrics = (
  current: EngagementCounts,
  previous: EngagementCounts,
): AdminPatientDetailMetric[] => [
  metric({
    current: current.posts_created,
    description: "Posts publicados pelo paciente no período.",
    id: "posts_created",
    label: "Posts",
    previous: previous.posts_created,
    source: "community_post.author_id",
  }),
  metric({
    current: current.comments_created,
    description: "Comentários e respostas criados pelo paciente no período.",
    id: "comments_created",
    label: "Comentários totais",
    previous: previous.comments_created,
    source: "post_reply.author_id",
  }),
  metric({
    current: current.verified_psychologist_responses,
    description: "Respostas reais de psicólogos verificados em posts ou comentários do paciente.",
    id: "verified_psychologist_responses",
    label: "Respostas de psicólogos verificados",
    previous: previous.verified_psychologist_responses,
    source: "post_reply.author com psicólogo verificado",
  }),
  metric({
    current: current.reports_received,
    description: "Denúncias reais recebidas em posts ou comentários do paciente.",
    id: "reports_received",
    label: "Denúncias recebidas",
    previous: previous.reports_received,
    source: "post_report em conteúdo do paciente",
  }),
  metric({
    current: current.upvotes_received,
    description: "Votos positivos recebidos em posts e respostas do paciente.",
    id: "upvotes_received",
    label: "Upvotes",
    previous: previous.upvotes_received,
    source: "post_vote.value>0 em conteúdo do paciente",
  }),
  metric({
    current: current.downvotes_received,
    description: "Votos negativos recebidos em posts e respostas do paciente.",
    id: "downvotes_received",
    label: "Downvotes",
    previous: previous.downvotes_received,
    source: "post_vote.value<0 em conteúdo do paciente",
  }),
  metric({
    current: current.saves_received,
    description: "Salvamentos recebidos em posts e respostas do paciente.",
    id: "saves_received",
    label: "Salvamentos",
    previous: previous.saves_received,
    source: "post_save+post_reply_save em conteúdo do paciente",
  }),
  metric({
    current: current.shares_received,
    description: "Compartilhamentos recebidos em posts e respostas do paciente.",
    id: "shares_received",
    label: "Compartilhamentos",
    previous: previous.shares_received,
    source: "post_share em conteúdo do paciente",
  }),
];

const dateKeyInTimeZone = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIMEZONE,
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
};

const buildSeries = (
  labels: string[],
  bundle: AdminPatientEngagementBundle,
): AdminPatientDetailSeriesPoint[] => {
  const emptyPoint = (date: string): AdminPatientDetailSeriesPoint => ({
    comments_created: 0,
    date,
    downvotes_received: 0,
    posts_created: 0,
    saves_received: 0,
    shares_received: 0,
    verified_psychologist_responses: 0,
    upvotes_received: 0,
  });
  const points = new Map(labels.map((label) => [label, emptyPoint(label)]));
  const increment = (date: Date, key: keyof Omit<AdminPatientDetailSeriesPoint, "date">) => {
    const dateKey = dateKeyInTimeZone(date);
    const point = points.get(dateKey);
    if (!point) return;
    point[key] += 1;
  };

  for (const post of bundle.posts) increment(post.createdAt, "posts_created");
  for (const reply of bundle.replies) increment(reply.createdAt, "comments_created");
  for (const vote of bundle.votesReceived) {
    if (vote.value > 0) increment(vote.createdAt, "upvotes_received");
    if (vote.value < 0) increment(vote.createdAt, "downvotes_received");
  }
  for (const reply of bundle.responsesReceived.filter(isVerifiedPsychologistResponse)) {
    increment(reply.createdAt, "verified_psychologist_responses");
  }
  for (const save of bundle.postSavesReceived) increment(save.createdAt, "saves_received");
  for (const save of bundle.replySavesReceived) increment(save.createdAt, "saves_received");
  for (const share of bundle.sharesReceived) increment(share.createdAt, "shares_received");

  return labels.map((label) => points.get(label) ?? emptyPoint(label));
};

const patientPlatformPageLabel = (view: AdminPatientDetailPlatformPageViewRecord) => {
  const path = (view.normalized_path || view.path || "/").split("?")[0] ?? "/";
  const segments = path.split("/").filter(Boolean);
  const joined = segments.join("/");

  if (joined.includes("post")) return "Posts";
  if (joined.includes("community")) return "Comunidades";
  if (joined.includes("favorite") || joined.includes("favoritos")) return "Favoritos";
  if (joined.includes("notification") || joined.includes("notificacoes")) return "Notificações";
  if (
    joined.includes("settings") ||
    joined.includes("configuracoes") ||
    joined.includes("account")
  ) {
    return "Configurações";
  }
  if (joined.includes("psychologist") || joined.includes("psicologo")) return "Psicólogos";
  if (joined.includes("profile") || joined.includes("perfil")) return "Perfil";
  if (joined.startsWith("app")) return "Área do paciente";

  return PATIENT_PAGE_KIND_LABELS[view.page_kind] ?? "Outras páginas";
};

const platformActivityHourLabel = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.trunc(hour)));
  const nextHour = (normalizedHour + 1) % 24;

  return `${pad(normalizedHour)}h-${pad(nextHour)}h`;
};

type PatientPlatformActivityMetric = "accesses" | "engagement" | "posts" | "replies" | "reviews";

type PatientPlatformDateActivity = {
  createdAt: Date;
};

type PatientPlatformHourlyActivityInput = {
  engagementEvents: PatientPlatformDateActivity[];
  pageViews: AdminPatientDetailPlatformPageViewRecord[];
  posts: PatientPlatformDateActivity[];
  replies: PatientPlatformDateActivity[];
  reviews: PatientPlatformDateActivity[];
};

const emptyPlatformHourlyActivityPoint = (
  hour: number,
): AdminPatientPlatformUsage["hourly_activity"][number] => ({
  accesses: 0,
  count: 0,
  engagement: 0,
  hour,
  label: platformActivityHourLabel(hour),
  percentage: 0,
  posts: 0,
  replies: 0,
  reviews: 0,
  total: 0,
});

const createPlatformHourlyActivityMap = () =>
  new Map(Array.from({ length: 24 }, (_, hour) => [hour, emptyPlatformHourlyActivityPoint(hour)]));

const finalizePlatformHourlyActivityMap = (
  hourly: Map<number, AdminPatientPlatformUsage["hourly_activity"][number]>,
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
  hourly: Map<number, AdminPatientPlatformUsage["hourly_activity"][number]>,
  date: Date,
  field: PatientPlatformActivityMetric,
) => {
  const point = hourly.get(date.getHours());
  if (!point) return;

  point[field] += 1;
  point.total += 1;
};

const incrementPlatformHourlyActivityCollections = (
  hourly: Map<number, AdminPatientPlatformUsage["hourly_activity"][number]>,
  hourlyByWeekday: Map<
    number,
    {
      hours: Map<number, AdminPatientPlatformUsage["hourly_activity"][number]>;
      label: string;
    }
  >,
  date: Date,
  field: PatientPlatformActivityMetric,
) => {
  incrementPlatformHourlyActivity(hourly, date, field);
  const weekday = hourlyByWeekday.get(date.getDay());
  if (weekday) incrementPlatformHourlyActivity(weekday.hours, date, field);
};

const buildPlatformHourlyActivityCollections = (input: PatientPlatformHourlyActivityInput) => {
  const hourly = createPlatformHourlyActivityMap();
  const hourlyByWeekday = new Map(
    PLATFORM_WEEKDAY_LABELS.map((label, day) => [
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
  for (const review of input.reviews) {
    incrementPlatformHourlyActivityCollections(
      hourly,
      hourlyByWeekday,
      review.createdAt,
      "reviews",
    );
  }

  return { hourly, hourlyByWeekday };
};

const summarizePlatformHourlyActivity = (
  input: PatientPlatformHourlyActivityInput,
): AdminPatientPlatformUsage["hourly_activity"] =>
  finalizePlatformHourlyActivityMap(buildPlatformHourlyActivityCollections(input).hourly);

const summarizePlatformHourlyActivityByWeekday = (
  input: PatientPlatformHourlyActivityInput,
): AdminPatientPlatformUsage["hourly_activity_by_weekday"] => {
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

const summarizePlatformPeakActivityHours = (
  pageViews: AdminPatientDetailPlatformPageViewRecord[],
): AdminPatientPlatformUsage["peak_activity_hours"] => {
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const countsByHour = Array.from({ length: 24 }, () => 0);

  for (const view of viewsWithUser) countsByHour[view.occurred_at.getHours()] += 1;

  const total = viewsWithUser.length;
  if (total === 0) return [];

  return countsByHour
    .map((count, hour) => ({
      count,
      hour,
      label: platformActivityHourLabel(hour),
      percentage: roundOneDecimal((count / total) * 100),
    }))
    .filter((point) => point.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.hour - right.hour;
    })
    .slice(0, 4);
};

const buildPlatformUsage = (params: {
  bundle: AdminPatientEngagementBundle;
  pageViews: AdminPatientDetailPlatformPageViewRecord[];
  period: AdminPatientDetailPeriod;
  pwaInstallAction: { occurred_at: Date } | null;
  sessions: AdminPatientDetailPlatformSessionRecord[];
}): AdminPatientPlatformUsage => {
  const { bundle, pageViews, period, pwaInstallAction, sessions: platformSessions } = params;
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const pageViewSessions = new Set(viewsWithUser.map((view) => view.session_id));
  const accessDays = new Set(viewsWithUser.map((view) => dateKeyInTimeZone(view.occurred_at)));
  const durations = viewsWithUser
    .map((view) => view.duration_seconds)
    .filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    );
  const durationCoverage = viewsWithUser.length > 0 ? durations.length / viewsWithUser.length : 0;
  const averageDuration =
    durationCoverage >= DURATION_RELIABILITY_THRESHOLD ? average(durations) : null;
  const pageCounts = new Map<string, number>();
  for (const view of viewsWithUser) {
    const pageLabel = patientPlatformPageLabel(view);
    pageCounts.set(pageLabel, (pageCounts.get(pageLabel) ?? 0) + 1);
  }
  const hourlyActivityInput = {
    engagementEvents: [
      ...bundle.votesMade,
      ...bundle.postSaves,
      ...bundle.replySaves,
      ...bundle.membershipsInPeriod,
    ],
    pageViews,
    posts: bundle.posts,
    replies: bundle.replies,
    reviews: bundle.reviews,
  };

  return {
    access_days_count: accessDays.size,
    average_duration_seconds: averageDuration,
    device_usage: buildPlatformDeviceUsage(platformSessions),
    duration_unavailable_reason:
      viewsWithUser.length === 0
        ? "Sem pageviews autenticados do paciente no período."
        : averageDuration === null
          ? "Duração indisponível: menos de 50% dos pageviews têm duration_seconds confiável."
          : null,
    hourly_activity: summarizePlatformHourlyActivity(hourlyActivityInput),
    hourly_activity_by_weekday: summarizePlatformHourlyActivityByWeekday(hourlyActivityInput),
    last_access_at: latestPlatformAccessAt({
      pageViews: viewsWithUser,
      sessions: platformSessions,
    }),
    peak_activity_hours: summarizePlatformPeakActivityHours(pageViews),
    period_from: period.from,
    period_to: period.to,
    pwa_installation_recorded: Boolean(pwaInstallAction),
    pwa_installed_at: pwaInstallAction?.occurred_at ?? null,
    sessions_count: platformSessions.length > 0 ? platformSessions.length : pageViewSessions.size,
    source:
      "page_view_event+visitor_session+important_action_event+community_post+post_reply+post_vote+post_save+post_reply_save+community_member+professional_review",
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
      viewsWithUser.length === 0 ? "Sem uso autenticado do paciente no período selecionado." : null,
  };
};

const activityFromPost = (
  post: AdminPatientEngagementBundle["posts"][number],
): AdminPatientDetailActivityItem => ({
  description: `Criou um post na comunidade ${post.community.name}: ${snippet(post.content, "sem conteúdo textual")}.`,
  detail_url: postUrl(post),
  id: `post-${post.id}`,
  occurred_at: post.createdAt,
  source: "community_post",
  title: post.title,
  type: "post_created",
});

const activityFromReply = (
  reply: AdminPatientEngagementBundle["replies"][number],
): AdminPatientDetailActivityItem => ({
  description: `Comentou no post "${reply.post.title}": ${snippet(reply.content, "comentário sem texto")}.`,
  detail_url: replyUrl(reply),
  id: `reply-${reply.id}`,
  occurred_at: reply.createdAt,
  source: "post_reply",
  title: "Comentou em um post",
  type: "post_reply_created",
});

const activityFromVote = (
  vote: AdminPatientEngagementBundle["votesMade"][number],
): AdminPatientDetailActivityItem => ({
  description: `Registrou ${vote.value > 0 ? "upvote" : "downvote"} em "${voteTargetTitle(vote)}".`,
  detail_url: voteTargetUrl(vote),
  id: `vote-${vote.id}`,
  occurred_at: vote.createdAt,
  source: "post_vote",
  title: vote.value > 0 ? "Upvote realizado" : "Downvote realizado",
  type: "post_vote",
});

const activityFromPostSave = (
  save: AdminPatientEngagementBundle["postSaves"][number],
): AdminPatientDetailActivityItem => ({
  description: `Salvou o post "${save.post.title}".`,
  detail_url: postUrl(save.post),
  id: `post-save-${save.id}`,
  occurred_at: save.createdAt,
  source: "post_save",
  title: "Salvou um post",
  type: "post_saved",
});

const activityFromReplySave = (
  save: AdminPatientEngagementBundle["replySaves"][number],
): AdminPatientDetailActivityItem => ({
  description: `Salvou uma resposta no post "${save.reply.post.title}".`,
  detail_url: replyUrl(save.reply),
  id: `reply-save-${save.id}`,
  occurred_at: save.createdAt,
  source: "post_reply_save",
  title: "Salvou uma resposta",
  type: "post_reply_saved",
});

const activityFromMembership = (
  member: AdminPatientEngagementBundle["membershipsInPeriod"][number],
): AdminPatientDetailActivityItem => ({
  description: `Entrou na comunidade ${member.community.name}.`,
  detail_url: `/community/${member.community.slug}`,
  id: `member-${member.id}`,
  occurred_at: member.createdAt,
  source: "community_member",
  title: "Entrou em comunidade",
  type: "community_joined",
});

const activityFromReview = (
  review: AdminPatientEngagementBundle["reviews"][number],
): AdminPatientDetailActivityItem => ({
  description: `Criou uma avaliação profissional com nota ${review.rating}. O comentário não é exibido nesta visão operacional.`,
  detail_url: null,
  id: `review-${review.id}`,
  occurred_at: review.createdAt,
  source: "professional_review",
  title: "Avaliação criada",
  type: "professional_review_created",
});

const buildActivities = (bundle: AdminPatientEngagementBundle) =>
  [
    ...bundle.posts.map(activityFromPost),
    ...bundle.replies.map(activityFromReply),
    ...bundle.votesMade.map(activityFromVote),
    ...bundle.postSaves.map(activityFromPostSave),
    ...bundle.replySaves.map(activityFromReplySave),
    ...bundle.membershipsInPeriod.map(activityFromMembership),
    ...bundle.reviews.map(activityFromReview),
  ]
    .sort((left, right) => right.occurred_at.getTime() - left.occurred_at.getTime())
    .slice(0, 10);

const communityFromPost = (post: AdminPatientEngagementBundle["posts"][number]) => post.community;
const communityFromReply = (reply: AdminPatientEngagementBundle["replies"][number]) =>
  reply.post.community;
const communityFromVote = (vote: AdminPatientEngagementBundle["votesMade"][number]) =>
  vote.post?.community ?? vote.reply?.post.community ?? null;
const communityFromPostSave = (save: AdminPatientEngagementBundle["postSaves"][number]) =>
  save.post.community;
const communityFromReplySave = (save: AdminPatientEngagementBundle["replySaves"][number]) =>
  save.reply.post.community;

const upsertCommunity = (
  acc: Map<string, AdminPatientDetailCommunity>,
  community: CommunityLike,
  increment = 0,
) => {
  const current =
    acc.get(community.id) ??
    ({
      avatar_url: community.avatar_url,
      comments: 0,
      color: community.visual_primary_color,
      downvotes: 0,
      engagement_diagnosis: diagnoseAdminCommunityEngagement({
        interactions: 0,
        maxInteractions: 0,
        source: "community_post+post_reply+post_vote+post_save+post_reply_save",
      }),
      id: community.id,
      interactions: 0,
      is_member: false,
      member_since: null,
      name: community.name,
      posts: 0,
      saves: 0,
      slug: community.slug,
      upvotes: 0,
      votes: 0,
    } satisfies AdminPatientDetailCommunity);

  current.interactions += increment;
  acc.set(community.id, current);
  return current;
};

const buildActiveCommunities = (bundle: AdminPatientEngagementBundle) => {
  const communities = new Map<string, AdminPatientDetailCommunity>();

  for (const member of bundle.memberships) {
    const item = upsertCommunity(communities, member.community, 0);
    item.is_member = true;
    item.member_since = member.createdAt;
  }
  for (const post of bundle.posts) {
    const item = upsertCommunity(communities, communityFromPost(post), 1);
    item.posts += 1;
  }
  for (const reply of bundle.replies) {
    const item = upsertCommunity(communities, communityFromReply(reply), 1);
    item.comments += 1;
  }
  for (const vote of bundle.votesMade) {
    const community = communityFromVote(vote);
    if (community) {
      const item = upsertCommunity(communities, community, 1);
      if (vote.value > 0) item.upvotes += 1;
      if (vote.value < 0) item.downvotes += 1;
      item.votes += 1;
    }
  }
  for (const save of bundle.postSaves) {
    const item = upsertCommunity(communities, communityFromPostSave(save), 1);
    item.saves += 1;
  }
  for (const save of bundle.replySaves) {
    const item = upsertCommunity(communities, communityFromReplySave(save), 1);
    item.saves += 1;
  }

  const activeCommunities = [...communities.values()].filter(
    (community) => community.interactions > 0,
  );
  const maxInteractions = Math.max(
    0,
    ...activeCommunities.map((community) => community.interactions),
  );

  return activeCommunities
    .map((community) => ({
      ...community,
      engagement_diagnosis: diagnoseAdminCommunityEngagement({
        interactions: community.interactions,
        maxInteractions,
        source: "community_post+post_reply+post_vote+post_save+post_reply_save",
      }),
    }))
    .sort((left, right) => {
      if (right.interactions !== left.interactions) return right.interactions - left.interactions;
      if (Number(right.is_member) !== Number(left.is_member)) {
        return Number(right.is_member) - Number(left.is_member);
      }

      return left.name.localeCompare(right.name, "pt-BR");
    })
    .slice(0, 5);
};

const publicationMetric = (params: {
  id: AdminPatientDetailPublicationMetric["id"];
  label: string;
  source: string;
  value: number;
}): AdminPatientDetailPublicationMetric => ({
  available: true,
  id: params.id,
  label: params.label,
  source: params.source,
  unit: "count",
  unavailable_reason: null,
  value: params.value,
});

const groupCountByNullableString = <T extends { _count: { _all: number } }>(
  items: T[],
  getKey: (item: T) => string | null,
) => {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;

    counts.set(key, (counts.get(key) ?? 0) + item._count._all);
  }

  return counts;
};

const countByPostId = <T>(items: T[], getPostId: (item: T) => string | null | undefined) => {
  const counts = new Map<string, number>();

  for (const item of items) {
    const postId = getPostId(item);
    if (!postId) continue;

    counts.set(postId, (counts.get(postId) ?? 0) + 1);
  }

  return counts;
};

const buildPublications = (
  bundle: AdminPatientEngagementBundle,
  postViews: Awaited<ReturnType<AdminPatientDetailRepository["countPostViews"]>>,
): AdminPatientDetailPublicationItem[] => {
  const commentsByPost = countByPostId(bundle.responsesReceived, (reply) => reply.post.id);
  const savesByPost = countByPostId(bundle.postSavesReceived, (save) => save.post.id);
  const sharesByPost = countByPostId(bundle.sharesReceived, (share) =>
    share.reply ? null : share.post.id,
  );
  const viewsByPost = groupCountByNullableString(postViews, (item) => item.target_id);

  return bundle.posts
    .map((post) => ({
      admin_statistics_url: `/comunidades/${post.community.slug}/conteudo/post/${post.id}`,
      community: {
        avatar_url: post.community.avatar_url,
        color: post.community.visual_primary_color,
        id: post.community.id,
        name: post.community.name,
        slug: post.community.slug,
      },
      content: post.content,
      created_at: post.createdAt,
      excerpt: snippet(post.content, "Sem descrição textual."),
      id: post.id,
      metrics: {
        comments: publicationMetric({
          id: "comments",
          label: "Comentários",
          source: "post_reply.post_id",
          value: commentsByPost.get(post.id) ?? post.replies_count,
        }),
        downvotes: publicationMetric({
          id: "downvotes",
          label: "Downvotes",
          source: "community_post.downvotes_count/post_vote",
          value: post.downvotes_count,
        }),
        reports: publicationMetric({
          id: "reports",
          label: "Denúncias",
          source: "post_report.post_id",
          value: post.reports.length,
        }),
        saves: publicationMetric({
          id: "saves",
          label: "Salvamentos",
          source: "post_save.post_id",
          value: savesByPost.get(post.id) ?? post.saves_count,
        }),
        shares: publicationMetric({
          id: "shares",
          label: "Compartilhamentos",
          source: "post_share.post_id",
          value: sharesByPost.get(post.id) ?? 0,
        }),
        upvotes: publicationMetric({
          id: "upvotes",
          label: "Upvotes",
          source: "community_post.upvotes_count/post_vote",
          value: post.upvotes_count,
        }),
        views: publicationMetric({
          id: "views",
          label: "Visualizações",
          source: "page_view_event.target_type=post/community_post",
          value: viewsByPost.get(post.id) ?? 0,
        }),
      },
      public_url: postUrl(post),
      source: "community_post" as const,
      title: post.title,
      type: "post" as const,
      type_label: "Post" as const,
    }))
    .sort(
      (left, right) =>
        right.created_at.getTime() - left.created_at.getTime() || left.id.localeCompare(right.id),
    );
};

const heatmapParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
    weekday: "short",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const rawHour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const hour = rawHour === 24 ? 0 : rawHour;

  return {
    dayIndex: WEEKDAY_INDEX[weekday] ?? 0,
    hourBucket: Math.floor(hour / 4) * 4,
  };
};

const buildHeatmap = (bundle: AdminPatientEngagementBundle) => {
  const eventDates = [
    ...bundle.posts.map((item) => item.createdAt),
    ...bundle.replies.map((item) => item.createdAt),
    ...bundle.votesMade.map((item) => item.createdAt),
    ...bundle.postSaves.map((item) => item.createdAt),
    ...bundle.replySaves.map((item) => item.createdAt),
  ];
  const counts = new Map<string, number>();

  for (const date of eventDates) {
    const { dayIndex, hourBucket } = heatmapParts(date);
    const key = `${dayIndex}:${hourBucket}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const cells: AdminPatientDetailHeatmapCell[] = [];
  for (let dayIndex = 0; dayIndex < HEATMAP_DAYS.length; dayIndex += 1) {
    for (const hour of HEATMAP_HOURS) {
      const count = counts.get(`${dayIndex}:${hour}`) ?? 0;
      cells.push({
        count,
        day: HEATMAP_DAYS[dayIndex].label,
        day_index: dayIndex,
        hour,
        hour_label: `${pad(hour)}h`,
      });
    }
  }

  const max = Math.max(0, ...cells.map((cell) => cell.count));

  return {
    available: eventDates.length > 0,
    cells,
    max_count: max,
    source: "community_post+post_reply+post_vote+post_save+post_reply_save" as const,
    timezone: TIMEZONE,
    total_events: eventDates.length,
    unavailable_reason:
      eventDates.length === 0
        ? "Sem eventos suficientes de posts, comentários, votos ou salvamentos no período."
        : null,
  };
};

const buildHeader = (patient: AdminPatientDetailRecord): AdminPatientDetailDTO["header"] => {
  const latestLocation = patient.visitor_locations[0] ?? null;
  const latestToken = patient.user_tokens[0] ?? null;
  const lastAccessAt = latestToken
    ? latestToken.updatedAt > latestToken.createdAt
      ? latestToken.updatedAt
      : latestToken.createdAt
    : null;

  return {
    active: patient.active,
    avatar: patient.avatar,
    created_at: patient.createdAt,
    email: patient.email,
    gender: patient.patient_profile?.gender ?? null,
    id: patient.id,
    last_access_at: lastAccessAt,
    location: latestLocation
      ? {
          captured_at: latestLocation.createdAt,
          city: latestLocation.city,
          country: latestLocation.country,
          source: latestLocation.source,
          state: latestLocation.state,
        }
      : null,
    name: normalizeName(patient.name),
    onboarding_completed_at: patient.patient_profile?.onboarding_completed_at ?? null,
    provider: patient.provider,
    provider_label: providerLabel(patient.provider),
    status: patient.active ? "active" : "inactive",
    status_label: patient.active ? "Ativo" : "Inativo",
  };
};

const buildDetail = (
  patient: AdminPatientDetailRecord,
  period: AdminPatientDetailPeriod,
  labels: string[],
  currentBundle: AdminPatientEngagementBundle,
  previousBundle: AdminPatientEngagementBundle,
  currentIntentSignals: PatientIntentSignals,
  previousIntentSignals: PatientIntentSignals,
  platformPageViews: AdminPatientDetailPlatformPageViewRecord[],
  platformSessions: AdminPatientDetailPlatformSessionRecord[],
  postViews: Awaited<ReturnType<AdminPatientDetailRepository["countPostViews"]>>,
  pwaInstallAction: { occurred_at: Date } | null,
): AdminPatientDetailDTO => {
  const currentCounts = countsFromBundle(currentBundle);
  const previousCounts = countsFromBundle(previousBundle);
  const heatmap = buildHeatmap(currentBundle);
  const intentAnalysis = buildPatientIntentAnalysis(currentIntentSignals, previousIntentSignals);
  const platformUsage = buildPlatformUsage({
    bundle: currentBundle,
    pageViews: platformPageViews,
    period,
    pwaInstallAction,
    sessions: platformSessions,
  });
  const unavailable = [
    ...(!patient.visitor_locations[0]
      ? [
          {
            description:
              "Nenhuma visitor_location vinculada ao paciente foi encontrada; localização precisa não é inferida.",
            id: "location",
            label: "Localização agregada",
            source: "visitor_location",
          },
        ]
      : []),
    ...(!heatmap.available
      ? [
          {
            description: heatmap.unavailable_reason ?? "Sem eventos suficientes no período.",
            id: "heatmap",
            label: "Horários de maior atividade",
            source: heatmap.source,
          },
        ]
      : []),
    ...(platformUsage.unavailable_reason
      ? [
          {
            description:
              "Uso da plataforma depende de page_view_event autenticado para o paciente no período selecionado.",
            id: "platform_usage",
            label: "Uso da plataforma",
            source: "page_view_event",
          },
        ]
      : []),
    ...(platformUsage.duration_unavailable_reason
      ? [
          {
            description: platformUsage.duration_unavailable_reason,
            id: "platform_duration",
            label: "Tempo médio",
            source: "page_view_event.duration_seconds",
          },
        ]
      : []),
  ];

  return {
    activities: {
      coverage_note:
        "Atividades são derivadas de posts, comentários, votos, salvamentos, entrada em comunidades e avaliações reais. Login não é exibido porque não há evento de login confiável nesta V1.",
      items: buildActivities(currentBundle),
      source: "community_activity+professional_review",
    },
    communities: {
      items: buildActiveCommunities(currentBundle),
      source: "community_member+community_post+post_reply+post_vote+post_save+post_reply_save",
    },
    coverage_notes: [
      "Aba Conta possui suporte administrativo auditado de acesso, sessões, suspensão, desativação e exclusão; não há silenciamento, restrição parcial ou moderação automática de paciente.",
      "Status Ativo/Inativo representa user.active, não retenção nem engajamento recente.",
      "E-mail é exibido apenas para admin autenticado; telefone, nascimento, bio, IP, coordenadas e endereço completo são omitidos na V1.",
      "Último acesso usa somente metadados reais de sessão/token do usuário, quando existentes.",
      "Localização, quando disponível, usa apenas dados coarse de visitor_location.",
      "Análise de intenção usa contagens derivadas de aberturas de perfil, favoritos e cliques WhatsApp; não expõe conversa, diagnóstico ou atendimento.",
    ],
    header: buildHeader(patient),
    heatmap,
    intent_analysis: intentAnalysis,
    metrics: buildMetrics(currentCounts, previousCounts),
    period,
    platform_usage: platformUsage,
    publications: {
      coverage_note:
        "Publicações listam posts reais criados pelo paciente e métricas persistidas de visualizações, votos, comentários, salvamentos, compartilhamentos e denúncias.",
      items: buildPublications(currentBundle, postViews),
      source:
        "community_post+post_reply+post_vote+post_save+post_share+page_view_event+post_report",
    },
    privacy: {
      omitted_fields: [
        "patient_profile.phone",
        "patient_profile.birthdate",
        "patient_profile.bio",
        "IP",
        "coordenadas",
        "endereço completo",
        "comentário textual de avaliações profissionais",
      ],
      visible_fields: [
        "user.id",
        "user.name",
        "user.email",
        "user.avatar",
        "user.active",
        "user_token.createdAt/updatedAt",
        "user.provider",
        "user.createdAt",
        "patient_profile.gender",
        "visitor_location.city/state/country",
        "contagens derivadas de profile_view_event/psychologist_favorite/contact_request",
      ],
    },
    series: {
      points: buildSeries(labels, currentBundle),
      source:
        "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+verified_responses",
    },
    source: "user+patient_profile+visitor_location+community_activity+professional_review",
    unavailable,
  };
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "patient" }),
});

export const showAdminPatient = async (data: IAdminPatientDetailDTO): Promise<Resolve> => {
  const repository = new AdminPatientDetailRepository();
  const patient = await repository.findPatient(data.p.id);
  if (!patient) return notFound();

  const resolvedPeriod = resolvePeriod(data.q ?? {}, patient.createdAt);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;
  const [
    currentBundle,
    previousBundle,
    currentIntentSignals,
    previousIntentSignals,
    platformPageViews,
    platformSessions,
    pwaInstallAction,
  ] = await Promise.all([
    repository.listEngagementBundle(patient.id, current),
    repository.listEngagementBundle(patient.id, previous),
    repository.listIntentSignals(patient.id, current),
    repository.listIntentSignals(patient.id, previous),
    repository.listPlatformPageViews(patient.id, current),
    repository.listPlatformSessions(patient.id, current),
    repository.findPwaInstallAction(patient.id),
  ]);
  const postViews = await repository.countPostViews(currentBundle.posts.map((post) => post.id));

  return {
    status: 200,
    ...msg("index", {}),
    data: buildDetail(
      patient,
      period,
      labels,
      currentBundle,
      previousBundle,
      currentIntentSignals,
      previousIntentSignals,
      platformPageViews,
      platformSessions,
      postViews,
      pwaInstallAction,
    ),
  };
};

export default async (data: IAdminPatientDetailDTO): Promise<Resolve> => {
  return showAdminPatient(data);
};

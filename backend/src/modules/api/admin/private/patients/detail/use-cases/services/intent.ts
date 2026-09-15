import type { AdminOperatingSystemType } from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
import {
  buildDateLabels as buildLabels,
  resolveCalendarPeriod,
  toDateKey,
} from "@/utils/date-range";
import type {
  AdminPatientDetailDateRange,
  AdminPatientDetailMetric,
  AdminPatientDetailPeriod,
  AdminPatientDetailQuery,
  AdminPatientIntentAnalysis,
  AdminPatientIntentMetric,
} from "../../DTOs/IAdminPatientDetailDTO";
import type {
  AdminPatientDetailPlatformSessionRecord,
  AdminPatientDetailRepository,
} from "../../repositories/AdminPatientDetailRepository";

export const DEFAULT_PERIOD_DAYS = 30;

export const MAX_PERIOD_DAYS = 3660;

export const pad = (value: number) => String(value).padStart(2, "0");

export const DURATION_RELIABILITY_THRESHOLD = 0.5;

export const TIMEZONE = "America/Sao_Paulo" as const;

export const HEATMAP_DAYS = [
  { id: "mon", label: "Seg" },
  { id: "tue", label: "Ter" },
  { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" },
  { id: "fri", label: "Sex" },
  { id: "sat", label: "Sáb" },
  { id: "sun", label: "Dom" },
] as const;

export const HEATMAP_HOURS = [0, 4, 8, 12, 16, 20] as const;

export const PATIENT_PAGE_KIND_LABELS: Record<string, string> = {
  community: "Comunidades",
  community_post: "Comunidades",
  home: "Início",
  login: "Login",
  psychologist_profile: "Psicólogos",
  psychologists: "Psicólogos",
  signup: "Cadastro",
};

export const PLATFORM_DEVICE_TYPES = ["desktop", "mobile", "tablet", "unknown"] as const;

export type PlatformDeviceType = (typeof PLATFORM_DEVICE_TYPES)[number];

export const PLATFORM_DEVICE_LABELS: Record<PlatformDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
};

export const PLATFORM_WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export const PATIENT_INTENT_SOURCE =
  "profile_view_event+psychologist_favorite+contact_request" as const;

export const PATIENT_INTENT_METRIC_SOURCES = {
  favorites: "psychologist_favorite.user_id",
  profile_views: "profile_view_event.viewer_id+source=profile_page",
  repeated_profile_views: "profile_view_event.viewer_id+psychologist_id",
  whatsapp_clicks: "contact_request.user_id+channel=whatsapp",
} as const;

export const PATIENT_INTENT_SCORE_WEIGHTS = {
  favorites: 20,
  profile_views: 3,
  repeated_profile_views: 5,
  whatsapp_clicks: 45,
} as const satisfies Record<AdminPatientIntentMetric["id"], number>;

export const PATIENT_INTENT_SCORE_CAPS = {
  favorites: 40,
  profile_views: 30,
  repeated_profile_views: 20,
  whatsapp_clicks: 90,
} as const satisfies Record<AdminPatientIntentMetric["id"], number>;

export type PeriodResolution = {
  current: AdminPatientDetailDateRange;
  days: number;
  labels: string[];
  period: AdminPatientDetailPeriod;
  previous: AdminPatientDetailDateRange;
};

export type PeriodResult =
  | {
      period: PeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

export type EngagementCounts = {
  comments_created: number;
  downvotes_received: number;
  posts_created: number;
  reports_received: number;
  saves_received: number;
  shares_received: number;
  verified_psychologist_responses: number;
  upvotes_received: number;
};

export type PatientIntentSignals = Awaited<
  ReturnType<AdminPatientDetailRepository["listIntentSignals"]>
>;

export type PatientIntentCounts = {
  favorites: number;
  profile_views: number;
  repeated_profile_views: number;
  whatsapp_clicks: number;
};

export type CommunityLike = {
  avatar_url: string | null;
  id: string;
  name: string;
  slug: string;
  visual_primary_color: string | null;
};

export const providerLabel = (provider: string) =>
  provider.trim().toLowerCase() === "google" ? "Google" : "E-mail e senha";

export const WEEKDAY_INDEX: Record<string, number> = {
  Fri: 4,
  Mon: 0,
  Sat: 5,
  Sun: 6,
  Thu: 3,
  Tue: 1,
  Wed: 2,
};

export const resolvePeriod = (
  query: AdminPatientDetailQuery,
  allPeriodStartDate?: Date,
): PeriodResult => {
  const resolved = resolveCalendarPeriod(query, {
    allPeriodStartDate,
    defaultDays: DEFAULT_PERIOD_DAYS,
    maxDays: MAX_PERIOD_DAYS,
  });
  if (!resolved) return { code: "invalid_analytics_date_range", success: false };

  const { days, end, label, previousEnd, previousStart, start } = resolved;
  return {
    success: true,
    period: {
      current: { end, start },
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
      previous: { end: previousEnd, start: previousStart },
    },
  };
};

export const roundPercent = (value: number) => Math.round(value * 10) / 10;

export const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

export const normalizePlatformDeviceType = (
  value: string | null | undefined,
): PlatformDeviceType => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

export const buildPlatformDeviceUsage = (sessions: AdminPatientDetailPlatformSessionRecord[]) => {
  const counts: Record<PlatformDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };
  const operatingSystemCounts = new Map<
    PlatformDeviceType,
    Record<AdminOperatingSystemType, number>
  >(
    PLATFORM_DEVICE_TYPES.map((deviceType) => [
      deviceType,
      Object.fromEntries(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
      ) as Record<AdminOperatingSystemType, number>,
    ]),
  );

  for (const session of sessions) {
    const deviceType = normalizePlatformDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[deviceType] += 1;
    const countsByOperatingSystem = operatingSystemCounts.get(deviceType);
    if (countsByOperatingSystem) countsByOperatingSystem[operatingSystem] += 1;
  }

  const totalSessions = sessions.length;

  return {
    items: PLATFORM_DEVICE_TYPES.map((deviceType) => {
      const deviceTotal = counts[deviceType];
      const countsByOperatingSystem = operatingSystemCounts.get(deviceType);

      return {
        count: deviceTotal,
        device_type: deviceType,
        id: deviceType,
        label: PLATFORM_DEVICE_LABELS[deviceType],
        operating_systems: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
          count: countsByOperatingSystem?.[operatingSystem] ?? 0,
          id: operatingSystem,
          label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
          operating_system: operatingSystem,
          percentage:
            deviceTotal > 0
              ? roundOneDecimal(
                  ((countsByOperatingSystem?.[operatingSystem] ?? 0) / deviceTotal) * 100,
                )
              : 0,
        }))
          .filter((operatingSystem) => operatingSystem.count > 0)
          .sort((left, right) => {
            if (right.count !== left.count) return right.count - left.count;

            return left.label.localeCompare(right.label, "pt-BR");
          }),
        percentage: totalSessions > 0 ? roundOneDecimal((deviceTotal / totalSessions) * 100) : 0,
      };
    }).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    }),
    source: "visitor_session.device_type+visitor_session.os+user_id" as const,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas do paciente por dispositivo no período selecionado."
        : null,
  };
};

export const latestPlatformAccessAt = (params: {
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

export const average = (values: number[]) => {
  if (values.length === 0) return null;

  return roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length);
};

export const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

export const metric = (params: {
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

export const uniqueCount = <T>(items: T[], getKey: (item: T) => string | null | undefined) =>
  new Set(items.map(getKey).filter((value): value is string => Boolean(value))).size;

export const scoreContribution = (metricId: AdminPatientIntentMetric["id"], value: number) =>
  Math.min(
    PATIENT_INTENT_SCORE_CAPS[metricId],
    Math.max(0, value) * PATIENT_INTENT_SCORE_WEIGHTS[metricId],
  );

export const patientIntentMetric = (params: {
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

export const countsFromIntentSignals = (signals: PatientIntentSignals): PatientIntentCounts => {
  const uniqueProfileViews = uniqueCount(signals.profileViews, (view) => view.psychologist_id);

  return {
    favorites: signals.favorites.length,
    profile_views: signals.profileViews.length,
    repeated_profile_views: Math.max(0, signals.profileViews.length - uniqueProfileViews),
    whatsapp_clicks: signals.whatsappClicks.length,
  };
};

export const latestIntentSignalAt = (signals: PatientIntentSignals) =>
  [...signals.profileViews, ...signals.favorites, ...signals.whatsappClicks].reduce<Date | null>(
    (latest, signal) => (!latest || signal.createdAt > latest ? signal.createdAt : latest),
    null,
  );

export const patientIntentLevel = (
  score: number,
  counts: PatientIntentCounts,
): AdminPatientIntentAnalysis["level"] => {
  if (score <= 0) {
    return {
      id: "no_signals",
      label: "Frio",
      tone: "neutral",
    };
  }

  if (counts.whatsapp_clicks > 0 || score >= 45) {
    return {
      id: "high",
      label: "Qualificado",
      tone: "hot",
    };
  }

  if (counts.favorites > 0 || score >= 20) {
    return {
      id: "medium",
      label: "Interessado",
      tone: "warm",
    };
  }

  return {
    id: "low",
    label: "Curioso",
    tone: "cool",
  };
};

export const patientIntentSummary = (
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

  return "Sem sinais de intenção de contato do paciente no período selecionado.";
};

export const buildPatientIntentAnalysis = (
  currentSignals: PatientIntentSignals,
  previousSignals: PatientIntentSignals,
): AdminPatientIntentAnalysis => {
  const currentCounts = countsFromIntentSignals(currentSignals);
  const previousCounts = countsFromIntentSignals(previousSignals);
  const metrics: AdminPatientIntentMetric[] = [
    patientIntentMetric({
      current: currentCounts.profile_views,
      description: "Aberturas de perfis públicos de psicólogos pelo paciente.",
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
      description: "Cliques no botão de WhatsApp para psicólogos.",
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
      "A análise considera sinais de descoberta e contato dentro do site; o último passo observado é o clique no WhatsApp.",
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

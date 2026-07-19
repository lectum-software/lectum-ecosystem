import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPatientsDashboardBreakdownItem,
  AdminPatientsDashboardDateRange,
  AdminPatientsDashboardMetric,
  AdminPatientsDashboardPeriod,
  AdminPatientsDashboardQuery,
  AdminPatientsDashboardRecentActivity,
  AdminPatientsDashboardRecentPatient,
  AdminPatientsDashboardSummary,
  IAdminPatientsDashboardDTO,
} from "../DTOs/IAdminPatientsDashboardDTO";
import {
  type AdminPatientLocationRecord,
  type AdminPatientPageViewRecord,
  type AdminPatientRecentRecord,
  type AdminPatientSnapshotRecord,
  AdminPatientsDashboardRepository,
} from "../repositories/AdminPatientsDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;
const DURATION_RELIABILITY_THRESHOLD = 0.5;

type PatientsPeriodResolution = {
  current: AdminPatientsDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminPatientsDashboardPeriod;
  previous: AdminPatientsDashboardDateRange;
};

type PeriodResult =
  | {
      period: PatientsPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

const GENDER_LABELS: Record<string, string> = {
  female: "Feminino",
  feminina: "Feminino",
  feminino: "Feminino",
  homem: "Masculino",
  male: "Masculino",
  masculina: "Masculino",
  masculino: "Masculino",
  mulher: "Feminino",
  nao_binario: "Outro",
  nao_informado: "Não informado",
  não_binário: "Outro",
  outro: "Outro",
  other: "Outro",
};

const SIGNUP_SOURCE_OPTIONS = [
  { id: "email_password", label: "E-mail e senha" },
  { id: "google", label: "Google" },
] as const;

type SignupSource = (typeof SIGNUP_SOURCE_OPTIONS)[number];

const COUNTRY_LABELS: Record<string, string> = {
  AO: "Angola",
  BR: "Brasil",
  BRA: "Brasil",
  MZ: "Moçambique",
  PT: "Portugal",
  PRT: "Portugal",
  US: "Estados Unidos",
  USA: "Estados Unidos",
};

const PATIENT_PAGE_KIND_LABELS: Record<string, string> = {
  community: "Comunidades",
  community_post: "Comunidades",
  home: "Início",
  login: "Login",
  psychologist_profile: "Psicólogos",
  psychologists: "Psicólogos",
  signup: "Cadastro",
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

const resolvePeriod = (
  query: AdminPatientsDashboardQuery,
  allPeriodStartDate?: Date,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "\u00daltimos 7 dias";

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
      previous: { start: previousStart, end: previousEnd },
      period: {
        days,
        from: toDateKey(start),
        label,
        max_days: MAX_PERIOD_DAYS,
        previous_from: toDateKey(previousStart),
        previous_to: toDateKey(previousEnd),
        timezone: "server-local",
        to: toDateKey(end),
      },
    },
  };
};

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const metric = (params: {
  current: number;
  description: string;
  id: string;
  label: string;
  previous: number;
  source: string;
}): AdminPatientsDashboardMetric => {
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
    unavailable: false,
    value: params.current,
  };
};

const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Paciente";

const normalizeGender = (value?: string | null) => {
  const key = normalizeKey(value || "nao_informado");

  return {
    id: key || "nao_informado",
    label: GENDER_LABELS[key] ?? value?.trim() ?? "Não informado",
  };
};

const signupSourceFromProvider = (provider?: string | null): SignupSource => {
  const normalized = (provider ?? "").trim().toLowerCase();

  return normalized === "google" ? SIGNUP_SOURCE_OPTIONS[1] : SIGNUP_SOURCE_OPTIONS[0];
};

const providerLabel = (provider: string) => signupSourceFromProvider(provider).label;

const dateInRange = (date: Date, range: AdminPatientsDashboardDateRange) =>
  date >= range.start && date <= range.end;

const createdUntil = (patient: AdminPatientSnapshotRecord, date: Date) => patient.createdAt <= date;

const countNewPatients = (
  patients: AdminPatientSnapshotRecord[],
  range: AdminPatientsDashboardDateRange,
) => patients.filter((patient) => dateInRange(patient.createdAt, range)).length;

const buildSeries = (
  patients: AdminPatientSnapshotRecord[],
  labels: string[],
): AdminPatientsDashboardSummary["series"]["points"] =>
  labels.map((label) => {
    const dayEnd = endOfDate(parseDateOnly(label, "start") ?? new Date(label));
    const visible = patients.filter((patient) => patient.createdAt <= dayEnd);

    return {
      active_patients: visible.filter((patient) => patient.active).length,
      date: label,
      inactive_patients: visible.filter((patient) => !patient.active).length,
      new_signups: patients.filter((patient) => toDateKey(patient.createdAt) === label).length,
      total_patients: visible.length,
    };
  });

const buildBreakdown = (
  items: Array<{ id: string; label: string }>,
  total: number,
  limit = 8,
): AdminPatientsDashboardBreakdownItem[] => {
  const counts = new Map<string, { count: number; label: string }>();

  for (const item of items) {
    const current = counts.get(item.id) ?? { count: 0, label: item.label };
    counts.set(item.id, { ...current, count: current.count + 1 });
  }

  return [...counts.entries()]
    .map(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: safePercentage(item.count, total),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    })
    .slice(0, limit);
};

const buildSignupSourceBreakdown = (
  patients: AdminPatientSnapshotRecord[],
): AdminPatientsDashboardBreakdownItem[] => {
  if (patients.length === 0) return [];

  const counts = new Map<SignupSource["id"], number>(
    SIGNUP_SOURCE_OPTIONS.map((source) => [source.id, 0] as const),
  );

  for (const patient of patients) {
    const source = signupSourceFromProvider(patient.provider);
    counts.set(source.id, (counts.get(source.id) ?? 0) + 1);
  }

  return SIGNUP_SOURCE_OPTIONS.map((source) => {
    const count = counts.get(source.id) ?? 0;

    return {
      count,
      id: source.id,
      label: source.label,
      percentage: safePercentage(count, patients.length),
    };
  });
};

const buildDemographics = (patients: AdminPatientSnapshotRecord[]) => ({
  gender: {
    items: buildBreakdown(
      patients.map((patient) => normalizeGender(patient.patient_profile?.gender)),
      patients.length,
      5,
    ),
    source: "patient_profile.gender" as const,
    total: patients.length,
  },
  signup_sources: {
    items: buildSignupSourceBreakdown(patients),
    source: "user.provider" as const,
    total: patients.length,
  },
});

const normalizeCountry = (country: string | null) => {
  const normalized = country?.trim();
  if (!normalized) return "Não identificado";

  const code = normalized.toUpperCase();
  return COUNTRY_LABELS[code] ?? normalized;
};

const normalizeLocality = (value: string | null) => value?.trim() || "Não identificado";

const latestLocationsByUser = (locations: AdminPatientLocationRecord[]) => {
  const latest = new Map<string, AdminPatientLocationRecord>();

  for (const location of locations) {
    if (!location.user_id) continue;
    const current = latest.get(location.user_id);
    if (!current || location.createdAt > current.createdAt) latest.set(location.user_id, location);
  }

  return [...latest.values()];
};

const buildLocationBreakdown = (
  locations: AdminPatientLocationRecord[],
  total: number,
  getGroup: (location: AdminPatientLocationRecord) => { id: string; label: string },
) => buildBreakdown(locations.map(getGroup), total, 10);

const buildLocations = (locations: AdminPatientLocationRecord[]) => {
  const latest = latestLocationsByUser(locations);
  const total = latest.length;

  return {
    cities: buildLocationBreakdown(latest, total, (location) => {
      const city = normalizeLocality(location.city);
      const state = normalizeLocality(location.state);
      const country = normalizeCountry(location.country);
      const label =
        [city, state, country].filter((item) => item !== "Não identificado").join(", ") || city;

      return {
        id: `${city}:${state}:${country}`,
        label,
      };
    }),
    countries: buildLocationBreakdown(latest, total, (location) => {
      const country = normalizeCountry(location.country);

      return { id: country, label: country };
    }),
    source: "visitor_location" as const,
    states: buildLocationBreakdown(latest, total, (location) => {
      const state = normalizeLocality(location.state);
      const country = normalizeCountry(location.country);
      const label =
        country === "Brasil" || country === "Não identificado" ? state : `${state}, ${country}`;

      return { id: `${state}:${country}`, label };
    }),
    total,
  };
};

const patientPlatformPageLabel = (view: AdminPatientPageViewRecord) => {
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

const buildPlatformUsage = (params: {
  eligiblePatientsCount: number;
  labels: string[];
  pageViews: AdminPatientPageViewRecord[];
  pwaInstalledUserIds: string[];
}) => {
  const { eligiblePatientsCount, labels, pageViews, pwaInstalledUserIds } = params;
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const users = new Set(viewsWithUser.map((view) => view.user_id as string));
  const pwaInstalledUsers = new Set(pwaInstalledUserIds.filter(Boolean));
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

    const pageLabel = patientPlatformPageLabel(view);
    pageCounts.set(pageLabel, (pageCounts.get(pageLabel) ?? 0) + 1);

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
    durationCoverage >= DURATION_RELIABILITY_THRESHOLD && durations.length > 0
      ? roundOneDecimal(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null;

  return {
    active_patients_count: activeCount,
    active_patients_rate:
      eligiblePatientsCount > 0
        ? roundOneDecimal((activeCount / eligiblePatientsCount) * 100)
        : null,
    average_access_days: activeCount > 0 ? roundOneDecimal(totalAccessDays / activeCount) : null,
    average_duration_seconds: averageDuration,
    average_sessions: activeCount > 0 ? roundOneDecimal(totalSessions / activeCount) : null,
    duration_unavailable_reason:
      viewsWithUser.length === 0
        ? "Sem pageviews autenticados de pacientes no período."
        : averageDuration === null
          ? "Duração indisponível: menos de 50% dos pageviews de pacientes têm duration_seconds confiável."
          : null,
    eligible_patients_count: eligiblePatientsCount,
    pageviews_count: viewsWithUser.length,
    pwa_installed_patients_count: pwaInstalledUsers.size,
    pwa_installed_patients_rate:
      eligiblePatientsCount > 0
        ? roundOneDecimal((pwaInstalledUsers.size / eligiblePatientsCount) * 100)
        : null,
    series: labels.map((label) => {
      const point = seriesMap.get(label);

      return {
        active_patients: point?.activeUsers.size ?? 0,
        date: label,
        pageviews: point?.pageviews ?? 0,
        sessions: point?.sessions.size ?? 0,
      };
    }),
    sessions_count: totalSessions,
    source: "page_view_event+important_action_event" as const,
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
        ? "Sem uso autenticado de pacientes no período selecionado."
        : null,
  };
};

const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
};

const postUrl = (post: { community: { slug: string }; id: string }) =>
  `/community/${post.community.slug}/post/${post.id}`;

const replyUrl = (reply: { id: string; post: { community: { slug: string }; id: string } }) =>
  `/community/${reply.post.community.slug}/post/${reply.post.id}/thread/${reply.id}`;

const pickRecentActivity = (
  patient: AdminPatientRecentRecord,
): AdminPatientsDashboardRecentActivity | null => {
  const candidates: AdminPatientsDashboardRecentActivity[] = [
    {
      description: "Cadastro de paciente realizado na plataforma.",
      detail_url: null,
      label: "Cadastro realizado",
      occurred_at: patient.createdAt,
      source: "user.createdAt",
      type: "account_created",
    },
    ...patient.community_members.map((member) => ({
      description: `Entrou na comunidade ${member.community.name}.`,
      detail_url: `/community/${member.community.slug}`,
      label: "Entrou em comunidade",
      occurred_at: member.createdAt,
      source: "community_member",
      type: "community_joined",
    })),
    ...patient.community_posts.map((post) => ({
      description: `Criou o post "${post.title}" na comunidade ${post.community.name}.`,
      detail_url: postUrl(post),
      label: "Criou um post",
      occurred_at: post.createdAt,
      source: "community_post",
      type: "post_created",
    })),
    ...patient.post_replies.map((reply) => ({
      description: `Comentou no post "${reply.post.title}": ${snippet(
        reply.content,
        "comentário sem texto",
      )}.`,
      detail_url: replyUrl(reply),
      label: "Comentou em um post",
      occurred_at: reply.createdAt,
      source: "post_reply",
      type: "post_reply_created",
    })),
    ...patient.post_votes.map((vote) => {
      const target = vote.reply ?? vote.post;
      const detailUrl = vote.reply ? replyUrl(vote.reply) : vote.post ? postUrl(vote.post) : null;

      return {
        description: `Reagiu a ${vote.reply ? "uma resposta" : "um post"}${
          target ? ` em "${vote.reply ? vote.reply.post.title : vote.post?.title}"` : ""
        }.`,
        detail_url: detailUrl,
        label: vote.value > 0 ? "Upvote registrado" : "Downvote registrado",
        occurred_at: vote.createdAt,
        source: "post_vote",
        type: "post_vote",
      };
    }),
    ...patient.post_saves.map((save) => ({
      description: `Salvou o post "${save.post.title}".`,
      detail_url: postUrl(save.post),
      label: "Salvou um post",
      occurred_at: save.createdAt,
      source: "post_save",
      type: "post_saved",
    })),
    ...patient.post_reply_saves.map((save) => ({
      description: `Salvou uma resposta no post "${save.reply.post.title}".`,
      detail_url: replyUrl(save.reply),
      label: "Salvou uma resposta",
      occurred_at: save.createdAt,
      source: "post_reply_save",
      type: "reply_saved",
    })),
  ];

  return (
    candidates.sort((left, right) => right.occurred_at.getTime() - left.occurred_at.getTime())[0] ??
    null
  );
};

const mapRecentPatient = (
  patient: AdminPatientRecentRecord,
): AdminPatientsDashboardRecentPatient => {
  const latestLocation = patient.visitor_locations[0] ?? null;

  return {
    avatar: patient.avatar,
    city: latestLocation?.city ?? null,
    country: latestLocation?.country ?? null,
    created_at: patient.createdAt,
    detail_url: `/pacientes/${patient.id}`,
    email: patient.email,
    gender: patient.patient_profile?.gender ?? null,
    id: patient.id,
    last_location_at: latestLocation?.createdAt ?? null,
    name: normalizeName(patient.name),
    provider: patient.provider,
    provider_label: providerLabel(patient.provider),
    recent_activity: pickRecentActivity(patient),
    state: latestLocation?.state ?? null,
    status: patient.active ? "active" : "inactive",
    status_label: patient.active ? "Ativo" : "Inativo",
  };
};

const getAllPeriodStartDate = (patients: AdminPatientSnapshotRecord[]) =>
  patients.reduce<Date | undefined>((earliest, patient) => {
    if (!earliest || patient.createdAt < earliest) return patient.createdAt;

    return earliest;
  }, undefined);

export const buildPatientsDashboard = async (
  query: AdminPatientsDashboardQuery,
): Promise<Resolve> => {
  const repository = new AdminPatientsDashboardRepository();
  const [patients, recentPatients, locations] = await Promise.all([
    repository.listPatientSnapshots(),
    repository.listRecentPatients(5),
    repository.listLocations(),
  ]);
  const resolvedPeriod = resolvePeriod(query ?? {}, getAllPeriodStartDate(patients));
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;
  const [patientPageViews, patientPwaInstalls] = await Promise.all([
    repository.listPatientPageViews(current),
    repository.listPatientPwaInstallActions(current),
  ]);

  const currentPatients = patients.filter((patient) => createdUntil(patient, current.end));
  const previousPatients = patients.filter((patient) => createdUntil(patient, previous.end));
  const currentNewPatients = countNewPatients(patients, current);
  const previousNewPatients = countNewPatients(patients, previous);
  const activePatients = patients.filter((patient) => patient.active);
  const inactivePatients = patients.filter((patient) => !patient.active);
  const previousActivePatients = previousPatients.filter((patient) => patient.active);
  const previousInactivePatients = previousPatients.filter((patient) => !patient.active);
  const locationSummary = buildLocations(locations);
  const platformUsage = buildPlatformUsage({
    eligiblePatientsCount: currentPatients.length,
    labels,
    pageViews: patientPageViews,
    pwaInstalledUserIds: patientPwaInstalls.flatMap((event) =>
      event.user_id ? [event.user_id] : [],
    ),
  });

  const summary: AdminPatientsDashboardSummary = {
    cards: {
      active_patients: metric({
        current: activePatients.length,
        description: "Contas de pacientes com user.active=true no snapshot atual.",
        id: "active_patients",
        label: "Pacientes ativos",
        previous: previousActivePatients.length,
        source: "user.role=paciente+user.active=true",
      }),
      inactive_patients: metric({
        current: inactivePatients.length,
        description: "Contas de pacientes com user.active=false no snapshot atual.",
        id: "inactive_patients",
        label: "Pacientes inativos",
        previous: previousInactivePatients.length,
        source: "user.role=paciente+user.active=false",
      }),
      new_signups: metric({
        current: currentNewPatients,
        description: "Usuários com role paciente criados no período selecionado.",
        id: "new_signups",
        label: "Novos cadastros",
        previous: previousNewPatients,
        source: "user.role=paciente+user.createdAt",
      }),
      total_patients: metric({
        current: patients.length,
        description: "Total atual de usuários não deletados com role paciente.",
        id: "total_patients",
        label: "Total de pacientes",
        previous: previousPatients.length,
        source: "user.role=paciente",
      }),
    },
    coverage_notes: [
      "Status ativo/inativo representa o estado da conta em user.active, não engajamento recente.",
      "Atividade recente usa eventos reais de comunidade, reações e salvamentos já persistidos.",
      "Uso da plataforma mede somente pageviews autenticados e eventos first-party de instalação PWA de pacientes no período selecionado.",
      "Tempo médio do paciente usa pageviews autenticados first-party e ignora períodos em que o app fica oculto/minimizado quando o navegador envia eventos de visibilidade.",
      "Localização usa apenas dados agregados e coarse de visitor_location; coordenadas, IP e endereço não são retornados.",
    ],
    demographics: buildDemographics(patients),
    export: {
      available: false,
      reason: "Exportação não exibida porque ainda não existe endpoint real para pacientes.",
    },
    locations: locationSummary,
    period,
    platform_usage: platformUsage,
    recent_patients: {
      items: recentPatients.map(mapRecentPatient),
      source: "user+patient_profile+visitor_location+community_activity",
      total: patients.length,
    },
    series: {
      points: buildSeries(patients, labels),
      source: "user.createdAt+user.active",
    },
    unavailable: [
      ...(platformUsage.duration_unavailable_reason
        ? [
            {
              description: platformUsage.duration_unavailable_reason,
              id: "patient_average_duration",
              label: "Tempo médio do paciente",
              source: platformUsage.source,
            },
          ]
        : []),
      ...(platformUsage.unavailable_reason
        ? [
            {
              description:
                "Uso da plataforma por pacientes depende de page_view_event autenticado no período selecionado.",
              id: "platform_usage",
              label: "Uso da plataforma",
              source: "page_view_event",
            },
          ]
        : []),
      ...(locationSummary.total === 0
        ? [
            {
              description:
                "Nenhuma visitor_location vinculada a pacientes foi encontrada; a seção de localização fica vazia sem inferir endereço.",
              id: "locations",
              label: "Localização agregada",
              source: "visitor_location",
            },
          ]
        : []),
    ],
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export default async (data: IAdminPatientsDashboardDTO): Promise<Resolve> => {
  return buildPatientsDashboard(data.q ?? {});
};

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
  type AdminPatientRecentRecord,
  type AdminPatientSnapshotRecord,
  AdminPatientsDashboardRepository,
} from "../repositories/AdminPatientsDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 90;
const MS_PER_DAY = 86_400_000;

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

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  manual: "E-mail",
};

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

const resolvePeriod = (query: AdminPatientsDashboardQuery): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);

  let start: Date;
  let end: Date;
  let label = "Últimos 7 dias";

  if (hasCustomFrom || hasCustomTo) {
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
    label = "Período personalizado";
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

const providerLabel = (provider: string) => PROVIDER_LABELS[provider] ?? provider;

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
    items: buildBreakdown(
      patients.map((patient) => ({
        id: normalizeKey(patient.provider || "manual"),
        label: providerLabel(patient.provider || "manual"),
      })),
      patients.length,
      5,
    ),
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

export const buildPatientsDashboard = async (
  query: AdminPatientsDashboardQuery,
): Promise<Resolve> => {
  const resolvedPeriod = resolvePeriod(query ?? {});
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const repository = new AdminPatientsDashboardRepository();
  const { current, labels, period, previous } = resolvedPeriod.period;
  const [patients, recentPatients, locations] = await Promise.all([
    repository.listPatientSnapshots(),
    repository.listRecentPatients(5),
    repository.listLocations(),
  ]);

  const previousPatients = patients.filter((patient) => createdUntil(patient, previous.end));
  const currentNewPatients = countNewPatients(patients, current);
  const previousNewPatients = countNewPatients(patients, previous);
  const activePatients = patients.filter((patient) => patient.active);
  const inactivePatients = patients.filter((patient) => !patient.active);
  const previousActivePatients = previousPatients.filter((patient) => patient.active);
  const previousInactivePatients = previousPatients.filter((patient) => !patient.active);
  const locationSummary = buildLocations(locations);

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
      "Localização usa apenas dados agregados e coarse de visitor_location; coordenadas, IP e endereço não são retornados.",
    ],
    demographics: buildDemographics(patients),
    export: {
      available: false,
      reason: "Exportação não exibida porque ainda não existe endpoint real para pacientes.",
    },
    locations: locationSummary,
    period,
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

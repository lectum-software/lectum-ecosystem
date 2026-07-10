import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPatientDetailActivityItem,
  AdminPatientDetailCommunity,
  AdminPatientDetailDateRange,
  AdminPatientDetailDTO,
  AdminPatientDetailHeatmapCell,
  AdminPatientDetailMetric,
  AdminPatientDetailPeriod,
  AdminPatientDetailQuery,
  AdminPatientDetailSeriesPoint,
  IAdminPatientDetailDTO,
} from "../DTOs/IAdminPatientDetailDTO";
import {
  type AdminPatientDetailRecord,
  AdminPatientDetailRepository,
  type AdminPatientEngagementBundle,
} from "../repositories/AdminPatientDetailRepository";

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 90;
const MS_PER_DAY = 86_400_000;
const TIMEZONE = "America/Sao_Paulo" as const;
const HEATMAP_DAYS = [
  { id: "mon", label: "Seg" },
  { id: "tue", label: "Ter" },
  { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" },
  { id: "fri", label: "Sex" },
  { id: "sat", label: "SÃ¡b" },
  { id: "sun", label: "Dom" },
] as const;
const HEATMAP_HOURS = [0, 4, 8, 12, 16, 20] as const;

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
  responses_received: number;
  upvotes_received: number;
};

type CommunityLike = {
  avatar_url: string | null;
  id: string;
  name: string;
  slug: string;
  visual_primary_color: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  manual: "E-mail",
};

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

const resolvePeriod = (query: AdminPatientDetailQuery): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);

  let start: Date;
  let end: Date;
  let label = "Ãšltimos 30 dias";

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
    label = "PerÃ­odo personalizado";
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

const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Paciente";

const providerLabel = (provider: string) => PROVIDER_LABELS[provider] ?? provider;

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

  return "conteÃºdo";
};

const countsFromBundle = (bundle: AdminPatientEngagementBundle): EngagementCounts => ({
  comments_created: bundle.replies.length,
  downvotes_received: bundle.votesReceived.filter((vote) => vote.value < 0).length,
  posts_created: bundle.posts.length,
  responses_received: bundle.responsesReceived.length,
  upvotes_received: bundle.votesReceived.filter((vote) => vote.value > 0).length,
});

const buildMetrics = (
  current: EngagementCounts,
  previous: EngagementCounts,
): AdminPatientDetailMetric[] => [
  metric({
    current: current.posts_created,
    description: "Posts publicados pelo paciente no perÃ­odo.",
    id: "posts_created",
    label: "Posts criados",
    previous: previous.posts_created,
    source: "community_post.author_id",
  }),
  metric({
    current: current.comments_created,
    description: "ComentÃ¡rios ou respostas criados pelo paciente no perÃ­odo.",
    id: "comments_created",
    label: "ComentÃ¡rios",
    previous: previous.comments_created,
    source: "post_reply.author_id",
  }),
  metric({
    current: current.upvotes_received,
    description: "Votos positivos recebidos em posts e respostas do paciente.",
    id: "upvotes_received",
    label: "Upvotes recebidos",
    previous: previous.upvotes_received,
    source: "post_vote.value>0 em conteÃºdo do paciente",
  }),
  metric({
    current: current.downvotes_received,
    description: "Votos negativos recebidos em posts e respostas do paciente.",
    id: "downvotes_received",
    label: "Downvotes recebidos",
    previous: previous.downvotes_received,
    source: "post_vote.value<0 em conteÃºdo do paciente",
  }),
  metric({
    current: current.responses_received,
    description: "Respostas de terceiros em posts ou replies do paciente.",
    id: "responses_received",
    label: "Respostas recebidas",
    previous: previous.responses_received,
    source: "post_reply em conteÃºdo do paciente",
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
    responses_received: 0,
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
  for (const reply of bundle.responsesReceived) increment(reply.createdAt, "responses_received");

  return labels.map((label) => points.get(label) ?? emptyPoint(label));
};

const activityFromPost = (
  post: AdminPatientEngagementBundle["posts"][number],
): AdminPatientDetailActivityItem => ({
  description: `Criou um post na comunidade ${post.community.name}: ${snippet(post.content, "sem conteÃºdo textual")}.`,
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
  description: `Comentou no post "${reply.post.title}": ${snippet(reply.content, "comentÃ¡rio sem texto")}.`,
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
  description: `Criou uma avaliaÃ§Ã£o profissional com nota ${review.rating}. O comentÃ¡rio nÃ£o Ã© exibido nesta visÃ£o operacional.`,
  detail_url: null,
  id: `review-${review.id}`,
  occurred_at: review.createdAt,
  source: "professional_review",
  title: "AvaliaÃ§Ã£o criada",
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
      color: community.visual_primary_color,
      id: community.id,
      interactions: 0,
      is_member: false,
      member_since: null,
      name: community.name,
      slug: community.slug,
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
  for (const post of bundle.posts) upsertCommunity(communities, communityFromPost(post), 1);
  for (const reply of bundle.replies) upsertCommunity(communities, communityFromReply(reply), 1);
  for (const vote of bundle.votesMade) {
    const community = communityFromVote(vote);
    if (community) upsertCommunity(communities, community, 1);
  }
  for (const save of bundle.postSaves) {
    upsertCommunity(communities, communityFromPostSave(save), 1);
  }
  for (const save of bundle.replySaves) {
    upsertCommunity(communities, communityFromReplySave(save), 1);
  }

  return [...communities.values()]
    .sort((left, right) => {
      if (right.interactions !== left.interactions) return right.interactions - left.interactions;
      if (Number(right.is_member) !== Number(left.is_member)) {
        return Number(right.is_member) - Number(left.is_member);
      }

      return left.name.localeCompare(right.name, "pt-BR");
    })
    .slice(0, 5);
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
        ? "Sem eventos suficientes de posts, comentÃ¡rios, votos ou salvamentos no perÃ­odo."
        : null,
  };
};

const buildHeader = (patient: AdminPatientDetailRecord): AdminPatientDetailDTO["header"] => {
  const latestLocation = patient.visitor_locations[0] ?? null;

  return {
    active: patient.active,
    avatar: patient.avatar,
    created_at: patient.createdAt,
    email: patient.email,
    gender: patient.patient_profile?.gender ?? null,
    id: patient.id,
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
): AdminPatientDetailDTO => {
  const currentCounts = countsFromBundle(currentBundle);
  const previousCounts = countsFromBundle(previousBundle);
  const heatmap = buildHeatmap(currentBundle);
  const unavailable = [
    ...(!patient.visitor_locations[0]
      ? [
          {
            description:
              "Nenhuma visitor_location vinculada ao paciente foi encontrada; localizaÃ§Ã£o precisa nÃ£o Ã© inferida.",
            id: "location",
            label: "LocalizaÃ§Ã£o agregada",
            source: "visitor_location",
          },
        ]
      : []),
    ...(!heatmap.available
      ? [
          {
            description: heatmap.unavailable_reason ?? "Sem eventos suficientes no perÃ­odo.",
            id: "heatmap",
            label: "HorÃ¡rios de maior atividade",
            source: heatmap.source,
          },
        ]
      : []),
  ];

  return {
    activities: {
      coverage_note:
        "Atividades sÃ£o derivadas de posts, comentÃ¡rios, votos, salvamentos, entrada em comunidades e avaliaÃ§Ãµes reais. Login nÃ£o Ã© exibido porque nÃ£o hÃ¡ evento de login confiÃ¡vel nesta V1.",
      items: buildActivities(currentBundle),
      source: "community_activity+professional_review",
    },
    communities: {
      items: buildActiveCommunities(currentBundle),
      source: "community_member+community_post+post_reply+post_vote+post_save+post_reply_save",
    },
    coverage_notes: [
      "Tela somente leitura: nÃ£o hÃ¡ aÃ§Ãµes de bloquear, silenciar, banir, excluir ou moderar paciente.",
      "Status Ativo/Inativo representa user.active, nÃ£o retenÃ§Ã£o nem engajamento recente.",
      "E-mail Ã© exibido apenas para admin autenticado; telefone, nascimento, bio, IP, coordenadas e endereÃ§o completo sÃ£o omitidos na V1.",
      "LocalizaÃ§Ã£o, quando disponÃ­vel, usa apenas dados coarse de visitor_location.",
    ],
    header: buildHeader(patient),
    heatmap,
    metrics: buildMetrics(currentCounts, previousCounts),
    period,
    privacy: {
      omitted_fields: [
        "patient_profile.phone",
        "patient_profile.birthdate",
        "patient_profile.bio",
        "IP",
        "coordenadas",
        "endereÃ§o completo",
        "comentÃ¡rio textual de avaliaÃ§Ãµes profissionais",
      ],
      visible_fields: [
        "user.id",
        "user.name",
        "user.email",
        "user.avatar",
        "user.active",
        "user.provider",
        "user.createdAt",
        "patient_profile.gender",
        "visitor_location.city/state/country",
      ],
    },
    series: {
      points: buildSeries(labels, currentBundle),
      source: "community_post+post_reply+post_vote+responses",
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
  const resolvedPeriod = resolvePeriod(data.q ?? {});
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const repository = new AdminPatientDetailRepository();
  const patient = await repository.findPatient(data.p.id);
  if (!patient) return notFound();

  const { current, labels, period, previous } = resolvedPeriod.period;
  const [currentBundle, previousBundle] = await Promise.all([
    repository.listEngagementBundle(patient.id, current),
    repository.listEngagementBundle(patient.id, previous),
  ]);

  return {
    status: 200,
    ...msg("index", {}),
    data: buildDetail(patient, period, labels, currentBundle, previousBundle),
  };
};

export default async (data: IAdminPatientDetailDTO): Promise<Resolve> => {
  return showAdminPatient(data);
};

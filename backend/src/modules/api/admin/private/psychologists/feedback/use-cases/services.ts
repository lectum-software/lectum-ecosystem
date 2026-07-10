import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPsychologistReportItem,
  AdminPsychologistReportsDTO,
  AdminPsychologistReportsQuery,
  AdminPsychologistReportsStatusGroup,
  AdminPsychologistReviewDistributionItem,
  AdminPsychologistReviewItem,
  AdminPsychologistReviewsDTO,
  AdminPsychologistReviewsQuery,
  IAdminPsychologistReportsDTO,
  IAdminPsychologistReviewsDTO,
} from "../DTOs/IAdminPsychologistFeedbackDTO";
import {
  AdminPsychologistFeedbackRepository,
  type AdminPsychologistReportRecord,
  type AdminPsychologistReviewRecord,
} from "../repositories/AdminPsychologistFeedbackRepository";

const DEFAULT_REVIEWS_LIMIT = 10;
const DEFAULT_REPORTS_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_REPORT_PERIOD_DAYS = 90;
const MAX_REPORT_PERIOD_DAYS = 180;
const MS_PER_DAY = 86_400_000;

const pad = (value: number) => String(value).padStart(2, "0");
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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

type ReportsPeriodResult =
  | {
      current: { end: Date; start: Date };
      period: AdminPsychologistReportsDTO["period"];
      success: true;
    }
  | { code: string; success: false };

const resolveReportsPeriod = (query: { from?: string; to?: string } = {}): ReportsPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  let start: Date;
  let end: Date;
  let label = "Últimos 90 dias";

  if (hasCustomFrom || hasCustomTo) {
    if (!hasCustomFrom || !hasCustomTo)
      return { success: false, code: "invalid_analytics_date_range" };

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
    start = startOfDate(addDays(today, -(DEFAULT_REPORT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_REPORT_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    current: { end, start },
    period: {
      days,
      from: toDateKey(start),
      label,
      max_days: MAX_REPORT_PERIOD_DAYS,
      timezone: "server-local",
      to: toDateKey(end),
    },
    success: true,
  };
};

const normalizePagination = (input: { limit?: number; page?: number }, defaultLimit: number) => {
  const limit = Math.min(Math.max(Number(input.limit || defaultLimit), 1), MAX_LIMIT);
  const page = Math.max(Number(input.page || 1), 1);

  return {
    limit,
    page,
  };
};

const normalizeText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const labelFromStatus = (status: string) => {
  const normalized = normalizeText(status).replace(/_/g, " ");

  const labels: Record<string, string> = {
    aprovada: "Aprovada",
    aprovado: "Aprovado",
    em_analise: "Em análise",
    "em analise": "Em análise",
    improcedente: "Improcedente",
    pendente: "Pendente",
    procedente: "Procedente",
    publicada: "Publicada",
    rejeitada: "Rejeitada",
    rejeitado: "Rejeitado",
    resolvida: "Resolvida",
    resolvido: "Resolvido",
  };

  return labels[normalized] ?? status;
};

const reportStatusGroup = (status: string): AdminPsychologistReportsStatusGroup => {
  const normalized = normalizeText(status).replace(/_/g, " ");

  if (["improcedente", "rejeitada", "rejeitado", "dismissed", "rejected"].includes(normalized)) {
    return "dismissed";
  }

  if (
    ["procedente", "resolvida", "resolvido", "aprovada", "aprovado", "upheld"].includes(normalized)
  ) {
    return "upheld";
  }

  return "in_review";
};

const reasonLabel = (reason: string) => {
  const labels: Record<string, string> = {
    abuse: "Abuso ou desrespeito",
    other: "Outro motivo",
    privacy: "Dados pessoais ou privacidade",
    self_harm: "Autolesão ou risco",
    spam: "Spam",
  };

  return labels[reason] ?? reason;
};

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    paciente: "Paciente",
    psicologo: "Psicólogo",
  };

  return labels[role] ?? "Usuário";
};

const excerpt = (value: string | null | undefined, max = 120) => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Sem descrição.";
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}…`;
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

const distributionFromReviews = (
  reviews: AdminPsychologistReviewRecord[],
): AdminPsychologistReviewDistributionItem[] => {
  const total = reviews.length;

  return ([5, 4, 3, 2, 1] as const).map((rating) => {
    const count = reviews.filter((review) => review.rating === rating).length;

    return {
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      rating,
    };
  });
};

const statusOptionsFromReviews = (reviews: AdminPsychologistReviewRecord[]) => {
  const statusCounts = new Map<string, number>();

  for (const review of reviews) {
    statusCounts.set(review.status, (statusCounts.get(review.status) ?? 0) + 1);
  }

  return [...statusCounts.entries()]
    .sort(([left], [right]) => labelFromStatus(left).localeCompare(labelFromStatus(right), "pt-BR"))
    .map(([id, count]) => ({ count, id, label: labelFromStatus(id) }));
};

const reviewMatches = (
  review: AdminPsychologistReviewRecord,
  query: ReturnType<typeof normalizeReviewsQuery>,
) => {
  if (query.rating !== "all" && review.rating !== Number(query.rating)) return false;
  if (query.status !== "all" && review.status !== query.status) return false;

  return true;
};

const toReviewItem = (review: AdminPsychologistReviewRecord): AdminPsychologistReviewItem => ({
  author: {
    avatar: review.author.avatar,
    id: review.author.id,
    name: review.author.name,
    role: review.author.role,
  },
  comment: review.comment,
  created_at: review.createdAt,
  id: review.id,
  rating: review.rating,
  response: review.response,
  responded_at: review.responded_at,
  status: review.status,
  status_label: labelFromStatus(review.status),
});

const normalizeReviewsQuery = (query: AdminPsychologistReviewsQuery = {}) => ({
  ...normalizePagination(query, DEFAULT_REVIEWS_LIMIT),
  rating: query.rating && query.rating >= 1 && query.rating <= 5 ? String(query.rating) : "all",
  status: query.status?.trim() || "all",
});

export const showAdminPsychologistReviews = async (
  data: IAdminPsychologistReviewsDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistFeedbackRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const query = normalizeReviewsQuery(data.q ?? {});
  const reviews = await repository.listReviews(profile.user.id);
  const filtered = reviews.filter((review) => reviewMatches(review, query));
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);
  const ratingSum = reviews.reduce((total, review) => total + review.rating, 0);
  const ratingAvg = reviews.length > 0 ? Math.round((ratingSum / reviews.length) * 10) / 10 : 0;
  const statusOptions = statusOptionsFromReviews(reviews);

  const response: AdminPsychologistReviewsDTO = {
    access: {
      mode: "read_only",
      restrictions: ["Admin não edita, exclui, aprova, reprova nem responde avaliações nesta V1."],
    },
    active_filters_count: [
      query.rating !== "all" ? query.rating : "",
      query.status !== "all" ? query.status : "",
    ].filter(Boolean).length,
    count,
    data: dataSlice.map(toReviewItem),
    filters: {
      ratings: ["all", "5", "4", "3", "2", "1"].map((rating) => ({
        count:
          rating === "all"
            ? reviews.length
            : reviews.filter((review) => review.rating === Number(rating)).length,
        id: rating,
        label: rating === "all" ? "Todas as avaliações" : `${rating} estrelas`,
      })),
      statuses: [{ count: reviews.length, id: "all", label: "Todos os status" }, ...statusOptions],
    },
    page,
    pages,
    per_page: query.limit,
    source: "professional_review",
    summary: {
      distribution: distributionFromReviews(reviews),
      rating_avg: ratingAvg,
      rating_count: reviews.length,
      statuses: statusOptions,
    },
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

const normalizeReportsQuery = (query: AdminPsychologistReportsQuery = {}) => ({
  ...normalizePagination(query, DEFAULT_REPORTS_LIMIT),
  from: query.from,
  status:
    query.status === "in_review" || query.status === "dismissed" || query.status === "upheld"
      ? query.status
      : "all",
  to: query.to,
  type: query.type === "post" || query.type === "reply" ? query.type : "all",
});

const reportContentType = (report: AdminPsychologistReportRecord): "post" | "reply" =>
  report.reply ? "reply" : "post";

const toReportItem = (report: AdminPsychologistReportRecord): AdminPsychologistReportItem => {
  const type = reportContentType(report);
  const statusGroup = reportStatusGroup(report.status);
  const community = type === "reply" ? report.reply!.post.community : report.post.community;
  const postId = type === "reply" ? report.reply!.post.id : report.post.id;
  const title =
    type === "reply"
      ? report.reply!.title || `Resposta em: ${report.reply!.post.title}`
      : report.post.title;
  const content = type === "reply" ? report.reply!.content : report.post.content;
  const publicUrl =
    type === "reply"
      ? `/community/${community.slug}/post/${postId}/thread/${report.reply!.id}`
      : `/community/${community.slug}/post/${postId}`;

  return {
    content: {
      community,
      excerpt: excerpt(content),
      id: type === "reply" ? report.reply!.id : report.post.id,
      public_url: publicUrl,
      title,
      type,
    },
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    reason: report.reason,
    reason_label: reasonLabel(report.reason),
    reported_by: {
      label: roleLabel(report.reporter.role),
      role: report.reporter.role,
    },
    status: report.status,
    status_group: statusGroup,
    status_label: labelFromStatus(report.status),
  };
};

const reportMatches = (
  report: AdminPsychologistReportItem,
  query: ReturnType<typeof normalizeReportsQuery>,
) => {
  if (query.type !== "all" && report.content.type !== query.type) return false;
  if (query.status !== "all" && report.status_group !== query.status) return false;

  return true;
};

export const showAdminPsychologistReports = async (
  data: IAdminPsychologistReportsDTO,
): Promise<Resolve> => {
  const query = normalizeReportsQuery(data.q ?? {});
  const period = resolveReportsPeriod({ from: query.from, to: query.to });
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const repository = new AdminPsychologistFeedbackRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const reports = await repository.listReports(
    profile.user.id,
    period.current.start,
    period.current.end,
  );
  const items = reports.map(toReportItem);
  const filtered = items.filter((item) => reportMatches(item, query));
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);
  const countByStatus = (status: AdminPsychologistReportsStatusGroup) =>
    items.filter((item) => item.status_group === status).length;
  const countByType = (type: "post" | "reply") =>
    items.filter((item) => item.content.type === type).length;

  const response: AdminPsychologistReportsDTO = {
    access: {
      mode: "read_only",
      restrictions: ["Admin não resolve, aprova, rejeita nem altera status de denúncias nesta V1."],
    },
    active_filters_count: [
      query.type !== "all" ? query.type : "",
      query.status !== "all" ? query.status : "",
      query.from && query.to ? "period" : "",
    ].filter(Boolean).length,
    cards: [
      { id: "total", label: "Total de denúncias", source: "post_report", value: items.length },
      {
        id: "in_review",
        label: "Em análise",
        source: "post_report",
        value: countByStatus("in_review"),
      },
      {
        id: "dismissed",
        label: "Improcedentes",
        source: "post_report",
        value: countByStatus("dismissed"),
      },
      { id: "upheld", label: "Procedentes", source: "post_report", value: countByStatus("upheld") },
    ],
    count,
    data: dataSlice,
    filters: {
      statuses: [
        { count: items.length, id: "all", label: "Todos os status" },
        { count: countByStatus("in_review"), id: "in_review", label: "Em análise" },
        { count: countByStatus("dismissed"), id: "dismissed", label: "Improcedentes" },
        { count: countByStatus("upheld"), id: "upheld", label: "Procedentes" },
      ],
      types: [
        { count: items.length, id: "all", label: "Todos" },
        { count: countByType("post"), id: "post", label: "Posts" },
        { count: countByType("reply"), id: "reply", label: "Respostas" },
      ],
    },
    page,
    pages,
    per_page: query.limit,
    period: period.period,
    source: "post_report+community_post+post_reply",
    unavailable: [],
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

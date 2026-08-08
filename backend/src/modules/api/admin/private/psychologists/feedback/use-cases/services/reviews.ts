import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  addDays,
  daysBetweenInclusive,
  endOfDate,
  parseDateOnly,
  startOfDate,
  toDateKey,
} from "@/utils/date-range";
import type {
  AdminPsychologistReportsDTO,
  AdminPsychologistReportsStatusGroup,
  AdminPsychologistReviewDistributionItem,
  AdminPsychologistReviewItem,
  AdminPsychologistReviewsDTO,
  AdminPsychologistReviewsQuery,
  IAdminPsychologistReviewsDTO,
} from "../../DTOs/IAdminPsychologistFeedbackDTO";
import {
  AdminPsychologistFeedbackRepository,
  type AdminPsychologistReviewRecord,
} from "../../repositories/AdminPsychologistFeedbackRepository";

export const DEFAULT_REVIEWS_LIMIT = 10;

export const DEFAULT_REPORTS_LIMIT = 10;

export const MAX_LIMIT = 50;

export const DEFAULT_REPORT_PERIOD_DAYS = 90;

export const MAX_REPORT_PERIOD_DAYS = 180;

export const DISMISS_REPORT_CONFIRMATION = "DENUNCIA IMPROCEDENTE";

export const UPHOLD_REPORT_CONFIRMATION = "DENUNCIA PROCEDENTE";

export const REVIEW_REPORT_CONFIRMATION = "REVISAR DECISAO";

export type ReportsPeriodResult =
  | {
      current: { end: Date; start: Date };
      period: AdminPsychologistReportsDTO["period"];
      success: true;
    }
  | { code: string; success: false };

export const resolveReportsPeriod = (
  query: { from?: string; to?: string } = {},
): ReportsPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  let start: Date;
  let end: Date;
  let label = "\u00daltimos 90 dias";

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
    label = "Per\u00edodo personalizado";
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

export const normalizePagination = (
  input: { limit?: number; page?: number },
  defaultLimit: number,
) => {
  const limit = Math.min(Math.max(Number(input.limit || defaultLimit), 1), MAX_LIMIT);
  const page = Math.max(Number(input.page || 1), 1);

  return {
    limit,
    page,
  };
};

export const normalizeText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const labelFromStatus = (status: string) => {
  const normalized = normalizeText(status).replace(/_/g, " ");

  const labels: Record<string, string> = {
    aprovada: "Aprovada",
    aprovado: "Aprovado",
    "em analise": "Pendente",
    em_analise: "Pendente",
    improcedente: "Improcedente",
    pendente: "Pendente",
    procedente: "Procedente",
    publicada: "Publicada",
    rejeitada: "Improcedente",
    rejeitado: "Improcedente",
    resolvida: "Procedente",
    resolvido: "Procedente",
  };

  return labels[normalized] ?? status;
};

export const reportStatusGroup = (status: string): AdminPsychologistReportsStatusGroup => {
  const normalized = normalizeText(status).replace(/_/g, " ");

  if (["pendente", "pending"].includes(normalized)) return "pending";
  if (["em analise", "in review", "in_review"].includes(normalized)) return "pending";

  if (["improcedente", "rejeitada", "rejeitado", "dismissed", "rejected"].includes(normalized)) {
    return "dismissed";
  }

  if (
    ["procedente", "resolvida", "resolvido", "aprovada", "aprovado", "upheld"].includes(normalized)
  ) {
    return "upheld";
  }

  return "pending";
};

export const reasonLabel = (reason: string) => {
  const labels: Record<string, string> = {
    abuse: "Abuso ou desrespeito",
    other: "Outro motivo",
    privacy: "Dados pessoais ou privacidade",
    self_harm: "Autoles\u00e3o ou risco",
    spam: "Spam",
  };

  return labels[reason] ?? reason;
};

export const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    paciente: "Paciente",
    psicologo: "Psic\u00f3logo",
  };

  return labels[role] ?? "Usu\u00e1rio";
};

export const excerpt = (value: string | null | undefined, max = 120) => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Sem descri\u00e7\u00e3o.";
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}...`;
};

export const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

export const reportNotFound = () => ({
  status: 404,
  ...error("not_found", { model: "post_report" }),
});

export const adminRequired = () => ({
  status: 403,
  ...error("role_not_authorized", {}),
});

export const invalidReportStatus = () => ({
  status: 409,
  ...error("admin_psychologist_report_invalid_status", {}),
});

export const distributionFromReviews = (
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

export const statusOptionsFromReviews = (reviews: AdminPsychologistReviewRecord[]) => {
  const statusCounts = new Map<string, number>();

  for (const review of reviews) {
    statusCounts.set(review.status, (statusCounts.get(review.status) ?? 0) + 1);
  }

  return [...statusCounts.entries()]
    .sort(([left], [right]) => labelFromStatus(left).localeCompare(labelFromStatus(right), "pt-BR"))
    .map(([id, count]) => ({ count, id, label: labelFromStatus(id) }));
};

export const reviewMatches = (
  review: AdminPsychologistReviewRecord,
  query: ReturnType<typeof normalizeReviewsQuery>,
) => {
  if (query.rating !== "all" && review.rating !== Number(query.rating)) return false;
  if (query.status !== "all" && review.status !== query.status) return false;

  return true;
};

export const toReviewItem = (
  review: AdminPsychologistReviewRecord,
): AdminPsychologistReviewItem => ({
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

export const normalizeReviewsQuery = (query: AdminPsychologistReviewsQuery = {}) => ({
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
      restrictions: [
        "Administradores n\u00e3o editam, excluem, aprovam, reprovam ou respondem avalia\u00e7\u00f5es nesta \u00e1rea.",
      ],
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
        label: rating === "all" ? "Todas as avalia\u00e7\u00f5es" : `${rating} estrelas`,
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

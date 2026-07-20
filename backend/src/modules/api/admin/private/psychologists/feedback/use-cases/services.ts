import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import type {
  AdminPsychologistReportActionDTO,
  AdminPsychologistReportItem,
  AdminPsychologistReportResolveBody,
  AdminPsychologistReportsDTO,
  AdminPsychologistReportsQuery,
  AdminPsychologistReportsStatusGroup,
  AdminPsychologistReviewDistributionItem,
  AdminPsychologistReviewItem,
  AdminPsychologistReviewsDTO,
  AdminPsychologistReviewsQuery,
  IAdminPsychologistReportResolveDTO,
  IAdminPsychologistReportsDTO,
  IAdminPsychologistReviewsDTO,
} from "../DTOs/IAdminPsychologistFeedbackDTO";
import {
  AdminPsychologistFeedbackRepository,
  type AdminPsychologistReportAudit,
  type AdminPsychologistReportMutationResult,
  type AdminPsychologistReportRecord,
  type AdminPsychologistReviewRecord,
} from "../repositories/AdminPsychologistFeedbackRepository";

const DEFAULT_REVIEWS_LIMIT = 10;
const DEFAULT_REPORTS_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_REPORT_PERIOD_DAYS = 90;
const MAX_REPORT_PERIOD_DAYS = 180;
const MS_PER_DAY = 86_400_000;
const DISMISS_REPORT_CONFIRMATION = "DENUNCIA IMPROCEDENTE";
const UPHOLD_REPORT_CONFIRMATION = "DENUNCIA PROCEDENTE";
const REVIEW_REPORT_CONFIRMATION = "REVISAR DECISAO";

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

const reportStatusGroup = (status: string): AdminPsychologistReportsStatusGroup => {
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

const reasonLabel = (reason: string) => {
  const labels: Record<string, string> = {
    abuse: "Abuso ou desrespeito",
    other: "Outro motivo",
    privacy: "Dados pessoais ou privacidade",
    self_harm: "Autoles\u00e3o ou risco",
    spam: "Spam",
  };

  return labels[reason] ?? reason;
};

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    paciente: "Paciente",
    psicologo: "Psic\u00f3logo",
  };

  return labels[role] ?? "Usu\u00e1rio";
};

const excerpt = (value: string | null | undefined, max = 120) => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Sem descri\u00e7\u00e3o.";
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}...`;
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

const reportNotFound = () => ({
  status: 404,
  ...error("not_found", { model: "post_report" }),
});

const adminRequired = () => ({
  status: 403,
  ...error("role_not_authorized", {}),
});

const invalidReportStatus = () => ({
  status: 409,
  ...error("admin_psychologist_report_invalid_status", {}),
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
      restrictions: [
        "Admin n\u00e3o edita, exclui, aprova, reprova nem responde avalia\u00e7\u00f5es nesta V1.",
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

const normalizeReportsQuery = (query: AdminPsychologistReportsQuery = {}) => ({
  ...normalizePagination(query, DEFAULT_REPORTS_LIMIT),
  from: query.from,
  status:
    query.status === "pending" || query.status === "dismissed" || query.status === "upheld"
      ? query.status
      : query.status === "in_review"
        ? "pending"
        : "all",
  to: query.to,
  type: query.type === "post" || query.type === "reply" ? query.type : "all",
});

const reportContentType = (report: AdminPsychologistReportRecord): "post" | "reply" =>
  report.reply ? "reply" : "post";

const reportContentAvailable = (report: AdminPsychologistReportRecord) => {
  if (report.reply) {
    return (
      !report.reply.deleted &&
      !report.reply.post.deleted &&
      report.reply.post.status === "publicado" &&
      !report.reply.post.community.deleted
    );
  }

  return (
    !report.post.deleted && report.post.status === "publicado" && !report.post.community.deleted
  );
};

const reportUnavailableReason = (report: AdminPsychologistReportRecord) => {
  if (report.reply) {
    if (report.reply.deleted) return "Resposta denunciada j\u00e1 foi removida.";
    if (report.reply.post.deleted || report.reply.post.status !== "publicado") {
      return "Publica\u00e7\u00e3o da resposta j\u00e1 est\u00e1 indispon\u00edvel.";
    }
    if (report.reply.post.community.deleted)
      return "Comunidade da resposta est\u00e1 indispon\u00edvel.";
  } else {
    if (report.post.deleted || report.post.status !== "publicado") {
      return "Publica\u00e7\u00e3o denunciada j\u00e1 est\u00e1 indispon\u00edvel.";
    }
    if (report.post.community.deleted)
      return "Comunidade da publica\u00e7\u00e3o est\u00e1 indispon\u00edvel.";
  }

  return null;
};

const canResolve = (status: string) => {
  const group = reportStatusGroup(status);
  return group === "pending";
};

const reportStatusFromResolution = (
  resolution: AdminPsychologistReportResolveBody["resolution"],
) => {
  if (resolution === "dismissed") return "rejeitada";
  if (resolution === "upheld") return "resolvida";
  if (resolution === "pending") return "pendente";

  return null;
};

const reportStatusLabelFromResolution = (
  resolution: AdminPsychologistReportResolveBody["resolution"],
) => {
  if (resolution === "dismissed") return "Improcedente";
  if (resolution === "upheld") return "Procedente";
  if (resolution === "pending") return "Pendente";

  return resolution;
};

const reportCommunity = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.post.community : report.post.community;

const reportPostId = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.post.id : report.post.id;

const reportTitle = (report: AdminPsychologistReportRecord) => {
  if (!report.reply) return report.post.title;

  return report.reply.title || `Resposta em: ${report.reply.post.title}`;
};

const reportContent = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.content : report.post.content;

const reportContentCreatedAt = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.createdAt : report.post.createdAt;

type AdminPsychologistReportAuthor =
  | AdminPsychologistReportRecord["post"]["author"]
  | NonNullable<AdminPsychologistReportRecord["reply"]>["author"];

const reportAuthor = (report: AdminPsychologistReportRecord): AdminPsychologistReportAuthor =>
  report.reply ? report.reply.author : report.post.author;

const reportAuthorName = (author: AdminPsychologistReportAuthor) => {
  if (author.role !== "psicologo") return author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: author.psychologist_profile?.professional_first_name,
    lastName: author.psychologist_profile?.professional_last_name,
  });
};

const reportAuthorRoleLabel = (author: AdminPsychologistReportAuthor) => {
  if (author.role !== "psicologo") return roleLabel(author.role);

  return author.psychologist_profile?.gender?.trim().toLowerCase() === "feminino"
    ? "Psicóloga"
    : "Psicólogo";
};

const reportMedia = (report: AdminPsychologistReportRecord) => {
  if (report.reply) {
    if (!report.reply.media_url || !report.reply.media_type) return null;

    return {
      media_type: report.reply.media_type,
      media_url: report.reply.media_url,
    };
  }

  const firstMedia = report.post.media_items[0];
  const mediaUrl = firstMedia?.media_url ?? report.post.media_url;
  const mediaType = firstMedia?.media_type ?? report.post.media_type;

  if (!mediaUrl || !mediaType) return null;

  return {
    media_type: mediaType,
    media_url: mediaUrl,
  };
};

const reportTargetId = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.id : report.post.id;

const reportPublicUrl = (report: AdminPsychologistReportRecord) => {
  if (!reportContentAvailable(report)) return null;

  const community = reportCommunity(report);
  const postId = reportPostId(report);

  return report.reply
    ? `/community/${community.slug}/post/${postId}/thread/${report.reply.id}`
    : `/community/${community.slug}/post/${postId}`;
};

const safeCommunity = (report: AdminPsychologistReportRecord) => {
  const community = reportCommunity(report);

  return {
    id: community.id,
    name: community.name,
    slug: community.slug,
  };
};

const toReportItem = (report: AdminPsychologistReportRecord): AdminPsychologistReportItem => {
  const type = reportContentType(report);
  const statusGroup = reportStatusGroup(report.status);
  const available = reportContentAvailable(report);
  const resolves = canResolve(report.status);
  const author = reportAuthor(report);

  return {
    capabilities: {
      can_review_resolution: !resolves,
      can_remove_content: resolves && available,
      can_resolve_dismissed: resolves,
      can_resolve_upheld: resolves,
    },
    content: {
      author: {
        avatar: author.avatar,
        id: author.id,
        name: reportAuthorName(author),
        role: author.role,
        role_label: reportAuthorRoleLabel(author),
      },
      available,
      body: reportContent(report),
      community: safeCommunity(report),
      created_at: reportContentCreatedAt(report),
      excerpt: excerpt(reportContent(report)),
      id: reportTargetId(report),
      media: reportMedia(report),
      public_url: reportPublicUrl(report),
      title: reportTitle(report),
      type,
      unavailable_reason: available ? null : reportUnavailableReason(report),
    },
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    moderation: {
      status: report.status,
      status_label: labelFromStatus(report.status),
    },
    reason: report.reason,
    reason_label: reasonLabel(report.reason),
    reported_by: {
      label: roleLabel(report.reporter.role),
      name: report.reporter.name,
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
      mode: "moderation",
      restrictions: [
        "Modera\u00e7\u00e3o limitada a triagem e resolu\u00e7\u00e3o da den\u00fancia; san\u00e7\u00f5es de conta ficam fora desta task.",
      ],
    },
    active_filters_count: [
      query.type !== "all" ? query.type : "",
      query.status !== "all" ? query.status : "",
      query.from && query.to ? "period" : "",
    ].filter(Boolean).length,
    cards: [
      { id: "total", label: "Total de den\u00fancias", source: "post_report", value: items.length },
      { id: "pending", label: "Pendentes", source: "post_report", value: countByStatus("pending") },
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
        { count: countByStatus("pending"), id: "pending", label: "Pendentes" },
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

const loadReport = async (psychologistId: string, reportId: string) => {
  const repository = new AdminPsychologistFeedbackRepository();
  const profile = await repository.findPsychologist(psychologistId);
  if (!profile) return { profile: null, report: null, repository };

  const report = await repository.findReportForPsychologist(profile.user.id, reportId);

  return { profile, report, repository };
};

const safeTargetSummary = (report: AdminPsychologistReportRecord) => ({
  Comunidade: reportCommunity(report).name,
  Conteudo: reportTitle(report),
  Tipo: report.reply ? "Resposta" : "Post",
});

const createReportAudit = (input: {
  action: AdminPsychologistReportAudit["action"];
  adminId: string;
  changedFields: string[];
  metadata?: AdminPsychologistReportAudit["metadata"];
  reason: string;
  report: AdminPsychologistReportRecord;
  safeAfter?: AdminPsychologistReportAudit["safeAfter"];
  targetId: string;
}): AdminPsychologistReportAudit => ({
  action: input.action,
  adminId: input.adminId,
  changedFields: input.changedFields,
  metadata: input.metadata,
  reason: input.reason,
  safeAfter: input.safeAfter,
  safeBefore: {
    "Status da denuncia": labelFromStatus(input.report.status),
    ...safeTargetSummary(input.report),
  },
  targetId: input.targetId,
});

const reportActionResponse = (
  result: AdminPsychologistReportMutationResult,
): AdminPsychologistReportActionDTO => ({
  affected_reports_count: result.affectedReportsCount,
  content_already_unavailable: result.contentAlreadyUnavailable,
  content_removed: result.contentRemoved,
  report: toReportItem(result.report),
  source: "post_report+admin_activity_log",
});

const dismissConfirmationIsValid = (body: AdminPsychologistReportResolveBody) =>
  body.confirmation.trim().toUpperCase() === DISMISS_REPORT_CONFIRMATION;

const upholdConfirmationIsValid = (body: AdminPsychologistReportResolveBody) =>
  body.confirmation.trim().toUpperCase() === UPHOLD_REPORT_CONFIRMATION;

export const resolveAdminPsychologistReport = async (
  data: IAdminPsychologistReportResolveDTO,
): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) return adminRequired();

  const { profile, report, repository } = await loadReport(data.p.id, data.p.reportId);
  if (!profile) return notFound();
  if (!report) return reportNotFound();

  const requestedStatus = reportStatusFromResolution(data.b.resolution);
  if (!requestedStatus) return invalidReportStatus();

  const isRevision = !canResolve(report.status);
  if (isRevision) {
    const currentGroup = reportStatusGroup(report.status);
    if (currentGroup === data.b.resolution) return invalidReportStatus();
    if (data.b.confirmation.trim().toUpperCase() !== REVIEW_REPORT_CONFIRMATION) {
      return {
        status: 400,
        ...error("admin_psychologist_report_review_confirmation_invalid", {}),
      };
    }

    const result = await repository.reviseResolution({
      audit: createReportAudit({
        action: "psychologist_report_decision_reviewed",
        adminId: admin.id,
        changedFields: ["Status da denuncia"],
        metadata: {
          previous_resolution: currentGroup,
          resolution: data.b.resolution,
          review: true,
        },
        reason: data.b.reason.trim(),
        report,
        safeAfter: {
          "Status da denuncia": reportStatusLabelFromResolution(data.b.resolution),
          ...safeTargetSummary(report),
        },
        targetId: profile.user.id,
      }),
      report,
      status: requestedStatus,
    });

    return {
      status: 200,
      ...msg("admin_psychologist_report_decision_reviewed", {}),
      data: reportActionResponse(result),
    };
  }

  if (data.b.resolution === "pending") return invalidReportStatus();

  if (data.b.resolution === "dismissed") {
    if (!dismissConfirmationIsValid(data.b)) {
      return {
        status: 400,
        ...error("admin_psychologist_report_dismiss_confirmation_invalid", {}),
      };
    }

    const result = await repository.resolveDismissed({
      audit: createReportAudit({
        action: "psychologist_report_dismissed",
        adminId: admin.id,
        changedFields: ["Status da denuncia"],
        metadata: {
          resolution: "dismissed",
        },
        reason: data.b.reason.trim(),
        report,
        safeAfter: {
          "Status da denuncia": "Improcedente",
          ...safeTargetSummary(report),
        },
        targetId: profile.user.id,
      }),
      report,
    });

    return {
      status: 200,
      ...msg("admin_psychologist_report_dismissed", {}),
      data: reportActionResponse(result),
    };
  }

  if (data.b.resolution !== "upheld") return invalidReportStatus();

  if (!upholdConfirmationIsValid(data.b)) {
    return {
      status: 400,
      ...error("admin_psychologist_report_uphold_confirmation_invalid", {}),
    };
  }

  const measure = data.b.measure === "remove_content" ? "remove_content" : "none";
  const action: AdminPsychologistReportAudit["action"] =
    measure === "remove_content"
      ? "psychologist_report_content_removed"
      : "psychologist_report_upheld";
  const result = await repository.resolveUpheld({
    audit: createReportAudit({
      action,
      adminId: admin.id,
      changedFields:
        measure === "remove_content"
          ? ["Status da denuncia", "Conteudo denunciado"]
          : ["Status da denuncia"],
      metadata: {
        measure,
        resolution: "upheld",
      },
      reason: data.b.reason.trim(),
      report,
      safeAfter: {
        "Medida aplicada":
          measure === "remove_content" ? "Remover conteudo denunciado" : "Manter conteudo",
        "Status da denuncia": "Procedente",
        ...safeTargetSummary(report),
      },
      targetId: profile.user.id,
    }),
    measure,
    report,
  });

  return {
    status: 200,
    ...msg(
      result.contentRemoved
        ? "admin_psychologist_report_content_removed"
        : "admin_psychologist_report_upheld",
      {},
    ),
    data: reportActionResponse(result),
  };
};

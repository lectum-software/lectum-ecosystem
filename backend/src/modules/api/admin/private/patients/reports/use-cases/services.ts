import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  daysBetweenInclusive,
  endOfDate,
  parseDateOnly,
  startOfDate,
  toDateKey,
} from "@/utils/date-range";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import type {
  AdminPatientReportItem,
  AdminPatientReportsDTO,
  AdminPatientReportsQuery,
  AdminPatientReportsStatusGroup,
  IAdminPatientReportsDTO,
} from "../DTOs/IAdminPatientReportsDTO";
import {
  type AdminPatientReportRecord,
  AdminPatientReportsRepository,
} from "../repositories/AdminPatientReportsRepository";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_CUSTOM_PERIOD_DAYS = 3660;

type ReportsPeriodResult =
  | {
      current: { end: Date; start: Date };
      period: AdminPatientReportsDTO["period"];
      success: true;
    }
  | { code: string; success: false };

const resolveReportsPeriod = (
  query: { from?: string; to?: string } = {},
  patientCreatedAt: Date,
): ReportsPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);

  if (!hasCustomFrom && !hasCustomTo) {
    const today = new Date();
    const start = startOfDate(patientCreatedAt > today ? today : patientCreatedAt);
    const end = endOfDate(today);

    return {
      current: { end, start },
      period: {
        days: daysBetweenInclusive(start, end),
        from: toDateKey(start),
        label: "Todo o período",
        max_days: null,
        timezone: "server-local",
        to: toDateKey(end),
      },
      success: true,
    };
  }

  if (!hasCustomFrom || !hasCustomTo) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const start = parseDateOnly(query.from, "start");
  const end = parseDateOnly(query.to, "end");

  if (!start || !end || start > end) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_CUSTOM_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    current: { end, start },
    period: {
      days,
      from: toDateKey(start),
      label: "Período personalizado",
      max_days: MAX_CUSTOM_PERIOD_DAYS,
      timezone: "server-local",
      to: toDateKey(end),
    },
    success: true,
  };
};

const normalizePagination = (input: { limit?: number; page?: number }) => {
  const limit = Math.min(Math.max(Number(input.limit || DEFAULT_LIMIT), 1), MAX_LIMIT);
  const page = Math.max(Number(input.page || 1), 1);

  return { limit, page };
};

const normalizeText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeQuery = (query: AdminPatientReportsQuery = {}) => ({
  ...normalizePagination(query),
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

const reportStatusGroup = (status: string): AdminPatientReportsStatusGroup => {
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

  return `${normalized.slice(0, max - 1).trim()}...`;
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "patient" }),
});

const reportContentType = (report: AdminPatientReportRecord): "post" | "reply" =>
  report.reply ? "reply" : "post";

const reportContentAvailable = (report: AdminPatientReportRecord) => {
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

const reportUnavailableReason = (report: AdminPatientReportRecord) => {
  if (report.reply) {
    if (report.reply.deleted) return "Comentário denunciado já foi removido.";
    if (report.reply.post.deleted || report.reply.post.status !== "publicado") {
      return "Publicação do comentário já está indisponível.";
    }
    if (report.reply.post.community.deleted) return "Comunidade do comentário está indisponível.";
  } else {
    if (report.post.deleted || report.post.status !== "publicado") {
      return "Publicação denunciada já está indisponível.";
    }
    if (report.post.community.deleted) return "Comunidade da publicação está indisponível.";
  }

  return null;
};

const reportCommunity = (report: AdminPatientReportRecord) =>
  report.reply ? report.reply.post.community : report.post.community;

const reportPostId = (report: AdminPatientReportRecord) =>
  report.reply ? report.reply.post.id : report.post.id;

const reportTitle = (report: AdminPatientReportRecord) => {
  if (!report.reply) return report.post.title;

  return report.reply.title || `Comentário em: ${report.reply.post.title}`;
};

const reportContent = (report: AdminPatientReportRecord) =>
  report.reply ? report.reply.content : report.post.content;

const reportContentCreatedAt = (report: AdminPatientReportRecord) =>
  report.reply ? report.reply.createdAt : report.post.createdAt;

type AdminPatientReportAuthor =
  | AdminPatientReportRecord["post"]["author"]
  | NonNullable<AdminPatientReportRecord["reply"]>["author"];

const reportAuthor = (report: AdminPatientReportRecord): AdminPatientReportAuthor =>
  report.reply ? report.reply.author : report.post.author;

const reportAuthorName = (author: AdminPatientReportAuthor) => {
  if (author.role !== "psicologo") return author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: author.psychologist_profile?.professional_first_name,
    lastName: author.psychologist_profile?.professional_last_name,
  });
};

const reportAuthorRoleLabel = (author: AdminPatientReportAuthor) => {
  if (author.role !== "psicologo") return roleLabel(author.role);

  return author.psychologist_profile?.gender?.trim().toLowerCase() === "feminino"
    ? "Psicóloga"
    : "Psicólogo";
};

const reportMedia = (report: AdminPatientReportRecord) => {
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

const reportTargetId = (report: AdminPatientReportRecord) =>
  report.reply ? report.reply.id : report.post.id;

const reportPublicUrl = (report: AdminPatientReportRecord) => {
  if (!reportContentAvailable(report)) return null;

  const community = reportCommunity(report);
  const postId = reportPostId(report);

  return report.reply
    ? `/comunidades/${community.slug}/publicacao/${postId}/resposta/${report.reply.id}`
    : `/comunidades/${community.slug}/publicacao/${postId}`;
};

const safeCommunity = (report: AdminPatientReportRecord) => {
  const community = reportCommunity(report);

  return {
    id: community.id,
    name: community.name,
    slug: community.slug,
  };
};

const toReportItem = (report: AdminPatientReportRecord): AdminPatientReportItem => {
  const type = reportContentType(report);
  const statusGroup = reportStatusGroup(report.status);
  const available = reportContentAvailable(report);
  const author = reportAuthor(report);

  return {
    capabilities: {
      can_review_resolution: false,
      can_remove_content: false,
      can_resolve_dismissed: false,
      can_resolve_upheld: false,
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
  report: AdminPatientReportItem,
  query: ReturnType<typeof normalizeQuery>,
) => {
  if (query.type !== "all" && report.content.type !== query.type) return false;
  if (query.status !== "all" && report.status_group !== query.status) return false;

  return true;
};

export const showAdminPatientReports = async (data: IAdminPatientReportsDTO): Promise<Resolve> => {
  const repository = new AdminPatientReportsRepository();
  const patient = await repository.findPatient(data.p.id);
  if (!patient) return notFound();

  const query = normalizeQuery(data.q ?? {});
  const period = resolveReportsPeriod({ from: query.from, to: query.to }, patient.createdAt);
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const reports = await repository.listReports(
    patient.id,
    period.current.start,
    period.current.end,
  );
  const items = reports.map(toReportItem);
  const filtered = items.filter((item) => reportMatches(item, query));
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);
  const countByStatus = (status: AdminPatientReportsStatusGroup) =>
    items.filter((item) => item.status_group === status).length;
  const countByType = (type: "post" | "reply") =>
    items.filter((item) => item.content.type === type).length;

  const response: AdminPatientReportsDTO = {
    access: {
      mode: "read_only",
      restrictions: [
        "Esta aba apresenta denúncias de conteúdo do paciente; as ações de moderação ficam disponíveis na área de moderação.",
      ],
    },
    active_filters_count: [
      query.type !== "all" ? query.type : "",
      query.status !== "all" ? query.status : "",
      query.from && query.to ? "period" : "",
    ].filter(Boolean).length,
    cards: [
      { id: "total", label: "Total de denúncias", source: "post_report", value: items.length },
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
        { count: countByType("reply"), id: "reply", label: "Comentários" },
      ],
    },
    page,
    pages,
    per_page: query.limit,
    period: period.period,
    source: "user+post_report+community_post+post_reply",
    unavailable: [
      {
        description:
          "Ações de resolução continuam centralizadas nas áreas de moderação já existentes; esta aba replica a leitura operacional sem simular ações.",
        id: "patient_report_actions",
        label: "Ações de moderação",
        source: "admin_patient_reports_v1",
      },
    ],
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

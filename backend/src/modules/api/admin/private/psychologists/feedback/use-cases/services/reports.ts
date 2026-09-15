import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import type {
  AdminPsychologistReportItem,
  AdminPsychologistReportResolveBody,
  AdminPsychologistReportsDTO,
  AdminPsychologistReportsQuery,
  AdminPsychologistReportsStatusGroup,
  IAdminPsychologistReportsDTO,
} from "../../DTOs/IAdminPsychologistFeedbackDTO";
import {
  AdminPsychologistFeedbackRepository,
  type AdminPsychologistReportRecord,
} from "../../repositories/AdminPsychologistFeedbackRepository";

import {
  DEFAULT_REPORTS_LIMIT,
  excerpt,
  labelFromStatus,
  normalizePagination,
  notFound,
  reasonLabel,
  reportStatusGroup,
  resolveReportsPeriod,
  roleLabel,
} from "./reviews";

export const normalizeReportsQuery = (query: AdminPsychologistReportsQuery = {}) => ({
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

export const reportContentType = (report: AdminPsychologistReportRecord): "post" | "reply" =>
  report.reply ? "reply" : "post";

export const reportContentAvailable = (report: AdminPsychologistReportRecord) => {
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

export const reportUnavailableReason = (report: AdminPsychologistReportRecord) => {
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

export const canResolve = (status: string) => {
  const group = reportStatusGroup(status);
  return group === "pending";
};

export const reportStatusFromResolution = (
  resolution: AdminPsychologistReportResolveBody["resolution"],
) => {
  if (resolution === "dismissed") return "rejeitada";
  if (resolution === "upheld") return "resolvida";
  if (resolution === "pending") return "pendente";

  return null;
};

export const reportStatusLabelFromResolution = (
  resolution: AdminPsychologistReportResolveBody["resolution"],
) => {
  if (resolution === "dismissed") return "Improcedente";
  if (resolution === "upheld") return "Procedente";
  if (resolution === "pending") return "Pendente";

  return resolution;
};

export const reportCommunity = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.post.community : report.post.community;

export const reportPostId = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.post.id : report.post.id;

export const reportTitle = (report: AdminPsychologistReportRecord) => {
  if (!report.reply) return report.post.title;

  return report.reply.title || `Resposta em: ${report.reply.post.title}`;
};

export const reportContent = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.content : report.post.content;

export const reportContentCreatedAt = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.createdAt : report.post.createdAt;

export type AdminPsychologistReportAuthor =
  | AdminPsychologistReportRecord["post"]["author"]
  | NonNullable<AdminPsychologistReportRecord["reply"]>["author"];

export const reportAuthor = (
  report: AdminPsychologistReportRecord,
): AdminPsychologistReportAuthor => (report.reply ? report.reply.author : report.post.author);

export const reportAuthorName = (author: AdminPsychologistReportAuthor) => {
  if (author.role !== "psicologo") return author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: author.psychologist_profile?.professional_first_name,
    lastName: author.psychologist_profile?.professional_last_name,
  });
};

export const reportAuthorRoleLabel = (author: AdminPsychologistReportAuthor) => {
  if (author.role !== "psicologo") return roleLabel(author.role);

  return author.psychologist_profile?.gender?.trim().toLowerCase() === "feminino"
    ? "Psicóloga"
    : "Psicólogo";
};

export const reportMedia = (report: AdminPsychologistReportRecord) => {
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

export const reportTargetId = (report: AdminPsychologistReportRecord) =>
  report.reply ? report.reply.id : report.post.id;

export const reportPublicUrl = (report: AdminPsychologistReportRecord) => {
  if (!reportContentAvailable(report)) return null;

  const community = reportCommunity(report);
  const postId = reportPostId(report);

  return report.reply
    ? `/comunidades/${community.slug}/publicacao/${postId}/resposta/${report.reply.id}`
    : `/comunidades/${community.slug}/publicacao/${postId}`;
};

export const safeCommunity = (report: AdminPsychologistReportRecord) => {
  const community = reportCommunity(report);

  return {
    id: community.id,
    name: community.name,
    slug: community.slug,
  };
};

export const toReportItem = (
  report: AdminPsychologistReportRecord,
): AdminPsychologistReportItem => {
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

export const reportMatches = (
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
        "Esta \u00e1rea permite triar e resolver a den\u00fancia; san\u00e7\u00f5es devem ser realizadas na gest\u00e3o da conta.",
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

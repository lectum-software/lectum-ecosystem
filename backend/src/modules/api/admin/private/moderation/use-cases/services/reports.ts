import { error } from "@/helpers/translate";
import {
  buildProfessionalFullDisplayName,
  normalizeProfessionalDisplayName,
} from "@/utils/professional-name";
import { hasProfessionalRegistryApproval } from "@/utils/subscription-entitlement";
import type {
  AdminModerationOperationalAlertDTO,
  AdminModerationOperationalAlertsDTO,
  AdminModerationReportActionDTO,
} from "../../DTOs/IAdminModerationDTO";
import type {
  AdminModerationReportAudit,
  AdminModerationReportMutationResult,
} from "../../repositories/AdminModerationRepository";
import type {
  AdminPostReportRecord,
  AdminRegistrationFailureUserRecord,
  AdminUncoveredPatientPostRecord,
} from "../../repositories/interfaces/IAdminModerationRepository";
import { communityDTO } from "./community-dto";
import {
  type COMMUNITY_ENGAGEMENT_LABELS,
  DAY_IN_MS,
  DISMISS_REPORT_CONFIRMATION,
  HOUR_IN_MS,
  normalizeSearch,
  UPHOLD_REPORT_CONFIRMATION,
} from "./events";

export const priorityWeight: Record<AdminModerationOperationalAlertDTO["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const excludedOperationalDimensions = [
  {
    id: "region_city_coverage",
    reason: "Dimensão removida do escopo atual por decisão de produto.",
    title: "Região/cidade com pacientes sem cobertura",
  },
  {
    id: "price_range_demand",
    reason: "Dimensão removida do escopo atual por decisão de produto.",
    title: "Faixa de preço muito buscada com pouca oferta",
  },
  {
    id: "schedule_demand",
    reason: "Dimensão removida do escopo atual por decisão de produto.",
    title: "Horários muito buscados sem disponibilidade",
  },
] satisfies AdminModerationOperationalAlertsDTO["excluded_dimensions"];

export const hoursSince = (date: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - date.getTime()) / HOUR_IN_MS));

export const daysSince = (date: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_IN_MS));

export const plural = (value: number, singular: string, pluralValue: string) =>
  value === 1 ? singular : pluralValue;

export const humanAge = (date: Date, now: Date) => {
  const hours = hoursSince(date, now);
  if (hours < 24) return `${hours} ${plural(hours, "hora", "horas")}`;

  const days = daysSince(date, now);
  return `${days} ${plural(days, "dia", "dias")}`;
};

export const compactText = (value?: string | null, max = 140) => {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return "Sem texto registrado.";

  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
};

export const postReportReasonLabels: Record<string, string> = {
  abuse: "Ofensa, assédio ou discurso de ódio",
  other: "Outro motivo",
  privacy: "Exposição de dados pessoais",
  self_harm: "Incentivo à violência ou autolesão",
  spam: "Spam ou divulgação indevida",
};

export const postReportReasonLabel = (reason: string) => postReportReasonLabels[reason] ?? reason;

export const postReportStatusGroup = (status: string): "dismissed" | "pending" | "upheld" => {
  const normalized = normalizeSearch(status);
  if (["resolvida", "resolved", "procedente", "upheld"].includes(normalized)) return "upheld";
  if (["rejeitada", "rejected", "improcedente", "dismissed"].includes(normalized)) {
    return "dismissed";
  }

  return "pending";
};

export const postReportStatusLabel = (status: string) => {
  const group = postReportStatusGroup(status);
  if (group === "upheld") return "Procedente";
  if (group === "dismissed") return "Improcedente";

  return "Pendente";
};

export const postReportPriority = (
  status: string,
): AdminModerationOperationalAlertDTO["priority"] => {
  const group = postReportStatusGroup(status);
  if (group === "upheld") return "high";
  if (group === "dismissed") return "medium";

  return "urgent";
};

export const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    paciente: "Paciente",
    psicologo: "Psicólogo",
  };

  return labels[role] ?? "Usuário";
};

export const registrationModeLabel = (provider?: string | null) =>
  normalizeSearch(provider) === "google" ? "Google" : "Email/senha";

export const registrationAlertHref = (user: AdminRegistrationFailureUserRecord) =>
  user.role === "psicologo" ? `/psicologos/${user.id}` : `/pacientes/${user.id}`;

export const registrationAlertEntityType = (
  user: AdminRegistrationFailureUserRecord,
): AdminModerationOperationalAlertDTO["entity"]["type"] =>
  user.role === "psicologo" ? "psychologist" : "patient";

export type AdminPostReportAuthor =
  | AdminPostReportRecord["post"]["author"]
  | NonNullable<AdminPostReportRecord["reply"]>["author"];

export const reportAuthor = (report: AdminPostReportRecord): AdminPostReportAuthor =>
  report.reply ? report.reply.author : report.post.author;

export const reportAuthorName = (author: AdminPostReportAuthor) => {
  if (author.role !== "psicologo") return author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: author.psychologist_profile?.professional_first_name,
    lastName: author.psychologist_profile?.professional_last_name,
  });
};

export const reportAuthorRoleLabel = (author: AdminPostReportAuthor) => {
  if (author.role !== "psicologo") return roleLabel(author.role);

  return author.psychologist_profile?.gender?.trim().toLowerCase() === "feminino"
    ? "Psicóloga"
    : "Psicólogo";
};

export const reportAuthorVerified = (author: AdminPostReportAuthor) =>
  author.role === "psicologo" && hasProfessionalRegistryApproval(author.psychologist_profile);

export type AdminModerationAlertUser = NonNullable<AdminModerationOperationalAlertDTO["user"]>;

export type PatientCommunityEngagementCounts = {
  posts: number;
  replies: number;
  saves: number;
  shares: number;
  votes: number;
};

export type PatientCommunityEngagementSegment = keyof typeof COMMUNITY_ENGAGEMENT_LABELS;

export type PatientCommunityEngagementSummary = {
  label: string;
};

export const reportAuthorAlertUser = (author: AdminPostReportAuthor): AdminModerationAlertUser => ({
  id: author.id,
  name: reportAuthorName(author),
  role: author.role,
  role_label: reportAuthorRoleLabel(author),
  show_verified_badge: reportAuthorVerified(author),
});

export const uncoveredPostAuthorAlertUser = (
  author: AdminUncoveredPatientPostRecord["author"],
): AdminModerationAlertUser => ({
  id: author.id,
  name: normalizeProfessionalDisplayName(author.name) || roleLabel(author.role),
  role: author.role,
  role_label: roleLabel(author.role),
  show_verified_badge: false,
});

export const registrationFailureAlertUser = (
  user: AdminRegistrationFailureUserRecord,
): AdminModerationAlertUser => ({
  id: user.id,
  name: normalizeProfessionalDisplayName(user.name) || roleLabel(user.role),
  role: user.role,
  role_label: roleLabel(user.role),
  show_verified_badge: false,
});

export const reportContentType = (report: AdminPostReportRecord): "post" | "reply" =>
  report.reply ? "reply" : "post";

export const reportCommunity = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.post.community : report.post.community;

export const reportPostId = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.post.id : report.post.id;

export const reportTitle = (report: AdminPostReportRecord) => {
  if (!report.reply) return report.post.title;

  return report.reply.title || `Resposta em: ${report.reply.post.title}`;
};

export const reportContent = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.content : report.post.content;

export const reportContentCreatedAt = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.createdAt : report.post.createdAt;

export const reportTargetId = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.id : report.post.id;

export const reportContentAvailable = (report: AdminPostReportRecord) => {
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

export const reportUnavailableReason = (report: AdminPostReportRecord) => {
  if (report.reply) {
    if (report.reply.deleted) return "Resposta denunciada já foi removida.";
    if (report.reply.post.deleted || report.reply.post.status !== "publicado") {
      return "Publicação da resposta já está indisponível.";
    }
    if (report.reply.post.community.deleted) {
      return "Comunidade da resposta está indisponível.";
    }
  } else {
    if (report.post.deleted || report.post.status !== "publicado") {
      return "Publicação denunciada já está indisponível.";
    }
    if (report.post.community.deleted) {
      return "Comunidade da publicação está indisponível.";
    }
  }

  return null;
};

export const reportMedia = (report: AdminPostReportRecord) => {
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

export const reportPublicUrl = (report: AdminPostReportRecord) => {
  if (!reportContentAvailable(report)) return null;

  const community = reportCommunity(report);
  const postId = reportPostId(report);

  return report.reply
    ? `/comunidades/${community.slug}/publicacao/${postId}/resposta/${report.reply.id}`
    : `/comunidades/${community.slug}/publicacao/${postId}`;
};

export const reportContentDTO = (report: AdminPostReportRecord) => {
  const author = reportAuthor(report);
  const available = reportContentAvailable(report);

  return {
    author: {
      avatar: author.avatar,
      id: author.id,
      name: reportAuthorName(author),
      role: author.role,
      role_label: reportAuthorRoleLabel(author),
      verified: reportAuthorVerified(author),
    },
    available,
    body: reportContent(report),
    community: communityDTO(reportCommunity(report)),
    created_at: reportContentCreatedAt(report),
    excerpt: compactText(reportContent(report), 120),
    id: reportTargetId(report),
    media: reportMedia(report),
    public_url: reportPublicUrl(report),
    title: reportTitle(report),
    type: reportContentType(report),
    unavailable_reason: available ? null : reportUnavailableReason(report),
  };
};

export const reportDTO = (report: AdminPostReportRecord) => {
  const statusGroup = postReportStatusGroup(report.status);
  const statusLabel = postReportStatusLabel(report.status);
  const available = reportContentAvailable(report);
  const resolves = statusGroup === "pending";

  return {
    capabilities: {
      can_remove_content: resolves && available,
      can_resolve_dismissed: resolves,
      can_resolve_upheld: resolves,
    },
    content: reportContentDTO(report),
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    moderation: {
      status: report.status,
      status_label: statusLabel,
    },
    reason: report.reason,
    reason_label: postReportReasonLabel(report.reason),
    reported_by: {
      label: roleLabel(report.reporter.role),
      name: report.reporter.name,
      role: report.reporter.role,
    },
    status: report.status,
    status_group: statusGroup,
    status_label: statusLabel,
  };
};

export const reportActionResponse = (
  result: AdminModerationReportMutationResult,
): AdminModerationReportActionDTO => ({
  affected_reports_count: result.affectedReportsCount,
  content_already_unavailable: result.contentAlreadyUnavailable,
  content_removed: result.contentRemoved,
  report: reportDTO(result.report),
  source: "post_report+admin_activity_log",
});

export const safeReportTargetSummary = (report: AdminPostReportRecord) => ({
  Comunidade: reportCommunity(report).name,
  Conteudo: compactText(reportTitle(report), 100),
  Tipo: report.reply ? "Resposta" : "Post",
});

export const createReportAudit = (input: {
  action: AdminModerationReportAudit["action"];
  adminId: string;
  changedFields: string[];
  metadata?: AdminModerationReportAudit["metadata"];
  reason: string;
  report: AdminPostReportRecord;
  safeAfter?: AdminModerationReportAudit["safeAfter"];
}): AdminModerationReportAudit => ({
  action: input.action,
  adminId: input.adminId,
  changedFields: input.changedFields,
  metadata: {
    ...(input.metadata ?? {}),
    content_author_id: reportAuthor(input.report).id,
    content_author_role: reportAuthor(input.report).role,
    report_id: input.report.id,
    target_id: reportTargetId(input.report),
    target_type: reportContentType(input.report),
  },
  reason: input.reason,
  safeAfter: input.safeAfter,
  safeBefore: {
    "Status da denuncia": postReportStatusLabel(input.report.status),
    ...safeReportTargetSummary(input.report),
  },
  targetId: input.report.id,
});

export const reportResolveStatusFromResolution = (resolution: string) => {
  if (resolution === "dismissed") return "rejeitada";
  if (resolution === "upheld") return "resolvida";

  return null;
};

export const invalidReportStatus = () => ({
  status: 409,
  ...error("admin_moderation_report_invalid_status", {}),
});

export const dismissConfirmationIsValid = (confirmation: string) =>
  confirmation.trim().toUpperCase() === DISMISS_REPORT_CONFIRMATION;

export const upholdConfirmationIsValid = (confirmation: string) =>
  confirmation.trim().toUpperCase() === UPHOLD_REPORT_CONFIRMATION;

export const toJsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

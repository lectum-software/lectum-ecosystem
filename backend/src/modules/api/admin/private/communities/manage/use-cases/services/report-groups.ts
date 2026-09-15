import {
  addDays,
  toDateKey as dateKey,
  daysBetweenInclusive,
  endOfDate as endOfDay,
  parseDateOnly,
  startOfDate as startOfDay,
} from "@/utils/date-range";
import type {
  AdminCommunityReportItemDTO,
  AdminCommunityReportsDTO,
  AdminCommunityReportsQuery,
} from "../../DTOs/IAdminCommunityManageDTO";
import type {
  AdminCommunityRecord,
  AdminCommunityReportRecord,
} from "../../repositories/AdminCommunityManageRepository";
import {
  DEFAULT_REPORT_PERIOD_DAYS,
  DISMISS_REPORT_CONFIRMATION,
  MAX_REPORT_PERIOD_DAYS,
  normalizeComparableText,
  REVIEW_REPORT_CONFIRMATION,
  UPHOLD_REPORT_CONFIRMATION,
} from "./community-list";
import {
  type AdminCommunityContentAuthor,
  type AdminCommunityReportContentKind,
  type AdminCommunityReportResolution,
  type AdminCommunityReportStatusGroup,
  contentMedia,
  isContentAuthorVerified,
} from "./content";

export type ReportPeriodRange = { end: Date; start: Date };

export type ReportPeriodResult =
  | {
      current: ReportPeriodRange;
      period: AdminCommunityReportsDTO["period"];
      success: true;
    }
  | { code: string; success: false };

export const reportStatusGroup = (status: string): AdminCommunityReportStatusGroup => {
  const normalized = normalizeComparableText(status).replace(/_/g, " ");

  if (["pendente", "pending", "em analise", "in review"].includes(normalized)) return "pending";
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

export const reportStatusLabel = (status: string) => {
  const labels: Record<AdminCommunityReportStatusGroup, string> = {
    dismissed: "Improcedente",
    pending: "Pendente",
    upheld: "Procedente",
  };

  return labels[reportStatusGroup(status)];
};

export const reportReasonLabel = (reason: string) => {
  const labels: Record<string, string> = {
    abuse: "Abuso ou desrespeito",
    other: "Outro motivo",
    privacy: "Dados pessoais ou privacidade",
    self_harm: "Autolesão ou risco",
    spam: "Spam",
  };

  return labels[reason] ?? reason;
};

export const reporterRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    paciente: "Paciente",
    psicologo: "Psicólogo",
  };

  return labels[role] ?? "Usuário";
};

export const reportContentKindFor = (
  type: AdminCommunityReportItemDTO["content"]["type"],
  author: AdminCommunityContentAuthor,
): AdminCommunityReportContentKind => {
  if (author.role !== "psicologo") return type === "post" ? "patient_post" : "patient_comment";

  const verified = isContentAuthorVerified(author);
  if (type === "post") {
    return verified ? "verified_psychologist_post" : "unverified_psychologist_post";
  }

  return verified ? "verified_psychologist_reply" : "unverified_psychologist_reply";
};

export const reportPostMedia = (post: NonNullable<AdminCommunityReportRecord["post"]>) => {
  const firstMedia = post.media_items[0];

  return contentMedia(
    firstMedia?.media_url ?? post.media_url,
    firstMedia?.media_type ?? post.media_type,
  );
};

export const reportPublicUrl = (
  community: AdminCommunityRecord,
  type: AdminCommunityReportItemDTO["content"]["type"],
  postId: string | null | undefined,
  contentId: string | null | undefined,
  parentReplyId: string | null | undefined,
) => {
  if (!postId || !contentId) return null;
  if (type === "post") return `/comunidades/${community.slug}/publicacao/${postId}`;

  if (parentReplyId) {
    return (
      "/comunidades/" +
      community.slug +
      "/publicacao/" +
      postId +
      "/resposta/" +
      parentReplyId +
      "#reply-" +
      contentId
    );
  }

  return (
    "/comunidades/" +
    community.slug +
    "/publicacao/" +
    postId +
    "?focusReplyId=" +
    encodeURIComponent(contentId) +
    "#reply-" +
    contentId
  );
};

export const resolveReportsPeriod = (
  query: AdminCommunityReportsQuery = {},
): ReportPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  let start: Date;
  let end: Date;
  let label = "Ultimos 90 dias";

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
    label = "Periodo personalizado";
  } else {
    const today = new Date();
    end = endOfDay(today);
    start = startOfDay(addDays(today, -(DEFAULT_REPORT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_REPORT_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    current: { end, start },
    period: {
      days,
      from: dateKey(start),
      label,
      max_days: MAX_REPORT_PERIOD_DAYS,
      timezone: "server-local",
      to: dateKey(end),
    },
    success: true,
  };
};

export const reportMatchesPeriod = (item: AdminCommunityReportItemDTO, range: ReportPeriodRange) =>
  item.created_at >= range.start && item.created_at <= range.end;

export const normalizeReportStatusQuery = (
  status?: AdminCommunityReportsQuery["status"],
): "all" | AdminCommunityReportStatusGroup => {
  if (!status || status === "all") return "all";
  if (status === "pending" || status === "dismissed" || status === "upheld") return status;

  return reportStatusGroup(status);
};

export const reportMatchesType = (
  item: AdminCommunityReportItemDTO,
  type: NonNullable<AdminCommunityReportsQuery["type"]>,
) => {
  if (type === "all") return true;
  if (type === "post") return item.content.type === "post";
  if (type === "comment" || type === "reply") return item.content.type === "comment";

  return item.content.content_kind === type;
};

export const reportStatusLabelFromGroup = (group: AdminCommunityReportStatusGroup) => {
  const labels: Record<AdminCommunityReportStatusGroup, string> = {
    dismissed: "Improcedente",
    pending: "Pendente",
    upheld: "Procedente",
  };

  return labels[group];
};

export const reportConfirmationForResolution = (resolution: AdminCommunityReportResolution) => {
  if (resolution === "dismissed") return DISMISS_REPORT_CONFIRMATION;
  if (resolution === "upheld") return UPHOLD_REPORT_CONFIRMATION;

  return REVIEW_REPORT_CONFIRMATION;
};

export const reportResolutionMessageKey = (
  resolution: AdminCommunityReportResolution,
  revision: boolean,
) => {
  if (revision) return "admin_community_report_decision_reviewed";

  return resolution === "dismissed"
    ? "admin_community_report_dismissed"
    : "admin_community_report_upheld";
};

export const reportGroupStatusFromCounts = (
  counts: AdminCommunityReportItemDTO["status_counts"],
): AdminCommunityReportStatusGroup => {
  if (counts.pending > 0) return "pending";
  if (counts.upheld >= counts.dismissed && counts.upheld > 0) return "upheld";

  return "dismissed";
};

export const refreshReportGroupDerivedFields = (item: AdminCommunityReportItemDTO) => {
  item.reporters.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  item.report_count = item.reporters.length;
  item.first_reported_at = item.reporters.reduce(
    (oldest, reporter) => (reporter.created_at < oldest ? reporter.created_at : oldest),
    item.reporters[0]?.created_at ?? item.first_reported_at,
  );
  item.last_reported_at = item.reporters.reduce(
    (latest, reporter) => (reporter.created_at > latest ? reporter.created_at : latest),
    item.reporters[0]?.created_at ?? item.last_reported_at,
  );
  item.created_at = item.last_reported_at;
  item.status_group = reportGroupStatusFromCounts(item.status_counts);
  item.status_label = reportStatusLabelFromGroup(item.status_group);
  item.status = item.status_group;
  item.capabilities = {
    can_review_resolution: item.status_counts.pending === 0,
    can_resolve_dismissed: item.status_counts.pending > 0,
    can_resolve_upheld: item.status_counts.pending > 0,
  };
  item.reported_by = {
    label:
      item.report_count === 1
        ? (item.reporters[0]?.reporter.label ?? "Usuario")
        : `${item.report_count} denunciantes`,
    role: item.report_count === 1 ? (item.reporters[0]?.reporter.role ?? "unknown") : "multiple",
  };

  return item;
};

export const mergeReportGroup = (
  current: AdminCommunityReportItemDTO,
  next: AdminCommunityReportItemDTO,
) => {
  current.reporters.push(...next.reporters);
  current.status_counts.dismissed += next.status_counts.dismissed;
  current.status_counts.pending += next.status_counts.pending;
  current.status_counts.upheld += next.status_counts.upheld;

  return refreshReportGroupDerivedFields(current);
};

export const groupReportsByContent = (items: AdminCommunityReportItemDTO[]) => {
  const groups = new Map<string, AdminCommunityReportItemDTO>();

  for (const item of items) {
    const key = `${item.content.type}:${item.content.id}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, refreshReportGroupDerivedFields({ ...item, id: key }));
      continue;
    }

    mergeReportGroup(current, item);
  }

  return [...groups.values()].sort((a, b) => {
    if (b.report_count !== a.report_count) return b.report_count - a.report_count;

    return b.last_reported_at.getTime() - a.last_reported_at.getTime();
  });
};

export const reportGroupMatchesStatus = (
  item: AdminCommunityReportItemDTO,
  status: "all" | AdminCommunityReportStatusGroup,
) => {
  if (status === "all") return true;

  return item.status_counts[status] > 0;
};

export const reportGroupSafeBefore = (item: AdminCommunityReportItemDTO) => ({
  content_id: item.content.id,
  content_type: item.content.type,
  excerpt: item.content.excerpt,
  post_id: item.content.post_id,
  report_count: item.report_count,
  status_counts: item.status_counts,
  status_group: item.status_group,
  title: item.content.title,
});

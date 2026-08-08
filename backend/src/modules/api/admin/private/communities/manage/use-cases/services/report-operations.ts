import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminCommunityActivitiesDTO,
  AdminCommunityReportsDTO,
  AdminCommunityResolveReportsDTO,
  IAdminCommunityActivitiesDTO,
  IAdminCommunityReportsDTO,
  IAdminCommunityResolveReportsDTO,
} from "../../DTOs/IAdminCommunityManageDTO";
import { AdminCommunityManageRepository } from "../../repositories/AdminCommunityManageRepository";
import {
  activityFiltersFromActivities,
  activityMatchesPeriod,
  activityMatchesQuery,
  mapActivity,
  resolveActivityPeriod,
} from "./activity-ranking";

import {
  communitySummary,
  normalizeLimit,
  normalizePage,
  normalizeSearch,
  paginate,
  REVIEW_REPORT_CONFIRMATION,
} from "./community-list";
import type { AdminCommunityReportContentKind, AdminCommunityReportStatusGroup } from "./content";

import { mapReport, reportMatchesSearch } from "./content-analytics";
import { findCommunityOrNotFound, notFound } from "./detail-summary";
import {
  groupReportsByContent,
  normalizeReportStatusQuery,
  reportConfirmationForResolution,
  reportGroupMatchesStatus,
  reportGroupSafeBefore,
  reportMatchesPeriod,
  reportMatchesType,
  reportResolutionMessageKey,
  resolveReportsPeriod,
} from "./report-groups";

export const listReports = async (data: IAdminCommunityReportsDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const page = normalizePage(data.q.page);
  const limit = normalizeLimit(data.q.limit);
  const search = normalizeSearch(data.q.q);
  const status = normalizeReportStatusQuery(data.q.status);
  const type = data.q.type ?? "all";
  const period = resolveReportsPeriod(data.q);
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const items = (await repository.listReports(community.id))
    .map((report) => mapReport(community, report))
    .filter((item) => reportMatchesPeriod(item, period.current));
  const reports = groupReportsByContent(items.filter((item) => reportMatchesType(item, type)))
    .filter((item) => reportGroupMatchesStatus(item, status))
    .filter((item) => reportMatchesSearch(item, search));
  const countByStatus = (statusGroup: AdminCommunityReportStatusGroup) =>
    items.filter((item) => item.status_group === statusGroup).length;
  const countByType = (contentKind: AdminCommunityReportContentKind) =>
    items.filter((item) => item.content.content_kind === contentKind).length;
  const paginated = paginate(reports, page, limit);
  const payload: AdminCommunityReportsDTO = {
    active_filters_count: [
      type !== "all" ? type : "",
      status !== "all" ? status : "",
      data.q.from && data.q.to ? "period" : "",
      search ? "q" : "",
    ].filter(Boolean).length,
    cards: [
      { id: "total", label: "Total de denúncias", source: "post_report", value: items.length },
      { id: "pending", label: "Pendentes", source: "post_report", value: countByStatus("pending") },
      { id: "upheld", label: "Procedentes", source: "post_report", value: countByStatus("upheld") },
      {
        id: "dismissed",
        label: "Improcedentes",
        source: "post_report",
        value: countByStatus("dismissed"),
      },
    ],
    community: communitySummary(community),
    count: paginated.count,
    data: paginated.data,
    filters: {
      statuses: [
        { count: items.length, id: "all", label: "Todos os status" },
        { count: countByStatus("pending"), id: "pending", label: "Pendentes" },
        { count: countByStatus("upheld"), id: "upheld", label: "Procedentes" },
        { count: countByStatus("dismissed"), id: "dismissed", label: "Improcedentes" },
      ],
      types: [
        { count: items.length, id: "all", label: "Todos" },
        {
          count: countByType("verified_psychologist_post"),
          id: "verified_psychologist_post",
          label: "Post de psicólogo verificado",
        },
        {
          count: countByType("unverified_psychologist_post"),
          id: "unverified_psychologist_post",
          label: "Post de psicólogo não verificado",
        },
        {
          count: countByType("verified_psychologist_reply"),
          id: "verified_psychologist_reply",
          label: "Resposta de psicólogo verificado",
        },
        {
          count: countByType("unverified_psychologist_reply"),
          id: "unverified_psychologist_reply",
          label: "Resposta de psicólogo não verificado",
        },
        { count: countByType("patient_post"), id: "patient_post", label: "Post de paciente" },
        {
          count: countByType("patient_comment"),
          id: "patient_comment",
          label: "Comentário de paciente",
        },
      ],
    },
    page: paginated.page,
    pages: paginated.pages,
    per_page: paginated.per_page,
    period: period.period,
    source: "post_report+community_post+post_reply",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const resolveReports = async (data: IAdminCommunityResolveReportsDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const targetType = data.p.targetType === "reply" ? "comment" : data.p.targetType;
  if (targetType !== "post" && targetType !== "comment") {
    return {
      status: 400,
      ...error("admin_community_report_invalid_target", {}),
    };
  }

  if (
    data.b.resolution !== "dismissed" &&
    data.b.resolution !== "pending" &&
    data.b.resolution !== "upheld"
  ) {
    return {
      status: 400,
      ...error("admin_community_report_invalid_status", {}),
    };
  }

  const currentGroups = groupReportsByContent(
    (await repository.listReports(community.id)).map((report) => mapReport(community, report)),
  );
  const targetGroup = currentGroups.find(
    (item) => item.content.type === targetType && item.content.id === data.p.targetId,
  );
  if (!targetGroup) {
    return {
      status: 404,
      ...error("admin_community_report_invalid_target", {}),
    };
  }

  const isRevision = targetGroup.status_group !== "pending";
  if (
    (!isRevision && data.b.resolution === "pending") ||
    (isRevision && targetGroup.status_group === data.b.resolution)
  ) {
    return {
      status: 409,
      ...error("admin_community_report_invalid_status", {}),
    };
  }

  const expectedConfirmation = isRevision
    ? REVIEW_REPORT_CONFIRMATION
    : reportConfirmationForResolution(data.b.resolution);
  if (data.b.confirmation.trim().toUpperCase() !== expectedConfirmation) {
    return {
      status: 400,
      ...error(
        isRevision
          ? "admin_community_report_review_confirmation_invalid"
          : data.b.resolution === "dismissed"
            ? "admin_community_report_dismiss_confirmation_invalid"
            : "admin_community_report_uphold_confirmation_invalid",
        {},
      ),
    };
  }

  if (
    !isRevision &&
    ((data.b.resolution === "dismissed" && !targetGroup.capabilities.can_resolve_dismissed) ||
      (data.b.resolution === "upheld" && !targetGroup.capabilities.can_resolve_upheld))
  ) {
    return {
      status: 409,
      ...error("admin_community_report_invalid_status", {}),
    };
  }

  const resolved = await repository.resolveReportsForTarget({
    adminId: admin.id,
    communityId: community.id,
    previousResolution: targetGroup.status_group,
    reason: data.b.reason,
    review: isRevision,
    resolution: data.b.resolution,
    safeBefore: reportGroupSafeBefore(targetGroup),
    targetId: targetGroup.content.id,
    targetType: targetGroup.content.type,
  });
  if (!resolved) {
    return {
      status: 404,
      ...error("admin_community_report_invalid_target", {}),
    };
  }

  const updatedGroup =
    groupReportsByContent(
      (await repository.listReports(community.id)).map((report) => mapReport(community, report)),
    ).find(
      (item) =>
        item.content.type === targetGroup.content.type &&
        item.content.id === targetGroup.content.id,
    ) ?? targetGroup;
  const payload: AdminCommunityResolveReportsDTO = {
    affected_reports_count: resolved.affectedReportsCount,
    content_id: targetGroup.content.id,
    post_id: targetGroup.content.post_id,
    report: updatedGroup,
    resolution: data.b.resolution,
    type: targetGroup.content.type,
  };

  return {
    status: 200,
    ...msg(reportResolutionMessageKey(data.b.resolution, isRevision), {}),
    data: payload,
  };
};

export const listActivities = async (data: IAdminCommunityActivitiesDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const page = normalizePage(data.q.page);
  const limit = normalizeLimit(data.q.limit);
  const search = normalizeSearch(data.q.q);
  const area = data.q.area?.trim() || "all";
  const type = data.q.type ?? "all";
  const period = resolveActivityPeriod({ from: data.q.from, to: data.q.to });
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const activities = (await repository.listActivities(community.id))
    .map(mapActivity)
    .filter((item) => activityMatchesPeriod(item, period.current));
  const filters = activityFiltersFromActivities(activities);
  const filteredActivities = activities.filter((item) =>
    activityMatchesQuery(item, { area, q: search, type }),
  );
  const paginated = paginate(filteredActivities, page, limit);
  const payload: AdminCommunityActivitiesDTO = {
    active_filters_count: [
      area !== "all" ? area : "",
      type !== "all" ? type : "",
      search,
      data.q.from && data.q.to ? "period" : "",
    ].filter(Boolean).length,
    community: communitySummary(community),
    count: paginated.count,
    data: paginated.data,
    filters,
    page: paginated.page,
    pages: paginated.pages,
    per_page: paginated.per_page,
    period: period.period,
    source: "admin_activity_log",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

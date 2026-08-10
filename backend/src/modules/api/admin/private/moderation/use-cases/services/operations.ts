import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminModerationEventsDTO,
  AdminModerationOperationalAlertsDTO,
  AdminModerationOperationalAlertsPageDTO,
  AdminModerationSummaryDTO,
  IAdminModerationEventDTO,
  IAdminModerationEventsDTO,
  IAdminModerationOperationalAlertsDTO,
  IAdminModerationReportResolveDTO,
  IAdminModerationResolveDTO,
  IAdminModerationSummaryDTO,
} from "../../DTOs/IAdminModerationDTO";
import { AdminModerationRepository } from "../../repositories/AdminModerationRepository";
import { mapReportAlert } from "./alert-signals";

import {
  countBy,
  eventMatchesCategory,
  eventMatchesSearch,
  hydrateReplyTargets,
  mapEvent,
  mapEventDetail,
  normalizeFilter,
  normalizeLimit,
  normalizePage,
  normalizeQuery,
  normalizeSearch,
  OPERATIONAL_ALERT_LIMIT,
  paginate,
  toStringArray,
} from "./events";
import { buildOperationalAlerts, sortOperationalAlertsByLatest } from "./operational-alerts";

import {
  normalizeOperationalAlertsQuery,
  operationalAlertMatchesFilters,
  operationalAlertMatchesGroup,
} from "./operational-filters";
import { buildOverviewCharts } from "./overview-charts";

import {
  createReportAudit,
  dismissConfirmationIsValid,
  invalidReportStatus,
  postReportStatusGroup,
  reportActionResponse,
  reportResolveStatusFromResolution,
  safeReportTargetSummary,
  upholdConfirmationIsValid,
} from "./reports";

export {
  archiveCommunitySuggestion,
  createCommunitySuggestionBlock,
  listCommunitySuggestions,
  moveCommunitySuggestion,
  updateCommunitySuggestionBlock,
} from "./community-suggestions";

export const getSummary = async (_data: IAdminModerationSummaryDTO): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const [allEvents, latestPending, pendingTotal, urgentPendingTotal, operationalAlerts, reports] =
    await Promise.all([
      repository.listEvents({}),
      repository.listLatestPending(5),
      repository.countPending(),
      repository.countUrgentPending(),
      buildOperationalAlerts(repository),
      repository.listPostReports(),
    ]);
  const limitedOperationalAlerts: AdminModerationOperationalAlertsDTO = {
    ...operationalAlerts,
    items: operationalAlerts.items.slice(0, OPERATIONAL_ALERT_LIMIT),
  };
  const replyMap = await hydrateReplyTargets(latestPending);
  const summary: AdminModerationSummaryDTO = {
    by_category: countBy(allEvents, (event) => toStringArray(event.categories)),
    by_decision: countBy(allEvents, (event) => [event.decision]),
    by_severity: countBy(allEvents, (event) => [event.severity]),
    by_status: countBy(allEvents, (event) => [event.status]),
    latest_pending: latestPending.map((event) => mapEvent(event, replyMap)),
    operational_alerts: limitedOperationalAlerts,
    overview_charts: buildOverviewCharts(allEvents, reports, operationalAlerts),
    pending_total: pendingTotal,
    source: "content_moderation_event",
    urgent_pending_total: urgentPendingTotal,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export const listOperationalAlerts = async (
  data: IAdminModerationOperationalAlertsDTO,
): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const query = normalizeOperationalAlertsQuery(data.q ?? {});
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const group = query.group;
  const operationalAlerts = await buildOperationalAlerts(repository);
  const baseItems =
    group === "denuncias"
      ? (await repository.listPostReports()).map((report) => mapReportAlert(report, new Date()))
      : operationalAlerts.items;
  const items = baseItems
    .sort(sortOperationalAlertsByLatest)
    .filter((alert) => operationalAlertMatchesGroup(alert, group))
    .filter((alert) => operationalAlertMatchesFilters(alert, query));
  const paginated = paginate(items, page, limit);
  const payload: AdminModerationOperationalAlertsPageDTO = {
    ...paginated,
    counts: operationalAlerts.counts,
    excluded_dimensions: operationalAlerts.excluded_dimensions,
    group,
    source: operationalAlerts.source,
    thresholds: operationalAlerts.thresholds,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const listEvents = async (data: IAdminModerationEventsDTO): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const query = normalizeQuery(data.q ?? {});
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const category = normalizeFilter(query.category);
  const search = normalizeSearch(query.q);
  const records = await repository.listEvents(query);
  const replyMap = await hydrateReplyTargets(records);
  const items = records
    .filter((event) => eventMatchesCategory(event, category))
    .map((event) => mapEvent(event, replyMap))
    .filter((event) => eventMatchesSearch(event, search));
  const paginated = paginate(items, page, limit);
  const payload: AdminModerationEventsDTO = {
    ...paginated,
    source: "content_moderation_event",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const showEvent = async (data: IAdminModerationEventDTO): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const event = await repository.findEvent(data.p.id);
  if (!event) {
    return {
      status: 404,
      ...error("admin_moderation_event_not_found", {}),
    };
  }

  const replyMap = await hydrateReplyTargets([event]);

  return {
    status: 200,
    ...msg("show", {}),
    data: mapEventDetail(event, replyMap),
  };
};

export const reviewEvent = async (data: IAdminModerationEventDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repository = new AdminModerationRepository();
  const event = await repository.markReviewing(data.p.id, admin.id);
  if (!event) {
    return {
      status: 404,
      ...error("admin_moderation_event_not_found", {}),
    };
  }

  const replyMap = await hydrateReplyTargets([event]);

  return {
    status: 200,
    ...msg("admin_moderation_event_reviewed", {}),
    data: mapEventDetail(event, replyMap),
  };
};

export const resolveEvent = async (data: IAdminModerationResolveDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  const note = data.b.note?.trim();
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }
  if (!note) {
    return {
      status: 422,
      ...error("admin_moderation_event_resolve_note_required", {}),
    };
  }

  const repository = new AdminModerationRepository();
  const event = await repository.resolveEvent(data.p.id, { adminId: admin.id, note });
  if (!event) {
    return {
      status: 404,
      ...error("admin_moderation_event_not_found", {}),
    };
  }

  const replyMap = await hydrateReplyTargets([event]);

  return {
    status: 200,
    ...msg("admin_moderation_event_resolved", {}),
    data: mapEventDetail(event, replyMap),
  };
};

export const resolveReport = async (data: IAdminModerationReportResolveDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const reason = data.b.reason?.trim();
  if (!reason) {
    return {
      status: 422,
      ...error("admin_moderation_report_reason_required", {}),
    };
  }

  const requestedStatus = reportResolveStatusFromResolution(data.b.resolution);
  if (!requestedStatus) return invalidReportStatus();

  const repository = new AdminModerationRepository();
  const report = await repository.findPostReport(data.p.reportId);
  if (!report) {
    return {
      status: 404,
      ...error("admin_moderation_report_not_found", {}),
    };
  }

  if (postReportStatusGroup(report.status) !== "pending") return invalidReportStatus();

  if (data.b.resolution === "dismissed") {
    if (!dismissConfirmationIsValid(data.b.confirmation)) {
      return {
        status: 400,
        ...error("admin_moderation_report_dismiss_confirmation_invalid", {}),
      };
    }

    const result = await repository.resolveReportDismissed({
      audit: createReportAudit({
        action: "moderation_report_dismissed",
        adminId: admin.id,
        changedFields: ["Status da denuncia"],
        metadata: {
          resolution: "dismissed",
        },
        reason,
        report,
        safeAfter: {
          "Status da denuncia": "Improcedente",
          ...safeReportTargetSummary(report),
        },
      }),
      report,
    });

    return {
      status: 200,
      ...msg("admin_moderation_report_dismissed", {}),
      data: reportActionResponse(result),
    };
  }

  if (data.b.resolution !== "upheld") return invalidReportStatus();

  if (!upholdConfirmationIsValid(data.b.confirmation)) {
    return {
      status: 400,
      ...error("admin_moderation_report_uphold_confirmation_invalid", {}),
    };
  }

  const measure = data.b.measure === "remove_content" ? "remove_content" : "none";
  const result = await repository.resolveReportUpheld({
    audit: createReportAudit({
      action:
        measure === "remove_content"
          ? "moderation_report_content_removed"
          : "moderation_report_upheld",
      adminId: admin.id,
      changedFields:
        measure === "remove_content"
          ? ["Status da denuncia", "Conteudo denunciado"]
          : ["Status da denuncia"],
      metadata: {
        measure,
        resolution: "upheld",
        requested_status: requestedStatus,
      },
      reason,
      report,
      safeAfter: {
        "Medida aplicada":
          measure === "remove_content" ? "Remover conteudo denunciado" : "Manter conteudo",
        "Status da denuncia": "Procedente",
        ...safeReportTargetSummary(report),
      },
    }),
    measure,
    report,
  });

  return {
    status: 200,
    ...msg(
      result.contentRemoved
        ? "admin_moderation_report_content_removed"
        : "admin_moderation_report_upheld",
      {},
    ),
    data: reportActionResponse(result),
  };
};

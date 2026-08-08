import type {
  AdminModerationOperationalAlertDTO,
  AdminModerationOperationalAlertsDTO,
  AdminModerationOverviewChartsDTO,
  AdminModerationReportChartType,
} from "../../DTOs/IAdminModerationDTO";
import type {
  AdminModerationEventRecord,
  AdminPostReportRecord,
} from "../../repositories/interfaces/IAdminModerationRepository";
import { toStringArray } from "./events";
import { postReportStatusGroup, reportAuthor } from "./reports";

export const reportChartTypes = [
  "all",
  "patient_comments",
  "patient_posts",
  "psychologist_posts",
  "psychologist_replies",
] as const satisfies readonly AdminModerationReportChartType[];

export const chartDateKey = (date: Date) => date.toISOString().slice(0, 10);

export const incrementChartPoint = <T extends { date: string }>(
  map: Map<string, T>,
  date: Date,
  createPoint: (date: string) => T,
  key: string,
) => {
  const day = chartDateKey(date);
  const point = map.get(day) ?? createPoint(day);
  const writable = point as unknown as Record<string, number>;

  writable[key] = Number(writable[key] ?? 0) + 1;
  map.set(day, point);
};

export const sortChartPoints = <T extends { date: string }>(map: Map<string, T>) =>
  [...map.values()].sort((left, right) => left.date.localeCompare(right.date));

export const createReportChartPoint = (date: string) => ({
  date,
  dismissed: 0,
  pending: 0,
  upheld: 0,
});

export const createComplianceChartPoint = (date: string) => ({
  date,
  invalid_whatsapp: 0,
  professional_crp_pending: 0,
});

export const createOperationalChartPoint = (date: string) => ({
  date,
  patient_posts_without_coverage_48h: 0,
  psychologist_no_conversion_after_adaptation: 0,
  registration_errors: 0,
  unpublished_required_settings: 0,
});

export const createSensitiveContentChartPoint = (date: string) => ({
  allow_sensitive: 0,
  block: 0,
  date,
  safety_hold: 0,
});

export const reportChartType = (report: AdminPostReportRecord): AdminModerationReportChartType => {
  const author = reportAuthor(report);

  if (report.reply) {
    return author.role === "psicologo" ? "psychologist_replies" : "patient_comments";
  }

  return author.role === "psicologo" ? "psychologist_posts" : "patient_posts";
};

export const buildReportOverviewCharts = (reports: AdminPostReportRecord[]) => {
  const maps = Object.fromEntries(reportChartTypes.map((type) => [type, new Map()])) as Record<
    AdminModerationReportChartType,
    Map<string, ReturnType<typeof createReportChartPoint>>
  >;

  for (const report of reports) {
    const status = postReportStatusGroup(report.status);
    for (const type of ["all", reportChartType(report)] as const) {
      incrementChartPoint(maps[type], report.createdAt, createReportChartPoint, status);
    }
  }

  return Object.fromEntries(
    reportChartTypes.map((type) => [type, { points: sortChartPoints(maps[type]) }]),
  ) as AdminModerationOverviewChartsDTO["reports"];
};

export const buildAlertOverviewCharts = (alerts: AdminModerationOperationalAlertDTO[]) => {
  const compliance = new Map<string, ReturnType<typeof createComplianceChartPoint>>();
  const operational = new Map<string, ReturnType<typeof createOperationalChartPoint>>();

  for (const alert of alerts) {
    if (alert.type === "professional_crp_pending" || alert.type === "invalid_whatsapp") {
      incrementChartPoint(compliance, alert.created_at, createComplianceChartPoint, alert.type);
      continue;
    }

    if (alert.type === "patient_post_without_coverage") {
      incrementChartPoint(
        operational,
        alert.created_at,
        createOperationalChartPoint,
        "patient_posts_without_coverage_48h",
      );
      continue;
    }

    if (alert.type === "unpublished_required_settings") {
      incrementChartPoint(
        operational,
        alert.created_at,
        createOperationalChartPoint,
        "unpublished_required_settings",
      );
      continue;
    }

    if (alert.type === "psychologist_no_conversion") {
      incrementChartPoint(
        operational,
        alert.created_at,
        createOperationalChartPoint,
        "psychologist_no_conversion_after_adaptation",
      );
      continue;
    }

    if (alert.type === "registration_error") {
      incrementChartPoint(
        operational,
        alert.created_at,
        createOperationalChartPoint,
        "registration_errors",
      );
    }
  }

  return {
    compliance: { points: sortChartPoints(compliance) },
    operational: { points: sortChartPoints(operational) },
  };
};

export const buildSensitiveContentOverviewCharts = (events: AdminModerationEventRecord[]) => {
  const byCategory = new Map<
    string,
    Map<string, ReturnType<typeof createSensitiveContentChartPoint>>
  >();
  const ensureCategoryMap = (category: string) => {
    const existing = byCategory.get(category);
    if (existing) return existing;

    const created = new Map<string, ReturnType<typeof createSensitiveContentChartPoint>>();
    byCategory.set(category, created);

    return created;
  };

  for (const event of events) {
    if (
      event.decision !== "allow_sensitive" &&
      event.decision !== "block" &&
      event.decision !== "safety_hold"
    ) {
      continue;
    }

    const categories = toStringArray(event.categories);
    const categoryIds = categories.length > 0 ? categories : ["other"];

    for (const category of ["all", ...categoryIds]) {
      incrementChartPoint(
        ensureCategoryMap(category),
        event.createdAt,
        createSensitiveContentChartPoint,
        event.decision,
      );
    }
  }

  const categories = [...byCategory.keys()].sort((left, right) => {
    if (left === "all") return -1;
    if (right === "all") return 1;

    return left.localeCompare(right);
  });
  const categoryEntries = categories.map((category) => [
    category,
    { points: sortChartPoints(ensureCategoryMap(category)) },
  ]);

  return {
    by_category: Object.fromEntries(categoryEntries),
    categories,
  };
};

export const buildOverviewCharts = (
  events: AdminModerationEventRecord[],
  reports: AdminPostReportRecord[],
  operationalAlerts: AdminModerationOperationalAlertsDTO,
): AdminModerationOverviewChartsDTO => {
  const alertCharts = buildAlertOverviewCharts(operationalAlerts.items);

  return {
    compliance: alertCharts.compliance,
    content_sensitive: buildSensitiveContentOverviewCharts(events),
    operational: alertCharts.operational,
    reports: buildReportOverviewCharts(reports),
  };
};

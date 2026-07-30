import type { Resolve } from "@/helpers/return";
import { msg } from "@/helpers/translate";
import type {
  AdminDashboardDailyPoint,
  AdminDashboardFinancialPoint,
  AdminDashboardSummary,
  IAdminDashboardSummaryDTO,
} from "../../summary/DTOs/IAdminDashboardSummaryDTO";
import { buildDashboardSummary } from "../../summary/use-cases/services";

const csvCell = (value: unknown) => {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const csvRow = (values: unknown[]) => values.map(csvCell).join(",");

const appendMetricRows = (summary: AdminDashboardSummary, rows: string[]) => {
  rows.push(csvRow(["section", "id", "label", "date", "value", "source", "extra"]));

  for (const card of Object.values(summary.cards)) {
    rows.push(
      csvRow([
        "card",
        card.id,
        card.label,
        "",
        card.value,
        card.source,
        `unit=${card.unit};previous=${card.previous_value};change_percent=${card.change_percent ?? "n/a"}`,
      ]),
    );
  }
};

const appendDailyRows = (
  rows: string[],
  section: string,
  points: Array<AdminDashboardDailyPoint | AdminDashboardFinancialPoint>,
  source: string,
) => {
  for (const point of points) {
    if ("value_cents" in point) {
      rows.push(
        csvRow([
          section,
          "mrr_estimate",
          "MRR estimado",
          point.date,
          point.value_cents,
          source,
          `active_subscriptions=${point.active_subscriptions}`,
        ]),
      );
      continue;
    }

    rows.push(csvRow([section, "count", section, point.date, point.count, source, ""]));
  }
};

const appendWhatsAppDistributionRows = (summary: AdminDashboardSummary, rows: string[]) => {
  const distribution = summary.whatsapp_click_distribution;

  rows.push(
    csvRow([
      "whatsapp_click_distribution",
      "total_clicks",
      "Cliques de WhatsApp",
      "",
      distribution.total_clicks,
      distribution.source,
      `total_psychologists=${distribution.total_psychologists};with_clicks=${distribution.psychologists_with_clicks};without_clicks=${distribution.psychologists_without_clicks};gini=${distribution.gini ?? "n/a"}`,
    ]),
  );

  rows.push(
    csvRow([
      "whatsapp_click_distribution",
      "top_10_percent",
      "Top 10%",
      "",
      distribution.top_10_percent.click_percentage,
      distribution.source,
      `clicks=${distribution.top_10_percent.clicks};psychologists=${distribution.top_10_percent.psychologist_count}`,
    ]),
  );

  rows.push(
    csvRow([
      "whatsapp_click_distribution",
      "top_20_percent",
      "Top 20%",
      "",
      distribution.top_20_percent.click_percentage,
      distribution.source,
      `clicks=${distribution.top_20_percent.clicks};psychologists=${distribution.top_20_percent.psychologist_count}`,
    ]),
  );
};

const buildCsv = (summary: AdminDashboardSummary) => {
  const rows: string[] = [];
  rows.push(csvRow(["Lectum Admin Dashboard"]));
  rows.push(csvRow(["period", summary.period.from, summary.period.to, summary.period.label]));
  rows.push("");
  appendMetricRows(summary, rows);
  appendWhatsAppDistributionRows(summary, rows);
  rows.push("");
  appendDailyRows(rows, "community_posts", summary.community_activity.posts, "community_post");
  appendDailyRows(rows, "community_comments", summary.community_activity.comments, "post_reply");
  appendDailyRows(rows, "financial", summary.financial.daily, summary.financial.source);
  rows.push("");

  for (const device of summary.devices.items) {
    rows.push(
      csvRow([
        "device",
        device.device_type,
        device.label,
        "",
        device.count,
        summary.devices.source,
        `percentage=${device.percentage}`,
      ]),
    );
  }

  for (const location of summary.locations.items) {
    rows.push(
      csvRow([
        "location",
        location.country,
        location.country,
        "",
        location.count,
        summary.locations.source,
        `percentage=${location.percentage}`,
      ]),
    );
  }

  rows.push("");
  for (const report of summary.pending_reports.items) {
    rows.push(
      csvRow([
        "pending_report",
        report.id,
        report.target_title,
        report.created_at,
        report.severity,
        summary.pending_reports.source,
        `reason=${report.reason};community=${report.community_name ?? ""};target=${report.target_type}:${report.target_id}`,
      ]),
    );
  }

  rows.push("");
  for (const item of summary.unavailable) {
    rows.push(csvRow(["unavailable", item.id, item.label, "", "", item.source, item.description]));
  }

  return rows.join("\r\n");
};

const isDashboardSummary = (data: unknown): data is AdminDashboardSummary => {
  return Boolean(data && typeof data === "object" && "period" in data && "cards" in data);
};

export default async (data: IAdminDashboardSummaryDTO): Promise<Resolve> => {
  const resolve = await buildDashboardSummary(data.q ?? {});
  if (!resolve.success || !isDashboardSummary(resolve.data)) return resolve as Resolve;

  const summary = resolve.data;
  return {
    status: 200,
    ...msg("index", {}),
    data: {
      csv: buildCsv(summary),
      filename: `lectum-admin-dashboard-${summary.period.from}-${summary.period.to}.csv`,
      mime: "text/csv; charset=utf-8",
    },
  };
};

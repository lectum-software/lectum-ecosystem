import type { Resolve } from "@/helpers/return";
import { msg } from "@/helpers/translate";
import { csvRow } from "@/utils/csv";
import type {
  AdminTrafficBreakdownItem,
  AdminTrafficConversion,
  AdminTrafficConversionAction,
  AdminTrafficConversionChart,
  AdminTrafficDeviceItem,
  AdminTrafficEntryPage,
  AdminTrafficLocationItem,
  AdminTrafficMetric,
  AdminTrafficOnlineNow,
  AdminTrafficRankingItem,
  AdminTrafficSummary,
  AdminTrafficTimelinePoint,
  IAdminTrafficSummaryDTO,
} from "../../summary/DTOs/IAdminTrafficSummaryDTO";
import { buildTrafficSummary } from "../../summary/use-cases/services";

const appendMetricRows = (rows: string[], section: string, metrics: AdminTrafficMetric[]) => {
  for (const metric of metrics) {
    rows.push(
      csvRow([
        section,
        metric.id,
        metric.label,
        "",
        metric.value,
        metric.source,
        `unit=${metric.unit};previous=${metric.previous_value};change_percent=${
          metric.change_percent ?? "n/a"
        };unavailable=${metric.unavailable}`,
      ]),
    );
  }
};

const appendOnlineNowRows = (rows: string[], onlineNow: AdminTrafficOnlineNow) => {
  rows.push(
    csvRow([
      "online_now",
      "unique_visitors",
      "Usuários online agora",
      onlineNow.window.to,
      onlineNow.unique_visitors,
      onlineNow.source,
      `window_minutes=${onlineNow.window.minutes};active_sessions=${onlineNow.active_sessions};authenticated_users=${onlineNow.authenticated_users};anonymous_visitors=${onlineNow.anonymous_visitors}`,
    ]),
  );

  for (const item of onlineNow.items) {
    rows.push(
      csvRow([
        "online_now_segment",
        item.id,
        item.label,
        onlineNow.window.to,
        item.count,
        onlineNow.source,
        `percentage=${item.percentage};window_minutes=${onlineNow.window.minutes}`,
      ]),
    );
  }
};

const appendBreakdownRows = (
  rows: string[],
  section: string,
  items: AdminTrafficBreakdownItem[],
  source: string,
) => {
  for (const item of items) {
    rows.push(
      csvRow([
        section,
        item.id,
        item.label,
        "",
        item.count,
        source,
        `percentage=${item.percentage}`,
      ]),
    );
  }
};

const appendDeviceRows = (rows: string[], items: AdminTrafficDeviceItem[], source: string) => {
  appendBreakdownRows(rows, "device", items, source);

  for (const device of items) {
    for (const operatingSystem of device.operating_systems) {
      rows.push(
        csvRow([
          "device_operating_system",
          `${device.id}:${operatingSystem.id}`,
          `${device.label} - ${operatingSystem.label}`,
          "",
          operatingSystem.count,
          source,
          `device=${device.id};device_count=${device.count};device_percentage=${device.percentage};operating_system=${operatingSystem.operating_system};percentage=${operatingSystem.percentage}`,
        ]),
      );
    }
  }
};

const appendLocationRows = (
  rows: string[],
  section: string,
  items: AdminTrafficLocationItem[],
  source: string,
) => {
  for (const item of items) {
    rows.push(
      csvRow([
        section,
        item.id,
        item.label,
        "",
        item.count,
        source,
        `percentage=${item.percentage}`,
      ]),
    );
  }
};

const appendEntryPageRows = (rows: string[], items: AdminTrafficEntryPage[], source: string) => {
  for (const item of items) {
    rows.push(
      csvRow([
        "entry_page",
        item.path,
        item.label,
        "",
        item.count,
        source,
        `percentage=${item.percentage};conversions=${item.conversions}`,
      ]),
    );
  }
};

const appendConversionRows = (rows: string[], items: AdminTrafficConversion[], source: string) => {
  for (const item of items) {
    rows.push(
      csvRow([
        "conversion",
        item.id,
        item.label,
        "",
        item.value,
        source,
        `metric_source=${item.source};previous=${item.previous_value};change_percent=${
          item.change_percent ?? "n/a"
        }`,
      ]),
    );
  }
};

const appendConversionChartRows = (
  rows: string[],
  section: string,
  chart: AdminTrafficConversionChart,
) => {
  for (const item of chart.items) {
    rows.push(
      csvRow([
        section,
        `${chart.id}:${item.id}`,
        `${chart.label} - ${item.label}`,
        "",
        item.count,
        chart.source,
        `percentage=${item.percentage};total=${chart.total};description=${chart.description}`,
      ]),
    );
  }
};

const appendConversionActionRows = (
  rows: string[],
  section: string,
  items: AdminTrafficConversionAction[],
) => {
  for (const item of items) {
    rows.push(
      csvRow([
        section,
        item.id,
        item.label,
        "",
        item.events,
        item.source,
        `actors=${item.actors};patient_actors=${item.patient_actors};psychologist_actors=${item.psychologist_actors};actor_label=${item.actor_label};actor_percentage=${item.actor_percentage};description=${item.description}`,
      ]),
    );
  }
};

const appendRankingRows = (
  rows: string[],
  section: string,
  items: AdminTrafficRankingItem[],
  source: string,
) => {
  for (const item of items) {
    rows.push(
      csvRow([
        section,
        item.id,
        item.label,
        "",
        item.sessions,
        source,
        `pageviews=${item.count};percentage=${item.percentage};path=${item.path ?? ""}`,
      ]),
    );
  }
};

const appendTimelineRows = (rows: string[], items: AdminTrafficTimelinePoint[], source: string) => {
  for (const item of items) {
    rows.push(
      csvRow(["overview_timeline", "sessions", "Sessões", item.date, item.sessions, source, ""]),
    );
    rows.push(
      csvRow([
        "overview_timeline",
        "unique_visitors",
        "Usuários únicos",
        item.date,
        item.unique_visitors,
        source,
        "",
      ]),
    );
    rows.push(
      csvRow([
        "overview_timeline",
        "new_visitors",
        "Novos visitantes",
        item.date,
        item.new_visitors,
        source,
        "",
      ]),
    );
    rows.push(
      csvRow([
        "overview_timeline",
        "recurring_visitors",
        "Visitantes recorrentes",
        item.date,
        item.recurring_visitors,
        source,
        "",
      ]),
    );
  }
};

const buildCsv = (summary: AdminTrafficSummary) => {
  const rows: string[] = [];
  rows.push(csvRow(["Lectum Admin Tráfego"]));
  rows.push(csvRow(["period", summary.period.from, summary.period.to, summary.period.label]));
  rows.push("");
  rows.push(csvRow(["section", "id", "label", "date", "value", "source", "extra"]));
  appendMetricRows(rows, "overview", summary.overview_cards);
  appendOnlineNowRows(rows, summary.online_now);
  appendTimelineRows(rows, summary.timeline.points, summary.timeline.source);
  appendBreakdownRows(
    rows,
    "traffic_source",
    summary.traffic_sources.items,
    summary.traffic_sources.source,
  );
  appendDeviceRows(rows, summary.devices.items, summary.devices.source);
  appendBreakdownRows(rows, "user_type", summary.user_types.items, summary.user_types.source);
  appendLocationRows(rows, "state", summary.locations.states, summary.locations.source);
  appendLocationRows(rows, "city", summary.locations.cities, summary.locations.source);
  appendLocationRows(rows, "country", summary.locations.countries, summary.locations.source);
  appendEntryPageRows(rows, summary.entry_pages.items, summary.entry_pages.source);
  appendConversionRows(rows, summary.conversions.items, summary.conversions.source);
  for (const chart of summary.conversion_groups.pre_signup.charts) {
    appendConversionChartRows(rows, "pre_signup_conversion_chart", chart);
  }
  appendConversionActionRows(
    rows,
    "pre_signup_conversion_action",
    summary.conversion_groups.pre_signup.actions,
  );
  appendConversionChartRows(
    rows,
    "post_signup_conversion_chart",
    summary.conversion_groups.post_signup.overall,
  );
  appendConversionActionRows(
    rows,
    "post_signup_conversion_action",
    summary.conversion_groups.post_signup.items,
  );
  appendMetricRows(rows, "quality", summary.quality.items);
  appendRankingRows(
    rows,
    "top_community",
    summary.top_communities.items,
    summary.top_communities.source,
  );
  appendRankingRows(rows, "top_post", summary.top_posts.items, summary.top_posts.source);
  appendRankingRows(
    rows,
    "top_psychologist",
    summary.top_psychologists.items,
    summary.top_psychologists.source,
  );

  for (const item of summary.unavailable) {
    rows.push(csvRow(["unavailable", item.id, item.label, "", "", item.source, item.description]));
  }

  return rows.join("\r\n");
};

const isTrafficSummary = (data: unknown): data is AdminTrafficSummary => {
  return Boolean(data && typeof data === "object" && "period" in data && "overview_cards" in data);
};

export default async (data: IAdminTrafficSummaryDTO): Promise<Resolve> => {
  const resolve = await buildTrafficSummary(data.q ?? {});
  if (!resolve.success || !isTrafficSummary(resolve.data)) return resolve as Resolve;

  const summary = resolve.data;
  return {
    status: 200,
    ...msg("index", {}),
    data: {
      csv: buildCsv(summary),
      filename: `lectum-admin-trafego-${summary.period.from}-${summary.period.to}.csv`,
      mime: "text/csv; charset=utf-8",
    },
  };
};

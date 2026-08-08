import { useState } from "react";
import type { AdminModerationReportChartType, AdminModerationSummary } from "@/api/req/moderation";

import {
  chartPoints,
  OverviewChartBlock,
  sensitiveCategoryOptionLabel,
} from "./components/overview-chart";
import { OverviewSelect } from "./components/overview-controls";
import {
  complianceChartMetrics,
  operationalChartMetrics,
  reportChartMetrics,
  reportTypeOptions,
  sensitiveContentChartMetrics,
} from "./modules/overview-support";

export const ModerationOverviewCharts = ({ summary }: { summary: AdminModerationSummary }) => {
  const [reportType, setReportType] = useState<AdminModerationReportChartType>("all");
  const [sensitiveCategory, setSensitiveCategory] = useState("all");
  const charts = summary.overview_charts;
  const sensitiveCategories = charts.content_sensitive.categories.includes("all")
    ? charts.content_sensitive.categories
    : ["all", ...charts.content_sensitive.categories];
  const activeSensitiveCategory = sensitiveCategories.includes(sensitiveCategory)
    ? sensitiveCategory
    : "all";
  const sensitiveOptions = sensitiveCategories.map((category) => [
    category,
    sensitiveCategoryOptionLabel(category),
  ]) as [string, string][];

  return (
    <div className="space-y-6">
      <OverviewChartBlock
        ariaLabel="Gráfico temporal de denúncias por decisão"
        href="/moderacao/denuncias"
        metrics={reportChartMetrics}
        points={chartPoints(charts.reports[reportType]?.points ?? [])}
        selector={
          <OverviewSelect
            label="Tipo"
            onChange={(value) => setReportType(value as AdminModerationReportChartType)}
            options={reportTypeOptions}
            value={reportType}
          />
        }
        title="Denúncias"
      />
      <OverviewChartBlock
        ariaLabel="Gráfico temporal de pendências de compliance"
        href="/moderacao/compliance"
        metrics={complianceChartMetrics}
        points={chartPoints(charts.compliance.points)}
        title="Compliance"
      />
      <OverviewChartBlock
        ariaLabel="Gráfico temporal de alertas operacionais"
        href="/moderacao/operacionais"
        metrics={operationalChartMetrics}
        points={chartPoints(charts.operational.points)}
        title="Operacionais"
      />
      <OverviewChartBlock
        ariaLabel="Gráfico temporal de conteúdo sensível por decisão"
        href="/moderacao/conteudo-sensivel"
        metrics={sensitiveContentChartMetrics}
        points={chartPoints(
          charts.content_sensitive.by_category[activeSensitiveCategory]?.points ?? [],
        )}
        selector={
          <OverviewSelect
            label="Categoria"
            onChange={setSensitiveCategory}
            options={sensitiveOptions}
            value={activeSensitiveCategory}
          />
        }
        title="Conteúdo sensível"
      />
    </div>
  );
};

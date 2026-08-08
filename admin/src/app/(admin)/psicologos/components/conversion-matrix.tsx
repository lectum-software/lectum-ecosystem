"use client";

import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";

import {
  calculatePercentage,
  formatPercentageValue,
  formatSecondsMetric,
  numberFormatter,
  type ProfileConversionBehaviorCell,
  type ProfileConversionBehaviorMetric,
  type ProfileConversionBehaviorResults,
  type ProfileCrossMatrix,
  type ProfileCrossMatrixAxisId,
  type ProfileCrossMatrixCategory,
  type ProfileCrossMatrixQuadrant,
  type ProfileCrossMatrixResults,
  toOneDecimal,
} from "../modules/dashboard-support";

import { hexToRgba, PROFILE_CONVERSION_CHART_COLORS } from "./metric-cards";

import { ProfileCrossMatrixAxisSelect } from "./timeline-filters";

export const findProfileCrossMatrixQuadrant = (
  matrix: ProfileCrossMatrix,
  row: ProfileCrossMatrixCategory,
  column: ProfileCrossMatrixCategory,
): ProfileCrossMatrixQuadrant =>
  matrix.quadrants.find(
    (quadrant) => quadrant.row_id === row.id && quadrant.column_id === column.id,
  ) ?? {
    column_id: column.id,
    column_label: column.label,
    count: 0,
    description: `Psicólogos em ${row.label} com ${column.label}.`,
    id: `${row.id}_${column.id}`,
    label: `${row.label} + ${column.label}`,
    percentage: 0,
    row_id: row.id,
    row_label: row.label,
  };

export type ProfileCrossMatrixCell = {
  color: string;
  column: ProfileCrossMatrixCategory;
  quadrant: ProfileCrossMatrixQuadrant;
  row: ProfileCrossMatrixCategory;
  rowPercentage: number;
};

export const buildProfileCrossMatrixRowCells = (
  matrix: ProfileCrossMatrix,
  row: ProfileCrossMatrixCategory,
): ProfileCrossMatrixCell[] => {
  const quadrants = matrix.columns.map((column) =>
    findProfileCrossMatrixQuadrant(matrix, row, column),
  );
  const rowTotal = quadrants.reduce((total, quadrant) => total + Math.max(0, quadrant.count), 0);

  return quadrants.map((quadrant, index) => {
    const column = matrix.columns[index] ?? {
      color: PROFILE_CONVERSION_CHART_COLORS.insufficient_data,
      count: 0,
      description: quadrant.description,
      id: quadrant.column_id,
      label: quadrant.column_label,
      percentage: 0,
    };

    return {
      color: column.color,
      column,
      quadrant,
      row,
      rowPercentage:
        rowTotal > 0 ? toOneDecimal((Math.max(0, quadrant.count) / rowTotal) * 100) : 0,
    };
  });
};

export const ProfileConversionMatrixQuadrantCard = ({
  color,
  description,
  headingLabel,
  intensityPercentage,
  quadrant,
  showColumnLabel = false,
}: {
  color: string;
  description: string;
  headingLabel?: string;
  intensityPercentage?: number;
  quadrant: ProfileCrossMatrixQuadrant;
  showColumnLabel?: boolean;
}) => {
  const hasData = quadrant.count > 0;
  const intensity = hasData
    ? 0.08 + Math.min(0.2, ((intensityPercentage ?? quadrant.percentage) / 100) * 0.2)
    : 0;

  return (
    <div
      className="flex min-h-24 min-w-0 flex-col items-center justify-center rounded-2xl border p-2.5 text-center"
      style={{
        backgroundColor: hasData ? hexToRgba(color, intensity) : "var(--admin-surface-muted)",
        borderColor: hasData ? hexToRgba(color, 0.32) : "var(--admin-border)",
        minHeight: "6rem",
      }}
    >
      {showColumnLabel ? (
        <div className="mb-1.5 flex items-center justify-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h4 className="min-w-0 text-center text-xs font-black text-foreground">
            {headingLabel ?? quadrant.column_label}
          </h4>
        </div>
      ) : null}
      <p className="text-base font-black text-foreground">
        {numberFormatter.format(quadrant.count)}
        <span className="ml-1 text-xs font-bold text-muted">
          ({formatPercentageValue(quadrant.percentage)})
        </span>
      </p>
      <p className="mt-1.5 text-center text-[0.68rem] font-bold leading-4 text-muted">
        {description}
      </p>
      <p className="sr-only">
        {numberFormatter.format(quadrant.count)} profissionais,{" "}
        {formatPercentageValue(quadrant.percentage)} do total da matriz.
      </p>
    </div>
  );
};

export const PROFILE_CONVERSION_BEHAVIOR_TAG_TONE_CLASS: Record<
  ProfileConversionBehaviorMetric["tone"],
  string
> = {
  above: "border-success/25 bg-success/10 text-success",
  below: "border-warning/25 bg-warning/10 text-warning",
  standard: "border-primary/20 bg-primary-soft text-primary",
  zero: "border-danger/20 bg-danger/10 text-danger",
};

export const PROFILE_CONVERSION_BEHAVIOR_VALUE_ONLY_TAG_IDS = new Set([
  "community_activity_level",
  "community_engagement_level",
  "community_post_format",
  "community_reply_format",
  "profile_dominant_plan",
  "profile_openings_per_psychologist",
]);

export const ProfileConversionBehaviorTableCell = ({
  align = "start",
  cell,
}: {
  align?: "end" | "start";
  cell: ProfileConversionBehaviorCell | null;
}) => {
  const tagClassName =
    "inline-flex max-w-full min-w-0 items-center rounded-2xl border px-2 py-0.5 text-[0.66rem] leading-4";
  const wrapperClassName = cn(
    "flex min-w-0 flex-wrap gap-1.5 px-1 py-1",
    align === "end" && "justify-end text-right",
  );
  const contentClassName = cn(
    "min-w-0 max-w-full",
    align === "end" ? "whitespace-nowrap" : "whitespace-normal break-words",
  );

  if (!cell) {
    return (
      <div className={wrapperClassName}>
        <span
          className={cn(tagClassName, PROFILE_CONVERSION_BEHAVIOR_TAG_TONE_CLASS.zero)}
          title="Não há dados suficientes para esta célula."
        >
          Sem dados
        </span>
      </div>
    );
  }

  const tags = getProfileConversionBehaviorTags(cell);

  if (tags.length === 0) {
    return (
      <div className={wrapperClassName}>
        <span
          className={cn(tagClassName, PROFILE_CONVERSION_BEHAVIOR_TAG_TONE_CLASS.zero)}
          title={cell.unavailable_reason ?? cell.headline}
        >
          {cell.unavailable_reason
            ? getProfileConversionBehaviorUnavailableTag(cell)
            : "Sem sinais mensur\u00e1veis"}
        </span>
      </div>
    );
  }

  return (
    <div className={wrapperClassName} title={cell.headline}>
      {tags.map((tag, index) => {
        const isWhatsappAverageTag = tag.id.includes("whatsapp_clicks_per_psychologist");
        const isPrimaryWhatsappTag = isWhatsappAverageTag && index === 0;
        const isValueOnlyTag = PROFILE_CONVERSION_BEHAVIOR_VALUE_ONLY_TAG_IDS.has(tag.id);

        return (
          <span
            className={cn(
              tagClassName,
              PROFILE_CONVERSION_BEHAVIOR_TAG_TONE_CLASS[tag.tone],
              isPrimaryWhatsappTag ? "font-black" : "font-semibold",
            )}
            key={`${cell.id}-${tag.id}`}
            title={tag.description}
          >
            <span className={contentClassName}>
              {isValueOnlyTag ? tag.value : `${tag.label}: ${tag.value}`}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const PROFILE_CONVERSION_BEHAVIOR_TAG_METRICS_BY_ELEMENT: Record<
  ProfileConversionBehaviorCell["element_id"],
  string[]
> = {
  communities: [
    "community_whatsapp_clicks_per_psychologist",
    "community_activity_level",
    "community_engagement_level",
    "community_post_format",
    "community_reply_format",
    "community_attention_per_content",
  ],
  favorite: ["favorites_screen_whatsapp_clicks_per_psychologist"],
  presentation_video: [
    "presentation_video_whatsapp_clicks_per_psychologist",
    "presentation_video_retention",
    "presentation_video_profile_accesses_per_video",
    "presentation_video_favorites_per_video",
    "presentation_video_shares_per_video",
    "presentation_video_average_ranking_position",
    "presentation_video_average_watch_seconds",
    "presentation_video_views_per_video",
    "presentation_video_replay_rate",
  ],
  profile: [
    "profile_whatsapp_clicks_per_psychologist",
    "profile_dominant_plan",
    "profile_openings_per_psychologist",
    "profile_average_stay_seconds",
    "profile_reviews_tab_opens_per_psychologist",
    "profile_content_tab_opens_per_psychologist",
    "profile_video_views_per_psychologist",
    "profile_video_retention",
    "profile_favorites_per_psychologist",
  ],
};

export const formatProfileConversionBehaviorMetricValue = (
  metric: ProfileConversionBehaviorMetric,
) => {
  if (typeof metric.value !== "number") return null;
  if (metric.unit === "percentage") return formatPercentageValue(metric.value);
  if (metric.unit === "seconds") return formatSecondsMetric(metric.value);
  if (metric.unit === "position") return `${numberFormatter.format(metric.value)}ª`;

  return numberFormatter.format(metric.value);
};

export const getProfileConversionBehaviorTags = (cell: ProfileConversionBehaviorCell) => {
  const priority = PROFILE_CONVERSION_BEHAVIOR_TAG_METRICS_BY_ELEMENT[cell.element_id] ?? [];
  const metricsById = new Map(cell.metrics.map((metric) => [metric.id, metric]));
  const orderedMetrics = priority.flatMap((id) => {
    const metric = metricsById.get(id);
    return metric ? [metric] : [];
  });

  return orderedMetrics.flatMap((metric) => {
    const value = metric.display_value ?? formatProfileConversionBehaviorMetricValue(metric);
    if (!value) return [];

    return [
      {
        description: metric.description,
        id: metric.id,
        label: metric.label,
        tone: metric.tone,
        value,
      },
    ];
  });
};

export const getProfileConversionBehaviorUnavailableTag = (cell: ProfileConversionBehaviorCell) => {
  if (cell.unavailable_reason?.startsWith("Sem profissionais")) return "Sem profissionais";
  if (cell.element_id === "presentation_video") return "Sem vídeo publicado";
  if (cell.element_id === "profile") return "Sem sinais no perfil";
  if (cell.element_id === "communities") return "Sem sinais na comunidade";
  if (cell.element_id === "favorite") return "Sem base em favoritos";

  return "Sem base";
};

export const getProfileConversionBehaviorAverageWhatsappClicks = (
  row: ProfileConversionBehaviorResults["rows"][number],
) => (row.count > 0 ? toOneDecimal((row.totals?.whatsapp_clicks ?? 0) / row.count) : 0);

export const getProfileConversionBehaviorPsychologistsLabel = (
  row: ProfileConversionBehaviorResults["rows"][number],
) =>
  `${numberFormatter.format(row.count)} (${formatPercentageValue(row.percentage)}) psic\u00f3logos`;

export const getProfileConversionBehaviorWhatsappSummaryLabel = (
  row: ProfileConversionBehaviorResults["rows"][number],
  totalWhatsappClicks: number,
) => {
  const whatsappClicks = row.totals?.whatsapp_clicks ?? 0;
  const whatsappPercentage = calculatePercentage(whatsappClicks, totalWhatsappClicks);
  const averageWhatsappClicks = getProfileConversionBehaviorAverageWhatsappClicks(row);

  return `${numberFormatter.format(whatsappClicks)} (${formatPercentageValue(whatsappPercentage)}) cliques WhatsApp, em m\u00e9dia ${numberFormatter.format(averageWhatsappClicks)} por psic\u00f3logo`;
};

export const PROFILE_CONVERSION_BEHAVIOR_TABLE_HEADER_CLASS =
  "border-border border-b p-2.5 align-top text-[0.7rem] font-black uppercase tracking-[0.1em] text-subtle";

export const ProfileConversionBehaviorRowHeader = ({
  row,
  totalWhatsappClicks,
}: {
  row: ProfileConversionBehaviorResults["rows"][number];
  totalWhatsappClicks: number;
}) => {
  const color = PROFILE_CONVERSION_CHART_COLORS[row.id];

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="break-words text-sm font-black leading-5 text-foreground">{row.label}</p>
      </div>
      <p className="mt-1 text-[0.7rem] font-bold leading-4 text-muted">
        <strong className="font-black text-foreground">
          {getProfileConversionBehaviorPsychologistsLabel(row)}
        </strong>
      </p>
      <p className="mt-1 text-[0.7rem] font-bold leading-4 text-muted">
        {getProfileConversionBehaviorWhatsappSummaryLabel(row, totalWhatsappClicks)}
      </p>
    </div>
  );
};

export const ProfileCrossMatrixDetails = ({ matrix }: { matrix: ProfileCrossMatrix }) => {
  if (matrix.totals.psychologists === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {matrix.unavailable_reason ??
          "Sem psicólogos ativos no período selecionado para cruzar os eixos selecionados."}
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="grid gap-3 lg:hidden">
        {matrix.rows.map((row) => {
          const rowCells = buildProfileCrossMatrixRowCells(matrix, row);

          return (
            <section
              className="rounded-[1.35rem] border border-border bg-surface p-3"
              key={`psychologist-mobile-profile-cross-matrix-${row.id}`}
            >
              <h3 className="text-sm font-black text-foreground">{row.label}</h3>
              <p className="mt-1 text-[0.68rem] font-bold leading-4 text-muted">
                {numberFormatter.format(row.count)} psicólogos{" · "}
                {formatPercentageValue(row.percentage)}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                {rowCells.map((cell) => (
                  <ProfileConversionMatrixQuadrantCard
                    color={cell.color}
                    description={`${formatPercentageValue(cell.rowPercentage)} dentro de ${cell.row.label.toLowerCase()}.`}
                    headingLabel={cell.column.label}
                    intensityPercentage={cell.rowPercentage}
                    key={cell.quadrant.id}
                    quadrant={cell.quadrant}
                    showColumnLabel
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto pb-2 lg:block">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `132px repeat(${matrix.columns.length}, minmax(7.5rem, 1fr))`,
            minWidth: `${132 + matrix.columns.length * 128}px`,
          }}
        >
          <div className="sticky left-0 z-10 hidden bg-surface lg:block" aria-hidden />
          {matrix.columns.map((column) => (
            <p
              className="rounded-xl bg-surface-muted px-2 py-1.5 text-center text-[0.68rem] font-black leading-4 text-muted"
              key={`psychologist-profile-cross-matrix-column-${column.id}`}
            >
              {column.label}
            </p>
          ))}

          {matrix.rows.map((row) => {
            const rowCells = buildProfileCrossMatrixRowCells(matrix, row);

            return (
              <Fragment key={`psychologist-profile-cross-matrix-row-${row.id}`}>
                <p className="sticky left-0 z-10 grid place-items-center rounded-xl bg-surface-muted px-2 py-2 text-center text-[0.68rem] font-black text-muted">
                  {row.label}
                </p>
                {rowCells.map((cell) => (
                  <ProfileConversionMatrixQuadrantCard
                    color={cell.color}
                    description={`${formatPercentageValue(cell.rowPercentage)} dentro de ${cell.row.label.toLowerCase()}.`}
                    intensityPercentage={cell.rowPercentage}
                    key={cell.quadrant.id}
                    quadrant={cell.quadrant}
                  />
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const getProfileCrossMatrixByAxes = (
  crossMatrix: ProfileCrossMatrixResults,
  rowAxisId: ProfileCrossMatrixAxisId,
  columnAxisId: ProfileCrossMatrixAxisId,
) =>
  crossMatrix.matrices.find(
    (matrix) => matrix.row_axis_id === rowAxisId && matrix.column_axis_id === columnAxisId,
  ) ?? null;

export function DashboardProfileConversionMatrixSection({
  crossMatrix,
}: {
  crossMatrix: ProfileCrossMatrixResults;
}) {
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(false);
  const [rowAxisId, setRowAxisId] = useState<ProfileCrossMatrixAxisId>(
    crossMatrix.default_row_axis_id,
  );
  const [columnAxisId, setColumnAxisId] = useState<ProfileCrossMatrixAxisId>(
    crossMatrix.default_column_axis_id,
  );
  const axisOptions = crossMatrix.axes;
  const rowAxis = axisOptions.find((axis) => axis.id === rowAxisId) ?? axisOptions[0];
  const columnAxis = axisOptions.find((axis) => axis.id === columnAxisId) ?? axisOptions[1];
  const fallbackMatrix = crossMatrix.matrices[0] ?? null;
  const matrixDetails =
    rowAxis && columnAxis
      ? getProfileCrossMatrixByAxes(crossMatrix, rowAxis.id, columnAxis.id)
      : null;
  const selectedMatrix = matrixDetails ?? fallbackMatrix;
  const matrixDetailsTitle =
    selectedMatrix?.title ??
    (rowAxis && columnAxis
      ? `${rowAxis.label} x ${columnAxis.label}`
      : "Matriz de cruzamento de dados");
  const rowAxisOptions = axisOptions.filter((axis) => axis.id !== columnAxisId);
  const columnAxisOptions = axisOptions.filter((axis) => axis.id !== rowAxisId);
  const alternativeAxisId = (blockedAxisId: ProfileCrossMatrixAxisId) =>
    axisOptions.find((axis) => axis.id !== blockedAxisId)?.id ?? blockedAxisId;
  const handleRowAxisChange = (value: ProfileCrossMatrixAxisId) => {
    setRowAxisId(value);
    if (value === columnAxisId) setColumnAxisId(alternativeAxisId(value));
  };
  const handleColumnAxisChange = (value: ProfileCrossMatrixAxisId) => {
    setColumnAxisId(value);
    if (value === rowAxisId) setRowAxisId(alternativeAxisId(value));
  };

  return (
    <div className="mt-5 rounded-[1.35rem] border border-border/70 bg-surface p-3 sm:p-4">
      <button
        aria-expanded={isMatrixExpanded}
        className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
        onClick={() => setIsMatrixExpanded((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-[0.62rem] font-black uppercase tracking-[0.16em] text-subtle">
            Matriz de cruzamento de dados
          </span>
        </span>
        <span className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-2 text-xs font-black text-foreground transition hover:border-primary/40 hover:text-primary">
          {isMatrixExpanded ? "Ocultar matriz" : "Ver matriz"}
          <ChevronDown
            aria-hidden
            className={cn("h-4 w-4 transition-transform", isMatrixExpanded && "rotate-180")}
          />
        </span>
      </button>

      {isMatrixExpanded ? (
        <div className="mt-4 border-border border-t pt-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-black text-foreground">{matrixDetailsTitle}</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-muted">
                Escolha os dois eixos para uma análise cruzada.
              </p>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:min-w-[28rem] 2xl:min-w-[30rem]">
              <ProfileCrossMatrixAxisSelect
                axes={rowAxisOptions}
                id="profile-cross-matrix-row-axis"
                label="Linha"
                onChange={handleRowAxisChange}
                value={rowAxisId}
              />
              <ProfileCrossMatrixAxisSelect
                axes={columnAxisOptions}
                id="profile-cross-matrix-column-axis"
                label="Coluna"
                onChange={handleColumnAxisChange}
                value={columnAxisId}
              />
            </div>
          </div>
          {selectedMatrix ? <ProfileCrossMatrixDetails matrix={selectedMatrix} /> : null}
        </div>
      ) : null}
    </div>
  );
}

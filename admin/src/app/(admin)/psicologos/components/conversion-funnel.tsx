"use client";

import { Funnel } from "lucide-react";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";
import { cn } from "@/lib/utils";
import { formatSelectedPeriod } from "../modules/dashboard-support";
import {
  DashboardProfileConversionMatrixSection,
  PROFILE_CONVERSION_BEHAVIOR_TABLE_HEADER_CLASS,
  ProfileConversionBehaviorRowHeader,
  ProfileConversionBehaviorTableCell,
} from "./conversion-matrix";
import { CardShell } from "./metric-cards";
import { getPlanSegmentSummary, PanelTitle } from "./timeline-filters";

export const DashboardProfileConversionBehaviorFunnelCard = ({
  summary,
}: {
  summary: AdminPsychologistsDashboard;
}) => {
  const segmentSummary = getPlanSegmentSummary(summary, "all");
  const behaviorTable = segmentSummary.profile_conversion_behavior;
  const profileCrossMatrix = segmentSummary.profile_cross_matrix;
  const conversionRows = behaviorTable?.rows ?? [];
  const behaviorColumns = behaviorTable?.columns ?? [];
  const totalBehaviorWhatsappClicks = conversionRows.reduce(
    (sum, row) => sum + (row.totals?.whatsapp_clicks ?? 0),
    0,
  );
  const behaviorCellsByKey = new Map(
    (behaviorTable?.cells ?? []).map((cell) => [`${cell.row_id}:${cell.element_id}`, cell]),
  );

  if (!behaviorTable || conversionRows.length === 0 || behaviorColumns.length === 0) {
    return null;
  }

  return (
    <CardShell className="p-5">
      <div>
        <p className="mb-1 text-xs font-black leading-5 text-muted">
          Comportamento predominante detalhado por conversão
        </p>
        <PanelTitle
          description={formatSelectedPeriod(summary.period)}
          icon={Funnel}
          title={"Análise comportamental por conversão"}
        />
      </div>

      <div className="mt-5 grid gap-3 lg:hidden">
        {conversionRows.map((row) => (
          <section
            className="rounded-[1.35rem] border border-border/70 bg-surface p-3"
            key={`profile-conversion-behavior-mobile-row-${row.id}`}
          >
            <ProfileConversionBehaviorRowHeader
              row={row}
              totalWhatsappClicks={totalBehaviorWhatsappClicks}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {behaviorColumns.map((column) => {
                const cell = behaviorCellsByKey.get(`${row.id}:${column.id}`) ?? null;

                return (
                  <div
                    className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/30 p-2"
                    key={`profile-conversion-behavior-mobile-cell-${row.id}-${column.id}`}
                  >
                    <p className="mb-1 text-[0.7rem] font-black uppercase leading-4 tracking-[0.1em] text-subtle">
                      {column.label}
                    </p>
                    <ProfileConversionBehaviorTableCell cell={cell} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[1.5rem] border border-border/70 bg-surface lg:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            {
              "Tabela com as faixas de conversão no eixo vertical e tags comportamentais dos psicólogos por vídeo de apresentação, perfil, comunidade e favoritos."
            }
          </caption>
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[24%]" />
            <col className="w-[24%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="bg-surface-muted/80">
              <th className={PROFILE_CONVERSION_BEHAVIOR_TABLE_HEADER_CLASS} scope="col">
                {"Conversão"}
              </th>
              {behaviorColumns.map((column) => (
                <th
                  className={cn(
                    PROFILE_CONVERSION_BEHAVIOR_TABLE_HEADER_CLASS,
                    column.id === "favorite" && "text-right",
                  )}
                  key={`profile-conversion-behavior-axis-${column.id}`}
                  scope="col"
                  title={column.description}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conversionRows.map((row) => (
              <tr key={`profile-conversion-behavior-row-${row.id}`}>
                <th className="border-border border-t bg-surface p-2.5 align-top" scope="row">
                  <ProfileConversionBehaviorRowHeader
                    row={row}
                    totalWhatsappClicks={totalBehaviorWhatsappClicks}
                  />
                </th>
                {behaviorColumns.map((column) => {
                  const cell = behaviorCellsByKey.get(`${row.id}:${column.id}`) ?? null;

                  return (
                    <td
                      className="border-border border-t p-2.5 align-top"
                      key={`profile-conversion-behavior-cell-${row.id}-${column.id}`}
                    >
                      <ProfileConversionBehaviorTableCell
                        align={column.id === "favorite" ? "end" : "start"}
                        cell={cell}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DashboardProfileConversionMatrixSection crossMatrix={profileCrossMatrix} />
    </CardShell>
  );
};

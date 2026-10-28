"use client";

import { CircleHelp, Compass, Eye, Heart, PlayCircle, Search, UsersRound } from "lucide-react";
import { z } from "zod";
import type {
  AnalyticsTimeline,
  PsychologistAnalyticsMetrics,
} from "@/api/generator/types/psychologist-analytics";
import { SelectController } from "@/components/controllers/select";
import { useFormList } from "@/hooks/form";
import { timelineSeries } from "../modules/timeline";

const schema = z.object({ detail: z.enum(["origin", "people"]) });
const origins = {
  presentation_video: {
    icon: PlayCircle,
    description: "Pelo vídeo de apresentação no explorar e nos resultados de busca.",
  },
  communities: { icon: UsersRound, description: "Pelas suas participações nas comunidades." },
  profile: { icon: Eye, description: "Pelo seu perfil público." },
  favorites: { icon: Heart, description: "Pela página de favoritos." },
  explore: { icon: Compass, description: "Pela navegação no explorar." },
  search: { icon: Search, description: "Pelos resultados de busca." },
  unknown: { icon: CircleHelp, description: "Sem origem identificada." },
};

export function PeopleSummary({ metrics }: { metrics?: PsychologistAnalyticsMetrics }) {
  return (
    <dl className="grid gap-3 text-sm leading-6" aria-label="Resumo de cliques no período">
      {[
        ["Total de cliques", metrics?.whatsapp_clicks],
        ["Pessoas únicas", metrics?.whatsapp_unique_people],
        ["Média de cliques por pessoa", metrics?.whatsapp_clicks_per_person],
      ].map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">{label}</dt>
          <dd className="font-semibold text-foreground">
            {typeof value !== "number"
              ? "—"
              : value.toLocaleString(
                  "pt-BR",
                  label === "Média de cliques por pessoa"
                    ? { minimumFractionDigits: 1, maximumFractionDigits: 1 }
                    : undefined,
                )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MetricDetails({
  timeline,
  metric,
  metrics,
}: {
  timeline?: AnalyticsTimeline;
  metric: string;
  metrics?: PsychologistAnalyticsMetrics;
}) {
  const { hook: form } = useFormList<{ detail: "origin" | "people" }>({
    fields: [{ name: "detail", field: "select" }],
    schema,
    defaultValues: { detail: "origin" },
  });
  const detail = form.watch("detail");
  const series = timeline ? [...timelineSeries(timeline)].sort((a, b) => b.total - a.total) : [];
  return (
    <div className="mt-5 border-t border-border pt-4">
      {metric === "whatsapp_clicks" ? (
        <SelectController
          field="select"
          name="detail"
          control={form.control}
          label="Detalhamento"
          className="mb-4 gap-0 [&>label]:sr-only [&>[role=alert]]:hidden"
          inputClassName="min-h-11 rounded-lg text-base font-medium"
          selectOptionClassName="min-h-11 text-base"
          useCustomSelect
          hideEmptyOption
          options={[
            { label: "Origem", value: "origin" },
            { label: "Pessoas", value: "people" },
          ]}
        />
      ) : (
        <h3 className="mb-3 text-base font-bold">Origem</h3>
      )}
      {metric === "whatsapp_clicks" && detail === "people" ? (
        <PeopleSummary metrics={metrics} />
      ) : series.length ? (
        <table className="w-full table-fixed text-sm" aria-label="Resultados por origem">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th scope="col" className="pb-3 font-semibold">
                Origem
              </th>
              <th scope="col" className="w-16 pb-3 text-right font-semibold">
                {metric === "whatsapp_clicks" ? "Cliques" : "Total"}
              </th>
            </tr>
          </thead>
          <tbody>
            {series.map((series) => {
              const origin = origins[series.id as keyof typeof origins] ?? origins.unknown;
              const Icon = origin.icon;
              return (
                <tr key={series.id} className="border-b border-border last:border-0">
                  <th scope="row" className="py-4 pr-2 text-left font-normal">
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0 break-words">
                        <p className="font-semibold text-foreground">{series.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{origin.description}</p>
                      </div>
                    </div>
                  </th>
                  <td className="py-4 text-right align-top font-bold tabular-nums">
                    {series.total.toLocaleString("pt-BR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted">Detalhamento ainda não disponível.</p>
      )}
    </div>
  );
}

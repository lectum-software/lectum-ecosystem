"use client";

import { FileText, type LucideIcon, MousePointerClick } from "lucide-react";
import type {
  AdminTrafficSummary,
  TrafficConversionAction,
  TrafficConversionChart,
  TrafficDeviceItem,
  TrafficEntryPage,
  TrafficMetric,
} from "@/api/req/traffic";
import { buildDonutCircleSegments } from "@/lib/chart-geometry";
import { cn } from "@/lib/utils";

import {
  CHART_COLORS,
  findMetric,
  formatMetricValue,
  formatPercentageValue,
  numberFormatter,
  type TrafficDonutChartItem,
} from "../modules/traffic-support";

import { CardShell, TrendBadge } from "./overview-cards";

export const DonutChart = ({
  ariaLabel,
  items,
  total,
}: {
  ariaLabel: string;
  items: TrafficDonutChartItem[];
  total: number;
}) => {
  const radius = 42;
  const { circumference, segments } = buildDonutCircleSegments(items, total, radius);

  return (
    <figure className="mt-5">
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[170px_minmax(0,1fr)] 2xl:items-center">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-full max-w-[12rem] min-w-0"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--admin-surface-muted)"
            strokeWidth="18"
          />
          {segments.map(({ dash, item, strokeDashoffset }, index) => (
            <circle
              cx="60"
              cy="60"
              fill="none"
              key={item.id}
              r={radius}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={strokeDashoffset}
              strokeWidth="18"
              transform="rotate(-90 60 60)"
            />
          ))}
          <text
            fill="var(--admin-foreground)"
            fontSize="15"
            fontWeight="900"
            textAnchor="middle"
            x="60"
            y="58"
          >
            {numberFormatter.format(total)}
          </text>
          <text
            fill="var(--admin-muted)"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
            x="60"
            y="72"
          >
            total
          </text>
        </svg>

        <div className="min-w-0 space-y-3">
          {items.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
              Nenhum dado foi encontrado no período.
            </p>
          ) : (
            items.map((item, index) => (
              <div
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
                key={item.id}
              >
                <span className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-foreground">
                  <span
                    aria-hidden
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block whitespace-normal break-words",
                        item.id === "anonymous" && "break-normal",
                      )}
                    >
                      {item.id === "anonymous" && item.label === "Não autenticados" ? (
                        <>
                          <span className="sr-only">{item.label}</span>
                          <span aria-hidden>Não</span>
                          <br aria-hidden />
                          <span aria-hidden>autenticados</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </span>
                    {item.sublabel ? (
                      <span className="mt-1 block whitespace-nowrap text-xs font-semibold leading-5 text-subtle">
                        {item.sublabel}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm font-semibold text-foreground">
                  {numberFormatter.format(item.count)}{" "}
                  <span className="text-xs font-medium text-muted">
                    ({formatPercentageValue(item.percentage)})
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      <figcaption className="sr-only">
        {items.length > 0
          ? items
              .map(
                (item) =>
                  `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
                    item.percentage,
                  )})${item.sublabel ? `; ${item.sublabel}` : ""}`,
              )
              .join("; ")
          : "Sem dados disponíveis."}
      </figcaption>
    </figure>
  );
};

export const buildDeviceDonutItems = (items: TrafficDeviceItem[]): TrafficDonutChartItem[] =>
  items.map((item) => {
    const operatingSystems = item.device_type === "unknown" ? [] : (item.operating_systems ?? []);
    const operatingSystemSummary = operatingSystems
      .map(
        (operatingSystem) =>
          `${operatingSystem.label} ${formatPercentageValue(operatingSystem.percentage)}`,
      )
      .join(" · ");

    return {
      ...item,
      sublabel: operatingSystemSummary || null,
    };
  });

export const PanelTitle = ({
  icon: Icon,
  periodDescription,
  title,
}: {
  icon: LucideIcon;
  periodDescription?: string;
  title: string;
}) => (
  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <Icon aria-hidden className="h-5 w-5 text-primary" />
        <h2 className="min-w-0 text-lg font-bold text-foreground">{title}</h2>
      </div>
      {periodDescription ? (
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      ) : null}
    </div>
  </div>
);

export const EntryPagesTable = ({ items }: { items: TrafficEntryPage[] }) => (
  <>
    <div className="mt-5 space-y-3 md:hidden">
      {items.map((item) => (
        <div className="rounded-2xl border border-border bg-surface p-3" key={item.path}>
          <p className="font-black text-foreground">{item.label}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-surface-muted p-2">
              <span className="block font-semibold text-muted">Sess&otilde;es</span>
              <strong className="text-foreground">{numberFormatter.format(item.count)}</strong>
            </div>
            <div className="rounded-xl bg-surface-muted p-2">
              <span className="block font-semibold text-muted">Participa&ccedil;&atilde;o</span>
              <strong className="text-foreground">{item.percentage}%</strong>
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum acesso de entrada foi encontrado no per&iacute;odo.
        </p>
      ) : null}
    </div>

    <div className="mt-5 hidden overflow-x-auto md:block">
      <table className="w-full min-w-full text-left text-sm">
        <caption className="sr-only">P&aacute;ginas de entrada por sess&otilde;es</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="py-3 font-black">P&aacute;gina de entrada</th>
            <th className="py-3 text-right font-black">Sess&otilde;es</th>
            <th className="py-3 text-right font-black">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.path}>
              <td className="min-w-0 py-3 pr-3">
                <p className="font-black text-foreground">{item.label}</p>
              </td>
              <td className="py-3 pr-3 text-right font-bold text-foreground">
                {numberFormatter.format(item.count)}
              </td>
              <td className="py-3 pr-3 text-right font-bold text-muted">{item.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum acesso de entrada foi encontrado no per&iacute;odo.
        </p>
      ) : null}
    </div>
  </>
);

export const NavigationMetricCard = ({
  description,
  metric,
  title,
  value,
}: {
  description: string;
  metric?: TrafficMetric | null;
  title: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
    <p className="text-xs font-semibold text-muted">{title}</p>
    <p className="mt-2 truncate text-2xl font-black tracking-tight text-foreground" title={value}>
      {value}
    </p>
    <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
      {metric ? <TrendBadge metric={metric} /> : null}
      <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
        {metric ? "vs. período anterior" : "base do período"}
      </span>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted">{description}</p>
  </div>
);

export const PageNavigationPanel = ({
  periodDescription,
  summary,
}: {
  periodDescription: string;
  summary: AdminTrafficSummary;
}) => {
  const pageviewsMetric = findMetric(summary, "pageviews");
  const pagesPerSessionMetric = findMetric(summary, "pages_per_session");
  const averageTimeMetric = findMetric(summary, "average_time");
  const bounceRateMetric = findMetric(summary, "bounce_rate");
  const returnRateMetric = findMetric(summary, "return_rate");
  const importantActionSessionsMetric = findMetric(summary, "important_action_sessions");

  const cards = [
    {
      description: "Total de páginas carregadas no período selecionado.",
      id: "pageviews",
      metric: pageviewsMetric,
      title: "Visualizações de páginas",
      value: pageviewsMetric ? formatMetricValue(pageviewsMetric) : "Indisponível",
    },
    {
      description: "Páginas vistas divididas por sessões com ao menos uma página carregada.",
      id: "pages_per_session",
      metric: pagesPerSessionMetric,
      title: "Média de páginas por sessão",
      value: pagesPerSessionMetric ? formatMetricValue(pagesPerSessionMetric) : "Indisponível",
    },
    {
      description: "Tempo médio por visualização com duração registrada.",
      id: "average_time",
      metric: averageTimeMetric,
      title: "Tempo médio na plataforma",
      value: averageTimeMetric ? formatMetricValue(averageTimeMetric) : "Indisponível",
    },
    {
      description: "Sessões com uma única visualização e sem ação importante registrada.",
      id: "bounce_rate",
      metric: bounceRateMetric,
      title: "Taxa de rejeição",
      value: bounceRateMetric ? formatMetricValue(bounceRateMetric) : "Indisponível",
    },
    {
      description: "Visitantes com sessão anterior ou mais de uma sessão no período.",
      id: "return_rate",
      metric: returnRateMetric,
      title: "Taxa de retorno",
      value: returnRateMetric ? formatMetricValue(returnRateMetric) : "Indisponível",
    },
    {
      description: "Sessões com pelo menos uma ação importante registrada.",
      id: "important_action_sessions",
      metric: importantActionSessionsMetric,
      title: "Sessões com ação importante",
      value: importantActionSessionsMetric
        ? formatMetricValue(importantActionSessionsMetric)
        : "Indisponível",
    },
  ];

  return (
    <CardShell className="min-w-0 p-5 md:p-6">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <FileText aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="min-w-0 text-xl font-bold text-foreground">Uso da plataforma</h2>
          </div>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <NavigationMetricCard
              description={card.description}
              key={card.id}
              metric={card.metric}
              title={card.title}
              value={card.value}
            />
          ))}
        </div>

        <div className="min-w-0 rounded-[1.5rem] border border-border/70 bg-surface-muted/70 p-4">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-black text-foreground">Principais páginas de entrada</h3>
            <p className="text-xs font-bold text-muted">
              Total: {numberFormatter.format(summary.entry_pages.total)} sessões
            </p>
          </div>
          <EntryPagesTable items={summary.entry_pages.items} />
        </div>
      </div>
    </CardShell>
  );
};

export const formatActorLabel = (action: TrafficConversionAction) => {
  const label = action.actor_label || "usuários";

  return `${numberFormatter.format(action.actors)} ${label}`;
};

export const formatRoleActorLabel = (count: number, singular: string, plural: string) =>
  `${numberFormatter.format(count)} ${count === 1 ? singular : plural}`;

export const ConversionChartCard = ({ chart }: { chart: TrafficConversionChart }) => (
  <div className="min-w-0 rounded-[1.5rem] border border-border bg-surface p-4">
    <h3 className="text-base font-black text-foreground">{chart.label}</h3>
    {chart.id === "visitor_to_signup" ? (
      <p className="mt-1 text-xs leading-5 text-muted">
        Estes registros consideram apenas visitantes rastreados. Podem existir outros usuários
        cadastrados sem rastreamento associado.
      </p>
    ) : null}
    {chart.id === "post_signup_overall" ? (
      <p className="mt-1 text-xs leading-5 text-muted">
        Usuários que realizaram pelo menos uma ação após se cadastrarem.
      </p>
    ) : null}
    <DonutChart
      ariaLabel={chart.label}
      items={getConversionChartItems(chart)}
      total={chart.total}
    />
  </div>
);

export const CONVERSION_CHART_ITEM_LABELS: Record<string, string> = {
  converted: "Se converteram após o cadastro",
  not_converted: "Não se converteram após o cadastro",
  not_signed_up: "Não se cadastraram",
  signed_up: "Se cadastraram",
};

export const getConversionChartItems = (chart: TrafficConversionChart) =>
  chart.items.map((item) => ({
    ...item,
    label: CONVERSION_CHART_ITEM_LABELS[item.id] ?? item.label,
  }));

export const ConversionActionTable = ({
  items,
  variant = "pre_signup",
}: {
  items: TrafficConversionAction[];
  variant?: "post_signup" | "pre_signup";
}) => (
  <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-border bg-surface">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma conversão foi encontrada no período.
      </p>
    ) : (
      <table className="w-full table-fixed text-left text-xs sm:text-sm">
        <thead className="bg-surface-muted text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted sm:text-xs">
          <tr>
            {variant === "post_signup" ? (
              <>
                <th className="w-[34%] px-2 py-3 sm:px-3">Conversão</th>
                <th className="w-[24%] px-2 py-3 text-right sm:px-3">Pacientes</th>
                <th className="w-[26%] px-2 py-3 text-right sm:px-3">Psicólogos</th>
                <th className="w-[16%] px-2 py-3 text-right sm:px-3">Taxa</th>
              </>
            ) : (
              <>
                <th className="w-[48%] px-2 py-3 sm:px-3">Conversão</th>
                <th className="w-[32%] px-2 py-3 text-right sm:px-3">Pessoas</th>
                <th className="w-[20%] px-2 py-3 text-right sm:px-3">Taxa</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="break-words px-2 py-3 font-semibold text-foreground sm:px-3">
                {item.label}
              </td>
              <td className="break-words px-2 py-3 text-right font-medium text-foreground sm:px-3">
                {variant === "post_signup"
                  ? formatRoleActorLabel(item.patient_actors ?? 0, "paciente", "pacientes")
                  : formatActorLabel(item)}
              </td>
              {variant === "post_signup" ? (
                <td className="break-words px-2 py-3 text-right font-medium text-foreground sm:px-3">
                  {formatRoleActorLabel(item.psychologist_actors ?? 0, "psicólogo", "psicólogos")}
                </td>
              ) : null}
              <td className="break-words px-2 py-3 text-right font-semibold text-primary sm:px-3">
                {item.actor_percentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export const ConversionColumn = ({
  children,
  summary,
  title,
}: {
  children: React.ReactNode;
  summary: string;
  title: string;
}) => (
  <div className="min-w-0 rounded-[1.75rem] border border-border/70 bg-surface-muted/60 p-4">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{summary}</p>
      <h3 className="mt-1 text-lg font-black text-foreground">{title}</h3>
    </div>
    <div className="mt-4 min-w-0 space-y-4">{children}</div>
  </div>
);

export const ConversionsPanel = ({
  periodDescription,
  summary,
}: {
  periodDescription: string;
  summary: AdminTrafficSummary;
}) => {
  const preSignup = summary.conversion_groups.pre_signup;
  const postSignup = summary.conversion_groups.post_signup;

  return (
    <CardShell className="p-5">
      <PanelTitle
        icon={MousePointerClick}
        periodDescription={periodDescription}
        title="Conversões geradas"
      />
      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
        <ConversionColumn
          summary={`${numberFormatter.format(preSignup.total_visitors)} visitantes`}
          title="Conversões para cadastro"
        >
          <div className="grid min-w-0 gap-4">
            {preSignup.charts.map((chart) => (
              <ConversionChartCard chart={chart} key={chart.id} />
            ))}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-foreground">Conversões antes do cadastro</h4>
            <ConversionActionTable items={preSignup.actions} />
          </div>
        </ConversionColumn>

        <ConversionColumn
          summary={`${numberFormatter.format(postSignup.total_users)} usuários cadastrados`}
          title="Conversões após cadastro"
        >
          <ConversionChartCard chart={postSignup.overall} />
          <div className="min-w-0">
            <h4 className="text-sm font-black text-foreground">Conversões após o cadastro</h4>
            <ConversionActionTable items={postSignup.items} variant="post_signup" />
          </div>
        </ConversionColumn>
      </div>
    </CardShell>
  );
};

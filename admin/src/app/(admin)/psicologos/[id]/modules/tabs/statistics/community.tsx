"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { AdminPsychologistStatistics } from "@/api/req/psychologists";
import { renderableImageSrc } from "@/lib/admin-media";
import { cn } from "@/lib/utils";
import { Badge, CardShell } from "../../components/shared";
import { numberFormatter } from "../../support/config";
import { initials, isPublicAdminMediaSrc } from "../../support/media";
import { buildPieSlicePath, getPiePoint, PlatformDevicePiePercentageLabel } from "./platform";

type PsychologistStatisticsCommunityItem =
  AdminPsychologistStatistics["community"]["communities"][number];

const formatCommunityRanking = (community: PsychologistStatisticsCommunityItem) =>
  community.ranking ? `#${numberFormatter.format(community.ranking.position)}` : "Sem ranking";

const formatCoverageRate = (community: PsychologistStatisticsCommunityItem) =>
  community.coverage.rate_percent === null
    ? "Sem base"
    : `${community.coverage.rate_percent.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })}%`;

const formatCommunityPeriodActions = (actions: number) =>
  `${numberFormatter.format(actions)} ${actions === 1 ? "ação" : "ações"} no período`;

const formatActiveCommunitiesColumnHeading = (count: number) =>
  `${numberFormatter.format(count)} ${count === 1 ? "Comunidade" : "Comunidades"}`;

export const communityEngagementDiagnosisClassName = (id: string | undefined) =>
  cn(
    "whitespace-nowrap",
    id === "muito_ativo" && "bg-success/10 text-success",
    id === "ativo" && "bg-primary-soft text-primary",
    id === "pouco_ativo" && "bg-warning/10 text-warning",
    (!id || id === "sem_base") && "bg-surface-muted text-muted",
  );

const getCommunityEngagementDiagnosis = (
  community: PsychologistStatisticsCommunityItem,
): NonNullable<PsychologistStatisticsCommunityItem["engagement_diagnosis"]> =>
  community.engagement_diagnosis ?? {
    id: "sem_base",
    label: "Sem engajamento",
    source: "conteudo",
  };

const PSYCHOLOGIST_COMMUNITY_ENGAGEMENT_LABEL_BY_ID: Record<
  AdminPsychologistStatistics["community"]["engagement_diagnosis"]["id"],
  string
> = {
  ativo: "Engajamento padr\u00e3o",
  muito_ativo: "Alto engajamento",
  pouco_ativo: "Baixo engajamento",
  sem_base: "Sem engajamento",
};

export const formatPsychologistCommunityEngagementLabel = (
  diagnosis: AdminPsychologistStatistics["community"]["engagement_diagnosis"],
) => PSYCHOLOGIST_COMMUNITY_ENGAGEMENT_LABEL_BY_ID[diagnosis.id] ?? diagnosis.label;

export const getPsychologistCommunityInteractions = (
  community: PsychologistStatisticsCommunityItem,
) => community.interactions ?? community.posts + community.replies;

type PsychologistCommunityActivityDiagnosisId =
  AdminPsychologistStatistics["community"]["engagement_diagnosis"]["id"];

const PSYCHOLOGIST_COMMUNITY_ACTIVITY_LABEL_BY_ID: Record<
  PsychologistCommunityActivityDiagnosisId,
  string
> = {
  ativo: "Ativo",
  muito_ativo: "Muito ativo",
  pouco_ativo: "Pouco ativo",
  sem_base: "Sem atividade",
};

export const resolvePsychologistCommunityActivityDiagnosis = (
  actions: number,
): {
  id: PsychologistCommunityActivityDiagnosisId;
  label: string;
} => {
  const normalizedActions = Math.max(0, Math.trunc(actions));
  let id: PsychologistCommunityActivityDiagnosisId = "pouco_ativo";

  if (normalizedActions <= 0) {
    id = "sem_base";
  } else if (normalizedActions >= 12) {
    id = "muito_ativo";
  } else if (normalizedActions >= 6) {
    id = "ativo";
  }

  return {
    id,
    label: PSYCHOLOGIST_COMMUNITY_ACTIVITY_LABEL_BY_ID[id],
  };
};

const formatCommunityVideoRatePercentage = (value: number) =>
  `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 1 ? 1 : 0,
  })}%`;

const CommunityVideoRateBreakdown = ({
  rate,
  total,
}: {
  rate?: PsychologistStatisticsCommunityItem["posts_video_rate"];
  total: number;
}) => {
  if (!rate || total === 0) {
    return (
      <span className="mt-1 block text-[11px] font-extrabold leading-4 text-subtle">
        Sem base de vídeo
      </span>
    );
  }

  return (
    <span className="mt-1 grid gap-0.5 text-[11px] font-extrabold leading-4 text-subtle">
      <span>Com vídeo {formatCommunityVideoRatePercentage(rate.with_video.rate_percent)}</span>
      <span>Sem vídeo {formatCommunityVideoRatePercentage(rate.without_video.rate_percent)}</span>
    </span>
  );
};

const ActiveCommunityAvatar = ({
  community,
}: {
  community: PsychologistStatisticsCommunityItem;
}) => {
  const imageSrc = renderableImageSrc(community.avatar_url);

  if (imageSrc) {
    return (
      <Image
        alt={`Comunidade ${community.name}`}
        className="h-10 w-10 rounded-xl object-cover"
        height={40}
        src={imageSrc}
        unoptimized={isPublicAdminMediaSrc(imageSrc)}
        width={40}
      />
    );
  }

  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black text-primary-foreground"
      style={{ backgroundColor: community.color || "var(--admin-primary)" }}
    >
      {initials(community.name)}
    </span>
  );
};

export const ActiveCommunitiesTable = ({
  communities,
}: {
  communities: PsychologistStatisticsCommunityItem[];
}) => {
  if (communities.length === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        Nenhuma comunidade com atividade do psicólogo foi encontrada no período.
      </p>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto rounded-[1.35rem] border border-border bg-surface">
      <table className="w-full min-w-[1080px] border-collapse text-left">
        <caption className="sr-only">
          Atividade e engajamento do psicólogo por comunidade, com ranking, posts, respostas, taxas
          com e sem vídeo, cobertura e status de seguimento junto ao nome.
        </caption>
        <thead className="bg-surface-muted/80">
          <tr className="text-xs font-black text-muted">
            <th className="px-4 py-3" scope="col">
              {formatActiveCommunitiesColumnHeading(communities.length)}
            </th>
            <th className="px-4 py-3 text-center" scope="col">
              Ranking
            </th>
            <th className="px-4 py-3 text-center" scope="col">
              Posts
            </th>
            <th className="px-4 py-3 text-center" scope="col">
              Respostas
            </th>
            <th className="px-4 py-3 text-center" scope="col">
              Cobertura
            </th>
            <th className="px-4 py-3 text-center" scope="col">
              Engajamento
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {communities.map((community) => {
            const interactions = getPsychologistCommunityInteractions(community);
            const coverage = community.coverage;
            const diagnosis = getCommunityEngagementDiagnosis(community);

            return (
              <tr className="align-middle transition hover:bg-surface-muted/45" key={community.id}>
                <th className="px-4 py-4" scope="row">
                  <div className="flex min-w-0 items-center gap-3">
                    <ActiveCommunityAvatar community={community} />
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="block max-w-[18rem] truncate text-sm font-black text-foreground">
                          {community.name}
                        </span>
                        <Badge
                          className={cn(
                            "shrink-0 whitespace-nowrap",
                            community.following
                              ? "bg-success/10 text-success"
                              : "bg-surface-muted text-muted",
                          )}
                        >
                          {community.following ? "Seguindo" : "Não seguindo"}
                        </Badge>
                      </span>
                      <span className="mt-1 block text-xs font-bold text-muted">
                        {formatCommunityPeriodActions(interactions)}
                      </span>
                    </span>
                  </div>
                </th>
                <td className="px-4 py-4 text-center text-sm font-black text-foreground">
                  {formatCommunityRanking(community)}
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="block text-sm font-bold text-muted">
                    {numberFormatter.format(community.posts)}
                  </span>
                  <CommunityVideoRateBreakdown
                    rate={community.posts_video_rate}
                    total={community.posts}
                  />
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="block text-sm font-bold text-muted">
                    {numberFormatter.format(community.replies)}
                  </span>
                  <CommunityVideoRateBreakdown
                    rate={community.replies_video_rate}
                    total={community.replies}
                  />
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="block text-sm font-black text-foreground">
                    {formatCoverageRate(community)}
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-5 text-muted">
                    {numberFormatter.format(coverage.covered_patient_posts)} de{" "}
                    {numberFormatter.format(coverage.patient_posts)} posts
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <Badge className={communityEngagementDiagnosisClassName(diagnosis.id)}>
                    {formatPsychologistCommunityEngagementLabel(diagnosis)}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

type PsychologistContentFormatDistribution =
  AdminPsychologistStatistics["community"]["content_distribution"];

type PsychologistContentFormatDistributionGroup = PsychologistContentFormatDistribution["posts"];

type PsychologistContentFormatDistributionItem =
  PsychologistContentFormatDistributionGroup["items"][number];

const contentFormatChartColors = {
  image: "var(--admin-primary)",
  image_carousel: "var(--admin-warning)",
  text: "var(--admin-muted)",
  video: "var(--admin-chart-accent)",
} satisfies Record<PsychologistContentFormatDistributionItem["id"], string>;

const formatContentFormatPercentage = (percentage: number) =>
  `${percentage.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: percentage > 0 && percentage < 1 ? 1 : 0,
  })}%`;

const formatContentFormatTotal = (total: number, labels: { plural: string; singular: string }) =>
  `${numberFormatter.format(total)} ${total === 1 ? labels.singular : labels.plural}`;

const formatContentFormatWhatsappClicks = (total: number) =>
  `${numberFormatter.format(total)} ${total === 1 ? "clique WhatsApp" : "cliques WhatsApp"}`;

const ContentFormatDistributionCard = ({
  badgeLabel,
  className,
  description,
  distribution,
  isRefreshing,
  title,
  totalLabels,
}: {
  badgeLabel?: string;
  className?: string;
  description: string;
  distribution: PsychologistContentFormatDistributionGroup;
  isRefreshing: boolean;
  title: string;
  totalLabels: { plural: string; singular: string };
}) => {
  const center = 60;
  const radius = 48;
  const innerRadius = 31;
  const visibleItems = distribution.items.filter((item) => item.count > 0);
  const hasContent = distribution.total > 0 && visibleItems.length > 0;
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: PsychologistContentFormatDistributionItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = distribution.total > 0 ? item.count / distribution.total : 0;
      if (share <= 0) return accumulator;

      const startAngle = accumulator.currentAngle;
      const endAngle = startAngle + share * 360;

      return {
        currentAngle: endAngle,
        items: accumulator.items.concat({
          endAngle,
          item,
          share,
          startAngle,
        }),
      };
    },
    { currentAngle: -90, items: [] },
  ).items;
  const ariaLabel = hasContent
    ? `Gráfico de donut de formatos de ${title.toLowerCase()}: ${distribution.items
        .map(
          (item) =>
            `${item.label}: ${numberFormatter.format(item.count)}, ${formatContentFormatPercentage(
              item.percentage,
            )}, ${formatContentFormatWhatsappClicks(item.whatsapp_clicks ?? 0)}`,
        )
        .join("; ")}.`
    : `Gráfico de donut de formatos de ${title.toLowerCase()}: sem conteúdo no período selecionado.`;

  return (
    <CardShell className={cn("min-w-0 max-w-full overflow-hidden p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">{description}</p>
        </div>
        <Badge className="shrink-0 bg-surface-muted text-muted">
          {badgeLabel ?? formatContentFormatTotal(distribution.total, totalLabels)}
        </Badge>
      </div>

      <figure className="mt-5 grid gap-4 sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:items-center">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-36 sm:w-40"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx={center}
            cy={center}
            fill="var(--admin-surface-muted)"
            r={radius}
            stroke="var(--admin-border)"
            strokeWidth="1"
          />
          {segments.map((segment) => {
            const color = contentFormatChartColors[segment.item.id];
            const labelPoint = getPiePoint(
              center,
              radius * 0.58,
              (segment.startAngle + segment.endAngle) / 2,
            );
            const percentageLabel = formatContentFormatPercentage(segment.item.percentage);

            if (segment.share >= 0.999) {
              return (
                <g key={segment.item.id}>
                  <circle
                    cx={center}
                    cy={center}
                    fill={color}
                    r={radius}
                    stroke="var(--admin-surface)"
                    strokeWidth="1.4"
                  />
                  <PlatformDevicePiePercentageLabel
                    color={color}
                    label={percentageLabel}
                    x={center}
                    y={center}
                  />
                </g>
              );
            }

            return (
              <g key={segment.item.id}>
                <path
                  d={buildPieSlicePath(center, radius, segment.startAngle, segment.endAngle)}
                  fill={color}
                  stroke="var(--admin-surface)"
                  strokeWidth="1.4"
                />
                {segment.share > 1 ? (
                  <PlatformDevicePiePercentageLabel
                    color={color}
                    label={percentageLabel}
                    x={labelPoint.x}
                    y={labelPoint.y}
                  />
                ) : null}
              </g>
            );
          })}
          <circle
            aria-hidden
            cx={center}
            cy={center}
            fill="var(--admin-surface)"
            r={innerRadius}
            stroke="var(--admin-surface)"
            strokeWidth="1"
          />
          <text
            fill="var(--admin-foreground)"
            fontSize="15"
            fontWeight="900"
            textAnchor="middle"
            x={center}
            y={center - 2}
          >
            {numberFormatter.format(distribution.total)}
          </text>
          <text
            fill="var(--admin-muted)"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
            x={center}
            y={center + 12}
          >
            total
          </text>
        </svg>
        <figcaption className="grid gap-2">
          {distribution.items.map((item) => (
            <div
              className={cn("rounded-2xl bg-surface-muted p-3", item.count === 0 && "opacity-70")}
              key={item.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: contentFormatChartColors[item.id] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-black text-foreground">
                  {formatContentFormatPercentage(item.percentage)}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-bold text-muted">
                <span>{formatContentFormatTotal(item.count, totalLabels)}</span>
                <span aria-hidden className="text-subtle">
                  ·
                </span>
                <span>{formatContentFormatWhatsappClicks(item.whatsapp_clicks ?? 0)}</span>
              </p>
            </div>
          ))}
        </figcaption>
      </figure>
    </CardShell>
  );
};

export const ContentFormatDistributionsBlock = ({
  cardClassName,
  className,
  distribution,
  isRefreshing,
}: {
  cardClassName?: string;
  className?: string;
  distribution: PsychologistContentFormatDistribution;
  isRefreshing: boolean;
}) => (
  <div className={cn("grid gap-5 lg:grid-cols-2", className)}>
    <ContentFormatDistributionCard
      badgeLabel={formatContentFormatWhatsappClicks(
        (distribution.posts.total_whatsapp_clicks ?? 0) +
          (distribution.replies.total_whatsapp_clicks ?? 0),
      )}
      className={cardClassName}
      description="Quantidade e taxa por formato dos posts no mesmo período selecionado."
      distribution={distribution.posts}
      isRefreshing={isRefreshing}
      title="Posts"
      totalLabels={{ plural: "posts", singular: "post" }}
    />
    <ContentFormatDistributionCard
      badgeLabel={formatContentFormatWhatsappClicks(
        distribution.replies.total_whatsapp_clicks ?? 0,
      )}
      className={cardClassName}
      description="Quantidade e taxa por formato das respostas no mesmo período selecionado."
      distribution={distribution.replies}
      isRefreshing={isRefreshing}
      title="Respostas"
      totalLabels={{ plural: "respostas", singular: "resposta" }}
    />
  </div>
);

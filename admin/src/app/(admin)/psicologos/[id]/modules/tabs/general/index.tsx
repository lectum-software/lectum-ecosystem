"use client";

import { type LucideIcon, Video } from "lucide-react";
import type { ReactNode } from "react";
import {
  useAdminPsychologistBilling,
  useAdminPsychologistStatistics,
} from "@/api/callers/psychologists";
import type { AdminPsychologistDetail } from "@/api/req/psychologists";
import { AdminStreamVideo } from "@/components/admin-stream-video";
import { renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { CardShell, IconCircle } from "../../components/shared";
import { GENERAL_TAB_STATISTICS_QUERY } from "../../support/config";
import { findGeneralMetric, formatRatingCountLabel } from "../../support/formatters";
import {
  EngagementMetricCard,
  MetricCard,
  ProfileConversionMetricCard,
  SubscriptionCard,
} from "./metrics";
import { AccountSituationCard, RecentActivity, RegistryStatusCard } from "./status";

export const GeneralTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const billingQuery = useAdminPsychologistBilling(id);
  const generalStatisticsQuery = useAdminPsychologistStatistics(id, GENERAL_TAB_STATISTICS_QUERY);
  const metrics = detail.general.metrics;
  const rankingMetric = findGeneralMetric(metrics, "ranking");
  const ratingMetric = findGeneralMetric(metrics, "rating_avg");

  return (
    <div className="space-y-5" data-psychologist-detail-tab="geral">
      <section>
        <h2 className="sr-only">Métricas principais</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rankingMetric ? <MetricCard metric={rankingMetric} /> : null}
          {ratingMetric ? (
            <MetricCard
              footer={formatRatingCountLabel(detail.header.rating_count)}
              footerPlacement="inline"
              metric={ratingMetric}
            />
          ) : null}
          <ProfileConversionMetricCard
            isError={generalStatisticsQuery.isError}
            isLoading={generalStatisticsQuery.isLoading && !generalStatisticsQuery.data}
            statistics={generalStatisticsQuery.data}
          />
          <EngagementMetricCard
            isError={generalStatisticsQuery.isError}
            isLoading={generalStatisticsQuery.isLoading && !generalStatisticsQuery.data}
            statistics={generalStatisticsQuery.data}
          />
        </div>
      </section>

      <div className="grid items-stretch gap-5 xl:grid-cols-3">
        <AccountSituationCard id={id} />
        <RegistryStatusCard id={id} />
        <SubscriptionCard
          billing={billingQuery.data}
          billingError={billingQuery.isError}
          billingLoading={billingQuery.isLoading}
          detail={detail}
        />
      </div>

      <div className="grid gap-5">
        <RecentActivity events={detail.general.recent_activity} />
      </div>
    </div>
  );
};

export const FieldRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid gap-1 border-b border-border/80 py-3 last:border-0 sm:grid-cols-[190px_1fr]">
    <dt className="text-sm font-extrabold text-muted">{label}</dt>
    <dd className="text-sm font-bold text-foreground">{value}</dd>
  </div>
);

export const InfoCard = ({
  action,
  children,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <IconCircle icon={Icon} />
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
    <div className="mt-4">{children}</div>
  </CardShell>
);

export const FeatureLine = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted p-3 text-sm font-black text-foreground">
    <Icon aria-hidden className="h-5 w-5 text-primary" />
    {label}
  </div>
);

export const TextBlock = ({ children, empty }: { children?: string | null; empty: string }) => (
  <p className="whitespace-pre-line rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-foreground">
    {children || empty}
  </p>
);

export const VideoCard = ({ detail }: { detail: AdminPsychologistDetail }) => {
  const content = detail.profile.content;
  const cover = renderableImageSrc(content.video_cover_url || content.cover_image_url);
  const videoSrc = resolveAdminMediaUrl(content.video_url);

  return (
    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <IconCircle icon={Video} />
        <h2 className="text-lg font-bold text-foreground">Vídeo de apresentação</h2>
      </div>

      {videoSrc ? (
        <div className="relative mt-5 max-w-[260px] overflow-hidden rounded-[1.6rem] border border-border bg-media-background">
          <AdminStreamVideo
            aria-label={`Vídeo de apresentação de ${detail.header.name}`}
            className="aspect-[9/16] w-full bg-media-background object-cover"
            controls
            playsInline
            poster={cover || undefined}
            preload="metadata"
            src={videoSrc}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm font-bold text-muted">Nenhum vídeo cadastrado.</p>
      )}
    </CardShell>
  );
};

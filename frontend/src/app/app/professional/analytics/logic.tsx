"use client";

import { useMemo, useState } from "react";
import { usePsychologistAnalytics } from "@/api/callers/psychologist-analytics";
import type { PsychologistAnalyticsPeriodKey } from "@/api/generator/types/psychologist-analytics";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { PrivateTemplate } from "@/templates/private";
import { CommunityActivitySection } from "./components/community-activity";

import { MetricCard, PeriodTabs, PremiumAnalyticsBanner } from "./components/period-and-metrics";
import { PresentationVideoAnalyticsSection } from "./components/presentation-video";
import { TrafficSourceSection } from "./components/traffic-source";
import {
  getCommunitiesAnalytics,
  getDefaultCustomRange,
  getTrafficSources,
  metricCards,
  resolveApiError,
} from "./modules/support";

export const ProfessionalAnalyticsLogic = () => {
  const [period, setPeriod] = useState<PsychologistAnalyticsPeriodKey>("all");
  const [customRange, setCustomRange] = useState(getDefaultCustomRange);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const query = useMemo(
    () => (period === "custom" ? { period, ...customRange } : { period }),
    [customRange, period],
  );
  const analytics = usePsychologistAnalytics(query);
  const data = analytics.data;
  const errorMessage = analytics.isError ? resolveApiError(analytics.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const shouldShowError = Boolean(errorMessage && !isProfessionalPlanError);
  const isAnalyticsPreview = data?.access.mode === "preview" || isProfessionalPlanError;

  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl">
        <AppPageHeader backLabel="Voltar para perfil" title="Meus Analytics" />

        <PeriodTabs
          current={period}
          customPopoverOpen={customPopoverOpen}
          customRange={customRange}
          disabled={analytics.isFetching}
          onChange={setPeriod}
          onCustomPopoverOpenChange={setCustomPopoverOpen}
          onCustomRangeApply={setCustomRange}
        />

        {analytics.isLoading ? <LoadingState label="Carregando dados de desempenho" /> : null}

        {shouldShowError ? (
          <InlineAlert title="Erro ao consultar dados" variant="error">
            <p>{errorMessage}</p>
          </InlineAlert>
        ) : null}

        {isAnalyticsPreview ? <PremiumAnalyticsBanner /> : null}

        {!shouldShowError ? (
          <section
            className="grid min-w-0 grid-cols-2 items-stretch gap-3"
            aria-label="Cards de analytics"
          >
            {metricCards(data).map((metric) => (
              <MetricCard key={metric.id} locked={isAnalyticsPreview} metric={metric} />
            ))}
          </section>
        ) : null}

        {!analytics.isLoading && !shouldShowError ? (
          <TrafficSourceSection locked={isAnalyticsPreview} traffic={getTrafficSources(data)} />
        ) : null}

        {!shouldShowError ? (
          <PresentationVideoAnalyticsSection
            locked={isAnalyticsPreview}
            video={data?.presentation_video}
          />
        ) : null}

        {!shouldShowError ? (
          <CommunityActivitySection
            communities={getCommunitiesAnalytics(data)}
            locked={isAnalyticsPreview}
          />
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

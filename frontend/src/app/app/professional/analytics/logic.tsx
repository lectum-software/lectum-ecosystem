"use client";

import { useMemo, useState } from "react";
import { usePsychologistAnalytics } from "@/api/callers/psychologist-analytics";
import type {
  PsychologistAnalyticsPeriodKey,
  PsychologistAnalyticsPreview,
  PsychologistAnalyticsResponse,
} from "@/api/generator/types/psychologist-analytics";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { PrivateTemplate } from "@/templates/private";
import { AnalyticsOverview } from "./components/analytics-overview";
import { CommunityActivitySection } from "./components/community-activity";
import { PeriodTabs, PremiumAnalyticsBanner } from "./components/period-and-metrics";
import { PresentationVideoAnalyticsSection } from "./components/presentation-video";
import {
  getCommunitiesAnalytics,
  getDefaultCustomRange,
  getTrafficSources,
  metricCards,
  resolveApiError,
} from "./modules/support";

const hasFullAnalytics = (
  value: PsychologistAnalyticsResponse | PsychologistAnalyticsPreview | undefined,
): value is PsychologistAnalyticsResponse => value?.access.mode === "full" && "metrics" in value;

export const ProfessionalAnalyticsLogic = () => {
  const [period, setPeriod] = useState<PsychologistAnalyticsPeriodKey>("30d");
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
  const visibleData = !isAnalyticsPreview && hasFullAnalytics(data) ? data : undefined;

  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl">
        <AppPageHeader backLabel="Voltar para perfil" title="Meus Analytics" />
        {isAnalyticsPreview ? <PremiumAnalyticsBanner /> : null}

        <PeriodTabs
          current={period}
          customPopoverOpen={customPopoverOpen}
          customRange={customRange}
          disabled={analytics.isFetching}
          onChange={setPeriod}
          onCustomPopoverOpenChange={setCustomPopoverOpen}
          onCustomRangeApply={(range) => {
            setCustomRange(range);
            setPeriod("custom");
          }}
        />

        {analytics.isLoading ? <LoadingState label="Carregando dados de desempenho" /> : null}

        {shouldShowError ? (
          <InlineAlert title="Erro ao consultar dados" variant="error">
            <p>{errorMessage}</p>
          </InlineAlert>
        ) : null}

        {!shouldShowError ? (
          <AnalyticsOverview
            cards={metricCards(visibleData).map((metric) =>
              metric.id === "acquired_patients" && data && "acquired_summary" in data
                ? {
                    ...metric,
                    value:
                      data.acquired_summary?.acquired_patients == null
                        ? "—"
                        : data.acquired_summary.acquired_patients.toLocaleString("pt-BR"),
                  }
                : metric,
            )}
            data={visibleData}
            traffic={getTrafficSources(visibleData)}
            locked={isAnalyticsPreview}
            loading={analytics.isFetching}
          />
        ) : null}

        {!shouldShowError ? (
          <PresentationVideoAnalyticsSection
            media={data?.presentation_video}
            locked={isAnalyticsPreview}
            video={visibleData?.presentation_video}
          />
        ) : null}

        {!shouldShowError ? (
          <CommunityActivitySection
            communities={getCommunitiesAnalytics(visibleData)}
            locked={isAnalyticsPreview}
          />
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

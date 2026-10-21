"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { ANALYTICS_PATH, ANALYTICS_SCROLL_KEY } from "@/utils/analytics-return";
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
  const searchParams = useSearchParams();
  const returning = searchParams.get("restore") === "1";
  const requestedPeriod = searchParams.get("period") ?? "30d";
  const [period, setPeriod] = useState<PsychologistAnalyticsPeriodKey>(
    returning && ["7d", "30d", "90d", "365d", "year", "all", "custom"].includes(requestedPeriod)
      ? (requestedPeriod as PsychologistAnalyticsPeriodKey)
      : "30d",
  );
  const [customRange, setCustomRange] = useState(() => {
    const start_at = searchParams.get("start_at");
    const end_at = searchParams.get("end_at");
    return returning &&
      start_at &&
      end_at &&
      /^\d{4}-\d{2}-\d{2}$/.test(start_at) &&
      /^\d{4}-\d{2}-\d{2}$/.test(end_at)
      ? { start_at, end_at }
      : getDefaultCustomRange();
  });
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

  const restored = useRef(false);
  const [selectedMetric, setSelectedMetric] = useState(
    returning ? (searchParams.get("metric") ?? "whatsapp_clicks") : "whatsapp_clicks",
  );
  const returnTo =
    ANALYTICS_PATH +
    "?" +
    new URLSearchParams({
      restore: "1",
      metric: selectedMetric,
      period,
      ...(period === "custom" ? customRange : {}),
    }).toString();
  useEffect(() => {
    if (!returning || !data || analytics.isFetching || restored.current) return;
    let top: number | null = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(ANALYTICS_SCROLL_KEY) ?? "null");
      if (saved && Date.now() - saved.at < 3600000 && Number.isFinite(saved.top)) {
        top = Math.max(0, saved.top);
      }
    } catch {
      /* Fall back to the highlighted content section. */
    }
    const restore = () => {
      restored.current = true;
      if (top == null) {
        document.getElementById("conteudos-em-destaque")?.scrollIntoView({ behavior: "instant" });
      } else {
        window.scrollTo({ top, behavior: "instant" });
      }
    };
    const frame = requestAnimationFrame(restore);
    const observer = new ResizeObserver(restore);
    const page = document.getElementById("analytics-page");
    if (page) observer.observe(page);
    const stop = () => observer.disconnect();
    const timer = window.setTimeout(stop, 1500);
    window.addEventListener("touchstart", stop, { once: true });
    window.addEventListener("wheel", stop, { once: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      stop();
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };
  }, [returning, data, analytics.isFetching]);

  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section
        id="analytics-page"
        className="mx-auto grid w-full max-w-[430px] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl"
      >
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
            initialSelected={selectedMetric}
            onMetricChange={setSelectedMetric}
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
            returnTo={returnTo}
            communities={getCommunitiesAnalytics(visibleData)}
            locked={isAnalyticsPreview}
          />
        ) : null}
      </section>
    </PrivateTemplate>
  );
};

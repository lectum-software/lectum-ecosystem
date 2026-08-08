"use client";
import { useAdminPatientDetail } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type { AdminPatientDetail } from "@/api/req/patients";
import { ErrorState, PatientStatisticsPeriodControls } from "../components/common";
import { PatientActiveCommunitiesBlock } from "../components/community-activity";

import {
  PatientIntentAnalysisCard,
  PatientPlatformActivityHoursCard,
} from "../components/intent-activity";
import { PatientPlatformUsageCard } from "../components/platform-device";
import { EngagementChart } from "../components/statistics-series";
import { usePatientStatisticsPeriodFilter } from "../modules/detail-support";

export type PatientStatisticsDetailSlice = {
  detail: AdminPatientDetail;
  errorMessage: string | null;
  isRefreshing: boolean;
  query: ReturnType<typeof useAdminPatientDetail>;
};

export const usePatientStatisticsDetailSlice = (
  id: string,
  initialDetail: AdminPatientDetail,
  filter: ReturnType<typeof usePatientStatisticsPeriodFilter>,
): PatientStatisticsDetailSlice => {
  const usesInitialAllPeriod = filter.selectedPeriod === "all";
  const query = useAdminPatientDetail(id, filter.periodQuery, {
    enabled: !usesInitialAllPeriod,
    placeholderData: (previous) => previous ?? initialDetail,
  });
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  return {
    detail: usesInitialAllPeriod ? initialDetail : (query.data ?? initialDetail),
    errorMessage,
    isRefreshing: !usesInitialAllPeriod && query.isFetching && Boolean(query.data),
    query,
  };
};

export const StatisticsTab = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => {
  const intentFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const statisticsFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const activeCommunitiesFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const activityHoursFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const platformUsageFilter = usePatientStatisticsPeriodFilter(detail.header.created_at);
  const intentSlice = usePatientStatisticsDetailSlice(id, detail, intentFilter);
  const communitySlice = usePatientStatisticsDetailSlice(id, detail, statisticsFilter);
  const activeCommunitiesSlice = usePatientStatisticsDetailSlice(
    id,
    detail,
    activeCommunitiesFilter,
  );
  const activityHoursSlice = usePatientStatisticsDetailSlice(id, detail, activityHoursFilter);
  const platformUsageSlice = usePatientStatisticsDetailSlice(id, detail, platformUsageFilter);
  const intentDetail = intentSlice.detail;
  const communityDetail = communitySlice.detail;
  const activeCommunitiesDetail = activeCommunitiesSlice.detail;
  const activityHoursDetail = activityHoursSlice.detail;
  const platformUsageDetail = platformUsageSlice.detail;

  if (communitySlice.query.isError && !communitySlice.query.data && communitySlice.errorMessage) {
    return (
      <ErrorState
        message={communitySlice.errorMessage}
        onRetry={() => void communitySlice.query.refetch()}
      />
    );
  }

  return (
    <div className="max-w-full space-y-5 overflow-x-clip" data-patient-detail-tab="estatisticas">
      <PatientIntentAnalysisCard
        detail={intentDetail}
        isRefreshing={intentSlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-intent-statistics"
            onDateControlsBlur={intentFilter.handleDateControlsBlur}
            onDateChange={intentFilter.handleDateChange}
            onPeriodChange={intentFilter.handlePeriodChange}
            period={intentFilter.selectedPeriod}
            range={intentFilter.draftRange}
            rangeError={intentFilter.rangeError}
          />
        }
      />
      <EngagementChart
        detail={communityDetail}
        isRefreshing={communitySlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-community-statistics"
            onDateControlsBlur={statisticsFilter.handleDateControlsBlur}
            onDateChange={statisticsFilter.handleDateChange}
            onPeriodChange={statisticsFilter.handlePeriodChange}
            period={statisticsFilter.selectedPeriod}
            range={statisticsFilter.draftRange}
            rangeError={statisticsFilter.rangeError}
          />
        }
      />
      <PatientActiveCommunitiesBlock
        communities={activeCommunitiesDetail.communities.items}
        engagementDiagnosis={activeCommunitiesDetail.communities.engagement_diagnosis}
        isRefreshing={activeCommunitiesSlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-active-communities-statistics"
            onDateControlsBlur={activeCommunitiesFilter.handleDateControlsBlur}
            onDateChange={activeCommunitiesFilter.handleDateChange}
            onPeriodChange={activeCommunitiesFilter.handlePeriodChange}
            period={activeCommunitiesFilter.selectedPeriod}
            range={activeCommunitiesFilter.draftRange}
            rangeError={activeCommunitiesFilter.rangeError}
          />
        }
      />
      <PatientPlatformActivityHoursCard
        detail={activityHoursDetail}
        isRefreshing={activityHoursSlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-activity-hours-statistics"
            onDateControlsBlur={activityHoursFilter.handleDateControlsBlur}
            onDateChange={activityHoursFilter.handleDateChange}
            onPeriodChange={activityHoursFilter.handlePeriodChange}
            period={activityHoursFilter.selectedPeriod}
            range={activityHoursFilter.draftRange}
            rangeError={activityHoursFilter.rangeError}
          />
        }
      />
      <PatientPlatformUsageCard
        detail={platformUsageDetail}
        isRefreshing={platformUsageSlice.isRefreshing}
        periodControls={
          <PatientStatisticsPeriodControls
            idPrefix="patient-platform-usage-statistics"
            onDateControlsBlur={platformUsageFilter.handleDateControlsBlur}
            onDateChange={platformUsageFilter.handleDateChange}
            onPeriodChange={platformUsageFilter.handlePeriodChange}
            period={platformUsageFilter.selectedPeriod}
            range={platformUsageFilter.draftRange}
            rangeError={platformUsageFilter.rangeError}
          />
        }
      />
    </div>
  );
};

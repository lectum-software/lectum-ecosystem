"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAdminNotificationAutomaticLogs,
  useAdminNotificationCampaigns,
  useAdminNotificationCancelCampaign,
  useAdminNotificationEmailStatus,
  useAdminNotificationMetrics,
  useAdminNotificationPushStatus,
} from "@/api/callers/notifications";
import { resolveApiError } from "@/api/handle";
import type {
  AdminNotificationCampaign,
  AdminNotificationsRangeQuery,
} from "@/api/req/notifications";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import { CampaignDetailsModal, CampaignsList } from "./components/campaigns";
import { AutomaticLogs } from "./components/logs";
import { NewNotificationModal } from "./components/new-notification-modal";
import {
  ErrorState,
  Header,
  LoadingCards,
  MetricsGrid,
  NotificationTableFiltersBlock,
} from "./components/table";
import {
  buildNotificationPeriodQuery,
  CAMPAIGN_LIMIT,
  CAMPAIGN_STATUS_OPTIONS,
  createDefaultTableFilters,
  DELIVERY_STATUS_OPTIONS,
  getRangeForPeriod,
  isValidRange,
  LOGS_LIMIT,
  NOTIFICATION_DEFAULT_PERIOD,
  type NotificationPeriodPreset,
  type NotificationPeriodValue,
  type NotificationRange,
  type NotificationTableFilters,
  tableRangeErrorMessage,
} from "./modules/notification-support";

export const AdminNotificationsClient = () => {
  const [campaignStatus, setCampaignStatus] = useState("all");
  const [logStatus, setLogStatus] = useState("all");
  const [campaignFilters, setCampaignFilters] = useState<NotificationTableFilters>(() =>
    createDefaultTableFilters(),
  );
  const [logFilters, setLogFilters] = useState<NotificationTableFilters>(() =>
    createDefaultTableFilters(),
  );
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminNotificationCampaign | null>(null);
  const [details, setDetails] = useState<AdminNotificationCampaign | null>(null);
  const [campaignPeriod, setCampaignPeriod] = useState<NotificationPeriodValue>(
    NOTIFICATION_DEFAULT_PERIOD,
  );
  const [logsPeriod, setLogsPeriod] = useState<NotificationPeriodValue>(
    NOTIFICATION_DEFAULT_PERIOD,
  );
  const selectedCampaignStatus =
    CAMPAIGN_STATUS_OPTIONS.find((item) => item.value === campaignStatus) ??
    CAMPAIGN_STATUS_OPTIONS[0];
  const selectedLogStatus =
    DELIVERY_STATUS_OPTIONS.find((item) => item.value === logStatus) ?? DELIVERY_STATUS_OPTIONS[0];
  const resetCampaignPage = () => setPage(1);
  const resetLogsPage = () => setLogsPage(1);
  const campaignRangeControls = useDateRangeCommitOnBlur({
    errorMessage: tableRangeErrorMessage,
    initialRange: () => getRangeForPeriod(NOTIFICATION_DEFAULT_PERIOD),
    isValidRange,
    onApply: resetCampaignPage,
  });
  const logsRangeControls = useDateRangeCommitOnBlur({
    errorMessage: tableRangeErrorMessage,
    initialRange: () => getRangeForPeriod(NOTIFICATION_DEFAULT_PERIOD),
    isValidRange,
    onApply: resetLogsPage,
  });
  const campaignRangeIsValid =
    campaignPeriod === "custom" ? isValidRange(campaignRangeControls.appliedRange) : true;
  const logsRangeIsValid =
    logsPeriod === "custom" ? isValidRange(logsRangeControls.appliedRange) : true;
  const metricQuery = useMemo<AdminNotificationsRangeQuery>(
    () => ({ period: NOTIFICATION_DEFAULT_PERIOD }),
    [],
  );
  const campaignQuery = useMemo(
    () => ({
      audience: campaignFilters.audience === "all" ? undefined : campaignFilters.audience,
      channel: campaignFilters.channel === "all" ? undefined : campaignFilters.channel,
      limit: CAMPAIGN_LIMIT,
      page,
      ...buildNotificationPeriodQuery(campaignPeriod, campaignRangeControls.appliedRange),
      q: campaignFilters.q.trim() || undefined,
      status: selectedCampaignStatus.status,
    }),
    [
      campaignFilters,
      campaignPeriod,
      campaignRangeControls.appliedRange,
      page,
      selectedCampaignStatus.status,
    ],
  );
  const logsQuery = useMemo(
    () => ({
      audience: logFilters.audience === "all" ? undefined : logFilters.audience,
      channel: logFilters.channel === "all" ? undefined : logFilters.channel,
      limit: LOGS_LIMIT,
      page: logsPage,
      ...buildNotificationPeriodQuery(logsPeriod, logsRangeControls.appliedRange),
      q: logFilters.q.trim() || undefined,
      status: selectedLogStatus.status,
    }),
    [logFilters, logsPage, logsPeriod, logsRangeControls.appliedRange, selectedLogStatus.status],
  );
  const metrics = useAdminNotificationMetrics(metricQuery);
  const campaigns = useAdminNotificationCampaigns(campaignQuery, { enabled: campaignRangeIsValid });
  const logs = useAdminNotificationAutomaticLogs(logsQuery, { enabled: logsRangeIsValid });
  const push = useAdminNotificationPushStatus();
  const email = useAdminNotificationEmailStatus();
  const cancelCampaign = useAdminNotificationCancelCampaign();
  const firstError = metrics.error || campaigns.error || logs.error || push.error || email.error;

  const updateCampaignPeriod = (nextPeriod: NotificationPeriodPreset) => {
    setCampaignPeriod(nextPeriod);
    campaignRangeControls.applyRange(getRangeForPeriod(nextPeriod));
  };
  const updateCampaignDateRange = (field: keyof NotificationRange, value: string) => {
    setCampaignPeriod("custom");
    campaignRangeControls.handleDateChange(field, value);
  };
  const updateLogsPeriod = (nextPeriod: NotificationPeriodPreset) => {
    setLogsPeriod(nextPeriod);
    logsRangeControls.applyRange(getRangeForPeriod(nextPeriod));
  };
  const updateLogsDateRange = (field: keyof NotificationRange, value: string) => {
    setLogsPeriod("custom");
    logsRangeControls.handleDateChange(field, value);
  };
  const updateCampaignFilters = (nextFilters: NotificationTableFilters) => {
    setCampaignFilters(nextFilters);
    setPage(1);
  };
  const updateLogFilters = (nextFilters: NotificationTableFilters) => {
    setLogFilters(nextFilters);
    setLogsPage(1);
  };
  const updateCampaignStatus = (nextStatus: string) => {
    setCampaignStatus(nextStatus);
    setPage(1);
  };
  const updateLogStatus = (nextStatus: string) => {
    setLogStatus(nextStatus);
    setLogsPage(1);
  };
  const openCreateModal = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleCancel = async (campaign: AdminNotificationCampaign) => {
    if (cancelCampaign.isPending) return;
    if (!window.confirm(`Cancelar a campanha "${campaign.title}"?`)) return;
    try {
      await cancelCampaign.mutateAsync(campaign.id);
      toast.success("Campanha cancelada.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="space-y-6">
      <Header />
      {firstError ? (
        <ErrorState
          message={resolveApiError(firstError)}
          onRetry={() => {
            void metrics.refetch();
            void campaigns.refetch();
            void logs.refetch();
            void push.refetch();
            void email.refetch();
          }}
        />
      ) : null}
      {metrics.isLoading ? (
        <LoadingCards />
      ) : metrics.data ? (
        <MetricsGrid metrics={metrics.data} />
      ) : null}
      <CampaignsList
        campaigns={campaigns.data?.data ?? []}
        cancelingCampaignId={cancelCampaign.isPending ? cancelCampaign.variables : null}
        count={campaigns.data?.count ?? 0}
        filtersSlot={
          <NotificationTableFiltersBlock
            filters={campaignFilters}
            onDateChange={updateCampaignDateRange}
            onDateControlsBlur={campaignRangeControls.handleDateControlsBlur}
            onFiltersChange={updateCampaignFilters}
            onPeriodChange={updateCampaignPeriod}
            onStatusChange={updateCampaignStatus}
            period={campaignPeriod}
            range={campaignRangeControls.draftRange}
            rangeError={campaignRangeControls.rangeError}
            searchPlaceholder="Buscar campanha por título ou conteúdo..."
            status={campaignStatus}
            statusOptions={CAMPAIGN_STATUS_OPTIONS}
          />
        }
        isFetching={campaigns.isFetching}
        onCancel={handleCancel}
        onDetails={setDetails}
        onEdit={(campaign) => {
          setEditing(campaign);
          setModalOpen(true);
        }}
        onNew={openCreateModal}
        onNext={() => setPage((current) => current + 1)}
        onPrev={() => setPage((current) => Math.max(1, current - 1))}
        page={campaigns.data?.page ?? page}
        pages={campaigns.data?.pages ?? 1}
      />
      <AutomaticLogs
        count={logs.data?.count ?? 0}
        data={logs.data?.data ?? []}
        filtersSlot={
          <NotificationTableFiltersBlock
            filters={logFilters}
            onDateChange={updateLogsDateRange}
            onDateControlsBlur={logsRangeControls.handleDateControlsBlur}
            onFiltersChange={updateLogFilters}
            onPeriodChange={updateLogsPeriod}
            onStatusChange={updateLogStatus}
            period={logsPeriod}
            range={logsRangeControls.draftRange}
            rangeError={logsRangeControls.rangeError}
            searchPlaceholder="Buscar log por notificação ou usuário..."
            status={logStatus}
            statusOptions={DELIVERY_STATUS_OPTIONS}
          />
        }
        isFetching={logs.isFetching}
        onNext={() => setLogsPage((current) => current + 1)}
        onPrev={() => setLogsPage((current) => Math.max(1, current - 1))}
        page={logs.data?.page ?? logsPage}
        pages={logs.data?.pages ?? 1}
      />
      {modalOpen ? (
        <NewNotificationModal
          campaign={editing}
          email={email.data}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          push={push.data}
        />
      ) : null}
      {details ? (
        <CampaignDetailsModal campaign={details} onClose={() => setDetails(null)} />
      ) : null}
    </div>
  );
};

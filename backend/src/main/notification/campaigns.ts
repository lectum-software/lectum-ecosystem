import {
  dispatchDueNotificationCampaigns,
  isNotificationCampaignSchedulerEnabled,
} from "@/modules/api/admin/private/notifications/use-cases/services";
import { parsePositiveInteger } from "@/utils/runtime-config";
import { toSafeErrorLog } from "@/utils/safe-error-log";

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 10;
let campaignInitialTimer: ReturnType<typeof setTimeout> | null = null;
let campaignTimer: ReturnType<typeof setInterval> | null = null;
let campaignRunInProgress = false;

const runCampaignsSafely = async () => {
  if (campaignRunInProgress) return;

  campaignRunInProgress = true;
  try {
    const batchSize = parsePositiveInteger(
      process.env.NOTIFICATION_CAMPAIGNS_BATCH_SIZE,
      DEFAULT_BATCH_SIZE,
      { max: 100 },
    );
    await dispatchDueNotificationCampaigns(new Date(), batchSize);
  } catch (error) {
    console.error(
      "[NOTIFICATION CAMPAIGNS] Falha no scheduler.",
      toSafeErrorLog(error, "CampaignSchedulerError"),
    );
  } finally {
    campaignRunInProgress = false;
  }
};

export const startNotificationCampaignScheduler = () => {
  if (!isNotificationCampaignSchedulerEnabled() || campaignTimer) return;

  const intervalMs = parsePositiveInteger(
    process.env.NOTIFICATION_CAMPAIGNS_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    { max: 60 * 60 * 1000, min: 10_000 },
  );

  campaignInitialTimer = setTimeout(() => void runCampaignsSafely(), 15_000);
  campaignTimer = setInterval(() => void runCampaignsSafely(), intervalMs);
};

export const stopNotificationCampaignScheduler = () => {
  if (campaignInitialTimer) clearTimeout(campaignInitialTimer);
  if (campaignTimer) clearInterval(campaignTimer);

  campaignInitialTimer = null;
  campaignTimer = null;
};

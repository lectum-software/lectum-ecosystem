import { isWebPushConfigured } from "@/config/webPush";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { processEveningDigest, processLunchDigest } from "./community";
import { processProfessionalDailyDigest } from "./professional";
import {
  DEFAULT_DIGEST_INTERVAL_MS,
  getZonedDateParts,
  isInsideWindow,
  listDigestTargetUsers,
} from "./state";

export const runNotificationDigestScheduler = async (now = new Date()) => {
  if (!isWebPushConfigured()) return;

  const parts = getZonedDateParts(now);
  const shouldRunLunchDigest = isInsideWindow(parts, 12, 15, 13, 15);
  const shouldRunEveningDigest = isInsideWindow(parts, 19, 30, 21, 0);
  const shouldRunProfessionalDailyDigest = isInsideWindow(parts, 18, 30, 19, 30);

  if (!shouldRunLunchDigest && !shouldRunEveningDigest && !shouldRunProfessionalDailyDigest) {
    return;
  }

  if (shouldRunLunchDigest || shouldRunEveningDigest) {
    const users = await listDigestTargetUsers("paciente");

    for (const user of users) {
      if (shouldRunLunchDigest) {
        await processLunchDigest(user, now, parts.dateKey);
      }

      if (shouldRunEveningDigest) {
        await processEveningDigest(user, now, parts.dateKey);
      }
    }
  }

  if (shouldRunProfessionalDailyDigest) {
    const users = await listDigestTargetUsers("psicologo");

    for (const user of users) {
      await processProfessionalDailyDigest(user, now, parts.dateKey);
    }
  }
};

export let digestTimer: ReturnType<typeof setInterval> | null = null;

export let digestInitialTimer: ReturnType<typeof setTimeout> | null = null;

export let digestRunInProgress = false;

export const runDigestSafely = async () => {
  if (digestRunInProgress) return;

  digestRunInProgress = true;
  try {
    await runNotificationDigestScheduler();
  } catch (error) {
    console.error(
      "[WEB NOTIFICATION] erro no scheduler de digests:",
      toSafeErrorLog(error, "DigestSchedulerError"),
    );
  } finally {
    digestRunInProgress = false;
  }
};

export const startNotificationDigestScheduler = () => {
  if (process.env.NOTIFICATION_DIGESTS_ENABLED === "false") return;
  if (digestTimer) return;

  const interval = Number(process.env.NOTIFICATION_DIGESTS_INTERVAL_MS);
  const intervalMs =
    Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_DIGEST_INTERVAL_MS;
  digestInitialTimer = setTimeout(() => void runDigestSafely(), 30_000);
  digestTimer = setInterval(() => void runDigestSafely(), intervalMs);
};

export const stopNotificationDigestScheduler = () => {
  if (digestInitialTimer) clearTimeout(digestInitialTimer);
  if (digestTimer) clearInterval(digestTimer);

  digestInitialTimer = null;
  digestTimer = null;
};

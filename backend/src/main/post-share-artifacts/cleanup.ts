import { captureOperationalError } from "@/infra/observability/sentry";
import { PostRepository } from "@/modules/api/private/posts/repositories/PostRepository";
import {
  deleteExpiredShareArtifactObject,
  isShareArtifactKey,
} from "@/modules/api/private/posts/use-cases/services/share-artifact";
import { parsePositiveInteger } from "@/utils/runtime-config";
import { toSafeErrorLog } from "@/utils/safe-error-log";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 50;

let cleanupInitialTimer: ReturnType<typeof setTimeout> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let cleanupRunInProgress = false;

export const runPostShareArtifactCleanup = async (now = new Date()) => {
  const repository = new PostRepository();
  const batchSize = parsePositiveInteger(
    process.env.POST_SHARE_ARTIFACT_CLEANUP_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    { max: 500 },
  );
  const expired = await repository.listExpiredShareArtifacts(now, batchSize);
  let processed = 0;

  for (const artifact of expired) {
    if (!isShareArtifactKey(artifact.storage_key)) {
      await repository.markShareArtifactDeleted(artifact.id, now);
      processed += 1;
      continue;
    }

    const deleted = await deleteExpiredShareArtifactObject(artifact.storage_key);
    if (!deleted) continue;

    await repository.markShareArtifactDeleted(artifact.id, now);
    processed += 1;
  }

  return { processed };
};

const runCleanupSafely = async () => {
  if (cleanupRunInProgress) return;

  cleanupRunInProgress = true;
  try {
    const result = await runPostShareArtifactCleanup();
    if (result.processed > 0) {
      console.log(`[POST SHARE ARTIFACTS] ${result.processed} arquivo(s) expirado(s) removido(s).`);
    }
  } catch (error) {
    captureOperationalError(error, {
      boundary: "scheduler",
      classification: "UnknownError",
      operation: "post_share_artifact_cleanup",
    });
    console.error(
      "[POST SHARE ARTIFACTS] Falha no scheduler de limpeza.",
      toSafeErrorLog(error, "PostShareArtifactCleanupError"),
    );
  } finally {
    cleanupRunInProgress = false;
  }
};

export const startPostShareArtifactCleanupScheduler = () => {
  if (process.env.POST_SHARE_ARTIFACT_CLEANUP_ENABLED === "false" || cleanupTimer) return;

  const intervalMs = parsePositiveInteger(
    process.env.POST_SHARE_ARTIFACT_CLEANUP_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    { max: 24 * 60 * 60 * 1000, min: 60 * 60 * 1000 },
  );

  cleanupInitialTimer = setTimeout(() => void runCleanupSafely(), 2 * 60 * 1000);
  cleanupTimer = setInterval(() => void runCleanupSafely(), intervalMs);
};

export const stopPostShareArtifactCleanupScheduler = () => {
  if (cleanupInitialTimer) clearTimeout(cleanupInitialTimer);
  if (cleanupTimer) clearInterval(cleanupTimer);

  cleanupInitialTimer = null;
  cleanupTimer = null;
};

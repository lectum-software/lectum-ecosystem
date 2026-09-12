import { getVideoStreamProvider } from "@/infra/video-stream";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { listLegacyVideoCandidates } from "./inventory";
import { acquireR2ToStreamMigrationLock } from "./lock";
import { R2ToStreamMigrationService } from "./service";
import {
  shouldRunR2ToStreamStartupMigration,
  summarizeR2ToStreamStartupMigration,
} from "./startup-policy";
import type { MigrationItemResult } from "./types";

const STARTUP_MIGRATION_LIMIT = 50;
const STARTUP_MIGRATION_POLL_INTERVAL_MS = 10_000;
const STARTUP_MIGRATION_WAIT_TIMEOUT_MS = 1_800_000;

const runR2ToStreamStartupMigration = async () => {
  const decision = shouldRunR2ToStreamStartupMigration();
  if (!decision.run) {
    console.info("[R2_STREAM_STARTUP_MIGRATION_SKIPPED]", {
      mode: decision.mode,
      targetEnvironment: decision.targetEnvironment ?? "unknown",
    });
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[R2_STREAM_STARTUP_MIGRATION_SKIPPED]", {
      reason: "database_url_missing",
      targetEnvironment: decision.targetEnvironment,
    });
    return;
  }

  const provider = getVideoStreamProvider();
  if (!provider) {
    console.warn("[R2_STREAM_STARTUP_MIGRATION_SKIPPED]", {
      reason: "stream_provider_unavailable",
      targetEnvironment: decision.targetEnvironment,
    });
    return;
  }

  const migrationLock = await acquireR2ToStreamMigrationLock(databaseUrl);
  if (!migrationLock) {
    console.info("[R2_STREAM_STARTUP_MIGRATION_SKIPPED]", {
      reason: "already_running",
      targetEnvironment: decision.targetEnvironment,
    });
    return;
  }

  try {
    const candidates = await listLegacyVideoCandidates({
      limit: STARTUP_MIGRATION_LIMIT,
      purpose: "all",
    });
    if (candidates.length === 0) {
      console.info("[R2_STREAM_STARTUP_MIGRATION_FINISHED]", {
        candidates: 0,
        targetEnvironment: decision.targetEnvironment,
      });
      return;
    }

    console.info("[R2_STREAM_STARTUP_MIGRATION_STARTED]", {
      candidates: candidates.length,
      limit: STARTUP_MIGRATION_LIMIT,
      targetEnvironment: decision.targetEnvironment,
    });

    const service = new R2ToStreamMigrationService(provider);
    const results: MigrationItemResult[] = [];
    for (const candidate of candidates) {
      if (!migrationLock.isHealthy()) {
        console.warn("[R2_STREAM_STARTUP_MIGRATION_INTERRUPTED]", {
          reason: "migration_lock_lost",
          results: summarizeR2ToStreamStartupMigration(results),
          targetEnvironment: decision.targetEnvironment,
        });
        return;
      }

      results.push(
        await service.process(candidate, {
          apply: true,
          pollIntervalMs: STARTUP_MIGRATION_POLL_INTERVAL_MS,
          waitTimeoutMs: STARTUP_MIGRATION_WAIT_TIMEOUT_MS,
        }),
      );
    }

    console.info("[R2_STREAM_STARTUP_MIGRATION_FINISHED]", {
      candidates: candidates.length,
      moreCandidatesMayExist: candidates.length === STARTUP_MIGRATION_LIMIT,
      r2ObjectsDeleted: 0,
      results: summarizeR2ToStreamStartupMigration(results),
      targetEnvironment: decision.targetEnvironment,
    });
  } finally {
    await migrationLock.release();
  }
};

export const startR2ToStreamStartupMigration = () => {
  void runR2ToStreamStartupMigration().catch((error: unknown) => {
    console.error("[R2_STREAM_STARTUP_MIGRATION_FAILED]", {
      ...toSafeErrorLog(error, "R2ToStreamStartupMigrationError"),
    });
  });
};

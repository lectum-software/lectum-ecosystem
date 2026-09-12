import { type R2MigrationTargetEnvironment, resolveR2MigrationTargetEnvironment } from "./policy";
import type { MigrationItemResult } from "./types";

export type StartupMigrationMode = "all" | "auto" | "disabled" | R2MigrationTargetEnvironment;

const DISABLED_VALUES = new Set(["0", "false", "no", "off", "disabled"]);
const ENABLED_VALUES = new Set(["1", "true", "yes", "on", "enabled", "auto"]);

export const resolveR2ToStreamStartupMigrationMode = (
  value: string | undefined,
): StartupMigrationMode => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "auto";
  if (DISABLED_VALUES.has(normalized)) return "disabled";
  if (ENABLED_VALUES.has(normalized)) return "auto";
  if (normalized === "homolog" || normalized === "production" || normalized === "all") {
    return normalized;
  }
  return "disabled";
};

export const shouldRunR2ToStreamStartupMigration = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const targetEnvironment = resolveR2MigrationTargetEnvironment(environment);
  const mode = resolveR2ToStreamStartupMigrationMode(environment.R2_TO_STREAM_STARTUP_MIGRATION);

  if (!targetEnvironment || mode === "disabled") {
    return { mode, run: false, targetEnvironment };
  }

  if (mode === "all" || mode === targetEnvironment) {
    return { mode, run: true, targetEnvironment };
  }

  return {
    mode,
    run: mode === "auto" && targetEnvironment === "homolog",
    targetEnvironment,
  };
};

export const summarizeR2ToStreamStartupMigration = (results: MigrationItemResult[]) =>
  results.reduce(
    (summary, result) => {
      summary[result.outcome] += 1;
      summary.total += 1;
      return summary;
    },
    {
      already_attached: 0,
      eligible: 0,
      failed: 0,
      migrated: 0,
      processing: 0,
      skipped: 0,
      total: 0,
    },
  );

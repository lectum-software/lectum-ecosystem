import "dotenv/config";

import { type StartedVideoApiRuntime, startVideoApiRuntime } from "./api.js";
import { logError, logInfo, logWarning } from "./http/logging.js";
import { type StartedVideoWorkerRuntime, startVideoWorkerRuntime } from "./worker.js";

let apiRuntime: StartedVideoApiRuntime | null = null;
let workerRuntime: StartedVideoWorkerRuntime | null = null;
let requestedExitCode = 0;
let shuttingDown = false;

const shutdownCombinedRuntime = async (reason: "signal" | "startup_failed", exitCode: number) => {
  if (shuttingDown) return;
  shuttingDown = true;
  requestedExitCode = exitCode;
  logWarning("video_combined_shutdown_started", {
    operation: "runtime",
    status: reason,
  });

  const shutdownResults = await Promise.allSettled([
    apiRuntime?.shutdown(),
    workerRuntime?.shutdown(),
  ]);
  const failedShutdown = shutdownResults.some((result) => result.status === "rejected");
  if (failedShutdown && requestedExitCode === 0) requestedExitCode = 1;

  logInfo("video_combined_shutdown_completed", {
    operation: "runtime",
    status: failedShutdown ? "partial" : "stopped",
  });
  process.exitCode = requestedExitCode;
};

process.once("SIGINT", () => void shutdownCombinedRuntime("signal", 0));
process.once("SIGTERM", () => void shutdownCombinedRuntime("signal", 0));

const main = async () => {
  workerRuntime = await startVideoWorkerRuntime({ registerSignals: false });
  apiRuntime = await startVideoApiRuntime({ registerSignals: false });
  logInfo("video_combined_started", { operation: "runtime", status: "ready" });
};

main().catch(() => {
  logError("video_combined_start_failed", {
    error_code: "startup_failed",
    operation: "runtime",
  });
  void shutdownCombinedRuntime("startup_failed", 1);
});

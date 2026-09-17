import "@/config/dotenv";
import {
  captureOperationalError,
  flushSentry,
  initializeSentry,
} from "@/infra/observability/sentry";
import { resolveSentryRuntimeConfig } from "@/infra/observability/sentry-policy";
import { parseObservabilityCheckEnvironment } from "./check-observability-arguments";

const main = async () => {
  const confirmation = parseObservabilityCheckEnvironment(process.argv.slice(2));
  if (!confirmation) {
    console.error("[OBSERVABILITY_CHECK_FAILED]", { reason: "confirmation_required" });
    process.exitCode = 1;
    return;
  }

  const config = resolveSentryRuntimeConfig(process.env);
  if (!config.enabled || !config.dsn) {
    console.error("[OBSERVABILITY_CHECK_FAILED]", { reason: "configuration_invalid" });
    process.exitCode = 1;
    return;
  }

  if (config.environment !== confirmation) {
    console.error("[OBSERVABILITY_CHECK_FAILED]", { reason: "environment_mismatch" });
    process.exitCode = 1;
    return;
  }

  if (!initializeSentry()) {
    console.error("[OBSERVABILITY_CHECK_FAILED]", { reason: "initialization_failed" });
    process.exitCode = 1;
    return;
  }

  captureOperationalError(new Error("observability-check"), {
    boundary: "runtime",
    classification: "UnknownError",
    operation: "observability_probe",
  });

  if (!(await flushSentry())) {
    console.error("[OBSERVABILITY_CHECK_FAILED]", { reason: "transport_failed" });
    process.exitCode = 1;
    return;
  }

  console.log("[OBSERVABILITY_CHECK_OK]", {
    environment: config.environment,
    event: "sanitized_operational_error",
    transport: "accepted",
  });
};

void main().catch(() => {
  console.error("[OBSERVABILITY_CHECK_FAILED]", { reason: "unexpected" });
  process.exitCode = 1;
});

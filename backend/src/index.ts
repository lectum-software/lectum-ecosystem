import "@/config/dotenv";
import {
  captureOperationalError,
  flushSentry,
  initializeSentry,
} from "@/infra/observability/sentry";

initializeSentry();

void import("@/main/server/bootstrap").catch(async (error) => {
  captureOperationalError(error, {
    boundary: "boot",
    classification: "BackendBootError",
  });
  console.error("[BOOT] Não foi possível iniciar o backend com segurança.");
  process.exitCode = 1;
  await flushSentry();
});

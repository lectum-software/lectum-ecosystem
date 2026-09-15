// Manual only: immutable local image + disposable PostgreSQL; no published configuration.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "whatsapp",
  probeUrl: new URL("./whatsapp-verification-probe.cjs", import.meta.url),
  expectedChecks: 20,
  successMarker: "WHATSAPP_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

// Manual: node backend/scripts/free-analytics-integration.mjs --image=lectum-backend:audit-VERSAO
// Full real HTTP handler + disposable PostgreSQL. No source overlays or provider substitutes.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "free-analytics",
  probeUrl: new URL("./free-analytics-probe.cjs", import.meta.url),
  expectedChecks: 18,
  successMarker: "FREE_ANALYTICS_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "plan-history",
  probeUrl: new URL("./professional-plan-history-probe.cjs", import.meta.url),
  expectedChecks: 40,
  successMarker: "PROFESSIONAL_PLAN_HISTORY_POSTGRES_OK",
});

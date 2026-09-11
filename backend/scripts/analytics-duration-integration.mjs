// Manual integration: uses only an existing immutable image and disposable PostgreSQL.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "duration",
  probeUrl: new URL("./analytics-duration-probe.cjs", import.meta.url),
  expectedChecks: 8,
  successMarker: "DURATION_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

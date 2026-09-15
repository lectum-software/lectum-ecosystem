// Manual only: immutable backend image + disposable PostgreSQL, never published configuration.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "moderation",
  probeUrl: new URL("./moderation-concurrency-probe.cjs", import.meta.url),
  expectedChecks: 26,
  successMarker: "MODERATION_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

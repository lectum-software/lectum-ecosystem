// Manual integration: uses only an existing immutable image and disposable PostgreSQL.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "poststate",
  probeUrl: new URL("./post-state-probe.cjs", import.meta.url),
  expectedChecks: 48,
  successMarker: "POST_STATE_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

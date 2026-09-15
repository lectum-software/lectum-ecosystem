// Manual only: immutable local image + disposable PostgreSQL; never published configuration.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "registry",
  probeUrl: new URL("./registry-confirmation-probe.cjs", import.meta.url),
  expectedChecks: 38,
  successMarker: "REGISTRY_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

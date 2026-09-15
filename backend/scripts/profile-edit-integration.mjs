// Manual integration using the existing isolated, immutable-image PostgreSQL runner.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "profileedit",
  probeUrl: new URL("./profile-edit-probe.cjs", import.meta.url),
  expectedChecks: 11,
  successMarker: "PROFILE_EDIT_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});

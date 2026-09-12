// Manual: immutable local image + disposable PostgreSQL; no production source overlay.
// The parent runs this probe. The same expectations apply to baseline and candidate.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "received-interactions",
  probeUrl: new URL("./psychologist-received-interactions-probe.cjs", import.meta.url),
  expectedChecks: 30,
  successMarker: "PSYCHOLOGIST_RECEIVED_INTERACTIONS_POSTGRES_OK",
});

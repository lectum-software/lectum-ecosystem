import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "video-retention",
  probeUrl: new URL("./video-retention-probe.cjs", import.meta.url),
  expectedChecks: 12,
  successMarker: "VIDEO_RETENTION_POSTGRES_OK",
});

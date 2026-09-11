// Manual: real private router/authentication + immutable image and disposable PostgreSQL.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "media-http",
  probeUrl: new URL("./video-cleanup-http-probe.cjs", import.meta.url),
  expectedChecks: 16,
  successMarker: "VIDEO_CLEANUP_HTTP_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});
